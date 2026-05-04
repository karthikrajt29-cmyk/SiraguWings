"""GET /parent/fees — outstanding + paid fees across all children of a parent.

Also: POST /parent/fees/{id}/pay-intent — returns a payment URL / UPI deep link.
The actual gateway integration is a follow-up; v1 returns a stub UPI deeplink
constructed from the center's GSTIN/payment fields when present, otherwise
echoes a placeholder URL.
"""
import uuid
from datetime import datetime, timedelta, timezone
from decimal import Decimal

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, require_parent
from app.schemas.parent import (
    ParentFeeItem,
    ParentPayIntentRequest,
    ParentPayIntentResponse,
)

router = APIRouter()


@router.get("/fees", response_model=list[ParentFeeItem])
async def list_fees(
    only_outstanding: bool = Query(False),
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> list[ParentFeeItem]:
    extra = " AND f.status <> 'Paid' " if only_outstanding else ""
    rows = await db.fetch(
        f"""
        SELECT f.id, f.center_id, c.name AS center_name,
               f.student_id, s.name AS student_name,
               b.batch_name, b.course_name,
               f.amount, f.due_date, f.status, f.notes,
               COALESCE((
                 SELECT SUM(amount_paid) FROM payment
                 WHERE fee_id = f.id AND status='Success' AND is_deleted=FALSE
               ), 0) AS paid_amount
        FROM fee f
        JOIN student s ON s.id = f.student_id AND s.is_deleted = FALSE
        JOIN center c  ON c.id = f.center_id  AND c.is_deleted = FALSE
        LEFT JOIN batch b ON b.id = f.batch_id
        WHERE s.parent_id = $1 AND f.is_deleted = FALSE
        {extra}
        ORDER BY f.due_date DESC
        """,
        parent.user_id,
    )

    items: list[ParentFeeItem] = []
    for r in rows:
        amount = Decimal(r["amount"])
        paid = Decimal(r["paid_amount"])
        outstanding = amount - paid
        items.append(
            ParentFeeItem(
                id=r["id"], center_id=r["center_id"], center_name=r["center_name"],
                student_id=r["student_id"], student_name=r["student_name"],
                batch_name=r["batch_name"], course_name=r["course_name"],
                amount=amount, paid_amount=paid, outstanding=outstanding,
                due_date=r["due_date"], status=r["status"], notes=r["notes"],
            )
        )
    return items


@router.post("/fees/{fee_id}/pay-intent", response_model=ParentPayIntentResponse)
async def create_pay_intent(
    fee_id: uuid.UUID,
    request: ParentPayIntentRequest,
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> ParentPayIntentResponse:
    fee = await db.fetchrow(
        """
        SELECT f.id, f.amount, f.status, f.center_id,
               c.name AS center_name,
               COALESCE((
                 SELECT SUM(amount_paid) FROM payment
                 WHERE fee_id = f.id AND status='Success' AND is_deleted=FALSE
               ), 0) AS paid_amount
        FROM fee f
        JOIN student s ON s.id = f.student_id AND s.is_deleted = FALSE
        JOIN center c  ON c.id = f.center_id  AND c.is_deleted = FALSE
        WHERE f.id = $1 AND s.parent_id = $2 AND f.is_deleted = FALSE
        """,
        fee_id, parent.user_id,
    )
    if not fee:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Fee not found.")

    outstanding = Decimal(fee["amount"]) - Decimal(fee["paid_amount"])
    if outstanding <= 0:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Fee already paid.")

    # UPI deep link / PG checkout integration is a follow-up.
    # v1 returns intent metadata so the mobile app can show "pay later" UI.
    return ParentPayIntentResponse(
        fee_id=fee_id,
        method=request.method,
        amount=outstanding,
        payment_url=None,
        upi_deeplink=None,
        expires_at=datetime.now(timezone.utc) + timedelta(minutes=15),
    )
