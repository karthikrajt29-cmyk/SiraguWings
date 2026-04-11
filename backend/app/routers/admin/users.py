import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import PagedResponse, SuccessResponse
from app.schemas.user import (
    UnlinkRequestAction,
    UnlinkRequestSummary,
    UserDetail,
    UserStatusUpdate,
    UserSummary,
)
from app.services.notification_service import send_push_notification

router = APIRouter()


# ---------------------------------------------------------------------------
# USER LIST
# ---------------------------------------------------------------------------
@router.get("", response_model=PagedResponse[UserSummary])
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[UserSummary]:
    where = 'WHERE u.is_deleted = FALSE'
    params: list = []
    idx = 1

    if search:
        where += f" AND (u.name ILIKE ${idx} OR u.mobile_number ILIKE ${idx} OR u.email ILIKE ${idx})"
        params.append(f"%{search}%")
        idx += 1

    if role:
        where += f" AND EXISTS (SELECT 1 FROM user_role ur WHERE ur.user_id=u.id AND ur.role=${idx} AND ur.is_active=TRUE AND ur.is_deleted=FALSE)"
        params.append(role)
        idx += 1

    total: int = await db.fetchval(f'SELECT COUNT(*) FROM "user" u {where}', *params)
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT u.id, u.name, u.mobile_number, u.email, u.status, u.last_login_at, u.created_date
        FROM "user" u
        {where}
        ORDER BY u.created_date DESC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    items = []
    for r in rows:
        roles = await db.fetch(
            "SELECT role, center_id::text FROM user_role WHERE user_id=$1 AND is_active=TRUE AND is_deleted=FALSE",
            r["id"],
        )
        items.append(UserSummary(
            id=r["id"], name=r["name"], mobile_number=r["mobile_number"],
            email=r["email"], status=r["status"], last_login_at=r["last_login_at"],
            created_date=r["created_date"], roles=[dict(x) for x in roles],
        ))

    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


