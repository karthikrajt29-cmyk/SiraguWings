import uuid
from typing import Optional  # noqa: F401 — used in type annotations below

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
               s.blood_group, s.current_class, s.school_name,
               s.address, s.emergency_contact,
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
            blood_group=r["blood_group"], current_class=r["current_class"],
            school_name=r["school_name"], address=r["address"],
            emergency_contact=r["emergency_contact"],
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

    if not request.parent_id:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "parent_id is required. Use the parent picker to select or create a parent.",
        )

    # Parent must exist with role='Parent' AND be mapped to this center
    # (either via user_role row or an existing child enrolled here).
    parent = await db.fetchrow(
        """
        SELECT u.id, u.name, u.mobile_number
        FROM "user" u
        WHERE u.id = $1 AND u.is_deleted = FALSE
          AND EXISTS (
              SELECT 1 FROM user_role ur
              WHERE ur.user_id = u.id AND ur.role = 'Parent'
                AND ur.is_deleted = FALSE AND ur.is_active = TRUE
          )
        """,
        request.parent_id,
    )
    if not parent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent not found.")

    mapped = await db.fetchrow(
        """
        SELECT 1
        WHERE EXISTS (
            SELECT 1 FROM user_role ur
            WHERE ur.user_id = $1 AND ur.role = 'Parent'
              AND ur.center_id = $2
              AND ur.is_deleted = FALSE AND ur.is_active = TRUE
        )
        OR EXISTS (
            SELECT 1 FROM student s
            JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
            WHERE s.parent_id = $1 AND s.is_deleted = FALSE AND cs.center_id = $2
        )
        """,
        request.parent_id, center_id,
    )
    if not mapped:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Parent is not mapped to this center. Map them first via the picker.",
        )

    parent_id = parent["id"]
    parent_name = parent["name"]
    parent_mobile = parent["mobile_number"]

    # Handle base64 photo — store the data URI directly in profile_image_url
    profile_image_url: Optional[str] = None
    if request.profile_image_base64:
        raw = request.profile_image_base64.strip()
        profile_image_url = raw if raw.startswith("data:") else f"data:image/jpeg;base64,{raw}"

    student_id = uuid.uuid4()
    added_at = request.date_of_join or None  # None → use NOW() in SQL
    async with db.transaction():
        await db.execute(
            """
            INSERT INTO student (
                id, parent_id, name, date_of_birth, gender, medical_notes,
                profile_image_url, blood_group, current_class, school_name,
                created_by_path, created_by, created_date,
                is_active, is_deleted, version_number, source_system
            ) VALUES (
                $1, $2, $3, $4, $5, $6,
                $7, $8, $9, $10,
                'Center', $11, NOW() AT TIME ZONE 'UTC',
                TRUE, FALSE, 1, 'OwnerPortal'
            )
            """,
            student_id, parent_id, request.name, request.date_of_birth,
            request.gender, request.medical_notes,
            profile_image_url, request.blood_group, request.current_class,
            request.school_name,
            owner.user_id,
        )

        cs_row = await db.fetchrow(
            """
            INSERT INTO center_student (
                id, center_id, student_id, invite_status, status, added_at,
                created_by, created_date, is_active, is_deleted, version_number, source_system
            ) VALUES (
                gen_random_uuid(), $1, $2, 'Linked', 'Active',
                COALESCE($4, NOW() AT TIME ZONE 'UTC'),
                $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
            )
            RETURNING invite_status, status, added_at
            """,
            center_id, student_id, owner.user_id, added_at,
        )

    return StudentSummary(
        id=student_id, name=request.name, date_of_birth=request.date_of_birth,
        gender=request.gender, parent_id=parent_id,
        parent_name=parent_name, parent_mobile=parent_mobile,
        medical_notes=request.medical_notes, profile_image_url=profile_image_url,
        blood_group=request.blood_group, current_class=request.current_class,
        school_name=request.school_name, address=request.address,
        emergency_contact=request.emergency_contact,
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

    date_of_join = request.date_of_join
    fields = request.model_dump(
        exclude_none=True,
        exclude={"profile_image_base64", "date_of_join"},
    )

    # Convert base64 photo to data URI and write into profile_image_url
    if request.profile_image_base64:
        raw = request.profile_image_base64.strip()
        fields["profile_image_url"] = raw if raw.startswith("data:") else f"data:image/jpeg;base64,{raw}"

    async with db.transaction():
        if fields:
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

        if date_of_join is not None:
            await db.execute(
                """
                UPDATE center_student SET added_at = $1,
                    modified_by = $2, modified_date = NOW() AT TIME ZONE 'UTC',
                    version_number = version_number + 1
                WHERE center_id = $3 AND student_id = $4 AND is_deleted = FALSE
                """,
                date_of_join, owner.user_id, center_id, student_id,
            )

    if not fields and date_of_join is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update.")

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
