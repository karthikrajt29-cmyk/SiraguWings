"""Teacher posts a daily activity (text + optional photo as data URI)."""
import uuid
from datetime import date as date_type
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, require_teacher
from app.schemas.teacher import TeacherActivity, TeacherActivityCreate

router = APIRouter()


def _to_data_uri(b64: Optional[str]) -> Optional[str]:
    if not b64:
        return None
    raw = b64.strip()
    return raw if raw.startswith("data:") else f"data:image/jpeg;base64,{raw}"


@router.post("/activities", response_model=TeacherActivity, status_code=201)
async def create_activity(
    request: TeacherActivityCreate,
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> TeacherActivity:
    # Validate teacher belongs to this center.
    link = await db.fetchrow(
        """
        SELECT 1 FROM center_teacher
        WHERE user_id = $1 AND center_id = $2
          AND is_active = TRUE AND is_deleted = FALSE
        """,
        teacher.user_id, request.center_id,
    )
    if not link:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "You are not active at this center.")

    if request.batch_id:
        # Make sure the batch is also yours.
        own = await db.fetchrow(
            """
            SELECT 1 FROM batch b
            JOIN center_teacher ct ON ct.id = b.teacher_id
            WHERE b.id = $1 AND ct.user_id = $2
              AND b.is_deleted = FALSE AND ct.is_deleted = FALSE
            """,
            request.batch_id, teacher.user_id,
        )
        if not own:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Batch is not assigned to you.")

    image_url = _to_data_uri(request.image_base64)
    activity_date = request.activity_date or date_type.today()
    new_id = uuid.uuid4()

    await db.execute(
        """
        INSERT INTO teacher_activity
            (id, teacher_id, center_id, batch_id, title, body, image_url,
             activity_date, created_by, created_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $2, NOW() AT TIME ZONE 'UTC')
        """,
        new_id, teacher.user_id, request.center_id, request.batch_id,
        request.title, request.body, image_url, activity_date,
    )

    row = await db.fetchrow(
        """
        SELECT ta.id, ta.center_id, c.name AS center_name,
               ta.batch_id, b.batch_name,
               ta.title, ta.body, ta.image_url, ta.activity_date, ta.created_date
        FROM teacher_activity ta
        JOIN center c       ON c.id = ta.center_id
        LEFT JOIN batch b   ON b.id = ta.batch_id
        WHERE ta.id = $1
        """,
        new_id,
    )
    return TeacherActivity(**dict(row))


@router.get("/activities", response_model=list[TeacherActivity])
async def list_my_activities(
    limit: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> list[TeacherActivity]:
    rows = await db.fetch(
        """
        SELECT ta.id, ta.center_id, c.name AS center_name,
               ta.batch_id, b.batch_name,
               ta.title, ta.body, ta.image_url, ta.activity_date, ta.created_date
        FROM teacher_activity ta
        JOIN center c       ON c.id = ta.center_id
        LEFT JOIN batch b   ON b.id = ta.batch_id
        WHERE ta.teacher_id = $1 AND ta.is_deleted = FALSE
        ORDER BY ta.activity_date DESC, ta.created_date DESC
        LIMIT $2
        """,
        teacher.user_id, limit,
    )
    return [TeacherActivity(**dict(r)) for r in rows]
