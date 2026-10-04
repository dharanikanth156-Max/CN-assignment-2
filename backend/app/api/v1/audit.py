from typing import Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.smtp_config import AuditLog
from app.models.user import User
from app.api.deps import get_current_admin

router = APIRouter(prefix="/audit", tags=["Audit"])

@router.get("")
async def list_audit_logs(
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    count_query = select(func.count(AuditLog.id))
    total = (await db.execute(count_query)).scalar_one()

    query = select(AuditLog).order_by(AuditLog.id.desc()).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(query)).scalars().all()

    return {
        "items": [
            {
                "id": l.id,
                "user_email": l.user_email,
                "action": l.action,
                "target_resource": l.target_resource,
                "details": l.details,
                "ip_address": l.ip_address,
                "timestamp": l.timestamp.isoformat() if l.timestamp else ""
            }
            for l in logs
        ],
        "total": total,
        "page": page,
        "limit": limit
    }
