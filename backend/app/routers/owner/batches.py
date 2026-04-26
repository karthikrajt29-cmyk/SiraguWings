import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner
from app.schemas.center import (
    BatchCreateRequest,
    BatchSummary,
    BatchUpdateRequest,
)
from app.schemas.common import SuccessResponse
from app.services.center_service import get_center_or_404

router = APIRouter()


BATCH_UPDATABLE_FIELDS = {
    "course_name", "batch_name", "category_type",
    "class_days", "start_time", "end_time",
    "strength_limit", "fee_amount", "teacher_id", "is_active",
}

TIME_FIELDS = {"start_time", "end_time"}


async def _validate_teacher_belongs_to_center(
    db: asyncpg.Connection,
    teacher_id: uuid.UUID,
    center_id: uuid.UUID,
) -> None:
    ct = await db.fetchrow(
        "SELECT id FROM center_teacher WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        teacher_id, center_id,
    )
    if not ct:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Selected teacher does not belong to this center.",
        )


# ---------------------------------------------------------------------------
# LIST batches in a center
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/batches", response_model=list[BatchSummary])
async def list_batches(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list[BatchSummary]:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT b.id, b.course_name, b.batch_name, b.category_type,
               b.class_days, b.start_time::text, b.end_time::text,
               b.strength_limit, b.fee_amount, b.is_active,
               b.created_date, b.teacher_id,
               u.name AS teacher_name,
               COUNT(bs.id) FILTER (WHERE bs.is_deleted=FALSE AND bs.is_active=TRUE) AS student_count
        FROM batch b
        LEFT JOIN center_teacher ct ON ct.id = b.teacher_id AND ct.is_deleted = FALSE
        LEFT JOIN "user" u          ON u.id  = ct.user_id
        LEFT JOIN batch_student bs  ON bs.batch_id = b.id
        WHERE b.center_id = $1 AND b.is_deleted = FALSE
        GROUP BY b.id, u.name
        ORDER BY b.is_active DESC, b.course_name, b.batch_name
        """,
        center_id,
    )

    return [
        BatchSummary(
            id=r["id"], course_name=r["course_name"], batch_name=r["batch_name"],
            category_type=r["category_type"], class_days=r["class_days"],
            start_time=r["start_time"], end_time=r["end_time"],
            strength_limit=r["strength_limit"], fee_amount=float(r["fee_amount"]),
            is_active=r["is_active"], teacher_name=r["teacher_name"],
            teacher_id=r["teacher_id"], created_date=r["created_date"],
            student_count=int(r["student_count"] or 0),
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# CREATE batch in a center
# ---------------------------------------------------------------------------
@router.post(
    "/centers/{center_id}/batches",
    response_model=BatchSummary,
    status_code=201,
)
async def create_batch(
    center_id: uuid.UUID,
    request: BatchCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> BatchSummary:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    if request.teacher_id:
        await _validate_teacher_belongs_to_center(db, request.teacher_id, center_id)

    new_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO batch (
            id, center_id, teacher_id, course_name, batch_name, category_type,
            class_days, start_time, end_time, strength_limit, fee_amount,
            created_by, created_date, is_active, is_deleted, version_number, source_system
        ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8::time, $9::time, $10, $11,
            $12, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
        )
        """,
        new_id, center_id, request.teacher_id,
        request.course_name, request.batch_name, request.category_type,
        request.class_days, request.start_time, request.end_time,
        request.strength_limit, request.fee_amount,
        owner.user_id,
    )

    r = await db.fetchrow(
        """
        SELECT b.id, b.course_name, b.batch_name, b.category_type,
               b.class_days, b.start_time::text, b.end_time::text,
               b.strength_limit, b.fee_amount, b.is_active,
               b.created_date, b.teacher_id,
               u.name AS teacher_name
        FROM batch b
        LEFT JOIN center_teacher ct ON ct.id = b.teacher_id AND ct.is_deleted = FALSE
        LEFT JOIN "user" u          ON u.id  = ct.user_id
        WHERE b.id = $1
        """,
        new_id,
    )
    return BatchSummary(
        id=r["id"], course_name=r["course_name"], batch_name=r["batch_name"],
        category_type=r["category_type"], class_days=r["class_days"],
        start_time=r["start_time"], end_time=r["end_time"],
        strength_limit=r["strength_limit"], fee_amount=float(r["fee_amount"]),
        is_active=r["is_active"], teacher_name=r["teacher_name"],
        teacher_id=r["teacher_id"], created_date=r["created_date"],
        student_count=0,
    )


# ---------------------------------------------------------------------------
# UPDATE batch
# ---------------------------------------------------------------------------
@router.patch(
    "/centers/{center_id}/batches/{batch_id}",
    response_model=SuccessResponse,
)
async def update_batch(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    request: BatchUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)

    existing = await db.fetchrow(
        """SELECT id FROM batch
           WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE""",
        batch_id, center_id,
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    raw = request.model_dump(exclude_none=True)
    fields = {k: v for k, v in raw.items() if k in BATCH_UPDATABLE_FIELDS}
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update.")

    if "teacher_id" in fields and fields["teacher_id"] is not None:
        await _validate_teacher_belongs_to_center(db, fields["teacher_id"], center_id)

    set_parts: list[str] = []
    values: list = []
    for i, (k, v) in enumerate(fields.items(), start=1):
        cast = "::time" if k in TIME_FIELDS else ""
        set_parts.append(f"{k} = ${i}{cast}")
        values.append(v)

    set_clauses = ", ".join(set_parts)
    idx = len(values) + 1
    values.append(owner.user_id)
    values.append(batch_id)

    await db.execute(
        f"""
        UPDATE batch SET {set_clauses},
            modified_by = ${idx},
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = ${idx + 1}
        """,
        *values,
    )
    return SuccessResponse(message="Batch updated.")


# ---------------------------------------------------------------------------
# DELETE batch (soft-delete)
# ---------------------------------------------------------------------------
@router.delete(
    "/centers/{center_id}/batches/{batch_id}",
    response_model=SuccessResponse,
)
async def remove_batch(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)

    result = await db.execute(
        """
        UPDATE batch
        SET is_deleted=TRUE, is_active=FALSE,
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
            version_number=version_number+1
        WHERE id=$2 AND center_id=$3 AND is_deleted=FALSE
        """,
        owner.user_id, batch_id, center_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    return SuccessResponse(message="Batch removed.")
