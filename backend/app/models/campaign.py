from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class Campaign(Base):
    __tablename__ = "campaigns"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    type = Column(String(50), nullable=False) # exam_schedule | exam_reminder | announcement | test_batch
    status = Column(String(50), default="queued", nullable=False) # queued | in_progress | completed | failed
    total_recipients = Column(Integer, default=0, nullable=False)
    sent_count = Column(Integer, default=0, nullable=False)
    failed_count = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    started_at = Column(DateTime(timezone=True), nullable=True)
    completed_at = Column(DateTime(timezone=True), nullable=True)
    duration_ms = Column(Float, default=0.0, nullable=False)
    avg_latency_ms = Column(Float, default=0.0, nullable=False)
    throughput_eps = Column(Float, default=0.0, nullable=False) # Emails per second
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    logs = relationship("DeliveryLog", back_populates="campaign", cascade="all, delete-orphan")

class DeliveryLog(Base):
    __tablename__ = "delivery_logs"

    id = Column(Integer, primary_key=True, index=True)
    campaign_id = Column(Integer, ForeignKey("campaigns.id", ondelete="CASCADE"), nullable=True, index=True)
    recipient_email = Column(String(255), index=True, nullable=False)
    recipient_name = Column(String(255), nullable=False)
    subject = Column(String(255), nullable=False)
    status = Column(String(50), default="queued", nullable=False) # queued | sending | sent | failed | retrying
    retry_count = Column(Integer, default=0, nullable=False)
    error_message = Column(Text, nullable=True)
    latency_ms = Column(Float, default=0.0, nullable=False)
    sent_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)

    campaign = relationship("Campaign", back_populates="logs")
