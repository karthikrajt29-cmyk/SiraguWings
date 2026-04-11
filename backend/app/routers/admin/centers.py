import uuid
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.center import (
    AddCenterUserRequest,
    BatchCreateRequest,
    BatchSummary,
    BulkApproveRequest,
    CenterApproveRequest,
    CenterCreateRequest,
    CenterDetail,
    CenterRejectRequest,
    CenterReinstateRequest,
    CenterSummary,
    CenterSuspendRequest,
    CenterUpdateRequest,
    CenterUserSummary,
)
from app.schemas.common import PagedResponse, SuccessResponse
from app.services.center_service import (
    daycare_docs_complete,
    get_center_or_404,
    requires_daycare_docs,
)
from app.services.notification_service import notify_all_admins, notify_center_owner

router = APIRouter()

SLA_WARN_HOURS = 20   # flag as approaching
SLA_BREACH_HOURS = 24 # SLA target


def _hours_since(dt: datetime) -> float:
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return (datetime.now(timezone.utc) - dt).total_seconds() / 3600


# ---------------------------------------------------------------------------
# LIST
# ---------------------------------------------------------------------------
@router.get("", response_model=PagedResponse[CenterSummary])
async def list_centers(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[CenterSummary]:
    """
    Center approval queue.
    status filter: Submitted | UnderReview | Approved | Rejected | Suspended
    Centers approaching 24-hour SLA have is_approaching_sla=True.
    """
    where = "WHERE c.is_deleted = FALSE"
    params: list = []
    idx = 1

    if status_filter:
        where += f" AND c.registration_status = ${idx}"
        params.append(status_filter)
        idx += 1

    total: int = await db.fetchval(f"SELECT COUNT(*) FROM center c {where}", *params)
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT
            c.id, c.name, c.category, c.owner_name, c.mobile_number, c.city,
            c.registration_status, c.subscription_status, c.created_date, c.approved_at,
            EXTRACT(EPOCH FROM (NOW() AT TIME ZONE 'UTC' - c.created_date)) / 3600
                AS hours_since_submission
        FROM center c
        {where}
        ORDER BY
            CASE c.registration_status
                WHEN 'Submitted'   THEN 1
                WHEN 'UnderReview' THEN 2
                ELSE 3
            END,
            c.created_date ASC
        LIMIT ${idx} OFFSET ${idx + 1}
        """,
        *params, size, offset,
    )

    items = []
    for r in rows:
        hours = float(r["hours_since_submission"] or 0)
        items.append(
            CenterSummary(
                id=r["id"],
                name=r["name"],
                category=r["category"],
                owner_name=r["owner_name"],
                mobile_number=r["mobile_number"],
                city=r["city"],
                registration_status=r["registration_status"],
                subscription_status=r["subscription_status"],
                created_date=r["created_date"],
                approved_at=r["approved_at"],
                hours_since_submission=round(hours, 1),
                is_approaching_sla=(
                    r["registration_status"] in ("Submitted", "UnderReview")
                    and hours >= SLA_WARN_HOURS
                ),
            )
        )

    return PagedResponse(
        items=items,
        total=total,
        page=page,
        size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


# ---------------------------------------------------------------------------
# CREATE
# ---------------------------------------------------------------------------
@router.post("", response_model=CenterDetail, status_code=201)
async def create_center(
    request: CenterCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> CenterDetail:
    """Admin-initiated center creation. Starts in Submitted status."""
    new_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO center (
            id, name, category, owner_name, mobile_number,
            address, city, state, pincode, description,
            operating_days, operating_timings, age_group,
            fee_range, facilities, social_link, website_link,
            latitude, longitude,
            registration_status, subscription_status,
            created_by, created_date, modified_by, modified_date,
            is_active, is_deleted, version_number, source_system
        ) VALUES (
            $1, $2, $3, $4, $5,
            $6, $7, $8, $9, $10,
            $11, $12, $13,
            $14, $15, $16, $17,
            $18, $19,
            'Submitted', 'Trial',
            $20, NOW() AT TIME ZONE 'UTC', $20, NOW() AT TIME ZONE 'UTC',
            TRUE, FALSE, 1, 'AdminPortal'
        )
        """,
        new_id, request.name, request.category, request.owner_name, request.mobile_number,
        request.address, request.city,
        getattr(request, "state", "Tamil Nadu") or "Tamil Nadu",
        getattr(request, "pincode", None),
        request.description,
        request.operating_days, request.operating_timings, request.age_group,
        request.fee_range, request.facilities, request.social_link, request.website_link,
        request.latitude, request.longitude,
        admin.user_id,
    )
    await write_audit_log(db, admin.user_id, "Create", "Center", new_id, "{}", request.model_dump_json())
    r = await get_center_or_404(db, new_id)
    return CenterDetail(
        id=r["id"], name=r["name"], category=r["category"],
        owner_name=r["owner_name"], mobile_number=r["mobile_number"], city=r["city"],
        state=r["state"] if "state" in r.keys() else "Tamil Nadu",
        pincode=r["pincode"] if "pincode" in r.keys() else None,
        registration_status=r["registration_status"],
        subscription_status=r["subscription_status"],
        created_date=r["created_date"], approved_at=r["approved_at"],
        hours_since_submission=0, is_approaching_sla=False,
        address=r["address"],
        latitude=float(r["latitude"]) if r["latitude"] else None,
        longitude=float(r["longitude"]) if r["longitude"] else None,
        operating_days=r["operating_days"], operating_timings=r["operating_timings"],
        age_group=r["age_group"], description=r["description"],
        logo_url=r["logo_url"], cover_image_url=r["cover_image_url"],
        fee_range=r["fee_range"], facilities=r["facilities"],
        social_link=r["social_link"], website_link=r["website_link"],
        rejection_reason=None, rejection_category=None, admin_notes=None,
        registration_cert_url=r["registration_cert_url"],
        premises_proof_url=r["premises_proof_url"],
        owner_id_proof_url=r["owner_id_proof_url"],
        safety_cert_url=r["safety_cert_url"],
        trial_ends_at=r["trial_ends_at"],
        suspended_at=r["suspended_at"],
        data_purge_at=r["data_purge_at"],
    )


