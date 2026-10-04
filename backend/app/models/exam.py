from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Exam(Base):
    __tablename__ = "exams"

    id = Column(Integer, primary_key=True, index=True)
    course_name = Column(String(255), nullable=False)
    course_code = Column(String(50), index=True, nullable=False)
    date_time = Column(DateTime(timezone=True), nullable=False, index=True) # e.g. 2026-10-10 09:30:00
    venue = Column(String(255), nullable=False) # e.g. Hall A, Science Block
    duration_minutes = Column(Integer, default=180, nullable=False)
    department = Column(String(100), index=True, nullable=False) # e.g. CS or "ALL"
    year = Column(Integer, index=True, nullable=False) # 1, 2, 3, 4, or 0 for ALL
    instructions = Column(String(1000), default="Bring College ID Card and Calculator.", nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    reminders = relationship("ExamReminderLog", back_populates="exam", cascade="all, delete-orphan")

class ExamReminderLog(Base):
    __tablename__ = "exam_reminder_logs"
    __table_args__ = (
        UniqueConstraint("student_id", "exam_id", "reminder_type", name="uq_student_exam_reminder"),
    )

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True)
    exam_id = Column(Integer, ForeignKey("exams.id", ondelete="CASCADE"), nullable=False, index=True)
    reminder_type = Column(String(50), nullable=False) # 7_DAYS, 1_DAY, 2_HOURS
    sent_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    
    exam = relationship("Exam", back_populates="reminders")
    student = relationship("Student")
