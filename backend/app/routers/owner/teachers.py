import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner
from app.schemas.center import (
    TeacherCreateRequest,
    TeacherSummary,
    TeacherUpdateRequest,
)
from app.schemas.common import SuccessResponse
from app.services.center_service import get_center_or_404

router = APIRouter()


# ---------------------------------------------------------------------------
# LIST teachers in a center
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}/teachers", response_model=list[TeacherSummary])
async def list_teachers(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list[TeacherSummary]:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    rows = await db.fetch(
        """
        SELECT ct.id, ct.user_id, u.name, u.email, u.mobile_number,
               ct.specialisation, ct.joined_at, ct.is_active
        FROM center_teacher ct
        JOIN "user" u ON u.id = ct.user_id
        WHERE ct.center_id = $1 AND ct.is_deleted = FALSE AND u.is_deleted = FALSE
        ORDER BY ct.is_active DESC, u.name
        """,
        center_id,
    )

    return [
        TeacherSummary(
            id=r["id"], user_id=r["user_id"], name=r["name"], email=r["email"],
            mobile_number=r["mobile_number"], specialisation=r["specialisation"],
            joined_at=r["joined_at"], is_active=r["is_active"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# ADD teacher by mobile
# ---------------------------------------------------------------------------
@router.post(
    "/centers/{center_id}/teachers",
    response_model=TeacherSummary,
    status_code=201,
)
async def add_teacher(
    center_id: uuid.UUID,
    request: TeacherCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> TeacherSummary:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    user = await db.fetchrow(
        'SELECT id, name, email, mobile_number FROM "user" '
        'WHERE mobile_number = $1 AND is_deleted = FALSE',
        request.mobile_number.strip(),
    )
    if not user:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No user found with mobile number {request.mobile_number}. "
            "Ask them to register first.",
        )

    async with db.transaction():
        # Link to center via center_teacher (uq_center_teacher_center_user protects dupes)
        try:
            ct = await db.fetchrow(
                """
                INSERT INTO center_teacher (
                    id, center_id, user_id, specialisation,
                    created_by, created_date, is_active, is_deleted, version_number, source_system
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3,
                    $4, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
                )
                RETURNING id, joined_at, is_active
                """,
                center_id, user["id"], request.specialisation, owner.user_id,
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"{user['name']} is already a teacher at this center.",
            )

        # Add Teacher role in user_role (ignore if already present)
        try:
            await db.execute(
                """
                INSERT INTO user_role (
                    id, user_id, role, center_id, assigned_at,
                    created_by, created_date, is_active, is_deleted, version_number, source_system
                ) VALUES (
                    gen_random_uuid(), $1, 'Teacher', $2, NOW() AT TIME ZONE 'UTC',
                    $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
                )
                """,
                user["id"], center_id, owner.user_id,
            )
        except asyncpg.UniqueViolationError:
            pass  # role already assigned — center_teacher row is the authoritative link

    return TeacherSummary(
        id=ct["id"], user_id=user["id"], name=user["name"], email=user["email"],
        mobile_number=user["mobile_number"], specialisation=request.specialisation,
        joined_at=ct["joined_at"], is_active=ct["is_active"],
    )


# ---------------------------------------------------------------------------
# UPDATE teacher (specialisation, active flag)
# ---------------------------------------------------------------------------
@router.patch(
    "/centers/{center_id}/teachers/{teacher_id}",
    response_model=SuccessResponse,
)
async def update_teacher(
    center_id: uuid.UUID,
    teacher_id: uuid.UUID,
    request: TeacherUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)

    existing = await db.fetchrow(
        """SELECT id FROM center_teacher
           WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE""",
        teacher_id, center_id,
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found in this center.")

    fields = request.model_dump(exclude_none=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update.")

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
    values = list(fields.values())
    idx = len(values) + 1
    values.append(owner.user_id)
    values.append(teacher_id)

    await db.execute(
        f"""
        UPDATE center_teacher SET {set_clauses},
            modified_by = ${idx},
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = ${idx + 1}
        """,
        *values,
    )
    return SuccessResponse(message="Teacher updated.")


# ---------------------------------------------------------------------------
# REMOVE teacher from center (soft-delete)
# ---------------------------------------------------------------------------
@router.delete(
    "/centers/{center_id}/teachers/{teacher_id}",
    response_model=SuccessResponse,
)
async def remove_teacher(
    center_id: uuid.UUID,
    teacher_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)

    existing = await db.fetchrow(
        """SELECT user_id FROM center_teacher
           WHERE id=$1 AND center_id=$2 AND is_deleted=FALSE""",
        teacher_id, center_id,
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Teacher not found in this center.")

    # Block if this teacher is still tied to active batches
    active_batch = await db.fetchrow(
        "SELECT id FROM batch WHERE teacher_id=$1 AND is_active=TRUE AND is_deleted=FALSE LIMIT 1",
        teacher_id,
    )
    if active_batch:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Teacher is still assigned to active batches. Reassign or deactivate those batches first.",
        )

    async with db.transaction():
        await db.execute(
            """
            UPDATE center_teacher
            SET is_deleted=TRUE, is_active=FALSE, deactivated_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE id=$2
            """,
            owner.user_id, teacher_id,
        )
        # Soft-delete the Teacher user_role row for this center
        await db.execute(
            """
            UPDATE user_role
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$1, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number=version_number+1
            WHERE user_id=$2 AND center_id=$3 AND role='Teacher' AND is_deleted=FALSE
            """,
            owner.user_id, existing["user_id"], center_id,
        )

    return SuccessResponse(message="Teacher removed from center.")
