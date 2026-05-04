import asyncio
import uuid
from functools import partial
from typing import Dict, List, Optional

import asyncpg

try:
    from firebase_admin import messaging
    _FCM_AVAILABLE = True
except ImportError:
    _FCM_AVAILABLE = False


async def _resolve_device_tokens(
    db: asyncpg.Connection,
    user_id: uuid.UUID,
    fallback_token: Optional[str] = None,
) -> List[str]:
    """Return all active FCM tokens for a user.

    Reads from device_token (multi-device, set by mobile app /me/devices).
    Falls back to user.device_token (legacy single-device column) if no
    device_token rows exist — keeps older notification paths working.
    """
    rows = await db.fetch(
        """
        SELECT token FROM device_token
        WHERE user_id = $1 AND is_deleted = FALSE
        """,
        user_id,
    )
    tokens = [r["token"] for r in rows if r["token"]]
    if not tokens and fallback_token:
        tokens.append(fallback_token)
    return tokens


async def send_push_notification(
    db: asyncpg.Connection,
    user_id: uuid.UUID,
    notification_type: str,          # Push | SMS | Email | InApp
    category: str,
    title: str,
    body: str,
    center_id: Optional[uuid.UUID] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    device_token: Optional[str] = None,
    created_by: Optional[uuid.UUID] = None,
) -> uuid.UUID:
    """Log notification to notification_log and fan out FCM push to all devices."""
    notif_id = uuid.uuid4()
    effective_created_by = created_by or user_id

    await db.execute(
        """
        INSERT INTO notification_log
            (id, user_id, center_id, type, category, title, body,
             reference_type, reference_id, delivery_status,
             created_by, created_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Queued',$10, NOW() AT TIME ZONE 'UTC')
        """,
        notif_id, user_id, center_id, notification_type, category,
        title, body, reference_type, reference_id, effective_created_by,
    )

    if notification_type in ("Push", "InApp") and _FCM_AVAILABLE:
        tokens = await _resolve_device_tokens(db, user_id, fallback_token=device_token)
        if tokens:
            sent = 0
            last_error: Optional[str] = None
            for token in tokens:
                try:
                    await _send_fcm(token, title, body, reference_type, reference_id)
                    sent += 1
                except Exception as exc:
                    last_error = str(exc)[:500]
            if sent > 0:
                await db.execute(
                    """
                    UPDATE notification_log
                    SET delivery_status = 'Sent', sent_at = NOW() AT TIME ZONE 'UTC'
                    WHERE id = $1
                    """,
                    notif_id,
                )
            else:
                await db.execute(
                    """
                    UPDATE notification_log
                    SET delivery_status = 'Failed', failure_reason = $1
                    WHERE id = $2
                    """,
                    last_error or "no devices reachable", notif_id,
                )

    return notif_id


async def _send_fcm(
    device_token: str,
    title: str,
    body: str,
    reference_type: Optional[str],
    reference_id: Optional[uuid.UUID],
) -> None:
    data: Dict[str, str] = {}
    if reference_type:
        data["reference_type"] = reference_type
    if reference_id:
        data["reference_id"] = str(reference_id)

    message = messaging.Message(
        notification=messaging.Notification(title=title, body=body),
        data=data,
        token=device_token,
    )
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(messaging.send, message))


async def notify_center_owner(
    db: asyncpg.Connection,
    center_id: uuid.UUID,
    notification_type: str,
    category: str,
    title: str,
    body: str,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    admin_user_id: Optional[uuid.UUID] = None,
) -> None:
    """Send a notification to the owner of a specific center."""
    owner = await db.fetchrow(
        """
        SELECT u.id, u.device_token
        FROM center c
        JOIN "user" u ON u.id = c.owner_id
        WHERE c.id = $1 AND c.is_deleted = FALSE
        """,
        center_id,
    )
    if owner:
        await send_push_notification(
            db=db,
            user_id=owner["id"],
            notification_type=notification_type,
            category=category,
            title=title,
            body=body,
            center_id=center_id,
            reference_type=reference_type,
            reference_id=reference_id,
            device_token=owner["device_token"],
            created_by=admin_user_id,
        )


async def notify_all_admins(
    db: asyncpg.Connection,
    notification_type: str,
    category: str,
    title: str,
    body: str,
    center_id: Optional[uuid.UUID] = None,
    reference_type: Optional[str] = None,
    reference_id: Optional[uuid.UUID] = None,
    created_by: Optional[uuid.UUID] = None,
) -> None:
    """Broadcast a notification to all admin users."""
    admins = await db.fetch(
        """
        SELECT u.id, u.device_token
        FROM user_role ur
        JOIN "user" u ON u.id = ur.user_id
        WHERE ur.role = 'Admin' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
          AND u.status = 'Active' AND u.is_deleted = FALSE
        """,
    )
    for admin in admins:
        await send_push_notification(
            db=db,
            user_id=admin["id"],
            notification_type=notification_type,
            category=category,
            title=title,
            body=body,
            center_id=center_id,
            reference_type=reference_type,
            reference_id=reference_id,
            device_token=admin["device_token"],
            created_by=created_by,
        )
