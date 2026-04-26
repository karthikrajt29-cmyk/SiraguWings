"""Owner-scoped endpoints for parents, batch students, and batch attendance.

These mirror the equivalent admin endpoints in `routers/admin/centers.py` but are
gated by `require_owner` + `assert_owns_center` so a center owner can only act on
centers they own.
"""
import uuid
from datetime import date as date_type

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner
from app.schemas.common import SuccessResponse
from app.services.center_service import get_center_or_404

router = APIRouter()


# ---------------------------------------------------------------------------
# PARENTS LINKED TO A CENTER (unique parents of enrolled students)
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/parents")
async def list_center_parents(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT u.id, u.name, u.mobile_number, u.email, u.status,
               COUNT(s.id) AS student_count
        FROM center_student cs
        JOIN student s ON s.id = cs.student_id AND s.is_deleted = FALSE
        JOIN "user" u  ON u.id = s.parent_id    AND u.is_deleted = FALSE
        WHERE cs.center_id = $1 AND cs.is_deleted = FALSE
        GROUP BY u.id, u.name, u.mobile_number, u.email, u.status
        ORDER BY u.name
        """,
        center_id,
    )
    return [
        {
            "id": str(r["id"]),
            "name": r["name"],
            "mobile_number": r["mobile_number"],
            "email": r["email"],
            "status": r["status"],
            "student_count": r["student_count"],
        }
        for r in rows
    ]


# ---------------------------------------------------------------------------
# BATCH STUDENTS — list / add / remove
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/batches/{batch_id}/students")
async def list_batch_students(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT bs.id  AS batch_student_id,
               s.id   AS student_id,
               s.name,
               s.date_of_birth,
               s.gender,
               u.name AS parent_name,
               bs.assigned_at
        FROM batch_student bs
        JOIN student s ON s.id = bs.student_id AND s.is_deleted = FALSE
        LEFT JOIN "user" u ON u.id = s.parent_id AND u.is_deleted = FALSE
        WHERE bs.batch_id = $1 AND bs.is_deleted = FALSE AND bs.is_active = TRUE
        ORDER BY s.name
        """,
        batch_id,
    )
    return [
        {
            "batch_student_id": str(r["batch_student_id"]),
            "student_id": str(r["student_id"]),
            "name": r["name"],
            "date_of_birth": r["date_of_birth"].isoformat() if r["date_of_birth"] else None,
            "gender": r["gender"],
            "parent_name": r["parent_name"],
            "assigned_at": r["assigned_at"].isoformat() if r["assigned_at"] else None,
        }
        for r in rows
    ]


@router.post(
    "/centers/{center_id}/batches/{batch_id}/students",
    response_model=SuccessResponse,
    status_code=201,
)
async def add_batch_student(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    body: dict,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    student_id_raw = body.get("student_id")
    if not student_id_raw:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "student_id required")
    try:
        student_id = uuid.UUID(student_id_raw)
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "student_id must be a UUID")

    # Verify batch belongs to this center
    batch = await db.fetchrow(
        "SELECT id FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        batch_id, center_id,
    )
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    # Student must be enrolled in the center
    cs = await db.fetchrow(
        "SELECT id FROM center_student WHERE center_id=$1 AND student_id=$2 AND is_deleted=FALSE",
        center_id, student_id,
    )
    if not cs:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Student is not enrolled in this center. Enroll the student first.",
        )

    existing = await db.fetchrow(
        """SELECT id FROM batch_student
           WHERE batch_id=$1 AND student_id=$2 AND is_deleted=FALSE AND is_active=TRUE""",
        batch_id, student_id,
    )
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, "Student is already assigned to this batch.")

    student = await db.fetchrow(
        "SELECT name FROM student WHERE id=$1 AND is_deleted=FALSE", student_id,
    )
    if not student:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")

    await db.execute(
        """
        INSERT INTO batch_student (id, batch_id, student_id, assigned_at,
                                   created_by, created_date, is_active, is_deleted,
                                   version_number, source_system)
        VALUES (gen_random_uuid(), $1, $2, NOW() AT TIME ZONE 'UTC',
                $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal')
        """,
        batch_id, student_id, owner.user_id,
    )
    return SuccessResponse(message=f"{student['name']} added to batch.")


