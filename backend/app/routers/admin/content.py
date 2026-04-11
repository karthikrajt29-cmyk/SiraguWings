import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import PagedResponse, SuccessResponse
from app.schemas.content import FeedPostRejectRequest, FeedPostSummary
from app.services.notification_service import notify_center_owner

router = APIRouter()


@router.get("/feed-posts", response_model=PagedResponse[FeedPostSummary])
async def list_feed_posts(
    status_filter: Optional[str] = Query("PendingReview", alias="status"),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[FeedPostSummary]:
    """Moderation queue for center promotional posts."""
    where = "WHERE fp.is_deleted=FALSE"
    params: list = []
    idx = 1
    if status_filter:
        where += f" AND fp.status=${idx}"
        params.append(status_filter)
        idx += 1

    total: int = await db.fetchval(
        f"SELECT COUNT(*) FROM feed_post fp {where}", *params
    )
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT fp.id, fp.center_id, c.name AS center_name, fp.title, fp.description,
               fp.category_tag, fp.image_url, fp.cta_url, fp.validity_date, fp.status,
               fp.created_date, fp.published_at, fp.rejection_category, fp.rejection_reason
        FROM feed_post fp JOIN center c ON c.id=fp.center_id
        {where}
        ORDER BY fp.created_date DESC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    items = [
        FeedPostSummary(
            id=r["id"], center_id=r["center_id"], center_name=r["center_name"],
            title=r["title"], description=r["description"], category_tag=r["category_tag"],
            image_url=r["image_url"], cta_url=r["cta_url"], validity_date=r["validity_date"],
            status=r["status"], created_date=r["created_date"], published_at=r["published_at"],
            rejection_category=r["rejection_category"], rejection_reason=r["rejection_reason"],
        )
        for r in rows
    ]
    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


@router.patch("/feed-posts/{post_id}/approve", response_model=SuccessResponse)
async def approve_feed_post(
    post_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    post = await db.fetchrow(
        "SELECT id, center_id, title, status FROM feed_post WHERE id=$1 AND is_deleted=FALSE",
        post_id,
    )
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feed post not found.")
    if post["status"] not in ("PendingReview", "Approved"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Post status is '{post['status']}'; cannot approve.")

    await db.execute(
        """
        UPDATE feed_post SET status='Live', reviewed_by=$1,
            reviewed_at=NOW() AT TIME ZONE 'UTC',
            published_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$2
        """,
        admin.user_id, post_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "FeedPost", post_id,
                          f'{{"status":"{post["status"]}"}}', '{"status":"Live"}')
    await notify_center_owner(
        db=db, center_id=post["center_id"], notification_type="InApp",
        category="FeedPostApproved",
        title="Post Approved — Now Live",
        body=f"Your post '{post['title']}' has been approved and is now visible to parents.",
        reference_type="FeedPost", reference_id=post_id,
        admin_user_id=admin.user_id,
    )
    return SuccessResponse(message="Feed post approved and is now live.")


@router.patch("/feed-posts/{post_id}/reject", response_model=SuccessResponse)
async def reject_feed_post(
    post_id: uuid.UUID,
    request: FeedPostRejectRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    post = await db.fetchrow(
        "SELECT id, center_id, title, status FROM feed_post WHERE id=$1 AND is_deleted=FALSE",
        post_id,
    )
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feed post not found.")
    if post["status"] not in ("PendingReview", "Live"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Cannot reject post with status '{post['status']}'.")

    await db.execute(
        """
        UPDATE feed_post SET status='Rejected',
            rejection_category=$1, rejection_reason=$2,
            reviewed_by=$3, reviewed_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$3, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$4
        """,
        request.rejection_category, request.rejection_reason, admin.user_id, post_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "FeedPost", post_id,
                          f'{{"status":"{post["status"]}"}}',
                          f'{{"status":"Rejected","category":"{request.rejection_category}"}}')
    await notify_center_owner(
        db=db, center_id=post["center_id"], notification_type="InApp",
        category="FeedPostRejected",
        title="Post Not Approved",
        body=f"Your post '{post['title']}' was not approved. Reason: {request.rejection_reason}. Please edit and resubmit.",
        reference_type="FeedPost", reference_id=post_id,
        admin_user_id=admin.user_id,
    )
    return SuccessResponse(message="Feed post rejected. Center notified.")


@router.delete("/feed-posts/{post_id}", response_model=SuccessResponse)
async def remove_feed_post(
    post_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """Remove a live post (e.g. reported content or policy violation)."""
    post = await db.fetchrow(
        "SELECT id, center_id, title, status FROM feed_post WHERE id=$1 AND is_deleted=FALSE",
        post_id,
    )
    if not post:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Feed post not found.")

    await db.execute(
        """
        UPDATE feed_post SET is_deleted=TRUE, is_active=FALSE, status='Archived',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$2
        """,
        admin.user_id, post_id,
    )
    await write_audit_log(db, admin.user_id, "Delete", "FeedPost", post_id,
                          f'{{"status":"{post["status"]}"}}', '{"is_deleted":true}')
    return SuccessResponse(message="Feed post removed successfully.")
