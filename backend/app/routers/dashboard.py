"""
Dashboard and statistics API routes.

Endpoints:
- GET  /api/dashboard/private          - Private account stats
- GET  /api/dashboard/clinical         - Clinical account stats
- GET  /api/dashboard/settings/private - Private account settings
- POST /api/dashboard/cleanup          - Manual retention cleanup
"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.config import settings
from app import crud
from app.schemas import DashboardStats, SettingsResponse
from app.routers.auth import verify_admin_token

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("/private", response_model=DashboardStats)
async def get_private_dashboard(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Get dashboard stats for private account (seniors)."""
    stats = await crud.get_account_stats(db, account_id=1)
    return DashboardStats(**stats)


@router.get("/clinical", response_model=DashboardStats)
async def get_clinical_dashboard(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Get dashboard stats for clinical account (patients)."""
    stats = await crud.get_account_stats(db, account_id=2)
    return DashboardStats(**stats)


@router.get("/settings/private", response_model=SettingsResponse)
async def get_private_settings(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Get settings for private account."""
    twilio_numbers = await crud.get_twilio_numbers(db, account_id=1)
    return SettingsResponse(
        twilio_numbers=[{
            "id": n.id,
            "account_id": n.account_id,
            "phone_e164": n.phone_e164,
            "twilio_sid": n.twilio_sid,
            "is_active": n.is_active,
            "created_at": n.created_at
        } for n in twilio_numbers],
        default_consent=False,
        default_retention_days=settings.DEFAULT_RETENTION_DAYS
    )


@router.post("/cleanup")
async def run_cleanup(
    db: AsyncSession = Depends(get_db),
    _: bool = Depends(verify_admin_token)
):
    """Manually run retention cleanup job."""
    result = await crud.cleanup_expired_data(db)
    return {"message": "Bereinigung abgeschlossen", **result}
