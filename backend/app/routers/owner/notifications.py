"""Owner-scoped notifications: inbox (read), broadcast (send to a center audience).

Notes:
- This writes rows into `notification_log`. Actual push/SMS/email dispatch is
  out of scope here — only `InApp` notifications are produced. Any worker
  that watches `delivery_status='Queued'` rows can pick them up later.
- Audiences supported: `Parents` (all unique parents of enrolled students at
  the center), `Teachers` (active center_teacher rows).
"""
import uuid
from typing import Literal

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, get_owned_center_ids, require_owner
from app.schemas.common import SuccessResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# INBOX — notifications addressed to the current user
# ---------------------------------------------------------------------------
@router.get("/notifications")
async def list_my_notifications(
    only_unread: bool = Query(False, description="If true, only return unread items"),
    limit: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    where_extra = " AND read_at IS NULL" if only_unread else ""
    rows = await db.fetch(
        f"""
        SELECT id, user_id, center_id, type, category, title, body,
               delivery_status, read_at, created_date
        FROM notification_log
        WHERE user_id = $1
          AND is_deleted = FALSE
          {where_extra}
        ORDER BY created_date DESC
        LIMIT $2
        """,
        owner.user_id, limit,
    )
    return [
        {
            "id": str(r["id"]),
            "center_id": str(r["center_id"]) if r["center_id"] else None,
            "type": r["type"],
            "category": r["category"],
            "title": r["title"],
            "body": r["body"],
            "delivery_status": r["delivery_status"],
            "read_at": r["read_at"].isoformat() if r["read_at"] else None,
            "created_date": r["created_date"].isoformat() if r["created_date"] else None,
        }
        for r in rows
    ]


@router.post("/notifications/{notification_id}/read", response_model=SuccessResponse)
async def mark_notification_read(
    notification_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    result = await db.execute(
        """
        UPDATE notification_log
        SET read_at = NOW() AT TIME ZONE 'UTC',
            modified_by = $1, modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = $2 AND user_id = $1 AND is_deleted = FALSE AND read_at IS NULL
        """,
        owner.user_id, notification_id,
    )
    if result == "UPDATE 0":
        # Either not found, not owned by caller, or already read — all are fine no-ops
        return SuccessResponse(message="Already up to date.")
    return SuccessResponse(message="Marked as read.")


@router.post("/notifications/read-all", response_model=SuccessResponse)
async def mark_all_read(
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    await db.execute(
        """
        UPDATE notification_log
        SET read_at = NOW() AT TIME ZONE 'UTC',
            modified_by = $1, modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE user_id = $1 AND is_deleted = FALSE AND read_at IS NULL
        """,
        owner.user_id,
    )
    return SuccessResponse(message="All notifications marked as read.")


# ---------------------------------------------------------------------------
# BROADCAST — owner sends a message to parents or teachers of a center
# ---------------------------------------------------------------------------
class BroadcastRequest(BaseModel):
    center_id: uuid.UUID
    audience: Literal["Parents", "Teachers"]
    title: str = Field(min_length=1, max_length=200)
    body: str = Field(min_length=1, max_length=1000)
    category: str = Field(default="Announcement", max_length=50)


@router.post("/notifications/broadcast")
async def broadcast(
    request: BroadcastRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(request.center_id, owner)

    # Resolve recipient list based on audience
    if request.audience == "Parents":
        rows = await db.fetch(
            """
            SELECT DISTINCT u.id
            FROM center_student cs
            JOIN student s ON s.id = cs.student_id AND s.is_deleted = FALSE
            JOIN "user" u  ON u.id = s.parent_id    AND u.is_deleted = FALSE
            WHERE cs.center_id = $1 AND cs.is_deleted = FALSE
            """,
            request.center_id,
        )
    else:  # Teachers
        rows = await db.fetch(
            """
            SELECT ct.user_id AS id
            FROM center_teacher ct
            JOIN "user" u ON u.id = ct.user_id AND u.is_deleted = FALSE
            WHERE ct.center_id = $1 AND ct.is_deleted = FALSE AND ct.is_active = TRUE
            """,
            request.center_id,
        )

    user_ids = [r["id"] for r in rows]
    if not user_ids:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"No active {request.audience.lower()} to notify in this center.",
        )

    async with db.transaction():
        for uid in user_ids:
            await db.execute(
                """
                INSERT INTO notification_log
                    (id, user_id, center_id, type, category, title, body,
                     delivery_status, created_by, created_date,
                     is_active, is_deleted, version_number, source_system)
                VALUES
                    (gen_random_uuid(), $1, $2, 'InApp', $3, $4, $5,
                     'Queued', $6, NOW() AT TIME ZONE 'UTC',
                     TRUE, FALSE, 1, 'OwnerPortal')
                """,
                uid, request.center_id, request.category,
                request.title, request.body, owner.user_id,
            )

    return {
        "message": f"Notification queued for {len(user_ids)} {request.audience.lower()}.",
        "recipient_count": len(user_ids),
    }


# ---------------------------------------------------------------------------
# UNREAD COUNT — for top-bar badge (cheap; widely-called)
# ---------------------------------------------------------------------------
@router.get("/notifications/unread-count")
async def unread_count(
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    # Reading owned_center_ids guards against unauthorised state shifts
    _ = get_owned_center_ids(owner)
    row = await db.fetchrow(
        """
        SELECT COUNT(*) AS n
        FROM notification_log
        WHERE user_id = $1 AND is_deleted = FALSE AND read_at IS NULL
        """,
        owner.user_id,
    )
    return {"unread": int(row["n"] or 0)}
