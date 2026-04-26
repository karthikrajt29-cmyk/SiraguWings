"""Owner-scoped fee management.

Tables in play:
- `fee`     — what a center charges its students (owner manages these)
- `payment` — money received against a fee (one fee can have many payments)
- `platform_invoice` — what SiraguWings bills the center (read-only here)

Status transitions on `fee`:
- Pending       -> initial state
- PartiallyPaid -> sum(payments.Success) > 0 but < amount
- Paid          -> sum(payments.Success) >= amount
- Overdue       -> due_date < today AND not Paid (computed at query time / recalc job)
"""
import uuid
from datetime import date as date_type
from decimal import Decimal
from typing import Literal, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, Field

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner
from app.schemas.common import SuccessResponse

# GST split applies only to invoices issued by a center that has a GSTIN.
DEFAULT_GST_RATE = Decimal("18.0")

router = APIRouter()


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class FeeCreateRequest(BaseModel):
    student_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    amount: Decimal = Field(gt=0)
    due_date: date_type
    notes: Optional[str] = Field(None, max_length=500)


class FeeBulkByBatchRequest(BaseModel):
    batch_id: uuid.UUID
    amount: Decimal = Field(gt=0)
    due_date: date_type
    notes: Optional[str] = Field(None, max_length=500)


class FeeUpdateRequest(BaseModel):
    amount: Optional[Decimal] = Field(None, gt=0)
    due_date: Optional[date_type] = None
    notes: Optional[str] = Field(None, max_length=500)


class PaymentCreateRequest(BaseModel):
    mode: Literal["UPI", "Card", "NetBanking", "Cash", "BankTransfer"]
    amount_paid: Decimal = Field(gt=0)
    transaction_id: Optional[str] = Field(None, max_length=200)
    gateway_reference: Optional[str] = Field(None, max_length=200)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _recalc_fee_status(db: asyncpg.Connection, fee_id: uuid.UUID, owner_id: uuid.UUID) -> str:
    """Recompute fee.status from payments + due_date and persist. Returns new status."""
    fee = await db.fetchrow(
        "SELECT amount, due_date, status FROM fee WHERE id=$1 AND is_deleted=FALSE",
        fee_id,
    )
    if not fee:
        return ""
    paid_row = await db.fetchrow(
        """SELECT COALESCE(SUM(amount_paid), 0) AS paid
           FROM payment WHERE fee_id=$1 AND status='Success' AND is_deleted=FALSE""",
        fee_id,
    )
    paid: Decimal = paid_row["paid"]
    amount: Decimal = fee["amount"]

    if paid >= amount:
        new_status = "Paid"
    elif paid > 0:
        new_status = "PartiallyPaid"
    elif fee["due_date"] < date_type.today():
        new_status = "Overdue"
    else:
        new_status = "Pending"

    if new_status != fee["status"]:
        await db.execute(
            """UPDATE fee SET status=$1,
                              modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                              version_number=version_number+1
               WHERE id=$3""",
            new_status, owner_id, fee_id,
        )
    return new_status


