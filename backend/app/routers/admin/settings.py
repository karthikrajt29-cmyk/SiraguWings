from typing import Literal

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Path, status
from pydantic import BaseModel

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import SuccessResponse

router = APIRouter()

# Config keys managed through this router
ALLOWED_KEYS = {
    "MaterialVisibilityMode",
    "PlatformFeeRate",
    "InviteExpiryDays",
    "OtpExpiryMinutes",
    "MaxFailedLoginAttempts",
    "TrialPeriodDays",
    "DataPurgeDelayDays",
}


class PlatformSettings(BaseModel):
    material_visibility_mode: str
    platform_fee_rate: float
    invite_expiry_days: int
    otp_expiry_minutes: int
    max_failed_login_attempts: int
    trial_period_days: int
    data_purge_delay_days: int


class MaterialVisibilityUpdate(BaseModel):
    value: Literal["Immediate", "RequiresReview"]


class ConfigUpdate(BaseModel):
    value: str


@router.get("", response_model=PlatformSettings)
async def get_settings(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PlatformSettings:
    """Return all platform configuration values as a typed object."""
    rows = await db.fetch(
        "SELECT config_key, config_value FROM app_config WHERE config_key = ANY($1) AND is_active=TRUE",
        list(ALLOWED_KEYS),
    )
    cfg = {r["config_key"]: r["config_value"] for r in rows}

    def _int(key: str, default: int) -> int:
        return int(cfg.get(key, default))

    def _float(key: str, default: float) -> float:
        return float(cfg.get(key, default))

    return PlatformSettings(
        material_visibility_mode=cfg.get("MaterialVisibilityMode", "Immediate"),
        platform_fee_rate=_float("PlatformFeeRate", 10.0),
        invite_expiry_days=_int("InviteExpiryDays", 7),
        otp_expiry_minutes=_int("OtpExpiryMinutes", 5),
        max_failed_login_attempts=_int("MaxFailedLoginAttempts", 5),
        trial_period_days=_int("TrialPeriodDays", 90),
        data_purge_delay_days=_int("DataPurgeDelayDays", 30),
    )


@router.patch("/material-visibility", response_model=SuccessResponse)
async def set_material_visibility(
    request: MaterialVisibilityUpdate,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """
    Set the global material visibility mode.
    Immediate  — parents see materials as soon as teacher uploads.
    RequiresReview — center owner must approve before parents can see.
    """
    old = await db.fetchrow(
        "SELECT config_value FROM app_config WHERE config_key='MaterialVisibilityMode' AND is_active=TRUE"
    )
    await db.execute(
        """
        UPDATE app_config
        SET config_value=$1, updated_by=$2, updated_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE config_key='MaterialVisibilityMode' AND is_active=TRUE
        """,
        request.value, admin.user_id,
    )
    await write_audit_log(
        db, admin.user_id, "Update", "AppConfig", admin.user_id,
        f'{{"MaterialVisibilityMode":"{old["config_value"] if old else "?"}"}}',
        f'{{"MaterialVisibilityMode":"{request.value}"}}',
    )
    return SuccessResponse(message=f"Material visibility set to '{request.value}'.")


@router.patch("/{config_key}", response_model=SuccessResponse)
async def update_config(
    config_key: str = Path(...),
    request: ConfigUpdate = ...,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """Update any allowed platform configuration key."""
    if config_key not in ALLOWED_KEYS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown config key '{config_key}'. Allowed: {sorted(ALLOWED_KEYS)}",
        )

    old = await db.fetchrow(
        "SELECT config_value FROM app_config WHERE config_key=$1 AND is_active=TRUE",
        config_key,
    )
    if not old:
        raise HTTPException(status.HTTP_404_NOT_FOUND, f"Config key '{config_key}' not found.")

    await db.execute(
        """
        UPDATE app_config
        SET config_value=$1, updated_by=$2, updated_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE config_key=$3 AND is_active=TRUE
        """,
        request.value, admin.user_id, config_key,
    )
    await write_audit_log(
        db, admin.user_id, "Update", "AppConfig", admin.user_id,
        f'{{"{config_key}":"{old["config_value"]}"}}',
        f'{{"{config_key}":"{request.value}"}}',
    )
    return SuccessResponse(message=f"'{config_key}' updated to '{request.value}'.")
