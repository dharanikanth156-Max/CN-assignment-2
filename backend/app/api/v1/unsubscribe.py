from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.student import Student
from app.core.security import verify_unsubscribe_token

router = APIRouter(prefix="/unsubscribe", tags=["Unsubscribe"])

@router.get("")
async def unsubscribe_student(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    email = verify_unsubscribe_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid or expired unsubscribe link.")

    student = (await db.execute(select(Student).where(Student.email == email))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student record not found.")

    student.subscribed = False
    await db.commit()

    return {
        "success": True,
        "email": student.email,
        "name": student.name,
        "message": f"Successfully unsubscribed {student.email} from elective notifications."
    }

@router.post("/resubscribe")
async def resubscribe_student(
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    email = verify_unsubscribe_token(token)
    if not email:
        raise HTTPException(status_code=400, detail="Invalid token.")

    student = (await db.execute(select(Student).where(Student.email == email))).scalar_one_or_none()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found.")

    student.subscribed = True
    await db.commit()

    return {
        "success": True,
        "email": student.email,
        "message": f"Successfully re-subscribed {student.email} to academic notifications."
    }
