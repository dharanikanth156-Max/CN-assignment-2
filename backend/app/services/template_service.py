import os
from datetime import datetime
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.core.config import settings
from app.core.security import generate_unsubscribe_token

TEMPLATES_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "templates", "email")

jinja_env = Environment(
    loader=FileSystemLoader(TEMPLATES_DIR),
    autoescape=select_autoescape(["html", "xml"]),
    trim_blocks=True,
    lstrip_blocks=True
)

class TemplateService:
    @staticmethod
    def format_date(dt: datetime) -> str:
        if not dt:
            return ""
        return dt.strftime("%A, %B %d, %Y")

    @staticmethod
    def format_time(dt: datetime) -> str:
        if not dt:
            return ""
        return dt.strftime("%I:%M %p")

    @classmethod
    def render_exam_schedule(cls, exam, student_name: str, student_email: str, custom_message: str = "") -> tuple[str, str, str]:
        subject = f"Official Exam Schedule: {exam.course_code} - {exam.course_name}"
        unsub_token = generate_unsubscribe_token(student_email)
        unsub_url = f"{settings.FRONTEND_URL}/unsubscribe?token={unsub_token}"
        
        ctx = {
            "subject": subject,
            "exam": exam,
            "student_name": student_name,
            "student_email": student_email,
            "exam_formatted_date": cls.format_date(exam.date_time),
            "exam_formatted_time": cls.format_time(exam.date_time),
            "custom_message": custom_message,
            "is_mandatory": True, # Exam schedules are mandatory
            "unsubscribe_url": unsub_url,
        }
        
        html_tmpl = jinja_env.get_template("exam_schedule.html")
        txt_tmpl = jinja_env.get_template("exam_schedule.txt")
        
        return subject, html_tmpl.render(ctx), txt_tmpl.render(ctx)

    @classmethod
    def render_exam_reminder(cls, exam, reminder_type: str, student_name: str, student_email: str) -> tuple[str, str, str]:
        type_labels = {
            "7_DAYS": "Upcoming Exam in 7 Days",
            "1_DAY": "URGENT: Exam Tomorrow",
            "2_HOURS": "FINAL NOTICE: Exam in 2 Hours",
        }
        label = type_labels.get(reminder_type, "Exam Reminder")
        subject = f"[{label}] {exam.course_code} - {exam.course_name}"
        unsub_token = generate_unsubscribe_token(student_email)
        unsub_url = f"{settings.FRONTEND_URL}/unsubscribe?token={unsub_token}"
        
        ctx = {
            "subject": subject,
            "exam": exam,
            "reminder_type": reminder_type,
            "student_name": student_name,
            "student_email": student_email,
            "exam_formatted_date": cls.format_date(exam.date_time),
            "exam_formatted_time": cls.format_time(exam.date_time),
            "is_mandatory": True,
            "unsubscribe_url": unsub_url,
        }
        
        html_tmpl = jinja_env.get_template("exam_reminder.html")
        txt_tmpl = jinja_env.get_template("exam_reminder.txt")
        
        return subject, html_tmpl.render(ctx), txt_tmpl.render(ctx)

    @classmethod
    def render_announcement(cls, announcement, student_name: str, student_email: str) -> tuple[str, str, str]:
        prefix = "🚨 [URGENT] " if announcement.priority == "urgent" else "📢 "
        subject = f"{prefix}{announcement.title}"
        unsub_token = generate_unsubscribe_token(student_email)
        unsub_url = f"{settings.FRONTEND_URL}/unsubscribe?token={unsub_token}"
        is_mandatory = (announcement.priority == "urgent")
        
        target_display = "All Students"
        if announcement.target_type == "department":
            target_display = f"Department of {announcement.target_filter}"
        elif announcement.target_type == "year":
            target_display = f"Year {announcement.target_filter} Students"
            
        ctx = {
            "subject": subject,
            "announcement": announcement,
            "target_display": target_display,
            "student_name": student_name,
            "student_email": student_email,
            "is_mandatory": is_mandatory,
            "unsubscribe_url": unsub_url,
        }
        
        html_tmpl = jinja_env.get_template("announcement.html")
        txt_tmpl = jinja_env.get_template("announcement.txt")
        
        return subject, html_tmpl.render(ctx), txt_tmpl.render(ctx)

template_service = TemplateService()
