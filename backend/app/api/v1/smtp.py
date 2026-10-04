import json
import asyncio
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import httpx

from app.db.session import get_db, SyncSessionLocal
from app.models.smtp_config import SMTPConfig, AuditLog
from app.models.user import User
from app.schemas.smtp_config import SMTPConfigResponse, SMTPConfigUpdate, TestConnectionRequest, TestConnectionResponse
from app.core.security import encrypt_secret, decrypt_secret
from app.services.smtp_inspector_service import smtp_inspector_service
from app.services.campaign_service import campaign_service
from app.api.deps import get_current_admin
from app.core.config import settings

router = APIRouter(prefix="/smtp", tags=["SMTP"])

@router.get("/config", response_model=SMTPConfigResponse)
async def get_smtp_config(
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    config = (await db.execute(select(SMTPConfig).where(SMTPConfig.is_active == True))).scalar_one_or_none()
    if not config:
        # Create default config pointing to local mailpit / mock smtpd
        config = SMTPConfig(
            host=settings.DEFAULT_SMTP_HOST,
            port=settings.DEFAULT_SMTP_PORT,
            security=settings.DEFAULT_SMTP_SECURITY,
            username=settings.DEFAULT_SMTP_USER,
            encrypted_password="",
            sender_name=settings.DEFAULT_SENDER_NAME,
            sender_email=settings.DEFAULT_SENDER_EMAIL,
            is_active=True
        )
        db.add(config)
        await db.commit()
        await db.refresh(config)

    return SMTPConfigResponse(
        id=config.id,
        host=config.host,
        port=config.port,
        security=config.security,
        username=config.username,
        password_set=bool(config.encrypted_password),
        sender_name=config.sender_name,
        sender_email=config.sender_email,
        is_active=config.is_active,
        updated_at=config.updated_at
    )

@router.put("/config", response_model=SMTPConfigResponse)
async def update_smtp_config(
    payload: SMTPConfigUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    config = (await db.execute(select(SMTPConfig).where(SMTPConfig.is_active == True))).scalar_one_or_none()
    if not config:
        config = SMTPConfig()
        db.add(config)

    config.host = payload.host
    config.port = payload.port
    config.security = payload.security
    config.username = payload.username or ""
    config.sender_name = payload.sender_name
    config.sender_email = payload.sender_email

    if payload.password is not None and payload.password != "":
        config.encrypted_password = encrypt_secret(payload.password)

    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_email=admin.email,
        action="UPDATE_SMTP_CONFIG",
        target_resource=f"{payload.host}:{payload.port}",
        details=f"Updated SMTP settings. Security: {payload.security}, Host: {payload.host}:{payload.port}",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()
    await db.refresh(config)

    return SMTPConfigResponse(
        id=config.id,
        host=config.host,
        port=config.port,
        security=config.security,
        username=config.username,
        password_set=bool(config.encrypted_password),
        sender_name=config.sender_name,
        sender_email=config.sender_email,
        is_active=config.is_active,
        updated_at=config.updated_at
    )

@router.post("/test-connection", response_model=TestConnectionResponse)
async def test_smtp_connection(
    payload: Optional[TestConnectionRequest] = None,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    config = (await db.execute(select(SMTPConfig).where(SMTPConfig.is_active == True))).scalar_one_or_none()
    host = payload.host if payload and payload.host else (config.host if config else "127.0.0.1")
    port = payload.port if payload and payload.port else (config.port if config else 1025)
    security = payload.security if payload and payload.security else (config.security if config else "none")
    username = payload.username if payload and payload.username is not None else (config.username if config else "")
    
    if payload and payload.password is not None and payload.password != "":
        password = payload.password
    else:
        password = decrypt_secret(config.encrypted_password) if (config and config.encrypted_password) else ""

    test_recip = payload.test_recipient if payload and payload.test_recipient else "probe@apex.edu"

    transcript = []
    has_error = False
    err_msg = ""
    total_latency = 0.0

    events = list(smtp_inspector_service.inspect_live(
        host=host,
        port=port,
        security=security,
        username=username,
        password=password,
        sender_email=config.sender_email if config else "notifications@apex.edu",
        recipient_email=test_recip
    ))

    for ev in events:
        transcript.append(ev)
        if ev["status"] == "error":
            has_error = True
            err_msg = ev["detail"]
        if ev["step"] == "SUMMARY":
            total_latency = ev["latency_ms"]

    if has_error:
        return TestConnectionResponse(
            success=False,
            message=err_msg or "Failed to connect to SMTP server",
            latency_ms=total_latency,
            transcript=transcript
        )

    return TestConnectionResponse(
        success=True,
        message="SMTP Connection & Handshake successful! Test email delivered.",
        latency_ms=total_latency,
        transcript=transcript
    )

@router.get("/inspector/stream")
async def stream_smtp_inspector(
    host: Optional[str] = None,
    port: Optional[int] = None,
    security: Optional[str] = None,
    username: Optional[str] = None,
    password: Optional[str] = None,
    sender_email: Optional[str] = "notifications@apex.edu",
    recipient_email: Optional[str] = "student@apex.edu",
    subject: Optional[str] = "Live SMTP Probe",
    db: AsyncSession = Depends(get_db)
):
    """
    Server-Sent Events (SSE) endpoint to stream live protocol inspection line-by-line.
    """
    cfg = (await db.execute(select(SMTPConfig).where(SMTPConfig.is_active == True))).scalar_one_or_none()
    h = host or (cfg.host if cfg else "127.0.0.1")
    p = port or (cfg.port if cfg else 1025)
    sec = security or (cfg.security if cfg else "none")
    u = username if username is not None else (cfg.username if cfg else "")
    
    if password is not None and password != "":
        pwd = password
    else:
        pwd = decrypt_secret(cfg.encrypted_password) if (cfg and cfg.encrypted_password) else ""

    async def event_generator():
        for item in smtp_inspector_service.inspect_live(
            host=h,
            port=p,
            security=sec,
            username=u,
            password=pwd,
            sender_email=sender_email or "notifications@apex.edu",
            recipient_email=recipient_email or "student@apex.edu",
            subject=subject or "Live SMTP Probe"
        ):
            yield f"data: {json.dumps(item)}\n\n"
            await asyncio.sleep(0.05) # small delay for visual animation pacing

    return StreamingResponse(event_generator(), media_type="text/event-stream")

@router.get("/mailpit-status")
async def get_mailpit_status():
    """
    Checks if Mailpit / local inbox server is reachable on port 8025 and returns message count.
    """
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(f"{settings.MAILPIT_WEB_URL}/api/v1/messages")
            if resp.status_code == 200:
                data = resp.json()
                total = data.get("total", len(data.get("messages", [])))
                return {"available": True, "web_url": settings.MAILPIT_WEB_URL, "messages_count": total}
    except Exception:
        pass
    return {"available": False, "web_url": settings.MAILPIT_WEB_URL, "messages_count": 0}
