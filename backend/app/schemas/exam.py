from pydantic import BaseModel, field_validator
from typing import Optional, List
from datetime import datetime
from app.core.security import sanitize_header_value

class ExamBase(BaseModel):
    course_name: str
    course_code: str
    date_time: datetime
    venue: str
    duration_minutes: int = 180
    department: str = "ALL" # CS, ECE, or ALL
    year: int = 0 # 1, 2, 3, 4, or 0 (ALL)
    instructions: Optional[str] = "Bring College ID Card and Calculator."

    @field_validator("course_name", "course_code", "venue")
    @classmethod
    def prevent_header_injection(cls, v: str) -> str:
        return sanitize_header_value(v)

class ExamCreate(ExamBase):
    pass

class ExamUpdate(BaseModel):
    course_name: Optional[str] = None
    course_code: Optional[str] = None
    date_time: Optional[datetime] = None
    venue: Optional[str] = None
    duration_minutes: Optional[int] = None
    department: Optional[str] = None
    year: Optional[int] = None
    instructions: Optional[str] = None

class ExamResponse(ExamBase):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

class SendScheduleRequest(BaseModel):
    exam_id: int
    custom_message: Optional[str] = None