# ---------------------------------------------------------------------------
# USER DETAIL
# ---------------------------------------------------------------------------
@router.get("/{user_id}", response_model=UserDetail)
async def get_user(
    user_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> UserDetail:
    r = await db.fetchrow(
        'SELECT * FROM "user" WHERE id=$1 AND is_deleted=FALSE', user_id
    )
    if not r:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    roles = await db.fetch(
        "SELECT role, center_id::text FROM user_role WHERE user_id=$1 AND is_active=TRUE AND is_deleted=FALSE",
        user_id,
    )
    connections = await db.fetch(
        """
        SELECT c.id AS center_id, c.name AS center_name, ur.role
        FROM user_role ur JOIN center c ON c.id = ur.center_id
        WHERE ur.user_id=$1 AND ur.is_active=TRUE AND ur.is_deleted=FALSE AND c.is_deleted=FALSE
        """,
        user_id,
    )

    return UserDetail(
        id=r["id"], name=r["name"], mobile_number=r["mobile_number"],
        email=r["email"], status=r["status"], last_login_at=r["last_login_at"],
        created_date=r["created_date"], preferred_language=r["preferred_language"],
        device_platform=r["device_platform"],
        failed_login_attempts=r["failed_login_attempts"],
        roles=[dict(x) for x in roles],
        center_connections=[dict(c) for c in connections],
    )


# ---------------------------------------------------------------------------
# USER STATUS UPDATE
# ---------------------------------------------------------------------------
@router.patch("/{user_id}/status", response_model=SuccessResponse)
async def update_user_status(
    user_id: uuid.UUID,
    request: UserStatusUpdate,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    user = await db.fetchrow(
        'SELECT id, name, status FROM "user" WHERE id=$1 AND is_deleted=FALSE', user_id
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    await db.execute(
        """
        UPDATE "user" SET status=$1, modified_by=$2,
            modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$3
        """,
        request.status, admin.user_id, user_id,
    )
    await write_audit_log(
        db, admin.user_id, "Update", "User", user_id,
        f'{{"status":"{user["status"]}"}}',
        f'{{"status":"{request.status}"}}',
    )
    return SuccessResponse(message=f"User status updated to {request.status}.")


# ---------------------------------------------------------------------------
# UNLINK REQUESTS
# ---------------------------------------------------------------------------
@router.get("/unlink-requests", response_model=PagedResponse[UnlinkRequestSummary])
async def list_unlink_requests(
    status_filter: Optional[str] = Query("Pending", alias="status"),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[UnlinkRequestSummary]:
    where = "WHERE ur.is_deleted=FALSE"
    params: list = []
    idx = 1
    if status_filter:
        where += f" AND ur.status=${idx}"
        params.append(status_filter)
        idx += 1

    total: int = await db.fetchval(
        f"SELECT COUNT(*) FROM unlink_request ur {where}", *params
    )
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT ur.id, ur.parent_id, p.name AS parent_name,
               ur.center_id, c.name AS center_name,
               ur.student_id, s.name AS student_name,
               ur.reason, ur.status, ur.created_date
        FROM unlink_request ur
        JOIN "user" p ON p.id = ur.parent_id
        JOIN center c  ON c.id = ur.center_id
        JOIN student s ON s.id = ur.student_id
        {where}
        ORDER BY ur.created_date DESC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    items = [
        UnlinkRequestSummary(
            id=r["id"], parent_id=r["parent_id"], parent_name=r["parent_name"],
            center_id=r["center_id"], center_name=r["center_name"],
            student_id=r["student_id"], student_name=r["student_name"],
            reason=r["reason"], status=r["status"], created_date=r["created_date"],
        )
        for r in rows
    ]

    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


@router.patch("/unlink-requests/{request_id}/approve", response_model=SuccessResponse)
async def approve_unlink(
    request_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    req = await db.fetchrow(
        "SELECT * FROM unlink_request WHERE id=$1 AND is_deleted=FALSE", request_id
    )
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unlink request not found.")
    if req["status"] != "Pending":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Request is not pending.")

    # Soft-delete center_student link
    await db.execute(
        """
        UPDATE center_student SET status='Removed', is_active=FALSE,
            removed_at=NOW() AT TIME ZONE 'UTC', removed_reason='Parent unlink request approved by admin',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE center_id=$2 AND student_id=$3 AND is_deleted=FALSE
        """,
        admin.user_id, req["center_id"], req["student_id"],
    )

    # Mark request approved
    await db.execute(
        """
        UPDATE unlink_request SET status='Approved', reviewed_by=$1,
            reviewed_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$2
        """,
        admin.user_id, request_id,
    )

    # Notify parent
    parent = await db.fetchrow('SELECT device_token FROM "user" WHERE id=$1', req["parent_id"])
    center = await db.fetchrow("SELECT name FROM center WHERE id=$1", req["center_id"])
    if parent:
        await send_push_notification(
            db=db, user_id=req["parent_id"], notification_type="InApp",
            category="UnlinkApproved",
            title="Unlink Request Approved",
            body=f"Your request to unlink from '{center['name']}' has been approved.",
            center_id=req["center_id"],
            reference_type="UnlinkRequest", reference_id=request_id,
            device_token=parent["device_token"],
            created_by=admin.user_id,
        )

    return SuccessResponse(message="Unlink request approved. Center removed from parent dashboard.")


@router.patch("/unlink-requests/{request_id}/reject", response_model=SuccessResponse)
async def reject_unlink(
    request_id: uuid.UUID,
    body: UnlinkRequestAction,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    req = await db.fetchrow(
        "SELECT * FROM unlink_request WHERE id=$1 AND is_deleted=FALSE", request_id
    )
    if not req:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Unlink request not found.")
    if req["status"] != "Pending":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Request is not pending.")

    await db.execute(
        """
        UPDATE unlink_request SET status='Rejected', reviewed_by=$1,
            reviewed_at=NOW() AT TIME ZONE 'UTC', rejection_reason=$2,
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$3
        """,
        admin.user_id, body.rejection_reason, request_id,
    )

    parent = await db.fetchrow('SELECT device_token FROM "user" WHERE id=$1', req["parent_id"])
    center = await db.fetchrow("SELECT name FROM center WHERE id=$1", req["center_id"])
    if parent:
        await send_push_notification(
            db=db, user_id=req["parent_id"], notification_type="InApp",
            category="UnlinkRejected",
            title="Unlink Request Rejected",
            body=(
                f"Your request to unlink from '{center['name']}' was not approved."
                + (f" Reason: {body.rejection_reason}" if body.rejection_reason else "")
            ),
            center_id=req["center_id"],
            reference_type="UnlinkRequest", reference_id=request_id,
            device_token=parent["device_token"],
            created_by=admin.user_id,
        )

    return SuccessResponse(message="Unlink request rejected. Parent notified.")
