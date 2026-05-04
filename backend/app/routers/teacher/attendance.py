"""Teacher attendance — view roster and mark/update attendance for own batches."""
import uuid
from datetime import date as date_type
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, require_teacher
from app.routers.teacher.batches import _ensure_teacher_owns_batch
from app.schemas.common import SuccessResponse
from app.schemas.teacher import TeacherAttendanceRequest

router = APIRouter()


@router.get("/batches/{batch_id}/attendance")
async def get_attendance(
    batch_id: uuid.UUID,
    attendance_date: Optional[date_type] = Query(None, alias="date"),
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> dict:
    await _ensure_teacher_owns_batch(db, batch_id, teacher.user_id)
    target_date = attendance_date or date_type.today()

    rows = await db.fetch(
        """
        SELECT s.id AS student_id, s.name, s.profile_image_url,
               a.status, a.marked_at
        FROM batch_student bs
        JOIN student s ON s.id = bs.student_id AND s.is_deleted = FALSE
        LEFT JOIN attendance a
          ON a.batch_id = bs.batch_id AND a.student_id = bs.student_id
         AND a.attendance_date = $2 AND a.is_deleted = FALSE
        WHERE bs.batch_id = $1 AND bs.is_deleted = FALSE
        ORDER BY s.name
        """,
        batch_id, target_date,
    )

    return {
        "batch_id": str(batch_id),
        "date": target_date.isoformat(),
        "items": [
            {
                "student_id": str(r["student_id"]),
                "name": r["name"],
                "profile_image_url": r["profile_image_url"],
                "status": r["status"],            # None if not marked yet
                "marked_at": r["marked_at"].isoformat() if r["marked_at"] else None,
            }
            for r in rows
        ],
    }


@router.post("/batches/{batch_id}/attendance", response_model=SuccessResponse)
async def mark_attendance(
    batch_id: uuid.UUID,
    request: TeacherAttendanceRequest,
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> SuccessResponse:
    await _ensure_teacher_owns_batch(db, batch_id, teacher.user_id)

    # Validate every student belongs to this batch.
    student_ids = {m.student_id for m in request.marks}
    valid = await db.fetch(
        """
        SELECT student_id FROM batch_student
        WHERE batch_id = $1 AND is_deleted = FALSE
          AND student_id = ANY($2::uuid[])
        """,
        batch_id, list(student_ids),
    )
    if len(valid) != len(student_ids):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "One or more students are not in this batch.",
        )

    async with db.transaction():
        for mark in request.marks:
            # Upsert by (batch, student, date). On update, capture previous_status.
            await db.execute(
                """
                INSERT INTO attendance
                    (batch_id, student_id, marked_by, attendance_date, status,
                     created_by, created_date)
                VALUES ($1, $2, $3, $4, $5, $3, NOW() AT TIME ZONE 'UTC')
                ON CONFLICT (batch_id, student_id, attendance_date) DO UPDATE SET
                    previous_status = attendance.status,
                    status          = EXCLUDED.status,
                    edited_by       = EXCLUDED.marked_by,
                    edited_at       = NOW() AT TIME ZONE 'UTC',
                    modified_by     = EXCLUDED.marked_by,
                    modified_date   = NOW() AT TIME ZONE 'UTC',
                    version_number  = attendance.version_number + 1
                """,
                batch_id, mark.student_id, teacher.user_id,
                request.attendance_date, mark.status,
            )

    return SuccessResponse(message=f"Attendance saved for {len(request.marks)} student(s).")
