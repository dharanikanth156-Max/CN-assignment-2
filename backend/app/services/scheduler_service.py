from datetime import datetime, timedelta, timezone
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from sqlalchemy import select, and_

from app.db.session import SyncSessionLocal
from app.models.exam import Exam, ExamReminderLog
from app.models.student import Student
from app.models.announcement import Announcement
from app.models.campaign import Campaign, DeliveryLog
from app.services.template_service import template_service
from app.services.campaign_service import campaign_service
from app.workers.worker_pool import worker_pool
from app.core.logging import logger

class SchedulerService:
    def __init__(self):
        self.scheduler = AsyncIOScheduler()

    def start(self):
        # Scan for reminders every 60 seconds
        self.scheduler.add_job(
            self.check_and_dispatch_exam_reminders,
            "interval",
            seconds=60,
            id="exam_reminders_scanner",
            replace_existing=True
        )
        # Scan for scheduled announcements every 30 seconds
        self.scheduler.add_job(
            self.check_and_dispatch_scheduled_announcements,
            "interval",
            seconds=30,
            id="announcements_scanner",
            replace_existing=True
        )
        self.scheduler.start()
        logger.info("APScheduler initialized and running.")

    def shutdown(self):
        self.scheduler.shutdown(wait=False)

    @classmethod
    def check_and_dispatch_exam_reminders(cls):
        """
        Scans all exams and fires reminders at 7 days, 1 day, and 2 hours offsets.
        Enforces idempotency using ExamReminderLog.
        """
        db = SyncSessionLocal()
        try:
            now = datetime.now(timezone.utc)
            # Find exams in future
            exams = db.scalars(select(Exam).where(Exam.date_time > now)).all()

            for exam in exams:
                exam_dt = exam.date_time
                if exam_dt.tzinfo is None:
                    exam_dt = exam_dt.replace(tzinfo=timezone.utc)
                    
                time_diff = exam_dt - now
                diff_seconds = time_diff.total_seconds()

                # Determine which offset window applies
                applicable_reminder = None
                # 7 days window (6.9 to 7.1 days)
                if 7 * 86400 - 3600 <= diff_seconds <= 7 * 86400 + 3600:
                    applicable_reminder = "7_DAYS"
                # 1 day window (23 to 25 hours)
                elif 24 * 3600 - 3600 <= diff_seconds <= 24 * 3600 + 3600:
                    applicable_reminder = "1_DAY"
                # 2 hours window (1h45m to 2h15m)
                elif 2 * 3600 - 900 <= diff_seconds <= 2 * 3600 + 900:
                    applicable_reminder = "2_HOURS"

                if not applicable_reminder:
                    continue

                # Target students for this exam
                query = select(Student)
                if exam.department and exam.department.upper() != "ALL":
                    query = query.where(Student.department == exam.department)
                if exam.year and exam.year > 0:
                    query = query.where(Student.year == exam.year)
                    
                students = db.scalars(query).all()
                if not students:
                    continue

                pending_recipients = []
                for student in students:
                    # Idempotency check: has reminder already been sent for (student, exam, reminder_type)?
                    already_sent = db.scalar(
                        select(ExamReminderLog).where(
                            and_(
                                ExamReminderLog.student_id == student.id,
                                ExamReminderLog.exam_id == exam.id,
                                ExamReminderLog.reminder_type == applicable_reminder
                            )
                        )
                    )
                    if already_sent:
                        continue

                    # Record reminder log to lock out duplicate dispatch
                    rem_log = ExamReminderLog(
                        student_id=student.id,
                        exam_id=exam.id,
                        reminder_type=applicable_reminder
                    )
                    db.add(rem_log)
                    db.flush()

                    subject, html, txt = template_service.render_exam_reminder(
                        exam, applicable_reminder, student.name, student.email
                    )
                    pending_recipients.append({
                        "email": student.email,
                        "name": student.name,
                        "subject": subject,
                        "html_content": html,
                        "text_content": txt
                    })

                if pending_recipients:
                    campaign = Campaign(
                        name=f"Reminder ({applicable_reminder}): {exam.course_code}",
                        type="exam_reminder",
                        total_recipients=len(pending_recipients),
                        status="queued"
                    )
                    db.add(campaign)
                    db.flush()

                    for r in pending_recipients:
                        log = DeliveryLog(
                            campaign_id=campaign.id,
                            recipient_email=r["email"],
                            recipient_name=r["name"],
                            subject=r["subject"],
                            status="queued"
                        )
                        db.add(log)
                        db.flush()
                        r["log_id"] = log.id

                    db.commit()
                    worker_pool.submit(campaign_service.execute_campaign_sync, campaign.id, pending_recipients)
                else:
                    db.commit()

        except Exception as e:
            logger.error(f"Error in exam reminders scanner: {e}")
            db.rollback()
        finally:
            db.close()

    @classmethod
    def check_and_dispatch_scheduled_announcements(cls):
        """
        Scans scheduled announcements that are due for release.
        """
        db = SyncSessionLocal()
        try:
            now = datetime.now(timezone.utc)
            announcements = db.scalars(
                select(Announcement).where(
                    and_(
                        Announcement.status == "scheduled",
                        Announcement.scheduled_at <= now
                    )
                )
            ).all()

            for a in announcements:
                campaign_service.send_announcement(a)

        except Exception as e:
            logger.error(f"Error checking scheduled announcements: {e}")
        finally:
            db.close()

scheduler_service = SchedulerService()