# ---------------------------------------------------------------------------
# DETAIL
# ---------------------------------------------------------------------------
@router.get("/{center_id}", response_model=CenterDetail)
async def get_center_detail(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> CenterDetail:
    r = await get_center_or_404(db, center_id)
    hours: Optional[float] = None
    if r["registration_status"] in ("Submitted", "UnderReview"):
        hours = _hours_since(r["created_date"])

    return CenterDetail(
        id=r["id"], name=r["name"], category=r["category"],
        owner_name=r["owner_name"], mobile_number=r["mobile_number"], city=r["city"],
        state=r["state"] if "state" in r.keys() else "Tamil Nadu",
        pincode=r["pincode"] if "pincode" in r.keys() else None,
        registration_status=r["registration_status"],
        subscription_status=r["subscription_status"],
        created_date=r["created_date"], approved_at=r["approved_at"],
        hours_since_submission=round(hours, 1) if hours is not None else None,
        is_approaching_sla=(hours is not None and hours >= SLA_WARN_HOURS),
        address=r["address"],
        latitude=float(r["latitude"]) if r["latitude"] else None,
        longitude=float(r["longitude"]) if r["longitude"] else None,
        operating_days=r["operating_days"], operating_timings=r["operating_timings"],
        age_group=r["age_group"], description=r["description"],
        logo_url=r["logo_url"], cover_image_url=r["cover_image_url"],
        fee_range=r["fee_range"], facilities=r["facilities"],
        social_link=r["social_link"], website_link=r["website_link"],
        rejection_reason=r["rejection_reason"], rejection_category=r["rejection_category"],
        admin_notes=r["admin_notes"],
        registration_cert_url=r["registration_cert_url"],
        premises_proof_url=r["premises_proof_url"],
        owner_id_proof_url=r["owner_id_proof_url"],
        safety_cert_url=r["safety_cert_url"],
        trial_ends_at=r["trial_ends_at"],
        suspended_at=r["suspended_at"],
        data_purge_at=r["data_purge_at"],
    )


# ---------------------------------------------------------------------------
# MARK UNDER REVIEW
# ---------------------------------------------------------------------------
@router.patch("/{center_id}/review", response_model=SuccessResponse)
async def mark_under_review(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await get_center_or_404(db, center_id, select="id, name, registration_status")
    if center["registration_status"] != "Submitted":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Center is '{center['registration_status']}'; expected 'Submitted'.",
        )

    await db.execute(
        """
        UPDATE center SET registration_status='UnderReview',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
            version_number=version_number+1
        WHERE id=$2
        """,
        admin.user_id, center_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          '{"registration_status":"Submitted"}',
                          '{"registration_status":"UnderReview"}')
    await notify_center_owner(
        db=db, center_id=center_id, notification_type="Push",
        category="CenterApproval",
        title="Application Under Review",
        body=f"Your center '{center['name']}' is now under review. We'll notify you within 24 hours.",
        reference_type="Center", reference_id=center_id,
        admin_user_id=admin.user_id,
    )
    return SuccessResponse(message="Center marked as Under Review.")


# ---------------------------------------------------------------------------
# APPROVE
# ---------------------------------------------------------------------------
@router.patch("/{center_id}/approve", response_model=SuccessResponse)
async def approve_center(
    center_id: uuid.UUID,
    request: CenterApproveRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await get_center_or_404(db, center_id)

    if center["registration_status"] not in ("Submitted", "UnderReview"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot approve center with status '{center['registration_status']}'.",
        )

    # Extra doc check for Daycare / KidsSchool
    if requires_daycare_docs(center["category"]) and not daycare_docs_complete(center):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Missing required verification documents for Daycare/KidsSchool category.",
        )

    # Warn if map pin missing
    map_pin_missing = not center["latitude"] or not center["longitude"]

    trial_cfg = await db.fetchrow(
        "SELECT config_value FROM app_config WHERE config_key='TrialPeriodDays' AND is_active=TRUE"
    )
    trial_days = int(trial_cfg["config_value"]) if trial_cfg else 90

    await db.execute(
        """
        UPDATE center SET
            registration_status = 'Approved',
            approved_at         = NOW() AT TIME ZONE 'UTC',
            trial_ends_at       = NOW() AT TIME ZONE 'UTC' + ($1 || ' days')::INTERVAL,
            admin_notes         = COALESCE($2, admin_notes),
            modified_by         = $3,
            modified_date       = NOW() AT TIME ZONE 'UTC',
            version_number      = version_number + 1
        WHERE id = $4
        """,
        str(trial_days), request.admin_notes, admin.user_id, center_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          f'{{"registration_status":"{center["registration_status"]}"}}',
                          '{"registration_status":"Approved"}')
    await notify_center_owner(
        db=db, center_id=center_id, notification_type="Push",
        category="CenterApproval",
        title="Center Approved!",
        body=f"Your center '{center['name']}' has been approved. Start managing your center now.",
        reference_type="Center", reference_id=center_id,
        admin_user_id=admin.user_id,
    )

    warning = (
        "Map pin is missing — discovery listing will be withheld until a pin is added."
        if map_pin_missing else None
    )
    return SuccessResponse(message="Center approved successfully.", data={"warning": warning})


# ---------------------------------------------------------------------------
# REJECT
# ---------------------------------------------------------------------------
@router.patch("/{center_id}/reject", response_model=SuccessResponse)
async def reject_center(
    center_id: uuid.UUID,
    request: CenterRejectRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await get_center_or_404(db, center_id, select="id, name, registration_status")
    if center["registration_status"] not in ("Submitted", "UnderReview"):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Cannot reject center with status '{center['registration_status']}'.",
        )

    await db.execute(
        """
        UPDATE center SET
            registration_status = 'Rejected',
            rejection_category  = $1,
            rejection_reason    = $2,
            admin_notes         = COALESCE($3, admin_notes),
            modified_by         = $4,
            modified_date       = NOW() AT TIME ZONE 'UTC',
            version_number      = version_number + 1
        WHERE id = $5
        """,
        request.rejection_category, request.rejection_reason,
        request.admin_notes, admin.user_id, center_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          f'{{"registration_status":"{center["registration_status"]}"}}',
                          f'{{"registration_status":"Rejected","category":"{request.rejection_category}"}}')
    await notify_center_owner(
        db=db, center_id=center_id, notification_type="Push",
        category="CenterApproval",
        title="Registration Needs Attention",
        body=(
            f"Your center '{center['name']}' registration was not approved. "
            f"Reason: {request.rejection_reason}. Please update and resubmit."
        ),
        reference_type="Center", reference_id=center_id,
        admin_user_id=admin.user_id,
    )
    return SuccessResponse(message="Center rejected. Owner notified with reason.")


# ---------------------------------------------------------------------------
# SUSPEND
# ---------------------------------------------------------------------------
@router.patch("/{center_id}/suspend", response_model=SuccessResponse)
async def suspend_center(
    center_id: uuid.UUID,
    request: CenterSuspendRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await get_center_or_404(db, center_id, select="id, name, registration_status")
    if center["registration_status"] != "Approved":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only Approved centers can be suspended."
        )

    purge_cfg = await db.fetchrow(
        "SELECT config_value FROM app_config WHERE config_key='DataPurgeDelayDays' AND is_active=TRUE"
    )
    purge_days = int(purge_cfg["config_value"]) if purge_cfg else 30

    await db.execute(
        """
        UPDATE center SET
            registration_status = 'Suspended',
            subscription_status = 'Suspended',
            suspended_at        = NOW() AT TIME ZONE 'UTC',
            data_purge_at       = NOW() AT TIME ZONE 'UTC' + ($1 || ' days')::INTERVAL,
            admin_notes         = COALESCE($2, admin_notes),
            modified_by         = $3,
            modified_date       = NOW() AT TIME ZONE 'UTC',
            version_number      = version_number + 1
        WHERE id = $4
        """,
        str(purge_days), request.admin_notes, admin.user_id, center_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          '{"registration_status":"Approved"}',
                          '{"registration_status":"Suspended"}')
    await notify_center_owner(
        db=db, center_id=center_id, notification_type="Push",
        category="CenterSuspension",
        title="Center Suspended",
        body=(
            f"Your center '{center['name']}' has been suspended. "
            f"Reason: {request.reason}. Data retained for {purge_days} days."
        ),
        reference_type="Center", reference_id=center_id,
        admin_user_id=admin.user_id,
    )
    return SuccessResponse(
        message=f"Center suspended. Data purge scheduled in {purge_days} days.",
        data={"purge_days": purge_days},
    )


# ---------------------------------------------------------------------------
# REINSTATE
# ---------------------------------------------------------------------------
@router.patch("/{center_id}/reinstate", response_model=SuccessResponse)
async def reinstate_center(
    center_id: uuid.UUID,
    request: CenterReinstateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await get_center_or_404(
        db, center_id, select="id, name, registration_status, data_purge_at"
    )
    if center["registration_status"] != "Suspended":
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, "Only Suspended centers can be reinstated."
        )

    if center["data_purge_at"]:
        purge_dt = center["data_purge_at"]
        if purge_dt.tzinfo is None:
            purge_dt = purge_dt.replace(tzinfo=timezone.utc)
        if datetime.now(timezone.utc) > purge_dt:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Reinstatement window has expired (30 days). Center must register fresh.",
            )

    await db.execute(
        """
        UPDATE center SET
            registration_status = 'Approved',
            subscription_status = 'Active',
            suspended_at        = NULL,
            data_purge_at       = NULL,
            admin_notes         = COALESCE($1, admin_notes),
            modified_by         = $2,
            modified_date       = NOW() AT TIME ZONE 'UTC',
            version_number      = version_number + 1
        WHERE id = $3
        """,
        request.admin_notes, admin.user_id, center_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          '{"registration_status":"Suspended"}',
                          '{"registration_status":"Approved"}')
    await notify_center_owner(
        db=db, center_id=center_id, notification_type="Push",
        category="CenterReinstatement",
        title="Center Reinstated",
        body=f"Your center '{center['name']}' has been reinstated and is active again.",
        reference_type="Center", reference_id=center_id,
        admin_user_id=admin.user_id,
    )
    return SuccessResponse(message="Center reinstated successfully.")


