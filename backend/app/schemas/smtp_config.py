from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.core.security import sanitize_header_value

class SMTPConfigUpdate(BaseModel):
    host: str
    port: int
    security: str # none | starttls | ssl
    username: Optional[str] = ""
    password: Optional[str] = None # None means keep unchanged
    sender_name: str
    sender_email: EmailStr

    @field_validator("sender_name")
    @classmethod
    def prevent_header_injection(cls, v: str) -> str:
        return sanitize_header_value(v)

class SMTPConfigResponse(BaseModel):
    id: int
    host: str
    port: int
    security: str
    username: str
    password_set: bool
    sender_name: str
    sender_email: str
    is_active: bool
    updated_at: datetime

    class Config:
        from_attributes = True

class TestConnectionRequest(BaseModel):
    host: Optional[str] = None
    port: Optional[int] = None
    security: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    test_recipient: Optional[EmailStr] = None

class TestConnectionResponse(BaseModel):
    success: bool
    message: str
    latency_ms: float
    transcript: List[dict]

class TestLabGenerateRequest(BaseModel):
    count: int = 50 # 10 | 50 | 200 | 1000
    department: Optional[str] = "CS"
    year: Optional[int] = 3

class TestLabRunRequest(BaseModel):
    run_name: str
    recipient_count: int = 50
    batch_size: int = 25
    reuse_connection: bool = True
    simulate_failure_rate: float = 0.0 # 0.0 to 1.0 (e.g. 0.05 for 5% fake invalid addresses/timeouts)
    simulate_slow_ms: int = 0

class TestRunResponse(BaseModel):
    id: int
    run_name: str
    recipient_count: int
    batch_size: int
    reuse_connection: bool
    simulate_failure_rate: float
    total_time_ms: float
    throughput_eps: float
    avg_latency_ms: float
    success_count: int
    fail_count: int
    retry_count: int
    created_at: datetime

    class Config:
        from_attributes = True

class AnalyticsOverview(BaseModel):
    total_students: int
    subscribed_students: int
    total_exams: int
    emails_sent_today: int
    total_sent: int
    total_failed: int
    overall_success_rate: float
    upcoming_exams_count: int
    recent_sends_chart: List[dict] # {date: "2026-10-04", sent: 120, failed: 2}
    department_distribution: List[dict]
