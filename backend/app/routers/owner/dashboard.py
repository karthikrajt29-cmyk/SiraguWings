import uuid

import asyncpg
from fastapi import APIRouter, Depends, Query

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner

router = APIRouter()


@router.get("/dashboard")
async def get_dashboard(
    center_id: uuid.UUID = Query(...),
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> dict:
    assert_owns_center(center_id, owner)

    row = await db.fetchrow(
        """
        SELECT
          (SELECT COUNT(*) FROM center_student
           WHERE center_id = $1 AND is_deleted = FALSE)        AS total_students,

          (SELECT COUNT(*) FROM batch
           WHERE center_id = $1 AND is_deleted = FALSE)        AS total_batches,

          COUNT(*) FILTER (
            WHERE f.status IN ('Pending', 'PartiallyPaid')
              AND f.due_date >= CURRENT_DATE
          )                                                     AS pending_fees,

          COALESCE(SUM(
            CASE WHEN f.status = 'Overdue'
                   OR (f.status = 'Pending' AND f.due_date < CURRENT_DATE)
                 THEN f.amount ELSE 0 END
          ), 0)                                                 AS overdue_amount

        FROM fee f
        WHERE f.center_id = $1 AND f.is_deleted = FALSE
        """,
        center_id,
    )

    return {
        "total_students": row["total_students"],
        "total_batches":  row["total_batches"],
        "pending_fees":   row["pending_fees"],
        "overdue_amount": float(row["overdue_amount"]),
    }
