from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.db.session import get_db
from app.models.user import User
from app.models.smtp_config import AuditLog
from app.schemas.auth import LoginRequest, Token, UserResponse
from app.core.security import verify_password, create_access_token
from app.api.deps import get_current_user, enforce_rate_limit

router = APIRouter(prefix="/auth", tags=["Auth"])

@router.post("/login", response_model=Token, dependencies=[Depends(enforce_rate_limit(15, 60))])
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user account",
        )

    # Log audit entry
    client_ip = request.client.host if request.client else "unknown"
    audit = AuditLog(
        user_email=user.email,
        action="LOGIN",
        target_resource="AUTH",
        details="Admin user logged in",
        ip_address=client_ip
    )
    db.add(audit)
    await db.commit()

    access_token = create_access_token(subject=user.email)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user_name=user.name,
        user_email=user.email,
        user_role=user.role
    )

@router.get("/me", response_model=UserResponse)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user
