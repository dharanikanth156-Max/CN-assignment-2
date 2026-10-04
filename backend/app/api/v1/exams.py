from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db, SyncSessionLocal
from app.models.exam import Exam
from app.models.user import User
from app.models.smtp_config import AuditLog
from app.models.student import Student
from app.schemas.exam import ExamCreate, ExamUpdate, ExamResponse, SendScheduleRequest
from app.services.campaign_service import campaign_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/exams", tags=["Exams"])

@router.get("", response_model=dict)
async def list_exams(
    search: Optional[str] = None,
    department: Optional[str] = None,
    year: Optional[int] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(Exam)
    if search:
        s_term = f"%{search.strip()}%"
        query = query.where(
            or_(
                Exam.course_name.ilike(s_term),
                Exam.course_code.ilike(s_term),
                Exam.venue.ilike(s_term)
            )
        )
    if department and department.upper() != "ALL":
        query = query.where(Exam.department == department)
    if year and year > 0:
        query = query.where(Exam.year == year)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Exam.date_time.asc()).offset((page - 1) * limit).limit(limit)
    exams = (await db.execute(query)).scalars().all()

    return {
        "items": [ExamResponse.model_validate(e) for e in exams],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/{exam_id}", response_model=ExamResponse)
async def get_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    return exam

@router.post("", response_model=ExamResponse, status_code=status.HTTP_201_CREATED)
async def create_exam(
    payload: ExamCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    exam = Exam(**payload.model_dump())
    db.add(exam)
    
    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_email=admin.email,
        action="CREATE_EXAM",
        target_resource=payload.course_code,
        details=f"Created exam {payload.course_code} - {payload.course_name}",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()
    await db.refresh(exam)
    return exam

@router.put("/{exam_id}", response_model=ExamResponse)
async def update_exam(
    exam_id: int,
    payload: ExamUpdate,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(exam, k, v)

    await db.commit()
    await db.refresh(exam)
    return exam

@router.delete("/{exam_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_exam(
    exam_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")
    await db.delete(exam)
    await db.commit()

@router.post("/{exam_id}/send-schedule")
async def send_exam_schedule(
    exam_id: int,
    payload: Optional[SendScheduleRequest] = None,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    exam = await db.get(Exam, exam_id)
    if not exam:
        raise HTTPException(status_code=404, detail="Exam not found")

    custom_msg = payload.custom_message if payload else ""
    campaign_id = campaign_service.send_exam_schedule(exam, custom_message=custom_msg)
    
    if campaign_id == 0:
        raise HTTPException(
            status_code=400,
            detail=f"No students found matching target audience (Dept: {exam.department}, Year: {exam.year})"
        )

    client_ip = request.client.host if request and request.client else "unknown"
    audit = AuditLog(
        user_email=admin.email,
        action="SEND_EXAM_SCHEDULE",
        target_resource=exam.course_code,
        details=f"Dispatched exam schedule campaign {campaign_id} for {exam.course_code}",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": f"Exam schedule campaign #{campaign_id} dispatched successfully to background workers.",
        "campaign_id": campaign_id
    }
