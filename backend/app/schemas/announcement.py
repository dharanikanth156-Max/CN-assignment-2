from pydantic import BaseModel, field_validator
from typing import Optional
from datetime import datetime
from app.core.security import sanitize_header_value, sanitize_html_content

class AnnouncementBase(BaseModel):
    title: str
    body_html: str
    priority: str = "normal" # normal | urgent
    target_type: str = "all" # all | department | year | custom
    target_filter: Optional[str] = None # e.g. "CS" or "2"
    scheduled_at: Optional[datetime] = None

    @field_validator("title")
    @classmethod
    def prevent_header_injection(cls, v: str) -> str:
        return sanitize_header_value(v)

    @field_validator("body_html")
    @classmethod
    def sanitize_body(cls, v: str) -> str:
        return sanitize_html_content(v)

class AnnouncementCreate(AnnouncementBase):
    pass

class AnnouncementUpdate(BaseModel):
    title: Optional[str] = None
    body_html: Optional[str] = None
    priority: Optional[str] = None
    target_type: Optional[str] = None
    target_filter: Optional[str] = None
    scheduled_at: Optional[datetime] = None
    status: Optional[str] = None

class AnnouncementResponse(AnnouncementBase):
    id: int
    body_text: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class SendAnnouncementRequest(BaseModel):
    announcement_id: int
