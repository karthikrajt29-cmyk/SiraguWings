"""GET /parent/notifications — inbox; POST /parent/notifications/{id}/read."""
import uuid

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import CurrentUser, require_parent
from app.schemas.common import SuccessResponse
from app.schemas.parent import ParentNotificationItem

router = APIRouter()


@router.get("/notifications", response_model=list[ParentNotificationItem])
async def list_notifications(
    only_unread: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> list[ParentNotificationItem]:
    extra = " AND nl.read_at IS NULL" if only_unread else ""
    rows = await db.fetch(
        f"""
        SELECT nl.id, nl.center_id, c.name AS center_name,
               nl.type, nl.category, nl.title, nl.body,
               nl.read_at, nl.created_date
        FROM notification_log nl
        LEFT JOIN center c ON c.id = nl.center_id
        WHERE nl.user_id = $1
          AND nl.is_deleted = FALSE
          {extra}
        ORDER BY nl.created_date DESC
        LIMIT $2
        """,
        parent.user_id, limit,
    )
    return [
        ParentNotificationItem(
            id=r["id"], center_id=r["center_id"], center_name=r["center_name"],
            type=r["type"], category=r["category"],
            title=r["title"], body=r["body"],
            read_at=r["read_at"], created_date=r["created_date"],
        )
        for r in rows
    ]


@router.get("/notifications/unread-count", response_model=dict)
async def unread_count(
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> dict:
    n: int = await db.fetchval(
        """SELECT COUNT(*) FROM notification_log
           WHERE user_id=$1 AND read_at IS NULL AND is_deleted=FALSE""",
        parent.user_id,
    )
    return {"unread": n or 0}


@router.post("/notifications/{notification_id}/read", response_model=SuccessResponse)
async def mark_read(
    notification_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> SuccessResponse:
    await db.execute(
        """
        UPDATE notification_log
        SET read_at = NOW() AT TIME ZONE 'UTC',
            modified_by = $1, modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = $2 AND user_id = $1 AND is_deleted = FALSE AND read_at IS NULL
        """,
        parent.user_id, notification_id,
    )
    return SuccessResponse(message="Marked as read.")


@router.post("/notifications/read-all", response_model=SuccessResponse)
async def mark_all_read(
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> SuccessResponse:
    await db.execute(
        """
        UPDATE notification_log
        SET read_at = NOW() AT TIME ZONE 'UTC',
            modified_by = $1, modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE user_id = $1 AND read_at IS NULL AND is_deleted = FALSE
        """,
        parent.user_id,
    )
    return SuccessResponse(message="All notifications marked as read.")
