from typing import Optional
from datetime import datetime, timezone
import bleach
from fastapi import APIRouter, Depends, HTTPException, status, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models.announcement import Announcement
from app.models.user import User
from app.models.smtp_config import AuditLog
from app.schemas.announcement import AnnouncementCreate, AnnouncementUpdate, AnnouncementResponse
from app.services.campaign_service import campaign_service
from app.api.deps import get_current_admin

router = APIRouter(prefix="/announcements", tags=["Announcements"])

def html_to_plain_text(html_str: str) -> str:
    cleaned = bleach.clean(html_str, tags=[], strip=True)
    return " ".join(cleaned.split())

@router.get("", response_model=dict)
async def list_announcements(
    search: Optional[str] = None,
    priority: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(Announcement)
    if search:
        s_term = f"%{search.strip()}%"
        query = query.where(Announcement.title.ilike(s_term))
    if priority:
        query = query.where(Announcement.priority == priority)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Announcement.id.desc()).offset((page - 1) * limit).limit(limit)
    announcements = (await db.execute(query)).scalars().all()

    return {
        "items": [AnnouncementResponse.model_validate(a) for a in announcements],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.post("", response_model=AnnouncementResponse, status_code=status.HTTP_201_CREATED)
async def create_announcement(
    payload: AnnouncementCreate,
    send_immediately: bool = False,
    request: Request = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    body_text = html_to_plain_text(payload.body_html)
    
    status_val = "draft"
    if payload.scheduled_at and payload.scheduled_at > datetime.now(timezone.utc):
        status_val = "scheduled"
        
    announcement = Announcement(
        title=payload.title,
        body_html=payload.body_html,
        body_text=body_text,
        priority=payload.priority,
        target_type=payload.target_type,
        target_filter=payload.target_filter,
        scheduled_at=payload.scheduled_at,
        status=status_val
    )
    db.add(announcement)
    
    client_ip = request.client.host if request and request.client else "unknown"
    audit = AuditLog(
        user_email=admin.email,
        action="CREATE_ANNOUNCEMENT",
        target_resource=payload.title,
        details=f"Created announcement '{payload.title}' (Priority: {payload.priority})",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()
    await db.refresh(announcement)

    if send_immediately or (not payload.scheduled_at):
        campaign_service.send_announcement(announcement)

    return announcement

@router.post("/{announcement_id}/send-now")
async def send_announcement_now(
    announcement_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    announcement = await db.get(Announcement, announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")

    campaign_id = campaign_service.send_announcement(announcement)
    
    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_email=admin.email,
        action="SEND_ANNOUNCEMENT",
        target_resource=announcement.title,
        details=f"Dispatched announcement campaign #{campaign_id} for '{announcement.title}'",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()

    return {
        "success": True,
        "message": f"Announcement campaign #{campaign_id} dispatched to workers",
        "campaign_id": campaign_id
    }

@router.delete("/{announcement_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_announcement(
    announcement_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    announcement = await db.get(Announcement, announcement_id)
    if not announcement:
        raise HTTPException(status_code=404, detail="Announcement not found")
    await db.delete(announcement)
    await db.commit()