# ---------------------------------------------------------------------------
# LIST fees in a center (with rich filters)
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/fees")
async def list_fees(
    center_id: uuid.UUID,
    status_filter: Optional[str] = Query(None, alias="status",
        description="Pending | Paid | Overdue | PartiallyPaid"),
    student_id: Optional[uuid.UUID] = None,
    batch_id: Optional[uuid.UUID] = None,
    start: Optional[str] = Query(None, description="due_date >= start (YYYY-MM-DD)"),
    end: Optional[str] = Query(None, description="due_date <= end (YYYY-MM-DD)"),
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    assert_owns_center(center_id, owner)

    clauses = ["f.center_id = $1", "f.is_deleted = FALSE"]
    params: list = [center_id]
    if status_filter:
        if status_filter not in {"Pending", "Paid", "Overdue", "PartiallyPaid"}:
            raise HTTPException(422, "invalid status")
        # `Overdue` is dynamic — match either persisted or computed
        if status_filter == "Overdue":
            clauses.append("f.status = 'Overdue' OR (f.status = 'Pending' AND f.due_date < CURRENT_DATE)")
        else:
            clauses.append(f"f.status = ${len(params)+1}")
            params.append(status_filter)
    if student_id:
        clauses.append(f"f.student_id = ${len(params)+1}")
        params.append(student_id)
    if batch_id:
        clauses.append(f"f.batch_id = ${len(params)+1}")
        params.append(batch_id)
    if start:
        try:
            params.append(date_type.fromisoformat(start))
        except ValueError:
            raise HTTPException(422, "start must be YYYY-MM-DD")
        clauses.append(f"f.due_date >= ${len(params)}")
    if end:
        try:
            params.append(date_type.fromisoformat(end))
        except ValueError:
            raise HTTPException(422, "end must be YYYY-MM-DD")
        clauses.append(f"f.due_date <= ${len(params)}")

    where = " AND ".join(f"({c})" for c in clauses)
    rows = await db.fetch(
        f"""
        SELECT f.id, f.center_id, f.student_id, f.batch_id, f.amount, f.due_date,
               f.status, f.notes, f.created_date,
               f.reminder_count, f.reminder_sent_at,
               s.name AS student_name,
               s.parent_id AS parent_id,
               b.batch_name AS batch_name,
               b.course_name AS course_name,
               COALESCE((
                 SELECT SUM(amount_paid) FROM payment
                 WHERE fee_id = f.id AND status='Success' AND is_deleted=FALSE
               ), 0) AS paid_amount
        FROM fee f
        JOIN student s ON s.id = f.student_id AND s.is_deleted = FALSE
        LEFT JOIN batch b ON b.id = f.batch_id
        WHERE {where}
        ORDER BY f.due_date DESC, s.name
        """,
        *params,
    )
    today = date_type.today()
    return [
        {
            "id": str(r["id"]),
            "student_id": str(r["student_id"]),
            "student_name": r["student_name"],
            "batch_id": str(r["batch_id"]) if r["batch_id"] else None,
            "batch_name": r["batch_name"],
            "course_name": r["course_name"],
            "amount": float(r["amount"]),
            "paid_amount": float(r["paid_amount"]),
            "outstanding": float(r["amount"] - r["paid_amount"]),
            "due_date": r["due_date"].isoformat(),
            "status": r["status"] if r["status"] != "Pending" or r["due_date"] >= today
                      else "Overdue",
            "notes": r["notes"],
            "created_date": r["created_date"].isoformat() if r["created_date"] else None,
            "reminder_count": int(r["reminder_count"] or 0),
            "reminder_sent_at": r["reminder_sent_at"].isoformat() if r["reminder_sent_at"] else None,
            "has_parent": bool(r["parent_id"]),
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# SUMMARY for dashboard widgets
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/fees/summary")
async def fees_summary(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)
    row = await db.fetchrow(
        """
        SELECT
          COALESCE(SUM(f.amount), 0) AS total_billed,
          COALESCE(SUM(CASE WHEN f.status = 'Paid' THEN f.amount ELSE 0 END), 0) AS total_paid,
          COALESCE(SUM(CASE WHEN f.status IN ('Pending','PartiallyPaid','Overdue') THEN f.amount ELSE 0 END), 0)
            AS pending_billed,
          COUNT(*) FILTER (WHERE f.status = 'Paid')                                AS paid_count,
          COUNT(*) FILTER (WHERE f.status = 'Pending'      AND f.due_date >= CURRENT_DATE) AS pending_count,
          COUNT(*) FILTER (WHERE f.status = 'PartiallyPaid')                       AS partial_count,
          COUNT(*) FILTER (WHERE f.status = 'Overdue' OR (f.status='Pending' AND f.due_date < CURRENT_DATE))
            AS overdue_count,
          COALESCE(SUM(CASE WHEN f.status = 'Overdue' OR (f.status='Pending' AND f.due_date < CURRENT_DATE)
                            THEN f.amount ELSE 0 END), 0) AS overdue_amount
        FROM fee f
        WHERE f.center_id = $1 AND f.is_deleted = FALSE
        """,
        center_id,
    )
    paid_row = await db.fetchrow(
        """
        SELECT COALESCE(SUM(p.amount_paid), 0) AS collected
        FROM payment p
        JOIN fee f ON f.id = p.fee_id
        WHERE f.center_id = $1 AND p.status = 'Success'
          AND p.is_deleted = FALSE AND f.is_deleted = FALSE
        """,
        center_id,
    )
    total_billed   = float(row["total_billed"])
    collected      = float(paid_row["collected"])
    outstanding    = max(0.0, total_billed - collected)
    collection_pct = round((collected / total_billed) * 100, 1) if total_billed > 0 else 0.0
    return {
        "total_billed":   total_billed,
        "collected":      collected,
        "outstanding":    outstanding,
        "overdue_amount": float(row["overdue_amount"]),
        "paid_count":     int(row["paid_count"] or 0),
        "pending_count":  int(row["pending_count"] or 0),
        "partial_count":  int(row["partial_count"] or 0),
        "overdue_count":  int(row["overdue_count"] or 0),
        "collection_pct": collection_pct,
    }


# ---------------------------------------------------------------------------
# CREATE one fee
# ---------------------------------------------------------------------------
@router.post("/centers/{center_id}/fees", status_code=201)
async def create_fee(
    center_id: uuid.UUID,
    request: FeeCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)

    # Verify the student is enrolled in this center
    cs = await db.fetchrow(
        "SELECT 1 FROM center_student WHERE center_id=$1 AND student_id=$2 AND is_deleted=FALSE",
        center_id, request.student_id,
    )
    if not cs:
        raise HTTPException(400, "Student is not enrolled in this center.")

    if request.batch_id:
        b = await db.fetchrow(
            "SELECT 1 FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
            request.batch_id, center_id,
        )
        if not b:
            raise HTTPException(400, "Batch is not in this center.")

    fee_id = uuid.uuid4()
    initial_status = "Pending" if request.due_date >= date_type.today() else "Overdue"
    await db.execute(
        """
        INSERT INTO fee (id, center_id, student_id, batch_id, amount, due_date,
                         status, notes, created_by, created_date,
                         is_active, is_deleted, version_number, source_system)
        VALUES ($1, $2, $3, $4, $5, $6,
                $7, $8, $9, NOW() AT TIME ZONE 'UTC',
                TRUE, FALSE, 1, 'OwnerPortal')
        """,
        fee_id, center_id, request.student_id, request.batch_id,
        request.amount, request.due_date, initial_status, request.notes, owner.user_id,
    )
    return {"id": str(fee_id), "status": initial_status}


# ---------------------------------------------------------------------------
# CREATE fees in bulk for everyone in a batch
# ---------------------------------------------------------------------------
@router.post("/centers/{center_id}/fees/bulk-by-batch", status_code=201)
async def create_fees_bulk_by_batch(
    center_id: uuid.UUID,
    request: FeeBulkByBatchRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)

    batch = await db.fetchrow(
        "SELECT id FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        request.batch_id, center_id,
    )
    if not batch:
        raise HTTPException(404, "Batch not found in this center.")

    students = await db.fetch(
        """
        SELECT bs.student_id
        FROM batch_student bs
        WHERE bs.batch_id = $1 AND bs.is_deleted = FALSE AND bs.is_active = TRUE
        """,
        request.batch_id,
    )
    if not students:
        raise HTTPException(400, "No active students in this batch.")

    initial_status = "Pending" if request.due_date >= date_type.today() else "Overdue"
    created = 0
    async with db.transaction():
        for s in students:
            await db.execute(
                """
                INSERT INTO fee (id, center_id, student_id, batch_id, amount, due_date,
                                 status, notes, created_by, created_date,
                                 is_active, is_deleted, version_number, source_system)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
                        $6, $7, $8, NOW() AT TIME ZONE 'UTC',
                        TRUE, FALSE, 1, 'OwnerPortal')
                """,
                center_id, s["student_id"], request.batch_id,
                request.amount, request.due_date, initial_status,
                request.notes, owner.user_id,
            )
            created += 1
    return {"created": created}


# ---------------------------------------------------------------------------
# UPDATE fee (amount/due_date/notes)
# ---------------------------------------------------------------------------
@router.patch("/centers/{center_id}/fees/{fee_id}", response_model=SuccessResponse)
async def update_fee(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    request: FeeUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)
    f = await db.fetchrow(
        "SELECT id FROM fee WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        fee_id, center_id,
    )
    if not f:
        raise HTTPException(404, "Fee not found.")

    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(400, "No fields to update.")

    set_parts = ", ".join(f"{k}=${i+1}" for i, k in enumerate(fields))
    values = list(fields.values())
    idx = len(values) + 1
    values.append(owner.user_id)
    values.append(fee_id)
    await db.execute(
        f"""UPDATE fee SET {set_parts},
                modified_by=${idx}, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE id=${idx + 1}""",
        *values,
    )
    await _recalc_fee_status(db, fee_id, owner.user_id)
    return SuccessResponse(message="Fee updated.")


# ---------------------------------------------------------------------------
# DELETE fee (soft) — only allowed if no successful payments yet
# ---------------------------------------------------------------------------
@router.delete("/centers/{center_id}/fees/{fee_id}", response_model=SuccessResponse)
async def remove_fee(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)
    paid = await db.fetchrow(
        """SELECT 1 FROM payment
           WHERE fee_id=$1 AND status='Success' AND is_deleted=FALSE LIMIT 1""",
        fee_id,
    )
    if paid:
        raise HTTPException(409, "Cannot delete a fee that has successful payments. Refund first.")

    result = await db.execute(
        """UPDATE fee SET is_deleted=TRUE, is_active=FALSE,
                          modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                          version_number=version_number+1
           WHERE id=$2 AND center_id=$3 AND is_deleted=FALSE""",
        owner.user_id, fee_id, center_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(404, "Fee not found.")
    return SuccessResponse(message="Fee deleted.")


# ---------------------------------------------------------------------------
# RECORD payment against a fee (cash/UPI/etc.)
# ---------------------------------------------------------------------------
@router.post("/centers/{center_id}/fees/{fee_id}/payments", status_code=201)
async def record_payment(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    request: PaymentCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)
    fee = await db.fetchrow(
        """SELECT id, amount FROM fee
           WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE""",
        fee_id, center_id,
    )
    if not fee:
        raise HTTPException(404, "Fee not found.")

    paid_row = await db.fetchrow(
        """SELECT COALESCE(SUM(amount_paid), 0) AS paid
           FROM payment WHERE fee_id=$1 AND status='Success' AND is_deleted=FALSE""",
        fee_id,
    )
    already: Decimal = paid_row["paid"]
    if already + request.amount_paid > fee["amount"]:
        raise HTTPException(
            400,
            f"Payment {request.amount_paid} would exceed remaining balance "
            f"{fee['amount'] - already}.",
        )

    payment_id = uuid.uuid4()
    async with db.transaction():
        await db.execute(
            """
            INSERT INTO payment (id, fee_id, mode, status, transaction_id, gateway_reference,
                                 amount_paid, paid_at, paid_by,
                                 created_by, created_date,
                                 is_active, is_deleted, version_number, source_system)
            VALUES ($1, $2, $3, 'Success', $4, $5,
                    $6, NOW() AT TIME ZONE 'UTC', $7,
                    $7, NOW() AT TIME ZONE 'UTC',
                    TRUE, FALSE, 1, 'OwnerPortal')
            """,
            payment_id, fee_id, request.mode,
            request.transaction_id, request.gateway_reference,
            request.amount_paid, owner.user_id,
        )
        new_status = await _recalc_fee_status(db, fee_id, owner.user_id)
    return {"id": str(payment_id), "fee_status": new_status}


# ---------------------------------------------------------------------------
# LIST payments for a fee
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/fees/{fee_id}/payments")
async def list_payments(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    assert_owns_center(center_id, owner)
    fee = await db.fetchrow(
        "SELECT id FROM fee WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        fee_id, center_id,
    )
    if not fee:
        raise HTTPException(404, "Fee not found.")

    rows = await db.fetch(
        """
        SELECT id, mode, status, transaction_id, gateway_reference,
               amount_paid, paid_at, created_date, refund_reason, refunded_at
        FROM payment
        WHERE fee_id=$1 AND is_deleted=FALSE
        ORDER BY paid_at DESC NULLS LAST, created_date DESC
        """,
        fee_id,
    )
    return [
        {
            "id": str(r["id"]),
            "mode": r["mode"],
            "status": r["status"],
            "transaction_id": r["transaction_id"],
            "gateway_reference": r["gateway_reference"],
            "amount_paid": float(r["amount_paid"]),
            "paid_at": r["paid_at"].isoformat() if r["paid_at"] else None,
            "created_date": r["created_date"].isoformat() if r["created_date"] else None,
            "refund_reason": r["refund_reason"],
            "refunded_at": r["refunded_at"].isoformat() if r["refunded_at"] else None,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# PLATFORM INVOICES — what SiraguWings bills the center (read-only)
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/platform-invoices")
async def list_platform_invoices(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    assert_owns_center(center_id, owner)
    rows = await db.fetch(
        """
        SELECT id, invoice_number, student_count, rate_per_student,
               sub_total, gst_rate, gst_amount, total_amount,
               billing_period_start, billing_period_end, due_date,
               status, gst_invoice_url, generated_at
        FROM platform_invoice
        WHERE center_id = $1 AND is_deleted = FALSE
        ORDER BY billing_period_start DESC
        """,
        center_id,
    )
    return [
        {
            "id": str(r["id"]),
            "invoice_number": r["invoice_number"],
            "student_count": r["student_count"],
            "rate_per_student": float(r["rate_per_student"]),
            "sub_total": float(r["sub_total"]),
            "gst_rate": float(r["gst_rate"]),
            "gst_amount": float(r["gst_amount"]),
            "total_amount": float(r["total_amount"]),
            "billing_period_start": r["billing_period_start"].isoformat(),
            "billing_period_end": r["billing_period_end"].isoformat(),
            "due_date": r["due_date"].isoformat(),
            "status": r["status"],
            "gst_invoice_url": r["gst_invoice_url"],
            "generated_at": r["generated_at"].isoformat() if r["generated_at"] else None,
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# GST INVOICE — fetch one fee with center / parent / GST breakdown
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/fees/{fee_id}/invoice")
async def get_fee_invoice(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    """Return everything needed to render a printable invoice."""
    assert_owns_center(center_id, owner)
    row = await db.fetchrow(
        """
        SELECT f.id, f.amount, f.due_date, f.status, f.notes, f.created_date,
               s.id    AS student_id,
               s.name  AS student_name,
               b.batch_name, b.course_name,
               p.name  AS parent_name,
               p.mobile_number AS parent_mobile,
               p.email AS parent_email,
               c.name  AS center_name,
               c.address AS center_address,
               c.city, c.state, c.pincode,
               c.gstin AS center_gstin,
               c.mobile_number AS center_mobile,
               COALESCE((
                 SELECT SUM(amount_paid) FROM payment
                 WHERE fee_id = f.id AND status = 'Success' AND is_deleted = FALSE
               ), 0) AS paid_amount
        FROM fee f
        JOIN center  c ON c.id = f.center_id  AND c.is_deleted = FALSE
        JOIN student s ON s.id = f.student_id AND s.is_deleted = FALSE
        LEFT JOIN batch b ON b.id = f.batch_id
        LEFT JOIN "user" p ON p.id = s.parent_id AND p.is_deleted = FALSE
        WHERE f.id = $1 AND f.center_id = $2 AND f.is_deleted = FALSE
        """,
        fee_id, center_id,
    )
    if not row:
        raise HTTPException(404, "Fee not found.")

    amount: Decimal = row["amount"]
    has_gst: bool = bool(row["center_gstin"])
    if has_gst:
        # The stored fee amount is the GST-inclusive total. Reverse-derive base + tax.
        gst_rate = DEFAULT_GST_RATE
        base = (amount / (Decimal("1") + gst_rate / Decimal("100"))).quantize(Decimal("0.01"))
        gst_amount = (amount - base).quantize(Decimal("0.01"))
        # CGST + SGST split for intra-state invoices (the common case).
        half_rate = gst_rate / Decimal("2")
        cgst_amount = (gst_amount / Decimal("2")).quantize(Decimal("0.01"))
        sgst_amount = (gst_amount - cgst_amount)
    else:
        gst_rate = Decimal("0")
        base = amount
        gst_amount = Decimal("0")
        half_rate = Decimal("0")
        cgst_amount = Decimal("0")
        sgst_amount = Decimal("0")

    return {
        "fee": {
            "id": str(row["id"]),
            "amount": float(amount),
            "paid_amount": float(row["paid_amount"]),
            "outstanding": float(amount - row["paid_amount"]),
            "due_date": row["due_date"].isoformat(),
            "status": row["status"],
            "notes": row["notes"],
            "created_date": row["created_date"].isoformat() if row["created_date"] else None,
        },
        "student": {
            "id": str(row["student_id"]),
            "name": row["student_name"],
            "parent_name": row["parent_name"],
            "parent_mobile": row["parent_mobile"],
            "parent_email": row["parent_email"],
        },
        "batch": {
            "course_name": row["course_name"],
            "batch_name": row["batch_name"],
        } if row["batch_name"] else None,
        "center": {
            "name": row["center_name"],
            "address": row["center_address"],
            "city": row["city"],
            "state": row["state"],
            "pincode": row["pincode"],
            "mobile_number": row["center_mobile"],
            "gstin": row["center_gstin"],
        },
        "tax": {
            "has_gst": has_gst,
            "gst_rate": float(gst_rate),
            "half_rate": float(half_rate),
            "base_amount": float(base),
            "gst_amount": float(gst_amount),
            "cgst_amount": float(cgst_amount),
            "sgst_amount": float(sgst_amount),
            "total_amount": float(amount),
        },
        "invoice_number": f"INV-{str(row['id'])[:8].upper()}",
    }


# ---------------------------------------------------------------------------
# REFUND — mark a successful payment as Refunded; recalc fee status
# ---------------------------------------------------------------------------
class RefundRequest(BaseModel):
    reason: Optional[str] = Field(None, max_length=500)


@router.post("/centers/{center_id}/fees/{fee_id}/payments/{payment_id}/refund")
async def refund_payment(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    payment_id: uuid.UUID,
    request: RefundRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)

    # Verify the payment row belongs to this center+fee and is currently Success
    row = await db.fetchrow(
        """
        SELECT p.id, p.status, p.amount_paid
        FROM payment p
        JOIN fee f ON f.id = p.fee_id
        WHERE p.id = $1 AND f.id = $2 AND f.center_id = $3
          AND p.is_deleted = FALSE AND f.is_deleted = FALSE
        """,
        payment_id, fee_id, center_id,
    )
    if not row:
        raise HTTPException(404, "Payment not found for this fee.")
    if row["status"] == "Refunded":
        raise HTTPException(409, "Payment is already refunded.")
    if row["status"] != "Success":
        raise HTTPException(400, f"Cannot refund a {row['status']} payment.")

    async with db.transaction():
        await db.execute(
            """
            UPDATE payment
            SET status='Refunded', refund_reason=$1, refunded_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE id=$3
            """,
            request.reason, owner.user_id, payment_id,
        )
        new_status = await _recalc_fee_status(db, fee_id, owner.user_id)

    return {
        "message": f"Refunded {row['amount_paid']}.",
        "fee_status": new_status,
        "refunded_amount": float(row["amount_paid"]),
    }


# ---------------------------------------------------------------------------
# REMINDER — notify the linked parent about a pending/overdue fee
# ---------------------------------------------------------------------------
class ReminderRequest(BaseModel):
    message: Optional[str] = Field(None, max_length=1000)


@router.post("/centers/{center_id}/fees/{fee_id}/reminder")
async def send_fee_reminder(
    center_id: uuid.UUID,
    fee_id: uuid.UUID,
    request: ReminderRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)

    # Pull fee + parent info
    row = await db.fetchrow(
        """
        SELECT f.id, f.amount, f.due_date, f.status,
               s.name AS student_name, s.parent_id,
               c.name AS center_name,
               COALESCE((
                 SELECT SUM(amount_paid) FROM payment
                 WHERE fee_id = f.id AND status = 'Success' AND is_deleted = FALSE
               ), 0) AS paid_amount
        FROM fee f
        JOIN student s ON s.id = f.student_id AND s.is_deleted = FALSE
        JOIN center  c ON c.id = f.center_id  AND c.is_deleted = FALSE
        WHERE f.id = $1 AND f.center_id = $2 AND f.is_deleted = FALSE
        """,
        fee_id, center_id,
    )
    if not row:
        raise HTTPException(404, "Fee not found.")

    if not row["parent_id"]:
        raise HTTPException(
            400,
            f"{row['student_name']} has no parent linked. Link a parent first.",
        )

    outstanding: Decimal = row["amount"] - row["paid_amount"]
    if outstanding <= 0:
        raise HTTPException(400, "This fee is fully paid — no reminder needed.")

    # Compose the reminder
    title = f"Fee due — {row['center_name']}"
    if request.message and request.message.strip():
        body = request.message.strip()
    else:
        body = (
            f"Hi, this is a reminder that ₹{outstanding} is due for "
            f"{row['student_name']} at {row['center_name']} on {row['due_date']}. "
            "Please clear the balance at your earliest convenience."
        )

    async with db.transaction():
        await db.execute(
            """
            INSERT INTO notification_log
                (id, user_id, center_id, type, category, title, body,
                 reference_type, reference_id,
                 delivery_status, created_by, created_date,
                 is_active, is_deleted, version_number, source_system)
            VALUES
                (gen_random_uuid(), $1, $2, 'InApp', 'FeeReminder', $3, $4,
                 'fee', $5,
                 'Queued', $6, NOW() AT TIME ZONE 'UTC',
                 TRUE, FALSE, 1, 'OwnerPortal')
            """,
            row["parent_id"], center_id, title, body, fee_id, owner.user_id,
        )
        await db.execute(
            """
            UPDATE fee
            SET reminder_sent_at = NOW() AT TIME ZONE 'UTC',
                reminder_count = reminder_count + 1,
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE id=$2
            """,
            owner.user_id, fee_id,
        )

    return {
        "message": "Reminder sent.",
        "outstanding": float(outstanding),
    }
