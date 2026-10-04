from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models.campaign import Campaign
from app.models.user import User
from app.schemas.campaign import CampaignResponse
from app.api.deps import get_current_admin

router = APIRouter(prefix="/campaigns", tags=["Campaigns"])

@router.get("", response_model=dict)
async def list_campaigns(
    type: Optional[str] = None,
    status: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(25, ge=1),
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    query = select(Campaign)
    if type:
        query = query.where(Campaign.type == type)
    if status:
        query = query.where(Campaign.status == status)

    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar_one()

    query = query.order_by(Campaign.id.desc()).offset((page - 1) * limit).limit(limit)
    campaigns = (await db.execute(query)).scalars().all()

    return {
        "items": [CampaignResponse.model_validate(c) for c in campaigns],
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit if total > 0 else 1
    }

@router.get("/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: int,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_admin)
):
    campaign = await db.get(Campaign, campaign_id)
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign
