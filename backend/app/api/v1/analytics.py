from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_

from app.db.session import get_db
from app.models.student import Student
from app.models.exam import Exam
from app.models.campaign import Campaign, DeliveryLog
from app.models.user import User
from app.schemas.smtp_config import AnalyticsOverview
from app.api.deps import get_current_admin

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
async def get_analytics_overview(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    now = datetime.now(timezone.utc)
    today_start = datetime(now.year, now.month, now.day, tzinfo=timezone.utc)

    # Total and subscribed students
    total_students = (await db.execute(select(func.count(Student.id)))).scalar_one() or 0
    sub_students = (await db.execute(select(func.count(Student.id)).where(Student.subscribed == True))).scalar_one() or 0
    total_exams = (await db.execute(select(func.count(Exam.id)))).scalar_one() or 0

    # Upcoming exams count
    upcoming_exams = (await db.execute(select(func.count(Exam.id)).where(Exam.date_time > now))).scalar_one() or 0

    # Total sent, failed, sent today
    sent_today = (await db.execute(
        select(func.count(DeliveryLog.id)).where(
            and_(DeliveryLog.status == "sent", DeliveryLog.sent_at >= today_start)
        )
    )).scalar_one() or 0

    total_sent = (await db.execute(
        select(func.count(DeliveryLog.id)).where(DeliveryLog.status == "sent")
    )).scalar_one() or 0

    total_failed = (await db.execute(
        select(func.count(DeliveryLog.id)).where(DeliveryLog.status == "failed")
    )).scalar_one() or 0

    total_attempts = total_sent + total_failed
    success_rate = (total_sent / total_attempts * 100.0) if total_attempts > 0 else 100.0

    # 7-day chart data
    recent_sends = []
    for i in range(6, -1, -1):
        day_date = (now - timedelta(days=i)).date()
        day_start = datetime.combine(day_date, datetime.min.time(), tzinfo=timezone.utc)
        day_end = datetime.combine(day_date, datetime.max.time(), tzinfo=timezone.utc)

        day_sent = (await db.execute(
            select(func.count(DeliveryLog.id)).where(
                and_(DeliveryLog.status == "sent", DeliveryLog.sent_at >= day_start, DeliveryLog.sent_at <= day_end)
            )
        )).scalar_one() or 0

        day_failed = (await db.execute(
            select(func.count(DeliveryLog.id)).where(
                and_(DeliveryLog.status == "failed", DeliveryLog.created_at >= day_start, DeliveryLog.created_at <= day_end)
            )
        )).scalar_one() or 0

        recent_sends.append({
            "date": day_date.strftime("%b %d"),
            "sent": day_sent,
            "failed": day_failed
        })

    # Department distribution
    dept_res = await db.execute(
        select(Student.department, func.count(Student.id)).group_by(Student.department)
    )
    dept_dist = [{"name": row[0], "count": row[1]} for row in dept_res.all()]

    return AnalyticsOverview(
        total_students=total_students,
        subscribed_students=sub_students,
        total_exams=total_exams,
        emails_sent_today=sent_today,
        total_sent=total_sent,
        total_failed=total_failed,
        overall_success_rate=round(success_rate, 1),
        upcoming_exams_count=upcoming_exams,
        recent_sends_chart=recent_sends,
        department_distribution=dept_dist
    )
