import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.firebase import create_firebase_user, generate_password_reset_link
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


def _to_data_uri(raw: Optional[str]) -> Optional[str]:
    """Convert raw base64 or existing data URI to a data URI string."""
    if not raw:
        return None
    s = raw.strip()
    return s if s.startswith("data:") else f"data:image/jpeg;base64,{s}"


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
               ct.specialisation, ct.qualification, ct.experience_years,
               ct.id_proof_url, ct.qualification_cert_url,
               ct.joined_at, ct.is_active
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
            qualification=r["qualification"], experience_years=r["experience_years"],
            id_proof_url=r["id_proof_url"],
            qualification_cert_url=r["qualification_cert_url"],
            joined_at=r["joined_at"], is_active=r["is_active"],
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# ADD teacher — creates user if not registered yet, then links to center
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

    mobile = request.mobile_number.strip()
    email = (request.email or "").strip().lower() or None

    id_proof_url = _to_data_uri(request.id_proof_base64)
    qual_cert_url = _to_data_uri(request.qualification_cert_base64)
    joined_at = request.date_of_join or None

    # Find existing user by mobile, or create a new one.
    user = await db.fetchrow(
        'SELECT id, name, email, mobile_number FROM "user" '
        'WHERE mobile_number = $1 AND is_deleted = FALSE',
        mobile,
    )

    if user:
        user_id = user["id"]
        user_name = user["name"]
        user_email = user["email"]
        user_mobile = user["mobile_number"]
    else:
        # Create the user account so the teacher can log in later.
        if email:
            dup_email = await db.fetchrow(
                'SELECT id FROM "user" WHERE email = $1 AND is_deleted = FALSE', email,
            )
            if dup_email:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "A user with this email already exists.",
                )

        new_id = uuid.uuid4()
        if email:
            await create_firebase_user(email, request.name.strip())
            await generate_password_reset_link(email)

        await db.execute(
            """
            INSERT INTO "user" (
                id, name, email, mobile_number, status,
                preferred_language, created_by, created_date,
                is_active, is_deleted, version_number, source_system
            ) VALUES (
                $1, $2, $3, $4, 'Active',
                'en', $5, NOW() AT TIME ZONE 'UTC',
                TRUE, FALSE, 1, 'OwnerPortal'
            )
            """,
            new_id, request.name.strip(), email, mobile, owner.user_id,
        )
        user_id = new_id
        user_name = request.name.strip()
        user_email = email
        user_mobile = mobile

    async with db.transaction():
        try:
            ct = await db.fetchrow(
                """
                INSERT INTO center_teacher (
                    id, center_id, user_id, specialisation, qualification, experience_years,
                    id_proof_url, qualification_cert_url,
                    joined_at, created_by, created_date,
                    is_active, is_deleted, version_number, source_system
                ) VALUES (
                    gen_random_uuid(), $1, $2, $3, $4, $5,
                    $6, $7,
                    COALESCE($8, NOW() AT TIME ZONE 'UTC'), $9, NOW() AT TIME ZONE 'UTC',
                    TRUE, FALSE, 1, 'OwnerPortal'
                )
                RETURNING id, joined_at, is_active
                """,
                center_id, user_id, request.specialisation,
                request.qualification, request.experience_years,
                id_proof_url, qual_cert_url,
                joined_at, owner.user_id,
            )
        except asyncpg.UniqueViolationError:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                f"{user_name} is already a teacher at this center.",
            )

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
                user_id, center_id, owner.user_id,
            )
        except asyncpg.UniqueViolationError:
            pass

    return TeacherSummary(
        id=ct["id"], user_id=user_id, name=user_name, email=user_email,
        mobile_number=user_mobile, specialisation=request.specialisation,
        qualification=request.qualification, experience_years=request.experience_years,
        id_proof_url=id_proof_url, qualification_cert_url=qual_cert_url,
        joined_at=ct["joined_at"], is_active=ct["is_active"],
    )


# ---------------------------------------------------------------------------
# UPDATE teacher (professional details, proof docs, active flag)
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

    date_of_join = request.date_of_join
    fields = request.model_dump(
        exclude_none=True,
        exclude={"date_of_join", "id_proof_base64", "qualification_cert_base64"},
    )

    if request.id_proof_base64:
        fields["id_proof_url"] = _to_data_uri(request.id_proof_base64)
    if request.qualification_cert_base64:
        fields["qualification_cert_url"] = _to_data_uri(request.qualification_cert_base64)

    if not fields and date_of_join is None:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields provided to update.")

    if fields:
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

    if date_of_join is not None:
        await db.execute(
            """
            UPDATE center_teacher SET joined_at = $1,
                modified_by = $2, modified_date = NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE id = $3
            """,
            date_of_join, owner.user_id, teacher_id,
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