# ---------------------------------------------------------------------------
# EDIT CENTER
# ---------------------------------------------------------------------------
@router.patch("/{center_id}", response_model=SuccessResponse)
async def update_center(
    center_id: uuid.UUID,
    request: CenterUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    await get_center_or_404(db, center_id, select="id")

    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update.")

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
    values = list(fields.values())
    idx = len(values) + 1
    values.append(admin.user_id)  # modified_by
    values.append(center_id)      # WHERE id

    await db.execute(
        f"""
        UPDATE center SET {set_clauses},
            modified_by = ${idx},
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = ${idx + 1}
        """,
        *values,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          "{}", str(fields))
    return SuccessResponse(message="Center updated successfully.")


# ---------------------------------------------------------------------------
# CENTER USERS
# ---------------------------------------------------------------------------
@router.get("/{center_id}/users", response_model=list[CenterUserSummary])
async def get_center_users(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> list[CenterUserSummary]:
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT u.id AS user_id, u.name, u.email, u.mobile_number, u.status,
               ur.role, ur.created_date AS joined_at
        FROM user_role ur
        JOIN "user" u ON u.id = ur.user_id
        WHERE ur.center_id = $1
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND u.is_deleted = FALSE
        ORDER BY ur.role, u.name
        """,
        center_id,
    )

    return [
        CenterUserSummary(
            user_id=r["user_id"], name=r["name"], email=r["email"],
            mobile_number=r["mobile_number"], role=r["role"],
            status=r["status"], joined_at=r["joined_at"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# ADD USER TO CENTER
# ---------------------------------------------------------------------------
@router.post("/{center_id}/users", response_model=SuccessResponse, status_code=201)
async def add_center_user(
    center_id: uuid.UUID,
    request: AddCenterUserRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """Look up a user by mobile number and link them to this center with the given role."""
    await get_center_or_404(db, center_id, select="id")

    if request.role not in ("Owner", "Teacher", "Staff"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "role must be Owner, Teacher, or Staff")

    user = await db.fetchrow(
        'SELECT id, name FROM "user" WHERE mobile_number = $1 AND is_deleted = FALSE',
        request.mobile_number,
    )
    if not user:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No user found with mobile number {request.mobile_number}. "
            "Ask the user to register first.",
        )

    existing = await db.fetchrow(
        """SELECT id FROM user_role
           WHERE user_id=$1 AND center_id=$2 AND role=$3
             AND is_active=TRUE AND is_deleted=FALSE""",
        user["id"], center_id, request.role,
    )
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"{user['name']} already has role '{request.role}' in this center.",
        )

    await db.execute(
        """
        INSERT INTO user_role (id, user_id, role, center_id, assigned_at, created_by, created_date,
                               is_active, is_deleted, version_number, source_system)
        VALUES (gen_random_uuid(), $1, $2, $3, NOW() AT TIME ZONE 'UTC', $4,
                NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'AdminPortal')
        """,
        user["id"], request.role, center_id, admin.user_id,
    )
    await write_audit_log(db, admin.user_id, "Create", "UserRole", center_id,
                          "{}", f'{{"user_id":"{user["id"]}","role":"{request.role}"}}')
    return SuccessResponse(message=f"{user['name']} added as {request.role}.")


# ---------------------------------------------------------------------------
# BATCHES LIST
# ---------------------------------------------------------------------------
@router.get("/{center_id}/batches", response_model=list[BatchSummary])
async def list_batches(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> list[BatchSummary]:
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT b.id, b.course_name, b.batch_name, b.category_type,
               b.class_days, b.start_time::text, b.end_time::text,
               b.strength_limit, b.fee_amount, b.is_active,
               b.created_date, b.teacher_id,
               u.name AS teacher_name
        FROM batch b
        LEFT JOIN center_teacher ct ON ct.id = b.teacher_id AND ct.is_deleted = FALSE
        LEFT JOIN "user" u          ON u.id  = ct.user_id
        WHERE b.center_id = $1 AND b.is_deleted = FALSE
        ORDER BY b.is_active DESC, b.course_name, b.batch_name
        """,
        center_id,
    )

    return [
        BatchSummary(
            id=r["id"], course_name=r["course_name"], batch_name=r["batch_name"],
            category_type=r["category_type"], class_days=r["class_days"],
            start_time=r["start_time"], end_time=r["end_time"],
            strength_limit=r["strength_limit"], fee_amount=float(r["fee_amount"]),
            is_active=r["is_active"], teacher_name=r["teacher_name"],
            teacher_id=r["teacher_id"], created_date=r["created_date"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# CREATE BATCH
# ---------------------------------------------------------------------------
@router.post("/{center_id}/batches", response_model=BatchSummary, status_code=201)
async def create_batch(
    center_id: uuid.UUID,
    request: BatchCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> BatchSummary:
    await get_center_or_404(db, center_id, select="id")

    # Validate teacher belongs to this center
    if request.teacher_id:
        ct = await db.fetchrow(
            "SELECT id FROM center_teacher WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
            request.teacher_id, center_id,
        )
        if not ct:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                "Selected teacher does not belong to this center.",
            )

    new_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO batch (
            id, center_id, teacher_id, course_name, batch_name, category_type,
            class_days, start_time, end_time, strength_limit, fee_amount,
            created_by, created_date, is_active, is_deleted, version_number, source_system
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8::time, $9::time, $10, $11,
            $12, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'AdminPortal'
        )
        """,
        new_id, center_id, request.teacher_id,
        request.course_name, request.batch_name, request.category_type,
        request.class_days, request.start_time, request.end_time,
        request.strength_limit, request.fee_amount,
        admin.user_id,
    )
    await write_audit_log(db, admin.user_id, "Create", "Batch", new_id,
                          "{}", request.model_dump_json())

    r = await db.fetchrow(
        """
        SELECT b.id, b.course_name, b.batch_name, b.category_type,
               b.class_days, b.start_time::text, b.end_time::text,
               b.strength_limit, b.fee_amount, b.is_active,
               b.created_date, b.teacher_id,
               u.name AS teacher_name
        FROM batch b
        LEFT JOIN center_teacher ct ON ct.id = b.teacher_id AND ct.is_deleted = FALSE
        LEFT JOIN "user" u          ON u.id  = ct.user_id
        WHERE b.id = $1
        """,
        new_id,
    )
    return BatchSummary(
        id=r["id"], course_name=r["course_name"], batch_name=r["batch_name"],
        category_type=r["category_type"], class_days=r["class_days"],
        start_time=r["start_time"], end_time=r["end_time"],
        strength_limit=r["strength_limit"], fee_amount=float(r["fee_amount"]),
        is_active=r["is_active"], teacher_name=r["teacher_name"],
        teacher_id=r["teacher_id"], created_date=r["created_date"],
    )


# ---------------------------------------------------------------------------
# LOGO UPLOAD
# ---------------------------------------------------------------------------
UPLOADS_DIR = Path(__file__).resolve().parent.parent.parent.parent / "uploads" / "centers"
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB


@router.post("/{center_id}/logo", response_model=SuccessResponse)
async def upload_logo(
    center_id: uuid.UUID,
    request: Request,
    file: UploadFile = File(...),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    await get_center_or_404(db, center_id, select="id")

    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Only JPEG, PNG, WebP or GIF images are allowed.")

    contents = await file.read()
    if len(contents) > MAX_SIZE_BYTES:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Image must be under 2 MB.")

    ext = Path(file.filename or "logo.jpg").suffix.lower() or ".jpg"
    filename = f"{center_id}_{uuid.uuid4().hex[:8]}{ext}"
    dest = UPLOADS_DIR / filename
    UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

    with open(dest, "wb") as f:
        f.write(contents)

    base_url = str(request.base_url).rstrip("/")
    logo_url = f"{base_url}/uploads/centers/{filename}"

    await db.execute(
        """
        UPDATE center SET logo_url=$1, modified_by=$2,
            modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$3
        """,
        logo_url, admin.user_id, center_id,
    )
    await write_audit_log(db, admin.user_id, "Update", "Center", center_id,
                          "{}", f'{{"logo_url":"{logo_url}"}}')

    return SuccessResponse(message="Logo uploaded successfully.", data={"logo_url": logo_url})


# ---------------------------------------------------------------------------
# BULK APPROVE
# ---------------------------------------------------------------------------
@router.post("/bulk-approve", response_model=SuccessResponse)
async def bulk_approve(
    request: BulkApproveRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """Approve multiple centers at once (web only). Client must show confirmation dialog."""
    if not request.center_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No center IDs provided.")

    trial_cfg = await db.fetchrow(
        "SELECT config_value FROM app_config WHERE config_key='TrialPeriodDays' AND is_active=TRUE"
    )
    trial_days = int(trial_cfg["config_value"]) if trial_cfg else 90

    approved, skipped = [], []
    for cid in request.center_ids:
        center = await db.fetchrow(
            "SELECT id, name, registration_status, category, registration_cert_url, "
            "premises_proof_url, owner_id_proof_url, safety_cert_url "
            "FROM center WHERE id=$1 AND is_deleted=FALSE",
            cid,
        )
        if not center or center["registration_status"] not in ("Submitted", "UnderReview"):
            skipped.append(str(cid))
            continue
        if requires_daycare_docs(center["category"]) and not daycare_docs_complete(center):
            skipped.append(str(cid))
            continue

        await db.execute(
            """
            UPDATE center SET
                registration_status = 'Approved',
                approved_at         = NOW() AT TIME ZONE 'UTC',
                trial_ends_at       = NOW() AT TIME ZONE 'UTC' + ($1 || ' days')::INTERVAL,
                admin_notes         = COALESCE($2, admin_notes),
                modified_by         = $3,
                modified_date       = NOW() AT TIME ZONE 'UTC',
                version_number      = version_number + 1
            WHERE id = $4
            """,
            str(trial_days), request.admin_notes, admin.user_id, cid,
        )
        await notify_center_owner(
            db=db, center_id=cid, notification_type="Push",
            category="CenterApproval",
            title="Center Approved!",
            body=f"Your center '{center['name']}' has been approved. Start managing your center.",
            reference_type="Center", reference_id=cid,
            admin_user_id=admin.user_id,
        )
        approved.append(str(cid))

    return SuccessResponse(
        message=f"Bulk approval done. Approved: {len(approved)}, Skipped: {len(skipped)}.",
        data={"approved": approved, "skipped": skipped},
    )
