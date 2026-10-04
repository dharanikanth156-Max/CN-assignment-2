import time
from datetime import datetime, timezone
from typing import List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import select

from app.db.session import SyncSessionLocal
from app.models.campaign import Campaign, DeliveryLog
from app.models.student import Student
from app.models.smtp_config import SMTPConfig
from app.services.email_service import email_service, EmailRecipient, SendResult
from app.services.template_service import template_service
from app.core.security import decrypt_secret
from app.core.logging import logger
from app.workers.worker_pool import worker_pool

class CampaignService:
    @staticmethod
    def get_smtp_credentials(db: Session) -> tuple[str, int, str, str, str, str, str]:
        config = db.scalar(select(SMTPConfig).where(SMTPConfig.is_active == True))
        if config:
            password = decrypt_secret(config.encrypted_password) if config.encrypted_password else ""
            return (
                config.host,
                config.port,
                config.security,
                config.username,
                password,
                config.sender_name,
                config.sender_email
            )
        return (
            "127.0.0.1",
            1025,
            "none",
            "",
            "",
            "Apex University Academic Office",
            "notifications@apex.edu"
        )

    @classmethod
    def execute_campaign_sync(cls, campaign_id: int, recipients_data: List[dict], simulate_failure_rate: float = 0.0):
        """
        Runs in background worker thread.
        Uses connection reuse for batches and updates DeliveryLog + Campaign metrics.
        """
        db = SyncSessionLocal()
        try:
            campaign = db.get(Campaign, campaign_id)
            if not campaign:
                return

            campaign.status = "in_progress"
            campaign.started_at = datetime.now(timezone.utc)
            db.commit()

            host, port, security, username, password, sender_name, sender_email = cls.get_smtp_credentials(db)

            # Map recipient items to EmailRecipient objects
            recipients = [
                EmailRecipient(
                    email=r["email"],
                    name=r["name"],
                    subject=r["subject"],
                    html_content=r["html_content"],
                    text_content=r["text_content"],
                    log_id=r.get("log_id")
                )
                for r in recipients_data
            ]

            batch_size = 25
            total = len(recipients)
            sent_count = 0
            fail_count = 0
            retry_count = 0
            latencies = []

            start_perf = time.time()

            # Process in batches with connection reuse
            for i in range(0, total, batch_size):
                chunk = recipients[i:i + batch_size]
                results = email_service.send_batch_with_connection_reuse(
                    recipients=chunk,
                    host=host,
                    port=port,
                    security=security,
                    username=username,
                    password=password,
                    sender_name=sender_name,
                    sender_email=sender_email,
                    simulate_failure_rate=simulate_failure_rate
                )

                # Update database for this chunk
                for res, item in zip(results, chunk):
                    if item.log_id:
                        log_entry = db.get(DeliveryLog, item.log_id)
                        if log_entry:
                            log_entry.status = res.status
                            log_entry.retry_count = res.retry_count
                            log_entry.error_message = res.error_message
                            log_entry.latency_ms = res.latency_ms
                            log_entry.sent_at = datetime.now(timezone.utc) if res.success else None

                    if res.success:
                        sent_count += 1
                    else:
                        fail_count += 1
                    retry_count += res.retry_count
                    latencies.append(res.latency_ms)

                campaign.sent_count = sent_count
                campaign.failed_count = fail_count
                campaign.retry_count = retry_count
                db.commit()

            end_perf = time.time()
            total_duration_ms = (end_perf - start_perf) * 1000.0
            avg_lat = sum(latencies) / len(latencies) if latencies else 0.0
            throughput = (sent_count / (total_duration_ms / 1000.0)) if total_duration_ms > 0 else 0.0

            campaign.completed_at = datetime.now(timezone.utc)
            campaign.status = "completed" if fail_count == 0 else ("partial" if sent_count > 0 else "failed")
            campaign.duration_ms = round(total_duration_ms, 2)
            campaign.avg_latency_ms = round(avg_lat, 2)
            campaign.throughput_eps = round(throughput, 2)
            db.commit()

        except Exception as e:
            logger.error(f"Campaign execution failed: {e}")
            if campaign:
                campaign.status = "failed"
                db.commit()
        finally:
            db.close()

    @classmethod
    def send_exam_schedule(cls, exam, custom_message: str = "") -> int:
        db = SyncSessionLocal()
        try:
            # Filter targeted students
            query = select(Student)
            if exam.department and exam.department.upper() != "ALL":
                query = query.where(Student.department == exam.department)
            if exam.year and exam.year > 0:
                query = query.where(Student.year == exam.year)
                
            students = db.scalars(query).all()
            if not students:
                return 0

            campaign = Campaign(
                name=f"Exam Schedule: {exam.course_code} - {exam.course_name}",
                type="exam_schedule",
                total_recipients=len(students),
                status="queued"
            )
            db.add(campaign)
            db.flush()

            recipients_data = []
            for s in students:
                subject, html, txt = template_service.render_exam_schedule(exam, s.name, s.email, custom_message)
                log = DeliveryLog(
                    campaign_id=campaign.id,
                    recipient_email=s.email,
                    recipient_name=s.name,
                    subject=subject,
                    status="queued"
                )
                db.add(log)
                db.flush()
                recipients_data.append({
                    "email": s.email,
                    "name": s.name,
                    "subject": subject,
                    "html_content": html,
                    "text_content": txt,
                    "log_id": log.id
                })

            db.commit()
            campaign_id = campaign.id

            # Dispatch to worker pool
            worker_pool.submit(cls.execute_campaign_sync, campaign_id, recipients_data)
            return campaign_id
        finally:
            db.close()

    @classmethod
    def send_announcement(cls, announcement) -> int:
        db = SyncSessionLocal()
        try:
            query = select(Student)
            if announcement.priority != "urgent":
                # Only subscribed students for non-urgent announcements
                query = query.where(Student.subscribed == True)

            if announcement.target_type == "department" and announcement.target_filter:
                query = query.where(Student.department == announcement.target_filter)
            elif announcement.target_type == "year" and announcement.target_filter:
                try:
                    y = int(announcement.target_filter)
                    query = query.where(Student.year == y)
                except ValueError:
                    pass

            students = db.scalars(query).all()
            if not students:
                announcement.status = "sent"
                db.commit()
                return 0

            campaign = Campaign(
                name=f"Announcement: {announcement.title}",
                type="announcement",
                total_recipients=len(students),
                status="queued"
            )
            db.add(campaign)
            db.flush()

            recipients_data = []
            for s in students:
                subject, html, txt = template_service.render_announcement(announcement, s.name, s.email)
                log = DeliveryLog(
                    campaign_id=campaign.id,
                    recipient_email=s.email,
                    recipient_name=s.name,
                    subject=subject,
                    status="queued"
                )
                db.add(log)
                db.flush()
                recipients_data.append({
                    "email": s.email,
                    "name": s.name,
                    "subject": subject,
                    "html_content": html,
                    "text_content": txt,
                    "log_id": log.id
                })

            announcement.status = "sending"
            db.commit()
            campaign_id = campaign.id

            # Dispatch to worker pool
            worker_pool.submit(cls.execute_campaign_sync, campaign_id, recipients_data)
            return campaign_id
        finally:
            db.close()

campaign_service = CampaignService()
