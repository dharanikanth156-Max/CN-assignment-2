from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Announcement(Base):
    __tablename__ = "announcements"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    body_html = Column(Text, nullable=False)
    body_text = Column(Text, nullable=False)
    priority = Column(String(50), default="normal", nullable=False) # normal | urgent
    target_type = Column(String(50), default="all", nullable=False) # all | department | year | custom
    target_filter = Column(String(255), nullable=True) # e.g. "CS" or "2" or comma list
    scheduled_at = Column(DateTime(timezone=True), nullable=True)
    status = Column(String(50), default="draft", nullable=False) # draft | scheduled | sending | sent | failed
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
