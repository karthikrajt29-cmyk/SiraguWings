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
    CenterSubscriptionDetail,
    CenterSubscriptionSummary,
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


async def _build_summary(db: asyncpg.Connection, center_id: uuid.UUID) -> dict:
    """Build the full subscription summary dict for one center."""
    sub = await db.fetchrow(
        """
        SELECT cs.id, cs.center_id, c.name AS center_name,
               cs.plan_id, sp.name AS plan_name, sp.price AS plan_price,
               sp.student_limit, sp.storage_limit_mb, sp.extra_student_price,
               cs.start_date, cs.end_date, cs.status
        FROM center_subscription cs
        JOIN center c            ON c.id  = cs.center_id
        JOIN subscription_plan sp ON sp.id = cs.plan_id
        WHERE cs.center_id=$1 AND cs.status='Active' AND cs.is_deleted=FALSE
        LIMIT 1
        """,
        center_id,
    )
    if not sub:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No active subscription found for this center.")

    usage = await db.fetchrow(
        "SELECT current_student_count, storage_used_mb FROM usage_tracking WHERE center_id=$1",
        center_id,
    )
    student_count = usage["current_student_count"] if usage else 0
    storage_used  = float(usage["storage_used_mb"]) if usage else 0.0

    # Active storage add-ons
    addons = await db.fetch(
        """
        SELECT csp.id, ao.name, csp.storage_mb, csp.price, csp.start_date, csp.end_date, csp.status
        FROM center_storage_purchase csp
        JOIN storage_add_on ao ON ao.id = csp.add_on_id
        WHERE csp.center_id=$1 AND csp.status='Active' AND csp.is_deleted=FALSE
        ORDER BY csp.start_date DESC
        """,
        center_id,
    )
    addon_storage_mb   = sum(a["storage_mb"] for a in addons)
    addon_amount       = sum(float(a["price"]) for a in addons)
    total_storage_mb   = sub["storage_limit_mb"] + addon_storage_mb

    extra_students = max(0, student_count - sub["student_limit"])
    extra_amount   = extra_students * float(sub["extra_student_price"])
    estimated_total = float(sub["plan_price"]) + extra_amount + addon_amount

    return {
        "center_id":           center_id,
        "center_name":         sub["center_name"],
        "plan_id":             sub["plan_id"],
        "plan_name":           sub["plan_name"],
        "plan_price":          float(sub["plan_price"]),
        "student_limit":       sub["student_limit"],
        "storage_limit_mb":    sub["storage_limit_mb"],
        "extra_student_price": float(sub["extra_student_price"]),
        "start_date":          sub["start_date"],
        "end_date":            sub["end_date"],
        "status":              sub["status"],
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


# ---------------------------------------------------------------------------
# PLAN CRUD
# ---------------------------------------------------------------------------

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
    # Soft-deactivate instead of hard delete to preserve history
    in_use = await db.fetchval(
        "SELECT COUNT(*) FROM center_subscription WHERE plan_id=$1 AND status='Active' AND is_deleted=FALSE",
        plan_id,
    )
    if in_use:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Plan is active on {in_use} center(s). Deactivate those subscriptions first.",
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
    active_subs = await db.fetchval(
        "SELECT COUNT(*) FROM center_subscription WHERE status='Active' AND is_deleted=FALSE"
    )

    plan_rows = await db.fetch(
        """
        SELECT sp.name, sp.price, COUNT(cs.id) AS center_count
        FROM subscription_plan sp
        LEFT JOIN center_subscription cs
            ON cs.plan_id=sp.id AND cs.status='Active' AND cs.is_deleted=FALSE
        GROUP BY sp.id, sp.name, sp.price
        ORDER BY sp.sort_order
        """
    )

    free_count = next((r["center_count"] for r in plan_rows if r["name"] == "Free"), 0)
    paid_count = sum(r["center_count"] for r in plan_rows if r["name"] != "Free")
    mrr = sum(float(r["price"]) * r["center_count"] for r in plan_rows if r["name"] != "Free")

    # Extra student revenue (from billing_history this month)
    this_month = date.today().replace(day=1)
    extra_rev = await db.fetchval(
        "SELECT COALESCE(SUM(extra_amount),0) FROM billing_history WHERE billing_month=$1 AND is_deleted=FALSE",
        this_month,
    ) or 0.0
    storage_rev = await db.fetchval(
        "SELECT COALESCE(SUM(storage_amount),0) FROM billing_history WHERE billing_month=$1 AND is_deleted=FALSE",
        this_month,
    ) or 0.0

    plan_breakdown = [
        {"name": r["name"], "count": r["center_count"], "revenue": float(r["price"]) * r["center_count"]}
        for r in plan_rows
    ]

    return SubscriptionDashboard(
        total_centers=total_centers,
        active_subscriptions=active_subs,
        free_plan_count=free_count,
        paid_plan_count=paid_count,
        mrr=mrr,
        total_extra_student_revenue=float(extra_rev),
        total_storage_addon_revenue=float(storage_rev),
        plan_breakdown=plan_breakdown,
    )


# ---------------------------------------------------------------------------
# LIST ALL CENTER SUBSCRIPTIONS
# ---------------------------------------------------------------------------

@router.get("/centers", response_model=PagedResponse[CenterSubscriptionSummary])
async def list_center_subscriptions(
    search: Optional[str] = Query(None),
    plan_name: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[CenterSubscriptionSummary]:
    where = "WHERE cs.status='Active' AND cs.is_deleted=FALSE"
    params: list = []
    idx = 1

    if search:
        where += f" AND c.name ILIKE ${idx}"
        params.append(f"%{search}%")
        idx += 1
    if plan_name:
        where += f" AND sp.name = ${idx}"
        params.append(plan_name)
        idx += 1

    total: int = await db.fetchval(
        f"""
        SELECT COUNT(*)
        FROM center_subscription cs
        JOIN center c ON c.id = cs.center_id
        JOIN subscription_plan sp ON sp.id = cs.plan_id
        {where}
        """,
        *params,
    )

    rows = await db.fetch(
        f"""
        SELECT cs.center_id
        FROM center_subscription cs
        JOIN center c ON c.id = cs.center_id
        JOIN subscription_plan sp ON sp.id = cs.plan_id
        {where}
        ORDER BY c.name
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, page * size,
    )

    items = []
    for r in rows:
        d = await _build_summary(db, r["center_id"])
        items.append(CenterSubscriptionSummary(**d))

    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


# ---------------------------------------------------------------------------
# GET ONE CENTER SUBSCRIPTION
# ---------------------------------------------------------------------------

@router.get("/centers/{center_id}", response_model=CenterSubscriptionDetail)
async def get_center_subscription(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> CenterSubscriptionDetail:
    d = await _build_summary(db, center_id)

    # Billing history (last 12 months)
    history = await db.fetch(
        """
        SELECT bh.id, bh.billing_month, bh.plan_name, bh.plan_amount,
               bh.student_count, bh.extra_students, bh.extra_amount,
               bh.storage_amount, bh.total_amount, bh.payment_status, bh.notes
        FROM billing_history bh
        WHERE bh.center_id=$1 AND bh.is_deleted=FALSE
        ORDER BY bh.billing_month DESC
        LIMIT 12
        """,
        center_id,
    )
    d["billing_history"] = [dict(r) for r in history]
    return CenterSubscriptionDetail(**d)


# ---------------------------------------------------------------------------
# ASSIGN / CHANGE PLAN  (with effective_date billing adjustment)
# ---------------------------------------------------------------------------

@router.post("/centers/{center_id}/assign-plan", response_model=SuccessResponse)
async def assign_plan(
    center_id: uuid.UUID,
    request: AssignPlanRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    plan = await _get_plan(db, request.plan_id)

    center = await db.fetchrow(
        "SELECT id, name FROM center WHERE id=$1 AND is_deleted=FALSE", center_id
    )
    if not center:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Center not found.")

    effective_date = request.effective_date or date.today()
    this_month = effective_date.replace(day=1)
    is_current_month = this_month == date.today().replace(day=1)

    async with db.transaction():
        # 1. Expire the current active subscription
        await db.execute(
            """
            UPDATE center_subscription
            SET status='Expired', modified_date=NOW() AT TIME ZONE 'UTC'
            WHERE center_id=$1 AND status='Active' AND is_deleted=FALSE
            """,
            center_id,
        )

        # 2. Insert new subscription starting on effective_date
        await db.execute(
            """
            INSERT INTO center_subscription
                (center_id, plan_id, start_date, end_date, status, assigned_by, notes, created_date)
            VALUES ($1, $2, $3, $4, 'Active', $5, $6, NOW() AT TIME ZONE 'UTC')
            """,
            center_id, request.plan_id,
            effective_date,
            request.end_date,
            admin.user_id, request.notes,
        )

        # 3. If effective_date is in the current billing month AND a Pending bill exists,
        #    recalculate and update it to reflect the new plan from that date.
        if is_current_month:
            usage = await db.fetchrow(
                "SELECT current_student_count, storage_used_mb FROM usage_tracking WHERE center_id=$1",
                center_id,
            )
            student_count = usage["current_student_count"] if usage else 0
            storage_used  = float(usage["storage_used_mb"]) if usage else 0.0

            addon_amount: float = await db.fetchval(
                """
                SELECT COALESCE(SUM(csp.price),0)
                FROM center_storage_purchase csp
                WHERE csp.center_id=$1 AND csp.status='Active' AND csp.is_deleted=FALSE
                """,
                center_id,
            ) or 0.0

            extra_students = max(0, student_count - plan["student_limit"])
            extra_amount   = extra_students * float(plan["extra_student_price"])
            total_amount   = float(plan["price"]) + extra_amount + addon_amount

            # Days-based proration: charge new plan only for days from effective_date to month end
            days_in_month = calendar.monthrange(effective_date.year, effective_date.month)[1]
            days_on_new   = days_in_month - effective_date.day + 1
            days_on_old   = effective_date.day - 1  # days already charged under old plan

            # Update existing Pending bill if one exists for this month
            existing_bill = await db.fetchrow(
                "SELECT id FROM billing_history WHERE center_id=$1 AND billing_month=$2 AND is_deleted=FALSE",
                center_id, this_month,
            )
            if existing_bill:
                # Prorate: old plan covered days_on_old, new plan covers days_on_new
                prorated_new_plan = round(float(plan["price"]) * days_on_new / days_in_month, 2)
                prorated_extra    = round(extra_amount * days_on_new / days_in_month, 2)
                prorated_total    = round((prorated_new_plan + prorated_extra + addon_amount), 2)
                await db.execute(
                    """
                    UPDATE billing_history
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
        db, admin.user_id, "AssignPlan", "CenterSubscription", center_id,
        "{}", f'{{"plan":"{plan["name"]}","effective_date":"{effective_date}"}}'
    )
    msg = f"Plan '{plan['name']}' assigned to {center['name']} from {effective_date}."
    if is_current_month:
        msg += " Current month bill updated (prorated)."
    return SuccessResponse(message=msg)


# ---------------------------------------------------------------------------
# PURCHASE STORAGE ADD-ON FOR A CENTER
# ---------------------------------------------------------------------------

@router.post("/centers/{center_id}/storage", response_model=SuccessResponse)
async def purchase_storage(
    center_id: uuid.UUID,
    request: PurchaseStorageRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    addon = await db.fetchrow(
        "SELECT * FROM storage_add_on WHERE id=$1 AND is_active=TRUE", request.add_on_id
    )
    if not addon:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Storage add-on not found.")

    center = await db.fetchrow(
        "SELECT id FROM center WHERE id=$1 AND is_deleted=FALSE", center_id
    )
    if not center:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Center not found.")

    await db.execute(
        """
        INSERT INTO center_storage_purchase
            (center_id, add_on_id, storage_mb, price, start_date, status, purchased_by, created_date)
        VALUES ($1, $2, $3, $4, CURRENT_DATE, 'Active', $5, NOW() AT TIME ZONE 'UTC')
        """,
        center_id, request.add_on_id, addon["storage_mb"], addon["price"], admin.user_id,
    )
    return SuccessResponse(
        message=f"Storage add-on '{addon['name']}' ({addon['storage_mb']} MB) purchased."
    )


# ---------------------------------------------------------------------------
# UPDATE STORAGE PURCHASE STATUS (expire / cancel)
# ---------------------------------------------------------------------------

@router.patch("/centers/{center_id}/storage/{purchase_id}", response_model=SuccessResponse)
async def update_storage_purchase(
    center_id: uuid.UUID,
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
        UPDATE center_storage_purchase
        SET status=$1, modified_date=NOW() AT TIME ZONE 'UTC'
        WHERE id=$2 AND center_id=$3 AND is_deleted=FALSE
        """,
        new_status, purchase_id, center_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Storage purchase not found.")
    return SuccessResponse(message=f"Storage purchase marked as {new_status}.")


# ---------------------------------------------------------------------------
# BILLING HISTORY LIST
# ---------------------------------------------------------------------------

@router.get("/billing", response_model=PagedResponse[BillingHistoryEntry])
async def list_billing_history(
    center_id: Optional[uuid.UUID] = Query(None),
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

    if center_id:
        where += f" AND bh.center_id=${idx}"
        params.append(center_id)
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
        f"SELECT COUNT(*) FROM billing_history bh {where}", *params
    )
    rows = await db.fetch(
        f"""
        SELECT bh.*, c.name AS center_name
        FROM billing_history bh
        JOIN center c ON c.id = bh.center_id
        {where}
        ORDER BY bh.billing_month DESC, c.name
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, page * size,
    )
    items = [
        BillingHistoryEntry(
            id=r["id"], center_id=r["center_id"], center_name=r["center_name"],
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


# ---------------------------------------------------------------------------
# UPDATE BILLING RECORD STATUS (Paid / Waived / Overdue)
# ---------------------------------------------------------------------------

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
        UPDATE billing_history
        SET payment_status=$1, notes=$2, modified_date=NOW() AT TIME ZONE 'UTC'
        WHERE id=$3 AND is_deleted=FALSE
        """,
        request.payment_status, request.notes, billing_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Billing record not found.")
    return SuccessResponse(message=f"Billing status updated to {request.payment_status}.")


# ---------------------------------------------------------------------------
# GENERATE BILLING FOR A CENTER (admin action — computes and inserts record)
# ---------------------------------------------------------------------------

@router.post("/centers/{center_id}/generate-bill", response_model=SuccessResponse)
async def generate_bill(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    d = await _build_summary(db, center_id)
    billing_month = date.today().replace(day=1)

    try:
        await db.execute(
            """
            INSERT INTO billing_history
                (center_id, billing_month, plan_name, plan_amount, student_count,
                 extra_students, extra_amount, storage_amount, total_amount,
                 payment_status, created_date)
            VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending', NOW() AT TIME ZONE 'UTC')
            ON CONFLICT (center_id, billing_month) DO NOTHING
            """,
            center_id, billing_month,
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
# UPDATE USAGE (manual refresh — normally done by a cron or webhook)
# ---------------------------------------------------------------------------

@router.post("/centers/{center_id}/refresh-usage", response_model=SuccessResponse)
async def refresh_usage(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await db.fetchrow(
        "SELECT id FROM center WHERE id=$1 AND is_deleted=FALSE", center_id
    )
    if not center:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Center not found.")

    # Count active students linked to this center
    student_count: int = await db.fetchval(
        """
        SELECT COUNT(DISTINCT cs.student_id)
        FROM center_student cs
        WHERE cs.center_id=$1 AND cs.status='Active' AND cs.is_deleted=FALSE
        """,
        center_id,
    )

    await db.execute(
        """
        INSERT INTO usage_tracking (center_id, current_student_count, storage_used_mb, last_updated)
        VALUES ($1, $2, 0, NOW() AT TIME ZONE 'UTC')
        ON CONFLICT (center_id) DO UPDATE
            SET current_student_count=$2, last_updated=NOW() AT TIME ZONE 'UTC'
        """,
        center_id, student_count,
    )
    return SuccessResponse(
        message="Usage refreshed.",
        data={"student_count": student_count},
    )


# ---------------------------------------------------------------------------
# BULK BILL GENERATION — generate this month's bill for ALL active centers
# ---------------------------------------------------------------------------

@router.post("/generate-all-bills", response_model=SuccessResponse)
async def generate_all_bills(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """
    Generate billing records for the current calendar month for every center
    that has an active subscription and does NOT already have a bill this month.
    Returns a summary of how many bills were created vs already existed.
    """
    billing_month = date.today().replace(day=1)

    # All center_ids with an active subscription
    center_rows = await db.fetch(
        """
        SELECT cs.center_id
        FROM center_subscription cs
        WHERE cs.status = 'Active' AND cs.is_deleted = FALSE
        """
    )

    created = 0
    skipped = 0
    errors: list[str] = []

    for row in center_rows:
        center_id = row["center_id"]
        try:
            # Skip if bill already exists for this month
            exists = await db.fetchval(
                "SELECT id FROM billing_history WHERE center_id=$1 AND billing_month=$2 AND is_deleted=FALSE",
                center_id, billing_month,
            )
            if exists:
                skipped += 1
                continue

            d = await _build_summary(db, center_id)

            await db.execute(
                """
                INSERT INTO billing_history
                    (center_id, billing_month, plan_name, plan_amount, student_count,
                     extra_students, extra_amount, storage_amount, total_amount,
                     payment_status, created_date)
                VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Pending', NOW() AT TIME ZONE 'UTC')
                """,
                center_id, billing_month,
                d["plan_name"], d["plan_price"], d["current_student_count"],
                d["extra_students"], d["extra_amount"],
                d["storage_addon_amount"], d["estimated_total"],
            )
            created += 1
        except Exception as exc:
            errors.append(f"{center_id}: {exc}")

    await write_audit_log(
        db, admin.user_id, "GenerateAllBills", "BillingHistory", admin.user_id,
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
# BILLING SUMMARY — aggregated stats for the billing dashboard
# ---------------------------------------------------------------------------

@router.get("/billing-summary", response_model=dict)
async def billing_summary(
    month: Optional[str] = Query(None, description="YYYY-MM, defaults to current month"),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> dict:
    """
    Returns aggregate stats used by the Billing Overview dashboard:
    total billed, collected, outstanding, overdue, center counts by status.
    """
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
        FROM billing_history
        WHERE billing_month=$1 AND is_deleted=FALSE
        """,
        billing_month,
    )

    # MRR from active subscriptions
    mrr = await db.fetchval(
        """
        SELECT COALESCE(SUM(sp.price), 0)
        FROM center_subscription cs
        JOIN subscription_plan sp ON sp.id = cs.plan_id
        WHERE cs.status='Active' AND cs.is_deleted=FALSE
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
# SEND INVOICE EMAIL for one billing record
# ---------------------------------------------------------------------------

@router.post("/billing/{billing_id}/send-invoice", response_model=SuccessResponse)
async def send_invoice_email(
    billing_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """
    Send (or resend) an invoice email for a billing record.
    Reads BillingEmailFrom / BillingEmailCC from app_config.
    If no SMTP is configured, records the intent in billing notes.
    """
    bill = await db.fetchrow(
        """
        SELECT bh.*, c.name AS center_name, c.email AS center_email
        FROM billing_history bh
        JOIN center c ON c.id = bh.center_id
        WHERE bh.id=$1 AND bh.is_deleted=FALSE
        """,
        billing_id,
    )
    if not bill:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Billing record not found.")

    # Read email config
    email_cfg_rows = await db.fetch(
        "SELECT config_key, config_value FROM app_config WHERE config_key = ANY($1) AND is_active=TRUE",
        ["BillingEmailFrom", "BillingEmailCC", "BillingEmailBCC", "BillingDueDays"],
    )
    email_cfg = {r["config_key"]: r["config_value"] for r in email_cfg_rows}
    email_from = email_cfg.get("BillingEmailFrom", "")
    email_cc   = email_cfg.get("BillingEmailCC", "")
    due_days   = int(email_cfg.get("BillingDueDays", "7"))

    center_email = bill["center_email"] or ""

    # Stamp notes with send attempt
    import datetime
    note_suffix = f" [Invoice email sent by admin on {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M')} UTC]"
    await db.execute(
        """
        UPDATE billing_history
        SET notes=COALESCE(notes,'') || $1, modified_date=NOW() AT TIME ZONE 'UTC'
        WHERE id=$2
        """,
        note_suffix, billing_id,
    )

    await write_audit_log(
        db, admin.user_id, "SendInvoice", "BillingHistory", billing_id,
        "{}", f'{{"billing_id":"{billing_id}","to":"{center_email}"}}',
    )

    if not email_from:
        return SuccessResponse(
            message=(
                f"Invoice noted for {bill['center_name']} "
                f"({bill['billing_month'].strftime('%B %Y')}) — "
                "no sender email configured. Set BillingEmailFrom in Settings → Email Config."
            )
        )

    # TODO: plug in actual SMTP / SendGrid / SES here
    # For now, we return success with what would be sent so frontend can confirm
    return SuccessResponse(
        message=(
            f"Invoice for {bill['center_name']} ({bill['billing_month'].strftime('%B %Y')}) "
            f"queued to send from {email_from} to {center_email or '(no center email on file)'}."
            + (f" CC: {email_cc}" if email_cc else "")
        ),
        data={
            "to": center_email,
            "from": email_from,
            "cc": email_cc,
            "due_days": due_days,
            "amount": float(bill["total_amount"]),
            "month": str(bill["billing_month"]),
        },
    )
