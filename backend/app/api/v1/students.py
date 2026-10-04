import csv
import io
import re
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Query, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, func, delete

from app.db.session import get_db
from app.models.student import Student
from app.models.user import User
from app.models.smtp_config import AuditLog
from app.schemas.student import StudentCreate, StudentUpdate, StudentResponse, StudentBulkImportResponse
from app.api.deps import get_current_admin

router = APIRouter(prefix="/students", tags=["Students"])

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")

@router.get("", response_model=dict)
async def list_students(
    search: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[int] = None,
    subscribed: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(Student)
    if search:
        s_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Student.name.ilike(s_term),
                Student.email.ilike(s_term),
                Student.roll_no.ilike(s_term)
            )
        )
    if department and department.upper() != "ALL":
        query = query.where(Student.department == department)
    if year and year > 0:
        query = query.where(Student.year == year)
    if subscribed is not None:
        query = query.where(Student.subscribed == subscribed)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total_res = await db.execute(count_query)
    total = total_res.scalar_one()

    # Apply pagination
    query = query.order_by(Student.id.desc()).offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    students = result.scalars().all()

    return {
        "items": [StudentResponse.model_validate(s) for s in students],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.post("", response_model=StudentResponse, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    # Check duplicate roll_no or email
    existing = await db.execute(
        select(Student).where(or_(Student.roll_no == payload.roll_no, Student.email == payload.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Student with this roll number or email already exists"
        )

    student = Student(**payload.model_dump())
    db.add(student)
    
    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_email=admin.email,
        action="CREATE_STUDENT",
        target_resource=payload.email,
        details=f"Created student {payload.name} ({payload.roll_no})",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()
    await db.refresh(student)
    return student

@router.put("/{student_id}", response_model=StudentResponse)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(student, k, v)

    await db.commit()
    await db.refresh(student)
    return student

@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    student = await db.get(Student, student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    await db.delete(student)
    await db.commit()

@router.post("/bulk-import", response_model=StudentBulkImportResponse)
async def bulk_import_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    if not file.filename.endswith(('.csv', '.txt')):
        raise HTTPException(status_code=400, detail="Only CSV files are supported")

    content = await file.read()
    decoded = content.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(decoded))

    total = 0
    imported = 0
    duplicates = 0
    invalid = 0
    errors = []

    # Pre-fetch existing emails and roll_nos for efficient deduplication
    existing_emails = set((await db.execute(select(Student.email))).scalars().all())
    existing_rolls = set((await db.execute(select(Student.roll_no))).scalars().all())

    new_students = []

    for row_idx, row in enumerate(reader, start=2):
        total += 1
        # Normalize column names
        row_norm = {k.strip().lower().replace(" ", "_"): v.strip() for k, v in row.items() if k}
        roll_no = row_norm.get("roll_no") or row_norm.get("rollno") or row_norm.get("id")
        name = row_norm.get("name") or row_norm.get("student_name")
        email = (row_norm.get("email") or "").lower()
        dept = (row_norm.get("department") or row_norm.get("dept") or "General").upper()
        year_str = row_norm.get("year") or "1"

        if not roll_no or not name or not email:
            invalid += 1
            errors.append(f"Row {row_idx}: Missing required fields (roll_no, name, or email)")
            continue

        if not EMAIL_REGEX.match(email):
            invalid += 1
            errors.append(f"Row {row_idx}: Invalid email format '{email}'")
            continue

        try:
            year = int(year_str)
        except ValueError:
            year = 1

        if email in existing_emails or roll_no in existing_rolls:
            duplicates += 1
            continue

        student = Student(
            roll_no=roll_no,
            name=name,
            email=email,
            department=dept,
            year=year,
            subscribed=True
        )
        new_students.append(student)
        existing_emails.add(email)
        existing_rolls.add(roll_no)
        imported += 1

    if new_students:
        db.add_all(new_students)
        await db.commit()

    return StudentBulkImportResponse(
        total_processed=total,
        imported_count=imported,
        duplicate_count=duplicates,
        invalid_count=invalid,
        errors=errors[:20]
    )

@router.get("/export/csv")
async def export_students_csv(
    department: Optional[str] = None,
    year: Optional[int] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(Student)
    if department and department.upper() != "ALL":
        query = query.where(Student.department == department)
    if year and year > 0:
        query = query.where(Student.year == year)

    res = await db.execute(query.order_by(Student.roll_no))
    students = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["roll_no", "name", "email", "department", "year", "subscribed"])
    for s in students:
        writer.writerow([s.roll_no, s.name, s.email, s.department, s.year, s.subscribed])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=students_export.csv"}
    )
