from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class CampaignResponse(BaseModel):
    id: int
    name: str
    type: str
    status: str
    total_recipients: int
    sent_count: int
    failed_count: int
    retry_count: int
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    duration_ms: float
    avg_latency_ms: float
    throughput_eps: float
    created_at: datetime

    class Config:
        from_attributes = True

class DeliveryLogResponse(BaseModel):
    id: int
    campaign_id: Optional[int]
    recipient_email: str
    recipient_name: str
    subject: str
    status: str
    retry_count: int
    error_message: Optional[str]
    latency_ms: float
    sent_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

class RetryFailedRequest(BaseModel):
    campaign_id: Optional[int] = None
    log_ids: Optional[List[int]] = None
