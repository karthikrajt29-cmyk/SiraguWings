"""GET /teacher/batches — batches assigned to the current teacher.

`batch.teacher_id` references `center_teacher.id` (not user.id), so the lookup
joins through center_teacher.
"""
import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser, require_teacher
from app.schemas.teacher import TeacherBatch, TeacherBatchStudent

router = APIRouter()


async def _ensure_teacher_owns_batch(
    db: asyncpg.Connection, batch_id: uuid.UUID, user_id: uuid.UUID
) -> dict:
    row = await db.fetchrow(
        """
        SELECT b.id, b.center_id
        FROM batch b
        JOIN center_teacher ct ON ct.id = b.teacher_id
        WHERE b.id = $1 AND ct.user_id = $2
          AND b.is_deleted = FALSE AND ct.is_deleted = FALSE
        """,
        batch_id, user_id,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not assigned to you.")
    return dict(row)


@router.get("/batches", response_model=list[TeacherBatch])
async def list_my_batches(
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> list[TeacherBatch]:
    rows = await db.fetch(
        """
        SELECT b.id, b.center_id, c.name AS center_name,
               b.course_name, b.batch_name, b.category_type,
               b.class_days, b.start_time, b.end_time, b.is_active,
               (
                 SELECT COUNT(*) FROM batch_student bs
                 WHERE bs.batch_id = b.id AND bs.is_deleted = FALSE
               ) AS student_count
        FROM batch b
        JOIN center_teacher ct ON ct.id = b.teacher_id AND ct.is_deleted = FALSE
        JOIN center c          ON c.id = b.center_id  AND c.is_deleted = FALSE
        WHERE ct.user_id = $1 AND b.is_deleted = FALSE
        ORDER BY b.is_active DESC, b.course_name, b.batch_name
        """,
        teacher.user_id,
    )
    return [
        TeacherBatch(
            id=r["id"], center_id=r["center_id"], center_name=r["center_name"],
            course_name=r["course_name"], batch_name=r["batch_name"],
            category_type=r["category_type"], class_days=r["class_days"],
            start_time=r["start_time"], end_time=r["end_time"],
            student_count=r["student_count"] or 0, is_active=r["is_active"],
        )
        for r in rows
    ]


@router.get("/batches/{batch_id}/students", response_model=list[TeacherBatchStudent])
async def list_batch_students(
    batch_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> list[TeacherBatchStudent]:
    await _ensure_teacher_owns_batch(db, batch_id, teacher.user_id)

    rows = await db.fetch(
        """
        SELECT s.id AS student_id, s.name, s.profile_image_url,
               s.parent_id, p.mobile_number AS parent_mobile
        FROM batch_student bs
        JOIN student s        ON s.id = bs.student_id AND s.is_deleted = FALSE
        LEFT JOIN "user" p    ON p.id = s.parent_id   AND p.is_deleted = FALSE
        WHERE bs.batch_id = $1 AND bs.is_deleted = FALSE
        ORDER BY s.name
        """,
        batch_id,
    )
    return [TeacherBatchStudent(**dict(r)) for r in rows]
