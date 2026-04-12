import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner
from app.schemas.center import (
    StudentCreateRequest,
    StudentSummary,
    StudentUpdateRequest,
)
from app.schemas.common import SuccessResponse
from app.services.center_service import get_center_or_404

router = APIRouter()


async def _validate_gender(db: asyncpg.Connection, gender: str) -> None:
    """Reject gender values not present in master_data('gender')."""
    row = await db.fetchrow(
        """SELECT 1 FROM siraguwin.master_data
           WHERE group_name='gender' AND value=$1
             AND is_active=TRUE AND is_deleted=FALSE""",
        gender,
    )
    if not row:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Invalid gender '{gender}'. Allowed values come from master_data('gender').",
        )


# ---------------------------------------------------------------------------
# LIST students in a center
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/students", response_model=list[StudentSummary])
async def list_students(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list[StudentSummary]:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT s.id, s.name, s.date_of_birth, s.gender, s.parent_id,
               s.medical_notes, s.profile_image_url,
               cs.invite_status, cs.status, cs.added_at,
               p.name          AS parent_name,
               p.mobile_number AS parent_mobile
        FROM center_student cs
        JOIN student s        ON s.id = cs.student_id
        LEFT JOIN "user" p    ON p.id = s.parent_id
        WHERE cs.center_id = $1
          AND cs.is_deleted = FALSE
          AND s.is_deleted  = FALSE
        ORDER BY s.name
        """,
        center_id,
    )

    return [
        StudentSummary(
            id=r["id"], name=r["name"], date_of_birth=r["date_of_birth"],
            gender=r["gender"], parent_id=r["parent_id"],
            parent_name=r["parent_name"], parent_mobile=r["parent_mobile"],
            medical_notes=r["medical_notes"], profile_image_url=r["profile_image_url"],
            invite_status=r["invite_status"], status=r["status"],
            added_at=r["added_at"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# CREATE student in a center
# ---------------------------------------------------------------------------
@router.post(
    "/centers/{center_id}/students",
    response_model=StudentSummary,
    status_code=201,
)
async def create_student(
    center_id: uuid.UUID,
    request: StudentCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> StudentSummary:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")
    await _validate_gender(db, request.gender)

    parent_id: Optional[uuid.UUID] = None
    parent_name: Optional[str] = None
    parent_mobile: Optional[str] = None
    if request.parent_mobile:
        parent = await db.fetchrow(
            'SELECT id, name, mobile_number FROM "user" '
            'WHERE mobile_number = $1 AND is_deleted = FALSE',
            request.parent_mobile.strip(),
        )
        if parent:
            parent_id = parent["id"]
            parent_name = parent["name"]
            parent_mobile = parent["mobile_number"]

    student_id = uuid.uuid4()
    async with db.transaction():
        await db.execute(
            """
            INSERT INTO student (
                id, parent_id, name, date_of_birth, gender, medical_notes,
                created_by_path, created_by, created_date,
                is_active, is_deleted, version_number, source_system
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                'Center', $7, NOW() AT TIME ZONE 'UTC',
                TRUE, FALSE, 1, 'OwnerPortal'
            )
            """,
            student_id, parent_id, request.name, request.date_of_birth,
            request.gender, request.medical_notes, owner.user_id,
        )

        cs_row = await db.fetchrow(
            """
            INSERT INTO center_student (
                id, center_id, student_id, invite_status, status, added_at,
                created_by, created_date, is_active, is_deleted, version_number, source_system
            ) VALUES (
                gen_random_uuid(), $1, $2, 'Linked', 'Active', NOW() AT TIME ZONE 'UTC',
                $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
            )
            RETURNING invite_status, status, added_at
            """,
            center_id, student_id, owner.user_id,
        )

    return StudentSummary(
        id=student_id, name=request.name, date_of_birth=request.date_of_birth,
        gender=request.gender, parent_id=parent_id,
        parent_name=parent_name, parent_mobile=parent_mobile,
        medical_notes=request.medical_notes, profile_image_url=None,
        invite_status=cs_row["invite_status"], status=cs_row["status"],
        added_at=cs_row["added_at"],
    )


# ---------------------------------------------------------------------------
# UPDATE student
# ---------------------------------------------------------------------------
@router.patch(
    "/centers/{center_id}/students/{student_id}",
    response_model=SuccessResponse,
)
async def update_student(
    center_id: uuid.UUID,
    student_id: uuid.UUID,
    request: StudentUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)

    # Confirm the student is linked to this center (prevents cross-center edits)
    link = await db.fetchrow(
        """SELECT 1 FROM center_student
           WHERE center_id=$1 AND student_id=$2 AND is_deleted=FALSE""",
        center_id, student_id,
    )
    if not link:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found in this center.")

    if request.gender:
        await _validate_gender(db, request.gender)

    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update.")

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
    values = list(fields.values())
    idx = len(values) + 1
    values.append(owner.user_id)
    values.append(student_id)

    await db.execute(
        f"""
        UPDATE student SET {set_clauses},
            modified_by = ${idx},
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = ${idx + 1}
        """,
        *values,
    )
    return SuccessResponse(message="Student updated.")


# ---------------------------------------------------------------------------
# REMOVE student from center (soft-delete the link, not the student record)
# ---------------------------------------------------------------------------
@router.delete(
    "/centers/{center_id}/students/{student_id}",
    response_model=SuccessResponse,
)
async def remove_student(
    center_id: uuid.UUID,
    student_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)

    result = await db.execute(
        """
        UPDATE center_student
        SET is_deleted=TRUE, status='Removed',
            removed_at=NOW() AT TIME ZONE 'UTC',
            modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
            version_number=version_number+1
        WHERE center_id=$2 AND student_id=$3 AND is_deleted=FALSE
        """,
        owner.user_id, center_id, student_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found in this center.")

    return SuccessResponse(message="Student removed from center.")
