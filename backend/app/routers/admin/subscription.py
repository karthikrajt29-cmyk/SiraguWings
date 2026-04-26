"""Owner-level subscription, storage, and billing administration.

A subscription is owned by an Owner (user) and covers ALL of the centers that
owner manages. Student-count limits and storage limits aggregate across the
owner's whole portfolio.
"""
import calendar
import uuid
from datetime import date
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import PagedResponse, SuccessResponse
from app.schemas.subscription import (
    AssignPlanRequest,
    BillingHistoryEntry,
    OwnerCenterRef,
    OwnerSubscriptionDetail,
    OwnerSubscriptionSummary,
    PlanCreateRequest,
    PlanUpdateRequest,
    PurchaseStorageRequest,
    StorageAddOn,
    StorageAddOnCreateRequest,
    StorageAddOnUpdateRequest,
    SubscriptionDashboard,
    SubscriptionPlan,
    UpdateBillingStatusRequest,
)

router = APIRouter()


# ---------------------------------------------------------------------------
# HELPERS
# ---------------------------------------------------------------------------

async def _get_plan(db: asyncpg.Connection, plan_id: uuid.UUID) -> asyncpg.Record:
    row = await db.fetchrow(
        "SELECT * FROM subscription_plan WHERE id=$1 AND is_active=TRUE", plan_id
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Subscription plan not found.")
    return row


async def _aggregate_student_count(db: asyncpg.Connection, owner_id: uuid.UUID) -> int:
    """Live-count active students across all of the owner's non-deleted centers."""
    val: int = await db.fetchval(
        """
        SELECT COUNT(DISTINCT cs.student_id)
          FROM center_student cs
          JOIN center c ON c.id = cs.center_id
         WHERE c.owner_id = $1
           AND c.is_deleted = FALSE
           AND cs.is_deleted = FALSE
           AND cs.status = 'Active'
        """,
        owner_id,
    )
    return int(val or 0)


async def _build_summary(db: asyncpg.Connection, owner_id: uuid.UUID) -> dict:
    """Build the full subscription summary dict for one owner."""
    sub = await db.fetchrow(
        """
        SELECT os.id, os.owner_id,
               u.name AS owner_name, u.email AS owner_email, u.mobile_number AS owner_mobile,
               os.plan_id, sp.name AS plan_name, sp.price AS plan_price,
               sp.student_limit, sp.storage_limit_mb, sp.extra_student_price,
               os.start_date, os.end_date, os.status
          FROM owner_subscription os
          JOIN "user" u            ON u.id  = os.owner_id
          JOIN subscription_plan sp ON sp.id = os.plan_id
         WHERE os.owner_id = $1 AND os.status = 'Active' AND os.is_deleted = FALSE
         LIMIT 1
        """,
        owner_id,
    )
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active subscription found for this owner.")

    student_count = await _aggregate_student_count(db, owner_id)
    # storage_used is a future feature — left at 0 until upload accounting is wired.
    storage_used = 0.0

    center_count: int = await db.fetchval(
        "SELECT COUNT(*) FROM center WHERE owner_id=$1 AND is_deleted=FALSE",
        owner_id,
    ) or 0

    addons = await db.fetch(
        """
        SELECT osp.id, ao.name, osp.storage_mb, osp.price, osp.start_date, osp.end_date, osp.status
          FROM owner_storage_purchase osp
          JOIN storage_add_on ao ON ao.id = osp.add_on_id
         WHERE osp.owner_id = $1 AND osp.status = 'Active' AND osp.is_deleted = FALSE
         ORDER BY osp.start_date DESC
        """,
        owner_id,
    )
    addon_storage_mb = sum(a["storage_mb"] for a in addons)
    addon_amount     = sum(float(a["price"]) for a in addons)
    total_storage_mb = sub["storage_limit_mb"] + addon_storage_mb

    extra_students = max(0, student_count - sub["student_limit"])
    extra_amount   = extra_students * float(sub["extra_student_price"])
    estimated_total = float(sub["plan_price"]) + extra_amount + addon_amount

    return {
        "owner_id":            owner_id,
        "owner_name":          sub["owner_name"],
        "owner_email":         sub["owner_email"],
        "owner_mobile":        sub["owner_mobile"],
        "plan_id":             sub["plan_id"],
        "plan_name":           sub["plan_name"],
        "plan_price":          float(sub["plan_price"]),
        "student_limit":       sub["student_limit"],
        "storage_limit_mb":    sub["storage_limit_mb"],
        "extra_student_price": float(sub["extra_student_price"]),
        "start_date":          sub["start_date"],
        "end_date":            sub["end_date"],
        "status":              sub["status"],
        "center_count":        int(center_count),
        "current_student_count": student_count,
        "storage_used_mb":     storage_used,
        "addon_storage_mb":    addon_storage_mb,
        "total_storage_mb":    total_storage_mb,
        "extra_students":      extra_students,
        "extra_amount":        extra_amount,
        "storage_addon_amount": addon_amount,
        "estimated_total":     estimated_total,
        "storage_purchases":   [dict(a) for a in addons],
    }


# ---------------------------------------------------------------------------
# PLANS (catalogue)
# ---------------------------------------------------------------------------

@router.get("/plans", response_model=list[SubscriptionPlan])
async def list_plans(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> list[SubscriptionPlan]:
    rows = await db.fetch(
        "SELECT * FROM subscription_plan ORDER BY sort_order"
    )
    return [SubscriptionPlan(**dict(r)) for r in rows]


@router.post("/plans", response_model=SubscriptionPlan, status_code=201)
async def create_plan(
    request: PlanCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SubscriptionPlan:
    existing = await db.fetchrow(
        "SELECT id FROM subscription_plan WHERE name=$1", request.name
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, f"A plan named '{request.name}' already exists.")
    row = await db.fetchrow(
        """
        INSERT INTO subscription_plan
            (name, price, student_limit, storage_limit_mb, extra_student_price,
             sort_order, is_active, created_date)
        VALUES ($1,$2,$3,$4,$5,$6,$7, NOW() AT TIME ZONE 'UTC')
        RETURNING *
        """,
        request.name, request.price, request.student_limit,
        request.storage_limit_mb, request.extra_student_price,
        request.sort_order, request.is_active,
    )
    return SubscriptionPlan(**dict(row))


@router.patch("/plans/{plan_id}", response_model=SubscriptionPlan)
async def update_plan(
    plan_id: uuid.UUID,
    request: PlanUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SubscriptionPlan:
    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update.")
    set_clauses = ", ".join(f"{k}=${i+2}" for i, k in enumerate(fields))
    values = [plan_id] + list(fields.values())
    row = await db.fetchrow(
        f"UPDATE subscription_plan SET {set_clauses}, modified_date=NOW() AT TIME ZONE 'UTC' WHERE id=$1 RETURNING *",
        *values,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found.")
    return SubscriptionPlan(**dict(row))


@router.delete("/plans/{plan_id}", response_model=SuccessResponse)
async def delete_plan(
    plan_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    in_use = await db.fetchval(
        "SELECT COUNT(*) FROM owner_subscription WHERE plan_id=$1 AND status='Active' AND is_deleted=FALSE",
        plan_id,
    )
    if in_use:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Plan is active on {in_use} owner(s). Reassign those subscriptions first.",
        )
    result = await db.execute(
        "UPDATE subscription_plan SET is_active=FALSE, modified_date=NOW() WHERE id=$1",
        plan_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Plan not found.")
    return SuccessResponse(message="Plan deactivated.")


# ---------------------------------------------------------------------------
# STORAGE ADD-ONS (catalogue)
# ---------------------------------------------------------------------------

@router.get("/storage-addons", response_model=list[StorageAddOn])
async def list_storage_addons(
    include_inactive: bool = Query(False),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> list[StorageAddOn]:
    rows = await db.fetch(
        "SELECT * FROM storage_add_on" + (" WHERE is_active=TRUE" if not include_inactive else "") + " ORDER BY sort_order"
    )
    return [StorageAddOn(**dict(r)) for r in rows]


@router.post("/storage-addons", response_model=StorageAddOn, status_code=201)
async def create_storage_addon(
    request: StorageAddOnCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> StorageAddOn:
    existing = await db.fetchrow(
        "SELECT id FROM storage_add_on WHERE name=$1", request.name
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, f"An add-on named '{request.name}' already exists.")
    row = await db.fetchrow(
        """
        INSERT INTO storage_add_on (name, storage_mb, price, sort_order, is_active, created_date)
        VALUES ($1,$2,$3,$4,$5, NOW() AT TIME ZONE 'UTC')
        RETURNING *
        """,
        request.name, request.storage_mb, request.price, request.sort_order, request.is_active,
    )
    return StorageAddOn(**dict(row))


@router.patch("/storage-addons/{addon_id}", response_model=StorageAddOn)
async def update_storage_addon(
    addon_id: uuid.UUID,
    request: StorageAddOnUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> StorageAddOn:
    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update.")
    set_clauses = ", ".join(f"{k}=${i+2}" for i, k in enumerate(fields))
    values = [addon_id] + list(fields.values())
    row = await db.fetchrow(
        f"UPDATE storage_add_on SET {set_clauses} WHERE id=$1 RETURNING *",
        *values,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Add-on not found.")
    return StorageAddOn(**dict(row))


@router.delete("/storage-addons/{addon_id}", response_model=SuccessResponse)
async def delete_storage_addon(
    addon_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    result = await db.execute(
        "UPDATE storage_add_on SET is_active=FALSE WHERE id=$1", addon_id
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Add-on not found.")
    return SuccessResponse(message="Add-on deactivated.")


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------

@router.get("/dashboard", response_model=SubscriptionDashboard)
async def subscription_dashboard(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SubscriptionDashboard:
    total_centers = await db.fetchval(
        "SELECT COUNT(*) FROM center WHERE is_deleted=FALSE AND registration_status='Approved'"
    )
    total_owners = await db.fetchval(
        "SELECT COUNT(DISTINCT owner_id) FROM center WHERE owner_id IS NOT NULL AND is_deleted=FALSE"
    )
    active_subs = await db.fetchval(
        "SELECT COUNT(*) FROM owner_subscription WHERE status='Active' AND is_deleted=FALSE"
    )

    plan_rows = await db.fetch(
        """
        SELECT sp.name, sp.price, COUNT(os.id) AS owner_count
          FROM subscription_plan sp
          LEFT JOIN owner_subscription os
                 ON os.plan_id = sp.id AND os.status='Active' AND os.is_deleted=FALSE
         GROUP BY sp.id, sp.name, sp.price
         ORDER BY sp.sort_order
        """
    )

    free_count = next((r["owner_count"] for r in plan_rows if r["name"] == "Free"), 0)
    paid_count = sum(r["owner_count"] for r in plan_rows if r["name"] != "Free")
    mrr = sum(float(r["price"]) * r["owner_count"] for r in plan_rows if r["name"] != "Free")

    this_month = date.today().replace(day=1)
    extra_rev = await db.fetchval(
        "SELECT COALESCE(SUM(extra_amount),0) FROM owner_billing_history WHERE billing_month=$1 AND is_deleted=FALSE",
        this_month,
    ) or 0.0
    storage_rev = await db.fetchval(
        "SELECT COALESCE(SUM(storage_amount),0) FROM owner_billing_history WHERE billing_month=$1 AND is_deleted=FALSE",
        this_month,
    ) or 0.0

    plan_breakdown = [
        {"name": r["name"], "count": r["owner_count"], "revenue": float(r["price"]) * r["owner_count"]}
        for r in plan_rows
    ]

    return SubscriptionDashboard(
        total_owners=total_owners or 0,
        total_centers=total_centers or 0,
        active_subscriptions=active_subs or 0,
        free_plan_count=free_count,
        paid_plan_count=paid_count,
        mrr=mrr,
        total_extra_student_revenue=float(extra_rev),
        total_storage_addon_revenue=float(storage_rev),
        plan_breakdown=plan_breakdown,
    )


# ---------------------------------------------------------------------------
# LIST ALL OWNER SUBSCRIPTIONS
# ---------------------------------------------------------------------------

@router.get("/owners", response_model=PagedResponse[OwnerSubscriptionSummary])
async def list_owner_subscriptions(
    search: Optional[str] = Query(None),
    plan_name: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[OwnerSubscriptionSummary]:
    where = "WHERE os.status='Active' AND os.is_deleted=FALSE"
    params: list = []
    idx = 1

    if search:
        where += f" AND (u.name ILIKE ${idx} OR u.email ILIKE ${idx})"
        params.append(f"%{search}%")
        idx += 1
    if plan_name:
        where += f" AND sp.name = ${idx}"
        params.append(plan_name)
        idx += 1

    total: int = await db.fetchval(
        f"""
        SELECT COUNT(*)
          FROM owner_subscription os
          JOIN "user" u             ON u.id  = os.owner_id
          JOIN subscription_plan sp ON sp.id = os.plan_id
        {where}
        """,
        *params,
    )

    rows = await db.fetch(
        f"""
        SELECT os.owner_id
          FROM owner_subscription os
          JOIN "user" u             ON u.id  = os.owner_id
          JOIN subscription_plan sp ON sp.id = os.plan_id
        {where}
        ORDER BY u.name
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, page * size,
    )

    items = []
    for r in rows:
        d = await _build_summary(db, r["owner_id"])
        items.append(OwnerSubscriptionSummary(**{k: v for k, v in d.items() if k != "storage_purchases"}))

    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


# ---------------------------------------------------------------------------
# GET ONE OWNER SUBSCRIPTION
# ---------------------------------------------------------------------------

@router.get("/owners/{owner_id}", response_model=OwnerSubscriptionDetail)
async def get_owner_subscription(
    owner_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> OwnerSubscriptionDetail:
    d = await _build_summary(db, owner_id)

    centers = await db.fetch(
        """
        SELECT c.id AS center_id, c.name AS center_name,
               COUNT(DISTINCT cs.student_id) FILTER
                 (WHERE cs.is_deleted=FALSE AND cs.status='Active') AS student_count
          FROM center c
          LEFT JOIN center_student cs ON cs.center_id = c.id
         WHERE c.owner_id = $1 AND c.is_deleted = FALSE
         GROUP BY c.id, c.name
         ORDER BY c.name
        """,
        owner_id,
    )
    d["centers"] = [
        OwnerCenterRef(
            center_id=r["center_id"],
            center_name=r["center_name"],
            student_count=int(r["student_count"] or 0),
        )
        for r in centers
    ]

    history = await db.fetch(
        """
        SELECT bh.id, bh.billing_month, bh.plan_name, bh.plan_amount,
               bh.student_count, bh.extra_students, bh.extra_amount,
               bh.storage_amount, bh.total_amount, bh.payment_status, bh.notes
          FROM owner_billing_history bh
         WHERE bh.owner_id = $1 AND bh.is_deleted = FALSE
         ORDER BY bh.billing_month DESC
         LIMIT 12
        """,
        owner_id,
    )
    d["billing_history"] = [dict(r) for r in history]
    return OwnerSubscriptionDetail(**d)


# ---------------------------------------------------------------------------
# ASSIGN / CHANGE PLAN  (with effective_date billing adjustment)
# ---------------------------------------------------------------------------

@router.post("/owners/{owner_id}/assign-plan", response_model=SuccessResponse)
async def assign_plan(
    owner_id: uuid.UUID,
    request: AssignPlanRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    plan = await _get_plan(db, request.plan_id)

    owner = await db.fetchrow(
        'SELECT id, name FROM "user" WHERE id=$1 AND is_deleted=FALSE', owner_id
    )
    if not owner:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Owner not found.")

    effective_date = request.effective_date or date.today()
    this_month = effective_date.replace(day=1)
    is_current_month = this_month == date.today().replace(day=1)

    async with db.transaction():
        # 1. Expire the current active subscription (if any)
        await db.execute(
            """
            UPDATE owner_subscription
               SET status='Expired', modified_date=NOW() AT TIME ZONE 'UTC'
             WHERE owner_id=$1 AND status='Active' AND is_deleted=FALSE
            """,
            owner_id,
        )

        # 2. Insert new subscription
        await db.execute(
            """
            INSERT INTO owner_subscription
                (owner_id, plan_id, start_date, end_date, status, assigned_by, notes, created_date)
            VALUES ($1, $2, $3, $4, 'Active', $5, $6, NOW() AT TIME ZONE 'UTC')
            """,
            owner_id, request.plan_id,
            effective_date, request.end_date,
            admin.user_id, request.notes,
        )

        # 2b. Sync denormalized center.subscription_status for all of owner's centers
        await db.execute(
            """
            UPDATE center
               SET subscription_status='Active', modified_by=$1,
                   modified_date=NOW() AT TIME ZONE 'UTC',
                   version_number=version_number+1
             WHERE owner_id=$2 AND is_deleted=FALSE AND subscription_status<>'Active'
            """,
            admin.user_id, owner_id,
        )

        # 3. Prorate the current month's bill if it already exists
        if is_current_month:
            student_count = await _aggregate_student_count(db, owner_id)
            addon_amount: float = await db.fetchval(
                """
                SELECT COALESCE(SUM(osp.price),0)
                  FROM owner_storage_purchase osp
                 WHERE osp.owner_id=$1 AND osp.status='Active' AND osp.is_deleted=FALSE
                """,
                owner_id,
            ) or 0.0

            extra_students = max(0, student_count - plan["student_limit"])
            extra_amount   = extra_students * float(plan["extra_student_price"])

            days_in_month = calendar.monthrange(effective_date.year, effective_date.month)[1]
            days_on_new   = days_in_month - effective_date.day + 1

            existing_bill = await db.fetchrow(
                "SELECT id FROM owner_billing_history WHERE owner_id=$1 AND billing_month=$2 AND is_deleted=FALSE",
                owner_id, this_month,
            )
            if existing_bill:
                prorated_new_plan = round(float(plan["price"]) * days_on_new / days_in_month, 2)
                prorated_extra    = round(extra_amount * days_on_new / days_in_month, 2)
                prorated_total    = round(prorated_new_plan + prorated_extra + addon_amount, 2)
                await db.execute(
                    """
                    UPDATE owner_billing_history
                       SET plan_name=$1, plan_amount=$2, student_count=$3,
                           extra_students=$4, extra_amount=$5,
                           storage_amount=$6, total_amount=$7,
                           notes=COALESCE(notes,'') || $8,
                           modified_date=NOW() AT TIME ZONE 'UTC'
                     WHERE id=$9
                    """,
                    plan["name"], prorated_new_plan, student_count,
                    extra_students, prorated_extra,
                    addon_amount, prorated_total,
                    f" [Plan changed to {plan['name']} from {effective_date} — prorated {days_on_new}/{days_in_month} days]",
                    existing_bill["id"],
                )

    await write_audit_log(
        db, admin.user_id, "AssignPlan", "OwnerSubscription", owner_id,
        "{}", f'{{"plan":"{plan["name"]}","effective_date":"{effective_date}"}}'
    )
    msg = f"Plan '{plan['name']}' assigned to {owner['name']} from {effective_date}."
    if is_current_month:
        msg += " Current month bill updated (prorated)."
    return SuccessResponse(message=msg)


# ---------------------------------------------------------------------------
# PURCHASE STORAGE ADD-ON FOR AN OWNER
# ---------------------------------------------------------------------------

@router.post("/owners/{owner_id}/storage", response_model=SuccessResponse)
async def purchase_storage(
    owner_id: uuid.UUID,
    request: PurchaseStorageRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    addon = await db.fetchrow(
        "SELECT * FROM storage_add_on WHERE id=$1 AND is_active=TRUE", request.add_on_id
    )
    if not addon:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Storage add-on not found.")

    owner = await db.fetchrow(
        'SELECT id FROM "user" WHERE id=$1 AND is_deleted=FALSE', owner_id
    )
    if not owner:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Owner not found.")

    await db.execute(
        """
        INSERT INTO owner_storage_purchase
            (owner_id, add_on_id, storage_mb, price, start_date, status, purchased_by, created_date)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Active', $5, NOW() AT TIME ZONE 'UTC')
        """,
        owner_id, request.add_on_id, addon["storage_mb"], addon["price"], admin.user_id,
    )
    return SuccessResponse(
        message=f"Storage add-on '{addon['name']}' ({addon['storage_mb']} MB) purchased."
    )


@router.patch("/owners/{owner_id}/storage/{purchase_id}", response_model=SuccessResponse)
async def update_storage_purchase(
    owner_id: uuid.UUID,
    purchase_id: uuid.UUID,
    body: dict,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    new_status = body.get("status")
    if new_status not in ("Expired", "Cancelled"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "status must be 'Expired' or 'Cancelled'.")
    result = await db.execute(
        """
        UPDATE owner_storage_purchase
           SET status=$1, modified_date=NOW() AT TIME ZONE 'UTC'
         WHERE id=$2 AND owner_id=$3 AND is_deleted=FALSE
        """,
        new_status, purchase_id, owner_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Storage purchase not found.")
    return SuccessResponse(message=f"Storage purchase marked as {new_status}.")


# ---------------------------------------------------------------------------
# BILLING HISTORY LIST
# ---------------------------------------------------------------------------

@router.get("/billing", response_model=PagedResponse[BillingHistoryEntry])
async def list_billing_history(
    owner_id: Optional[uuid.UUID] = Query(None),
    month: Optional[str] = Query(None, description="YYYY-MM format"),
    payment_status: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[BillingHistoryEntry]:
    where = "WHERE bh.is_deleted=FALSE"
    params: list = []
    idx = 1

    if owner_id:
        where += f" AND bh.owner_id=${idx}"
        params.append(owner_id)
        idx += 1
    if month:
        try:
            billing_month = date.fromisoformat(f"{month}-01")
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "month must be YYYY-MM format.")
        where += f" AND bh.billing_month=${idx}"
        params.append(billing_month)
        idx += 1
    if payment_status:
        where += f" AND bh.payment_status=${idx}"
        params.append(payment_status)
        idx += 1

    total: int = await db.fetchval(
        f"SELECT COUNT(*) FROM owner_billing_history bh {where}", *params
    )
    rows = await db.fetch(
        f"""
        SELECT bh.*, u.name AS owner_name
          FROM owner_billing_history bh
          JOIN "user" u ON u.id = bh.owner_id
        {where}
         ORDER BY bh.billing_month DESC, u.name
         LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, page * size,
    )
    items = [
        BillingHistoryEntry(
            id=r["id"], owner_id=r["owner_id"], owner_name=r["owner_name"],
            billing_month=r["billing_month"], plan_name=r["plan_name"],
            plan_amount=float(r["plan_amount"]), student_count=r["student_count"],
            extra_students=r["extra_students"], extra_amount=float(r["extra_amount"]),
            storage_amount=float(r["storage_amount"]), total_amount=float(r["total_amount"]),
            payment_status=r["payment_status"], notes=r["notes"],
            created_date=r["created_date"],
        )
        for r in rows
    ]
    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


@router.patch("/billing/{billing_id}", response_model=SuccessResponse)
async def update_billing_status(
    billing_id: uuid.UUID,
    request: UpdateBillingStatusRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    if request.payment_status not in ("Pending", "Paid", "Waived", "Overdue"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid payment_status.")
    result = await db.execute(
        """
        UPDATE owner_billing_history
           SET payment_status=$1, notes=$2, modified_date=NOW() AT TIME ZONE 'UTC'
         WHERE id=$3 AND is_deleted=FALSE
        """,
        request.payment_status, request.notes, billing_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Billing record not found.")
    return SuccessResponse(message=f"Billing status updated to {request.payment_status}.")


# ---------------------------------------------------------------------------
# GENERATE BILL FOR ONE OWNER
# ---------------------------------------------------------------------------

@router.post("/owners/{owner_id}/generate-bill", response_model=SuccessResponse)
async def generate_bill(
    owner_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    d = await _build_summary(db, owner_id)
    billing_month = date.today().replace(day=1)

    try:
        await db.execute(
            """
            INSERT INTO owner_billing_history
                (owner_id, billing_month, plan_name, plan_amount, student_count,
                 extra_students, extra_amount, storage_amount, total_amount,
                 payment_status, created_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending', NOW() AT TIME ZONE 'UTC')
            ON CONFLICT (owner_id, billing_month) DO NOTHING
            """,
            owner_id, billing_month,
            d["plan_name"], d["plan_price"], d["current_student_count"],
            d["extra_students"], d["extra_amount"],
            d["storage_addon_amount"], d["estimated_total"],
        )
    except Exception:
        raise HTTPException(status.HTTP_409_CONFLICT, "Billing record for this month already exists.")

    return SuccessResponse(
        message=f"Bill generated for {billing_month.strftime('%B %Y')}.",
        data={
            "billing_month": str(billing_month),
            "total_amount": d["estimated_total"],
        },
    )


# ---------------------------------------------------------------------------
# BULK BILL GENERATION — every owner's bill for the current month
# ---------------------------------------------------------------------------

@router.post("/generate-all-bills", response_model=SuccessResponse)
async def generate_all_bills(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    billing_month = date.today().replace(day=1)

    owner_rows = await db.fetch(
        """
        SELECT os.owner_id
          FROM owner_subscription os
         WHERE os.status = 'Active' AND os.is_deleted = FALSE
        """
    )

    created = 0
    skipped = 0
    errors: list[str] = []

    for row in owner_rows:
        owner_id = row["owner_id"]
        try:
            exists = await db.fetchval(
                "SELECT id FROM owner_billing_history WHERE owner_id=$1 AND billing_month=$2 AND is_deleted=FALSE",
                owner_id, billing_month,
            )
            if exists:
                skipped += 1
                continue

            d = await _build_summary(db, owner_id)

            await db.execute(
                """
                INSERT INTO owner_billing_history
                    (owner_id, billing_month, plan_name, plan_amount, student_count,
                     extra_students, extra_amount, storage_amount, total_amount,
                     payment_status, created_date)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending', NOW() AT TIME ZONE 'UTC')
                """,
                owner_id, billing_month,
                d["plan_name"], d["plan_price"], d["current_student_count"],
                d["extra_students"], d["extra_amount"],
                d["storage_addon_amount"], d["estimated_total"],
            )
            created += 1
        except Exception as exc:
            errors.append(f"{owner_id}: {exc}")

    await write_audit_log(
        db, admin.user_id, "GenerateAllBills", "OwnerBillingHistory", admin.user_id,
        "{}", f'{{"month":"{billing_month}","created":{created},"skipped":{skipped}}}',
    )

    msg = (
        f"Bills generated for {billing_month.strftime('%B %Y')}: "
        f"{created} created, {skipped} already existed."
    )
    if errors:
        msg += f" {len(errors)} error(s): {'; '.join(errors[:3])}"

    return SuccessResponse(
        message=msg,
        data={"billing_month": str(billing_month), "created": created, "skipped": skipped},
    )


# ---------------------------------------------------------------------------
# BILLING SUMMARY
# ---------------------------------------------------------------------------

@router.get("/billing-summary", response_model=dict)
async def billing_summary(
    month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month"),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> dict:
    if month:
        try:
            billing_month = date.fromisoformat(f"{month}-01")
        except ValueError:
            raise HTTPException(status.HTTP_400_BAD_REQUEST, "month must be YYYY-MM.")
    else:
        billing_month = date.today().replace(day=1)

    rows = await db.fetchrow(
        """
        SELECT
            COUNT(*)                                                       AS total_bills,
            COALESCE(SUM(total_amount), 0)                                AS total_amount,
            COALESCE(SUM(CASE WHEN payment_status='Paid'    THEN total_amount ELSE 0 END), 0) AS collected,
            COALESCE(SUM(CASE WHEN payment_status='Pending' THEN total_amount ELSE 0 END), 0) AS outstanding,
            COALESCE(SUM(CASE WHEN payment_status='Overdue' THEN total_amount ELSE 0 END), 0) AS overdue,
            COALESCE(SUM(CASE WHEN payment_status='Waived'  THEN total_amount ELSE 0 END), 0) AS waived,
            COUNT(CASE WHEN payment_status='Paid'    THEN 1 END)          AS paid_count,
            COUNT(CASE WHEN payment_status='Pending' THEN 1 END)          AS pending_count,
            COUNT(CASE WHEN payment_status='Overdue' THEN 1 END)          AS overdue_count
        FROM owner_billing_history
        WHERE billing_month=$1 AND is_deleted=FALSE
        """,
        billing_month,
    )

    mrr = await db.fetchval(
        """
        SELECT COALESCE(SUM(sp.price), 0)
          FROM owner_subscription os
          JOIN subscription_plan sp ON sp.id = os.plan_id
         WHERE os.status='Active' AND os.is_deleted=FALSE
        """
    ) or 0.0

    return {
        "billing_month":   str(billing_month),
        "mrr":             float(mrr),
        "total_bills":     rows["total_bills"],
        "total_amount":    float(rows["total_amount"]),
        "collected":       float(rows["collected"]),
        "outstanding":     float(rows["outstanding"]),
        "overdue":         float(rows["overdue"]),
        "waived":          float(rows["waived"]),
        "paid_count":      rows["paid_count"],
        "pending_count":   rows["pending_count"],
        "overdue_count":   rows["overdue_count"],
    }


# ---------------------------------------------------------------------------
# SEND INVOICE EMAIL — owner-keyed
# ---------------------------------------------------------------------------

@router.post("/billing/{billing_id}/send-invoice", response_model=SuccessResponse)
async def send_invoice_email(
    billing_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    bill = await db.fetchrow(
        """
        SELECT bh.*, u.name AS owner_name, u.email AS owner_email
          FROM owner_billing_history bh
          JOIN "user" u ON u.id = bh.owner_id
         WHERE bh.id=$1 AND bh.is_deleted=FALSE
        """,
        billing_id,
    )
    if not bill:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Billing record not found.")

    email_cfg_rows = await db.fetch(
        "SELECT config_key, config_value FROM app_config WHERE config_key = ANY($1) AND is_active=TRUE",
        ["BillingEmailFrom", "BillingEmailCC", "BillingEmailBCC", "BillingDueDays"],
    )
    email_cfg = {r["config_key"]: r["config_value"] for r in email_cfg_rows}
    email_from = email_cfg.get("BillingEmailFrom", "")
    email_cc   = email_cfg.get("BillingEmailCC", "")
    due_days   = int(email_cfg.get("BillingDueDays", "7"))

    owner_email = bill["owner_email"] or ""

    import datetime
    note_suffix = f" [Invoice email sent by admin on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC]"
    await db.execute(
        """
        UPDATE owner_billing_history
           SET notes=COALESCE(notes,'') || $1, modified_date=NOW() AT TIME ZONE 'UTC'
         WHERE id=$2
        """,
        note_suffix, billing_id,
    )

    await write_audit_log(
        db, admin.user_id, "SendInvoice", "OwnerBillingHistory", billing_id,
        "{}", f'{{"billing_id":"{billing_id}","to":"{owner_email}"}}',
    )

    if not email_from:
        return SuccessResponse(
            message=(
                f"Invoice noted for {bill['owner_name']} "
                f"({bill['billing_month'].strftime('%B %Y')}) — "
                "no sender email configured. Set BillingEmailFrom in Settings → Email Config."
            )
        )

    return SuccessResponse(
        message=(
            f"Invoice for {bill['owner_name']} ({bill['billing_month'].strftime('%B %Y')}) "
            f"queued to send from {email_from} to {owner_email or '(no email on file)'}."
            + (f" CC: {email_cc}" if email_cc else "")
        ),
        data={
            "to": owner_email,
            "from": email_from,
            "cc": email_cc,
            "due_days": due_days,
            "amount": float(bill["total_amount"]),
            "month": str(bill["billing_month"]),
        },
    )
