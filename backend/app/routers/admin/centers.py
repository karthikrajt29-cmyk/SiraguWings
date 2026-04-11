import uuid
from datetime import datetime, timezone
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.center import (
    BulkApproveRequest,
    CenterApproveRequest,
    CenterDetail,
    CenterRejectRequest,
    CenterReinstateRequest,
    CenterSummary,
    CenterSuspendRequest,
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
