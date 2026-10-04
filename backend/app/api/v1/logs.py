import io
import csv
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db, SyncSessionLocal
from app.models.campaign import DeliveryLog, Campaign
from app.models.user import User
from app.schemas.campaign import DeliveryLogResponse, RetryFailedRequest
from app.api.deps import get_current_admin
from app.services.email_service import email_service, EmailRecipient
from app.services.campaign_service import campaign_service
from app.workers.worker_pool import worker_pool

router = APIRouter(prefix="/logs", tags=["Logs"])

@router.get("", response_model=dict)
async def list_delivery_logs(
    campaign_id: Optional[int] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=500),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(DeliveryLog)
    if campaign_id:
        query = query.where(DeliveryLog.campaign_id == campaign_id)
    if status:
        query = query.where(DeliveryLog.status == status)
    if search:
        s = f"%{search.strip()}%"
        query = query.where(
            or_(
                DeliveryLog.recipient_email.ilike(s),
                DeliveryLog.recipient_name.ilike(s),
                DeliveryLog.subject.ilike(s)
            )
        )

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(DeliveryLog.id.desc()).offset((page - 1) * limit).limit(limit)
    logs = (await db.execute(query)).scalars().all()

    return {
        "items": [DeliveryLogResponse.model_validate(l) for l in logs],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.post("/retry-failed")
async def retry_failed_logs(
    payload: RetryFailedRequest,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(DeliveryLog).where(DeliveryLog.status == "failed")
    if payload.campaign_id:
        query = query.where(DeliveryLog.campaign_id == payload.campaign_id)
    if payload.log_ids:
        query = query.where(DeliveryLog.id.in_(payload.log_ids))

    failed_logs = (await db.execute(query)).scalars().all()
    if not failed_logs:
        return {"success": True, "message": "No failed delivery logs found matching criteria", "retried_count": 0}

    # Mark them retrying
    for log in failed_logs:
        log.status = "retrying"
    await db.commit()

    # Re-dispatch failed logs synchronously or through worker pool
    def run_retry():
        s_db = SyncSessionLocal()
        try:
            host, port, security, username, password, sender_name, sender_email = campaign_service.get_smtp_credentials(s_db)
            recipients = [
                EmailRecipient(
                    email=l.recipient_email,
                    name=l.recipient_name,
                    subject=l.subject,
                    html_content=f"<p>{l.subject}</p>",
                    text_content=l.subject,
                    log_id=l.id
                )
                for l in failed_logs
            ]
            results = email_service.send_batch_with_connection_reuse(
                recipients=recipients,
                host=host,
                port=port,
                security=security,
                username=username,
                password=password,
                sender_name=sender_name,
                sender_email=sender_email
            )
            for res, item in zip(results, recipients):
                log_row = s_db.get(DeliveryLog, item.log_id)
                if log_row:
                    log_row.status = res.status
                    log_row.error_message = res.error_message
                    log_row.retry_count += 1
                    log_row.latency_ms = res.latency_ms
            s_db.commit()
        finally:
            s_db.close()

    worker_pool.submit(run_retry)

    return {
        "success": True,
        "message": f"Queued {len(failed_logs)} failed recipient(s) for retry",
        "retried_count": len(failed_logs)
    }

@router.get("/export/csv")
async def export_logs_csv(
    campaign_id: Optional[int] = None,
    status: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(DeliveryLog)
    if campaign_id:
        query = query.where(DeliveryLog.campaign_id == campaign_id)
    if status:
        query = query.where(DeliveryLog.status == status)

    res = await db.execute(query.order_by(DeliveryLog.id.desc()).limit(10000))
    logs = res.scalars().all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["id", "campaign_id", "recipient_email", "recipient_name", "subject", "status", "retry_count", "latency_ms", "sent_at", "error_message"])
    for l in logs:
        writer.writerow([
            l.id,
            l.campaign_id or "",
            l.recipient_email,
            l.recipient_name,
            l.subject,
            l.status,
            l.retry_count,
            round(l.latency_ms, 2),
            l.sent_at.isoformat() if l.sent_at else "",
            l.error_message or ""
        ])

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=delivery_logs.csv"}
    )
