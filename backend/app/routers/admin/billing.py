import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.core.audit import write_audit_log
from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.billing import (
    BillingDashboard,
    CenterBillingSummary,
    ExtendTrialRequest,
    InvoiceDetail,
    InvoiceSummary,
    WaiveFeeRequest,
)
from app.schemas.common import PagedResponse, SuccessResponse

router = APIRouter()


# ---------------------------------------------------------------------------
# DASHBOARD
# ---------------------------------------------------------------------------
@router.get("/dashboard", response_model=BillingDashboard)
async def billing_dashboard(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> BillingDashboard:
    """Revenue overview: MRR, billed students, outstanding, overdue."""
    stats = await db.fetchrow(
        """
        SELECT
            COUNT(DISTINCT cs.student_id)  AS total_students_billed,
            COUNT(DISTINCT cs.center_id)   AS total_centers_paying,
            COALESCE(SUM(CASE WHEN pi.status IN ('Generated','Overdue') THEN pi.total_amount ELSE 0 END), 0)
                AS outstanding_amount,
            COALESCE(SUM(CASE WHEN pi.status = 'Overdue' THEN pi.total_amount ELSE 0 END), 0)
                AS overdue_amount
        FROM center_student cs
        JOIN center c ON c.id = cs.center_id
        LEFT JOIN platform_invoice pi ON pi.center_id = c.id AND pi.is_deleted = FALSE
        WHERE cs.is_deleted = FALSE AND cs.status = 'Active'
          AND c.is_deleted = FALSE AND c.subscription_status = 'Active'
        """
    )

    mrr_row = await db.fetchrow(
        """
        SELECT COALESCE(SUM(pi.total_amount), 0) AS mrr
        FROM platform_invoice pi
        WHERE pi.status = 'Paid'
          AND pi.billing_period_start >= DATE_TRUNC('month', CURRENT_DATE)
          AND pi.is_deleted = FALSE
        """
    )
    trial_count: int = await db.fetchval(
        "SELECT COUNT(*) FROM center WHERE subscription_status='Trial' AND is_deleted=FALSE"
    )

    return BillingDashboard(
        total_students_billed=stats["total_students_billed"] or 0,
        total_centers_paying=stats["total_centers_paying"] or 0,
        monthly_recurring_revenue=float(mrr_row["mrr"] or 0),
        outstanding_amount=float(stats["outstanding_amount"] or 0),
        overdue_amount=float(stats["overdue_amount"] or 0),
        trial_centers=trial_count or 0,
    )


# ---------------------------------------------------------------------------
# CENTER BILLING LIST
# ---------------------------------------------------------------------------
@router.get("/centers", response_model=PagedResponse[CenterBillingSummary])
async def list_center_billing(
    subscription_status: Optional[str] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[CenterBillingSummary]:
    where = "WHERE c.is_deleted = FALSE"
    params: list = []
    idx = 1
    if subscription_status:
        where += f" AND c.subscription_status = ${idx}"
        params.append(subscription_status)
        idx += 1

    total: int = await db.fetchval(f"SELECT COUNT(*) FROM center c {where}", *params)
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT
            c.id AS center_id, c.name AS center_name,
            c.subscription_status, c.trial_ends_at,
            COUNT(cs.id) AS total_students,
            pi.total_amount AS latest_invoice_amount,
            pi.status AS latest_invoice_status,
            pi.due_date AS next_due_date
        FROM center c
        LEFT JOIN center_student cs ON cs.center_id = c.id AND cs.is_deleted=FALSE AND cs.status='Active'
        LEFT JOIN LATERAL (
            SELECT total_amount, status, due_date FROM platform_invoice
            WHERE center_id = c.id AND is_deleted=FALSE
            ORDER BY created_date DESC LIMIT 1
        ) pi ON TRUE
        {where}
        GROUP BY c.id, c.name, c.subscription_status, c.trial_ends_at,
                 pi.total_amount, pi.status, pi.due_date
        ORDER BY c.name ASC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    items = [
        CenterBillingSummary(
            center_id=r["center_id"],
            center_name=r["center_name"],
            subscription_status=r["subscription_status"],
            total_students=r["total_students"] or 0,
            latest_invoice_amount=float(r["latest_invoice_amount"]) if r["latest_invoice_amount"] else None,
            latest_invoice_status=r["latest_invoice_status"],
            next_due_date=r["next_due_date"],
            trial_ends_at=r["trial_ends_at"],
        )
        for r in rows
    ]
    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


# ---------------------------------------------------------------------------
# WAIVE FEE
# ---------------------------------------------------------------------------
@router.patch("/centers/{center_id}/waive", response_model=SuccessResponse)
async def waive_invoice(
    center_id: uuid.UUID,
    request: WaiveFeeRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    invoice = await db.fetchrow(
        "SELECT id, status FROM platform_invoice WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        request.invoice_id, center_id,
    )
    if not invoice:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found for this center.")
    if invoice["status"] == "Paid":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot waive an already paid invoice.")

    await db.execute(
        """
        UPDATE platform_invoice SET status='Waived',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$2
        """,
        admin.user_id, request.invoice_id,
    )
    await write_audit_log(
        db, admin.user_id, "Update", "PlatformInvoice", request.invoice_id,
        f'{{"status":"{invoice["status"]}"}}',
        f'{{"status":"Waived","reason":"{request.reason}"}}',
    )
    return SuccessResponse(message="Invoice waived successfully.")


# ---------------------------------------------------------------------------
# EXTEND TRIAL
# ---------------------------------------------------------------------------
@router.patch("/centers/{center_id}/extend-trial", response_model=SuccessResponse)
async def extend_trial(
    center_id: uuid.UUID,
    request: ExtendTrialRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    center = await db.fetchrow(
        "SELECT id, name, subscription_status, trial_ends_at FROM center WHERE id=$1 AND is_deleted=FALSE",
        center_id,
    )
    if not center:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Center not found.")
    if center["subscription_status"] != "Trial":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Center is not in Trial status.")
    if request.days <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "days must be a positive integer.")

    await db.execute(
        """
        UPDATE center SET
            trial_ends_at = COALESCE(trial_ends_at, NOW() AT TIME ZONE 'UTC')
                            + ($1 || ' days')::INTERVAL,
            modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$3
        """,
        str(request.days), admin.user_id, center_id,
    )
    await write_audit_log(
        db, admin.user_id, "Update", "Center", center_id, None,
        f'{{"trial_extended_days":{request.days},"reason":"{request.reason}"}}',
    )
    return SuccessResponse(message=f"Trial extended by {request.days} days.")


# ---------------------------------------------------------------------------
# INVOICES
# ---------------------------------------------------------------------------
@router.get("/invoices", response_model=PagedResponse[InvoiceSummary])
async def list_invoices(
    status_filter: Optional[str] = Query(None, alias="status"),
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[InvoiceSummary]:
    where = "WHERE pi.is_deleted=FALSE"
    params: list = []
    idx = 1
    if status_filter:
        where += f" AND pi.status=${idx}"
        params.append(status_filter)
        idx += 1

    total: int = await db.fetchval(
        f"SELECT COUNT(*) FROM platform_invoice pi {where}", *params
    )
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT pi.id, pi.center_id, c.name AS center_name,
               pi.invoice_number, pi.student_count, pi.total_amount,
               pi.due_date, pi.status, pi.generated_at
        FROM platform_invoice pi
        JOIN center c ON c.id = pi.center_id
        {where}
        ORDER BY pi.generated_at DESC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    items = [
        InvoiceSummary(
            id=r["id"], center_id=r["center_id"], center_name=r["center_name"],
            invoice_number=r["invoice_number"], student_count=r["student_count"],
            total_amount=float(r["total_amount"]),
            due_date=r["due_date"], status=r["status"], generated_at=r["generated_at"],
        )
        for r in rows
    ]
    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


@router.get("/invoices/{invoice_id}", response_model=InvoiceDetail)
async def get_invoice(
    invoice_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> InvoiceDetail:
    pi = await db.fetchrow(
        """
        SELECT pi.*, c.name AS center_name
        FROM platform_invoice pi JOIN center c ON c.id=pi.center_id
        WHERE pi.id=$1 AND pi.is_deleted=FALSE
        """,
        invoice_id,
    )
    if not pi:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Invoice not found.")

    payments = await db.fetch(
        "SELECT id, mode, status, transaction_id, amount_paid, paid_at FROM platform_payment WHERE invoice_id=$1 AND is_deleted=FALSE ORDER BY created_date DESC",
        invoice_id,
    )

    return InvoiceDetail(
        id=pi["id"], center_id=pi["center_id"], center_name=pi["center_name"],
        invoice_number=pi["invoice_number"], student_count=pi["student_count"],
        total_amount=float(pi["total_amount"]),
        due_date=pi["due_date"], status=pi["status"], generated_at=pi["generated_at"],
        rate_per_student=float(pi["rate_per_student"]),
        sub_total=float(pi["sub_total"]),
        gst_rate=float(pi["gst_rate"]),
        gst_amount=float(pi["gst_amount"]),
        billing_period_start=pi["billing_period_start"],
        billing_period_end=pi["billing_period_end"],
        gst_invoice_url=pi["gst_invoice_url"],
        payments=[dict(p) for p in payments],
    )
