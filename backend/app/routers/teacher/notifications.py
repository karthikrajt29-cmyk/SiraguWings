"""Teacher inbox — same shape as parent/owner inbox, scoped to current user."""
import uuid

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import CurrentUser, require_teacher
from app.schemas.common import SuccessResponse
from app.schemas.teacher import TeacherNotificationItem

router = APIRouter()


@router.get("/notifications", response_model=list[TeacherNotificationItem])
async def list_notifications(
    only_unread: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> list[TeacherNotificationItem]:
    extra = " AND read_at IS NULL" if only_unread else ""
    rows = await db.fetch(
        f"""
        SELECT id, center_id, type, category, title, body, read_at, created_date
        FROM notification_log
        WHERE user_id = $1 AND is_deleted = FALSE
        {extra}
        ORDER BY created_date DESC
        LIMIT $2
        """,
        teacher.user_id, limit,
    )
    return [TeacherNotificationItem(**dict(r)) for r in rows]


@router.get("/notifications/unread-count", response_model=dict)
async def unread_count(
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> dict:
    n: int = await db.fetchval(
        """SELECT COUNT(*) FROM notification_log
           WHERE user_id=$1 AND read_at IS NULL AND is_deleted=FALSE""",
        teacher.user_id,
    )
    return {"unread": n or 0}


@router.post("/notifications/{notification_id}/read", response_model=SuccessResponse)
async def mark_read(
    notification_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> SuccessResponse:
    await db.execute(
        """
        UPDATE notification_log
        SET read_at = NOW() AT TIME ZONE 'UTC',
            modified_by = $1, modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = $2 AND user_id = $1 AND is_deleted = FALSE AND read_at IS NULL
        """,
        teacher.user_id, notification_id,
    )
    return SuccessResponse(message="Marked as read.")


@router.post("/notifications/read-all", response_model=SuccessResponse)
async def mark_all_read(
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> SuccessResponse:
    await db.execute(
        """
        UPDATE notification_log
        SET read_at = NOW() AT TIME ZONE 'UTC',
            modified_by = $1, modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE user_id = $1 AND read_at IS NULL AND is_deleted = FALSE
        """,
        teacher.user_id,
    )
    return SuccessResponse(message="All notifications marked as read.")
