import pytest
import os
import sys
from datetime import datetime, timezone
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
from app.models.student import Student
from app.models.exam import Exam, ExamReminderLog

@pytest.fixture
def in_memory_db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    Session = sessionmaker(bind=engine)
    session = Session()
    yield session
    session.close()

def test_reminder_unique_constraint_idempotency(in_memory_db):
    session = in_memory_db
    
    student = Student(roll_no="CS101", name="Alice", email="alice@apex.edu", department="CS", year=4)
    exam = Exam(course_name="Algorithms", course_code="CS401", date_time=datetime.now(timezone.utc), venue="Hall A", department="CS", year=4)
    session.add(student)
    session.add(exam)
    session.commit()

    # First reminder entry
    rem1 = ExamReminderLog(student_id=student.id, exam_id=exam.id, reminder_type="7_DAYS")
    session.add(rem1)
    session.commit()

    # Duplicate attempt with same (student, exam, reminder_type) MUST raise IntegrityError
    rem2 = ExamReminderLog(student_id=student.id, exam_id=exam.id, reminder_type="7_DAYS")
    session.add(rem2)
    with pytest.raises(Exception):
        session.commit()
    session.rollback()

    # Different reminder_type for same student+exam is allowed
    rem3 = ExamReminderLog(student_id=student.id, exam_id=exam.id, reminder_type="1_DAY")
    session.add(rem3)
    session.commit()
    assert rem3.id is not None
