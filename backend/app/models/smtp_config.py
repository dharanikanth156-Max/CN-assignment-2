from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Boolean, DateTime, Float, Text
from app.db.base import Base

def utc_now():
    return datetime.now(timezone.utc)

class SMTPConfig(Base):
    __tablename__ = "smtp_configs"

    id = Column(Integer, primary_key=True, index=True)
    host = Column(String(255), default="127.0.0.1", nullable=False)
    port = Column(Integer, default=1025, nullable=False)
    security = Column(String(50), default="none", nullable=False) # none | starttls | ssl
    username = Column(String(255), default="", nullable=False)
    encrypted_password = Column(Text, default="", nullable=False)
    sender_name = Column(String(255), default="Apex University Academic Office", nullable=False)
    sender_email = Column(String(255), default="notifications@apex.edu", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), nullable=False)
    action = Column(String(100), nullable=False) # e.g. SEND_SCHEDULE, BULK_IMPORT, UPDATE_SMTP
    target_resource = Column(String(255), nullable=True)
    details = Column(Text, nullable=True)
    ip_address = Column(String(100), nullable=True)
    timestamp = Column(DateTime(timezone=True), default=utc_now, nullable=False)

class TestRun(Base):
    __tablename__ = "test_runs"

    id = Column(Integer, primary_key=True, index=True)
    run_name = Column(String(255), nullable=False)
    recipient_count = Column(Integer, nullable=False)
    batch_size = Column(Integer, default=25, nullable=False)
    reuse_connection = Column(Boolean, default=True, nullable=False)
    simulate_failure_rate = Column(Float, default=0.0, nullable=False) # 0.0 to 1.0
    total_time_ms = Column(Float, default=0.0, nullable=False)
    throughput_eps = Column(Float, default=0.0, nullable=False)
    avg_latency_ms = Column(Float, default=0.0, nullable=False)
    success_count = Column(Integer, default=0, nullable=False)
    fail_count = Column(Integer, default=0, nullable=False)
    retry_count = Column(Integer, default=0, nullable=False)
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
