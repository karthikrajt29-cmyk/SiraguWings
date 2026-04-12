import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import PagedResponse, SuccessResponse
from app.core.firebase import (
    create_firebase_user,
    delete_firebase_user,
    generate_password_reset_link,
    update_firebase_user,
)
from app.schemas.user import (
    UnlinkRequestAction,
    UnlinkRequestSummary,
    UserCreateRequest,
    UserDetail,
    UserRoleRequest,
    UserStatusUpdate,
    UserStatsResponse,
    UserSummary,
    UserUpdateRequest,
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
    status_filter: Optional[str] = Query(None, alias="status"),
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

    if status_filter:
        where += f" AND u.status = ${idx}"
        params.append(status_filter)
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
# USER STATS (accurate role / status counts across full table)
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=UserStatsResponse)
async def get_user_stats(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> UserStatsResponse:
    total     = await db.fetchval('SELECT COUNT(*) FROM "user" WHERE is_deleted=FALSE')
    active    = await db.fetchval('SELECT COUNT(*) FROM "user" WHERE is_deleted=FALSE AND status=\'Active\'')
    suspended = await db.fetchval('SELECT COUNT(*) FROM "user" WHERE is_deleted=FALSE AND status=\'Suspended\'')

    role_rows = await db.fetch(
        """
        SELECT role, COUNT(DISTINCT user_id) AS cnt
        FROM user_role
        WHERE is_active=TRUE AND is_deleted=FALSE
        GROUP BY role
        """
    )
    by_role = {r["role"]: r["cnt"] for r in role_rows}
    return UserStatsResponse(
        total=total, active=active, suspended=suspended, by_role=by_role,
    )


# ---------------------------------------------------------------------------
# CREATE USER
# ---------------------------------------------------------------------------
@router.post("", response_model=SuccessResponse, status_code=201)
async def create_user(
    request: UserCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    # Validate role + center pairing
    CENTER_SCOPED = {"Owner", "Teacher", "Staff"}
    if request.role:
        if request.role not in ("Admin", "Owner", "Teacher", "Parent", "Staff"):
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid role.")
        if request.role in CENTER_SCOPED and not request.center_id:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"center_id is required for role '{request.role}'.",
            )

    # Check email uniqueness
    existing = await db.fetchrow(
        'SELECT id FROM "user" WHERE email=$1 AND is_deleted=FALSE', request.email
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "A user with this email already exists.")

    # Create Firebase account (no password — user sets via reset link)
    await create_firebase_user(request.email, request.name)
    reset_link = await generate_password_reset_link(request.email)

    new_id = uuid.uuid4()
    async with db.transaction():
        await db.execute(
            """
            INSERT INTO "user" (
                id, name, email, mobile_number, status,
                preferred_language, created_by, created_date,
                is_active, is_deleted, version_number, source_system
            ) VALUES (
                $1, $2, $3, $4, 'Active',
                'en', $5, NOW() AT TIME ZONE 'UTC',
                TRUE, FALSE, 1, 'AdminPortal'
            )
            """,
            new_id, request.name, request.email, request.mobile_number, admin.user_id,
        )

        if request.role:
            await db.execute(
                """
                INSERT INTO user_role (
                    id, user_id, role, center_id, assigned_at,
                    created_by, created_date, is_active, is_deleted, version_number, source_system
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, NOW() AT TIME ZONE 'UTC',
                    $4, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'AdminPortal'
                )
                """,
                new_id, request.role, request.center_id, admin.user_id,
            )

    await write_audit_log(db, admin.user_id, "Create", "User", new_id, "{}", f'{{"email":"{request.email}"}}')
    return SuccessResponse(
        message=f"User created. Share this link to let them set their password.",
        data={"user_id": str(new_id), "reset_link": reset_link},
    )


# ---------------------------------------------------------------------------
# DELETE USER (soft-delete + Firebase removal)
# ---------------------------------------------------------------------------
@router.delete("/{user_id}", response_model=SuccessResponse)
async def delete_user(
    user_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    user = await db.fetchrow(
        'SELECT id, email FROM "user" WHERE id=$1 AND is_deleted=FALSE', user_id
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    async with db.transaction():
        await db.execute(
            """
            UPDATE "user"
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE id=$2
            """,
            admin.user_id, user_id,
        )
        # Soft-delete all role assignments
        await db.execute(
            """
            UPDATE user_role
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE user_id=$2 AND is_deleted=FALSE
            """,
            admin.user_id, user_id,
        )

    # Remove from Firebase (non-blocking: if Firebase fails the DB change stands)
    if user["email"]:
        await delete_firebase_user(user["email"])

    await write_audit_log(db, admin.user_id, "Delete", "User", user_id, f'{{"email":"{user["email"]}"}}', "{}")
    return SuccessResponse(message="User deleted.")


# ---------------------------------------------------------------------------
# ADD ROLE TO USER
# ---------------------------------------------------------------------------
@router.post("/{user_id}/roles", response_model=SuccessResponse, status_code=201)
async def add_user_role(
    user_id: uuid.UUID,
    request: UserRoleRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    if request.role not in ("Admin", "Owner", "Teacher", "Parent", "Staff"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid role.")

    user = await db.fetchrow('SELECT id FROM "user" WHERE id=$1 AND is_deleted=FALSE', user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    try:
        await db.execute(
            """
            INSERT INTO user_role (
                id, user_id, role, center_id, assigned_at,
                created_by, created_date, is_active, is_deleted, version_number, source_system
            ) VALUES (
                gen_random_uuid(), $1, $2, $3, NOW() AT TIME ZONE 'UTC',
                $4, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'AdminPortal'
            )
            """,
            user_id, request.role, request.center_id, admin.user_id,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(status.HTTP_409_CONFLICT, f"User already has role '{request.role}' for this center.")

    return SuccessResponse(message=f"Role '{request.role}' assigned.")


# ---------------------------------------------------------------------------
# REMOVE ROLE FROM USER
# ---------------------------------------------------------------------------
@router.delete("/{user_id}/roles", response_model=SuccessResponse)
async def remove_user_role(
    user_id: uuid.UUID,
    role: str = Query(...),
    center_id: Optional[uuid.UUID] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    if center_id:
        # Remove role for a specific center
        result = await db.execute(
            """
            UPDATE user_role
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE user_id=$2 AND role=$3 AND center_id=$4 AND is_deleted=FALSE
            """,
            admin.user_id, user_id, role, center_id,
        )
    else:
        # No center_id supplied — remove all assignments of this role for the user
        # (covers center-scoped roles like Owner/Teacher where center_id is always set)
        result = await db.execute(
            """
            UPDATE user_role
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE user_id=$2 AND role=$3 AND is_deleted=FALSE
            """,
            admin.user_id, user_id, role,
        )

    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Role assignment not found.")

    return SuccessResponse(message=f"Role '{role}' removed.")


# ---------------------------------------------------------------------------
# PARENT'S STUDENTS (linked via student.parent_id)
# ---------------------------------------------------------------------------
@router.get("/{user_id}/students")
async def get_user_students(
    user_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> list:
    rows = await db.fetch(
        """
        SELECT s.id, s.name, s.date_of_birth, s.gender, s.profile_image_url,
               cs.center_id, c.name AS center_name, cs.status AS link_status,
               cs.invite_status, cs.enrolled_at
        FROM student s
        LEFT JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
        LEFT JOIN center c ON c.id = cs.center_id AND c.is_deleted = FALSE
        WHERE s.parent_id = $1 AND s.is_deleted = FALSE
        ORDER BY s.name
        """,
        user_id,
    )
    result: dict[uuid.UUID, dict] = {}
    for r in rows:
        sid = r["id"]
        if sid not in result:
            result[sid] = {
                "id": str(sid),
                "name": r["name"],
                "date_of_birth": r["date_of_birth"].isoformat() if r["date_of_birth"] else None,
                "gender": r["gender"],
                "profile_image_url": r["profile_image_url"],
                "centers": [],
            }
        if r["center_id"]:
            result[sid]["centers"].append({
                "center_id": str(r["center_id"]),
                "center_name": r["center_name"],
                "link_status": r["link_status"],
                "invite_status": r["invite_status"],
                "enrolled_at": r["enrolled_at"].isoformat() if r["enrolled_at"] else None,
            })
    return list(result.values())


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
# USER PROFILE UPDATE (name + email)
# ---------------------------------------------------------------------------
@router.patch("/{user_id}", response_model=SuccessResponse)
async def update_user(
    user_id: uuid.UUID,
    request: UserUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    user = await db.fetchrow(
        'SELECT id, name, email FROM "user" WHERE id=$1 AND is_deleted=FALSE', user_id
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")

    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided.")

    # Sync changes to Firebase first (rolls back DB update if Firebase fails)
    await update_firebase_user(
        current_email=user["email"],
        new_name=fields.get("name"),
        new_email=fields.get("email"),
    )

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
    values = list(fields.values())
    idx = len(values) + 1
    values.append(admin.user_id)
    values.append(user_id)

    await db.execute(
        f"""
        UPDATE "user" SET {set_clauses},
            modified_by = ${idx},
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = ${idx + 1}
        """,
        *values,
    )
    await write_audit_log(
        db, admin.user_id, "Update", "User", user_id,
        str({k: user[k] for k in fields if k in user.keys()}),
        str(fields),
    )
    return SuccessResponse(message="User updated.")


# ---------------------------------------------------------------------------
# PASSWORD RESET LINK
# ---------------------------------------------------------------------------
@router.post("/{user_id}/reset-password", response_model=SuccessResponse)
async def reset_user_password(
    user_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    user = await db.fetchrow(
        'SELECT id, email FROM "user" WHERE id=$1 AND is_deleted=FALSE', user_id
    )
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "User not found.")
    if not user["email"]:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "User has no email address.")

    link = await generate_password_reset_link(user["email"])
    await write_audit_log(db, admin.user_id, "ResetPassword", "User", user_id, "{}", "{}")
    return SuccessResponse(message="Password reset link generated.", data={"reset_link": link})


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
