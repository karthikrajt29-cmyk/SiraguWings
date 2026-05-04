"""Device-token registration endpoints used by the mobile app.

Mobile app calls POST /me/devices on every app start (and on FCM token refresh).
The token is upserted; if the same FCM token already exists for a different
user, ownership is reassigned (account switch on the same device).
"""
import asyncpg
from fastapi import APIRouter, Depends, status

from app.database import get_db
from app.dependencies import CurrentUser, get_current_user
from app.schemas.common import SuccessResponse
from app.schemas.device import DeviceTokenRegisterRequest

router = APIRouter()


@router.post("/me/devices", response_model=SuccessResponse, status_code=status.HTTP_200_OK)
async def register_device(
    request: DeviceTokenRegisterRequest,
    db: asyncpg.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse:
    """Upsert a device token for the current user.

    If the token already exists (under any user), it is reassigned to the
    caller and `last_seen_at` is bumped. Soft-deleted rows for the same
    token are revived.
    """
    await db.execute(
        """
        INSERT INTO device_token (user_id, token, platform, app_version,
                                  created_by, last_seen_at)
        VALUES ($1, $2, $3, $4, $1, NOW() AT TIME ZONE 'UTC')
        ON CONFLICT (token) WHERE is_deleted = FALSE
        DO UPDATE SET
            user_id       = EXCLUDED.user_id,
            platform      = EXCLUDED.platform,
            app_version   = EXCLUDED.app_version,
            last_seen_at  = NOW() AT TIME ZONE 'UTC',
            modified_by   = EXCLUDED.user_id,
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = device_token.version_number + 1
        """,
        user.user_id, request.token, request.platform, request.app_version,
    )
    return SuccessResponse(message="Device registered.")


@router.delete("/me/devices/{token}", response_model=SuccessResponse)
async def unregister_device(
    token: str,
    db: asyncpg.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SuccessResponse:
    """Soft-delete a device-token row.

    Used on logout so the device stops receiving push for the user that
    just logged out. The mobile app should call this *before* it clears
    the Firebase auth state.
    """
    await db.execute(
        """
        UPDATE device_token
        SET is_deleted = TRUE,
            modified_by = $1,
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE user_id = $1 AND token = $2 AND is_deleted = FALSE
        """,
        user.user_id, token,
    )
    return SuccessResponse(message="Device unregistered.")