@router.delete(
    "/centers/{center_id}/batches/{batch_id}/students/{student_id}",
    response_model=SuccessResponse,
)
async def remove_batch_student(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    student_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    # Verify batch belongs to this center
    batch = await db.fetchrow(
        "SELECT id FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        batch_id, center_id,
    )
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    result = await db.execute(
        """
        UPDATE batch_student
        SET is_active=FALSE, is_deleted=TRUE, removed_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$3, modified_date=NOW() AT TIME ZONE 'UTC'
        WHERE batch_id=$1 AND student_id=$2 AND is_deleted=FALSE AND is_active=TRUE
        """,
        batch_id, student_id, owner.user_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found in this batch.")
    student = await db.fetchrow("SELECT name FROM student WHERE id=$1", student_id)
    return SuccessResponse(message=f"{student['name'] if student else 'Student'} removed from batch.")


# ---------------------------------------------------------------------------
# ATTENDANCE — GET (one date) and POST (upsert)
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/batches/{batch_id}/attendance")
async def get_batch_attendance(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    date: str = Query(..., description="ISO date YYYY-MM-DD"),
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")
    try:
        attendance_date = date_type.fromisoformat(date)
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "date must be YYYY-MM-DD")

    # Make sure the batch belongs to this center
    batch = await db.fetchrow(
        "SELECT id FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        batch_id, center_id,
    )
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    rows = await db.fetch(
        """
        SELECT bs.student_id,
               s.name,
               s.gender,
               s.date_of_birth,
               u.name AS parent_name,
               a.status AS attendance_status,
               a.marked_at,
               a.edited_at
        FROM batch_student bs
        JOIN student s ON s.id = bs.student_id AND s.is_deleted = FALSE
        LEFT JOIN "user" u ON u.id = s.parent_id AND u.is_deleted = FALSE
        LEFT JOIN attendance a
               ON a.student_id = bs.student_id
              AND a.batch_id   = bs.batch_id
              AND a.attendance_date = $2
              AND a.is_deleted = FALSE
        WHERE bs.batch_id = $1 AND bs.is_deleted = FALSE AND bs.is_active = TRUE
        ORDER BY s.name
        """,
        batch_id, attendance_date,
    )
    return [
        {
            "student_id":        str(r["student_id"]),
            "name":              r["name"],
            "gender":            r["gender"],
            "date_of_birth":     r["date_of_birth"].isoformat() if r["date_of_birth"] else None,
            "parent_name":       r["parent_name"],
            "attendance_status": r["attendance_status"],
            "marked_at":         r["marked_at"].isoformat() if r["marked_at"] else None,
            "edited_at":         r["edited_at"].isoformat() if r["edited_at"] else None,
        }
        for r in rows
    ]


@router.post(
    "/centers/{center_id}/batches/{batch_id}/attendance",
    response_model=SuccessResponse,
)
async def mark_batch_attendance(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    body: dict,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    """Body: { date: YYYY-MM-DD, records: [{student_id, status: Present|Absent}, ...] }"""
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    try:
        attendance_date = date_type.fromisoformat(body.get("date", ""))
    except (ValueError, TypeError):
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "date must be YYYY-MM-DD")

    records = body.get("records", [])
    if not records:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "records cannot be empty")

    valid_statuses = {"Present", "Absent"}
    for rec in records:
        if rec.get("status") not in valid_statuses:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                f"Invalid status: {rec.get('status')}",
            )

    # Verify the batch belongs to this center before any writes
    batch = await db.fetchrow(
        "SELECT id FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        batch_id, center_id,
    )
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    async with db.transaction():
        for rec in records:
            try:
                student_id = uuid.UUID(rec["student_id"])
            except (KeyError, ValueError, TypeError):
                raise HTTPException(
                    status.HTTP_422_UNPROCESSABLE_ENTITY,
                    "Each record must include a valid UUID student_id.",
                )
            att_status = rec["status"]

            existing = await db.fetchrow(
                """
                SELECT id, status FROM attendance
                WHERE batch_id=$1 AND student_id=$2 AND attendance_date=$3 AND is_deleted=FALSE
                """,
                batch_id, student_id, attendance_date,
            )
            if existing:
                if existing["status"] != att_status:
                    await db.execute(
                        """
                        UPDATE attendance
                        SET status=$1, edited_at=NOW() AT TIME ZONE 'UTC', edited_by=$2,
                            modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                            previous_status=$3, version_number=version_number+1
                        WHERE id=$4
                        """,
                        att_status, owner.user_id, existing["status"], existing["id"],
                    )
            else:
                await db.execute(
                    """
                    INSERT INTO attendance
                        (batch_id, student_id, marked_by, attendance_date, status,
                         created_by, created_date)
                    VALUES ($1,$2,$3,$4,$5,$3,NOW() AT TIME ZONE 'UTC')
                    """,
                    batch_id, student_id, owner.user_id, attendance_date, att_status,
                )

    return SuccessResponse(
        message=f"Attendance saved for {len(records)} student(s) on {attendance_date}.",
    )


# ---------------------------------------------------------------------------
# ATTENDANCE RANGE — for reports / summary widgets
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/batches/{batch_id}/attendance/range")
async def get_batch_attendance_range(
    center_id: uuid.UUID,
    batch_id: uuid.UUID,
    start: str = Query(..., description="ISO date YYYY-MM-DD"),
    end: str = Query(..., description="ISO date YYYY-MM-DD"),
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list:
    """Flat list of (date, student, status) rows in [start, end] for one batch."""
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")
    try:
        start_d = date_type.fromisoformat(start)
        end_d = date_type.fromisoformat(end)
    except ValueError:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "start/end must be YYYY-MM-DD")
    if start_d > end_d:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "start must be <= end")

    batch = await db.fetchrow(
        "SELECT id FROM batch WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE",
        batch_id, center_id,
    )
    if not batch:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Batch not found in this center.")

    rows = await db.fetch(
        """
        SELECT a.attendance_date, a.status,
               s.id AS student_id, s.name AS student_name
        FROM attendance a
        JOIN student s ON s.id = a.student_id AND s.is_deleted = FALSE
        WHERE a.batch_id = $1
          AND a.is_deleted = FALSE
          AND a.attendance_date BETWEEN $2 AND $3
        ORDER BY a.attendance_date, s.name
        """,
        batch_id, start_d, end_d,
    )
    return [
        {
            "attendance_date": r["attendance_date"].isoformat(),
            "status": r["status"],
            "student_id": str(r["student_id"]),
            "student_name": r["student_name"],
        }
        for r in rows
    ]
