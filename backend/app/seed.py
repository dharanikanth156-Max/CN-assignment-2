import sys
import os
from datetime import datetime, timedelta, timezone

# Add parent directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.session import sync_engine, SyncSessionLocal
from app.db.base import Base
from app.models.user import User
from app.models.student import Student
from app.models.exam import Exam
from app.models.announcement import Announcement
from app.models.smtp_config import SMTPConfig
from app.core.security import get_password_hash
from app.core.logging import setup_logging, logger

def seed_database():
    setup_logging()
    logger.info("Setting up database tables...")
    Base.metadata.create_all(bind=sync_engine)

    db = SyncSessionLocal()
    try:
        # 1. Admin User
        admin = db.query(User).filter(User.email == "admin@college.edu").first()
        if not admin:
            admin = User(
                email="admin@college.edu",
                name="Prof. Sarah Jenkins (Dean of Exams)",
                hashed_password=get_password_hash("Admin@123"),
                role="admin",
                is_active=True
            )
            db.add(admin)
            logger.info("Admin user created: admin@college.edu / Admin@123")

        # 2. SMTP Config
        smtp_cfg = db.query(SMTPConfig).first()
        if not smtp_cfg:
            smtp_cfg = SMTPConfig(
                host="127.0.0.1",
                port=1025,
                security="none",
                username="",
                encrypted_password="",
                sender_name="Apex University Academic Office",
                sender_email="notifications@apex.edu",
                is_active=True
            )
            db.add(smtp_cfg)
            logger.info("Default SMTP config initialized pointing to 127.0.0.1:1025")

        # 3. Sample Students
        if db.query(Student).count() == 0:
            sample_students = [
                # Computer Science (Year 4)
                Student(roll_no="CS2023-001", name="Alex Mercer", email="alex.mercer@apex.edu", department="CS", year=4, subscribed=True),
                Student(roll_no="CS2023-002", name="Elena Rostova", email="elena.rostova@apex.edu", department="CS", year=4, subscribed=True),
                Student(roll_no="CS2023-003", name="Liam Chen", email="liam.chen@apex.edu", department="CS", year=4, subscribed=True),
                Student(roll_no="CS2023-004", name="Priya Sharma", email="priya.sharma@apex.edu", department="CS", year=4, subscribed=True),
                Student(roll_no="CS2023-005", name="Marcus Vance", email="marcus.vance@apex.edu", department="CS", year=4, subscribed=True),
                # Computer Science (Year 3)
                Student(roll_no="CS2024-010", name="Zack Taylor", email="zack.taylor@apex.edu", department="CS", year=3, subscribed=True),
                Student(roll_no="CS2024-011", name="Sophia Patel", email="sophia.patel@apex.edu", department="CS", year=3, subscribed=True),
                Student(roll_no="CS2024-012", name="David Kim", email="david.kim@apex.edu", department="CS", year=3, subscribed=True),
                # Electronics & Communication (Year 3)
                Student(roll_no="ECE2024-001", name="Maya Lin", email="maya.lin@apex.edu", department="ECE", year=3, subscribed=True),
                Student(roll_no="ECE2024-002", name="Rohan Iyer", email="rohan.iyer@apex.edu", department="ECE", year=3, subscribed=True),
                Student(roll_no="ECE2024-003", name="Tanya Gomez", email="tanya.gomez@apex.edu", department="ECE", year=3, subscribed=True),
                # Mechanical Engineering (Year 2)
                Student(roll_no="MECH2025-001", name="Lucas Scott", email="lucas.scott@apex.edu", department="MECH", year=2, subscribed=True),
                Student(roll_no="MECH2025-002", name="Ananya Gupta", email="ananya.gupta@apex.edu", department="MECH", year=2, subscribed=True),
                Student(roll_no="MECH2025-003", name="Jordan Miller", email="jordan.miller@apex.edu", department="MECH", year=2, subscribed=False),
                # MBA (Year 1)
                Student(roll_no="MBA2026-001", name="Vikram Reddy", email="vikram.reddy@apex.edu", department="MBA", year=1, subscribed=True),
                Student(roll_no="MBA2026-002", name="Chloe Dubois", email="chloe.dubois@apex.edu", department="MBA", year=1, subscribed=True),
            ]
            db.add_all(sample_students)
            logger.info(f"Seeded {len(sample_students)} initial students.")

        # 4. Sample Exams
        if db.query(Exam).count() == 0:
            now = datetime.now(timezone.utc)
            sample_exams = [
                Exam(
                    course_name="Distributed Systems & Cloud Architecture",
                    course_code="CS401",
                    date_time=now + timedelta(days=7, hours=2), # ~7 days offset for reminder testing
                    venue="Auditorium Hall A, Tech Block",
                    duration_minutes=180,
                    department="CS",
                    year=4,
                    instructions="Scientific calculator and physical Hall Ticket required. No mobile devices."
                ),
                Exam(
                    course_name="Digital Signal Processing",
                    course_code="ECE302",
                    date_time=now + timedelta(days=1, hours=1), # ~1 day offset for reminder testing
                    venue="Seminar Hall 2, Electronics Block",
                    duration_minutes=180,
                    department="ECE",
                    year=3,
                    instructions="Graph sheets will be provided in the hall."
                ),
                Exam(
                    course_name="Thermodynamics & Heat Transfer",
                    course_code="MECH201",
                    date_time=now + timedelta(hours=2, minutes=5), # ~2 hours offset for urgent reminder testing
                    venue="Mechanical Design Center, Hall B",
                    duration_minutes=120,
                    department="MECH",
                    year=2,
                    instructions="Steam tables and standard charts permitted."
                ),
                Exam(
                    course_name="Database Management Systems",
                    course_code="CS304",
                    date_time=now + timedelta(days=12),
                    venue="Main Examination Hall 1",
                    duration_minutes=180,
                    department="CS",
                    year=3,
                    instructions="Bring Blue/Black ballpoint pens only."
                )
            ]
            db.add_all(sample_exams)
            logger.info(f"Seeded {len(sample_exams)} sample exams.")

        # 5. Sample Announcements
        if db.query(Announcement).count() == 0:
            sample_announcements = [
                Announcement(
                    title="End-Semester Hall Tickets Download Window Open",
                    body_html="<p>All students are advised to download and print their <strong>End-Semester Hall Tickets</strong> from the student portal before Friday. Verified physical hall tickets are strictly required for entry into examination centers.</p>",
                    body_text="All students are advised to download and print their End-Semester Hall Tickets from the student portal before Friday. Verified physical hall tickets are strictly required for entry into examination centers.",
                    priority="urgent",
                    target_type="all",
                    target_filter=None,
                    status="sent"
                ),
                Announcement(
                    title="Special Guest Lecture: High-Throughput SMTP Systems in Cloud Computing",
                    body_html="<p>The Department of Computer Science invites all 3rd and 4th year students to a technical masterclass on <em>Designing Fault-Tolerant High-Throughput Email Delivery Engines</em> by our alumni engineering team.</p>",
                    body_text="The Department of Computer Science invites all 3rd and 4th year students to a technical masterclass on Designing Fault-Tolerant High-Throughput Email Delivery Engines by our alumni engineering team.",
                    priority="normal",
                    target_type="department",
                    target_filter="CS",
                    status="draft"
                )
            ]
            db.add_all(sample_announcements)
            logger.info(f"Seeded sample announcements.")

        db.commit()
        print("\n" + "="*60)
        print("DATABASE INITIALIZED & SEEDED SUCCESSFULLY!")
        print("Admin Login Credentials:")
        print("  Email:    admin@college.edu")
        print("  Password: Admin@123")
        print("="*60 + "\n")
    except Exception as e:
        db.rollback()
        logger.error(f"Error seeding database: {e}")
        raise
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
