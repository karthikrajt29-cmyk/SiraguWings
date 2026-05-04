"""GET /parent/children/{id}/attendance — attendance history for a child."""
import uuid
from datetime import date as date_type
from datetime import timedelta
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, require_parent
from app.schemas.parent import ChildAttendanceDay

router = APIRouter()


async def _ensure_owns_child(
    db: asyncpg.Connection, child_id: uuid.UUID, parent_id: uuid.UUID
) -> None:
    row = await db.fetchrow(
        """SELECT 1 FROM student
           WHERE id=$1 AND parent_id=$2 AND is_deleted=FALSE""",
        child_id, parent_id,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Child not found.")


@router.get(
    "/children/{child_id}/attendance",
    response_model=list[ChildAttendanceDay],
)
async def child_attendance(
    child_id: uuid.UUID,
    start: Optional[date_type] = Query(None, description="Default: 30 days ago"),
    end: Optional[date_type] = Query(None, description="Default: today"),
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> list[ChildAttendanceDay]:
    await _ensure_owns_child(db, child_id, parent.user_id)

    today = date_type.today()
    end_d = end or today
    start_d = start or (end_d - timedelta(days=30))
    if start_d > end_d:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "start must be <= end")

    rows = await db.fetch(
        """
        SELECT a.attendance_date, a.batch_id, b.batch_name, b.course_name,
               a.status
        FROM attendance a
        JOIN batch b ON b.id = a.batch_id
        WHERE a.student_id = $1
          AND a.attendance_date BETWEEN $2 AND $3
          AND a.is_deleted = FALSE
        ORDER BY a.attendance_date DESC, b.batch_name
        """,
        child_id, start_d, end_d,
    )
    return [
        ChildAttendanceDay(
            attendance_date=r["attendance_date"],
            batch_id=r["batch_id"],
            batch_name=r["batch_name"],
            course_name=r["course_name"],
            status=r["status"],
        )
        for r in rows
    ]
