"""Owner-scoped parent search, mapping, and creation.

Three endpoints:

- `GET  /owner/parents/search`        — global parent search (name/mobile/email)
- `POST /owner/centers/{id}/parents/{pid}/link` — map an existing parent to a center
- `POST /owner/centers/{id}/parents`  — create a brand-new parent + auto-map to center

Search is intentionally global (not center-scoped) so owners can discover and reuse
existing parents across the system. The protection is at *selection* time —
linking or creating a center mapping requires `assert_owns_center`.
"""
import uuid
from typing import List, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field

from app.core.audit import write_audit_log
from app.core.firebase import create_firebase_user, generate_password_reset_link
from app.database import get_db
from app.dependencies import CurrentUser, assert_owns_center, require_owner
from app.services.center_service import get_center_or_404

router = APIRouter()


# ─────────────────────────────────────────────────────────────────────────────
# Pydantic models
# ─────────────────────────────────────────────────────────────────────────────
class ParentChild(BaseModel):
    id: uuid.UUID
    name: str
    center_id: Optional[uuid.UUID] = None
    center_name: Optional[str] = None


class ParentSearchResult(BaseModel):
    id: uuid.UUID
    name: str
    mobile_number: str
    email: Optional[str] = None
    status: str
    is_mapped_to_center: bool
    children: List[ParentChild] = []


class ParentRecord(BaseModel):
    id: uuid.UUID
    name: str
    mobile_number: str
    email: Optional[str] = None
    status: str
    student_count: int = 0
    address: Optional[str] = None
    emergency_contact: Optional[str] = None


class ParentCreateRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=120)
    mobile_number: str = Field(..., min_length=10, max_length=15)
    email: Optional[EmailStr] = None
    address: Optional[str] = Field(None, max_length=500)
    emergency_contact: Optional[str] = Field(None, max_length=20)


# ─────────────────────────────────────────────────────────────────────────────
# GET /owner/parents/search?q=&for_center_id=
# ─────────────────────────────────────────────────────────────────────────────
@router.get("/parents/search", response_model=List[ParentSearchResult])
async def search_parents(
    q: str = Query(..., min_length=1, max_length=80, description="Name, mobile, or email"),
    for_center_id: uuid.UUID = Query(..., description="Used to compute is_mapped_to_center"),
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> List[ParentSearchResult]:
    assert_owns_center(for_center_id, owner)

    pattern = f"%{q.strip()}%"

    # Global search — find any user with role='Parent' matching name/mobile/email.
    rows = await db.fetch(
        """
        SELECT DISTINCT u.id, u.name, u.mobile_number, u.email, u.status
        FROM "user" u
        JOIN user_role ur ON ur.user_id = u.id
                          AND ur.role = 'Parent'
                          AND ur.is_deleted = FALSE
                          AND ur.is_active  = TRUE
        WHERE u.is_deleted = FALSE
          AND (u.name ILIKE $1 OR u.mobile_number ILIKE $1 OR COALESCE(u.email, '') ILIKE $1)
        ORDER BY u.name
        LIMIT 25
        """,
        pattern,
    )

    if not rows:
        return []

    parent_ids = [r["id"] for r in rows]

    # is_mapped_to_center: parent has a user_role with this center_id OR
    # a child currently enrolled there.
    mapped_rows = await db.fetch(
        """
        SELECT DISTINCT u.id AS user_id
        FROM "user" u
        WHERE u.id = ANY($1::uuid[])
          AND (
                EXISTS (
                    SELECT 1 FROM user_role ur
                    WHERE ur.user_id = u.id
                      AND ur.role = 'Parent'
                      AND ur.center_id = $2
                      AND ur.is_deleted = FALSE
                      AND ur.is_active  = TRUE
                )
             OR EXISTS (
                    SELECT 1
                    FROM student s
                    JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
                    WHERE s.parent_id = u.id
                      AND s.is_deleted = FALSE
                      AND cs.center_id = $2
                )
          )
        """,
        parent_ids, for_center_id,
    )
    mapped: set[uuid.UUID] = {r["user_id"] for r in mapped_rows}

    # Children — at most a handful per parent, useful for disambiguation.
    child_rows = await db.fetch(
        """
        SELECT s.id, s.parent_id, s.name, c.id AS center_id, c.name AS center_name
        FROM student s
        LEFT JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
        LEFT JOIN center c ON c.id = cs.center_id AND c.is_deleted = FALSE
        WHERE s.parent_id = ANY($1::uuid[])
          AND s.is_deleted = FALSE
        ORDER BY s.name
        """,
        parent_ids,
    )

    children_by_parent: dict[uuid.UUID, list[ParentChild]] = {}
    seen: set[tuple[uuid.UUID, uuid.UUID, Optional[uuid.UUID]]] = set()
    for cr in child_rows:
        key = (cr["parent_id"], cr["id"], cr["center_id"])
        if key in seen:
            continue
        seen.add(key)
        children_by_parent.setdefault(cr["parent_id"], []).append(
            ParentChild(
                id=cr["id"],
                name=cr["name"],
                center_id=cr["center_id"],
                center_name=cr["center_name"],
            )
        )

    return [
        ParentSearchResult(
            id=r["id"],
            name=r["name"],
            mobile_number=r["mobile_number"],
            email=r["email"],
            status=r["status"],
            is_mapped_to_center=r["id"] in mapped,
            children=children_by_parent.get(r["id"], []),
        )
        for r in rows
    ]


# ─────────────────────────────────────────────────────────────────────────────
# POST /owner/centers/{center_id}/parents/{parent_id}/link
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/centers/{center_id}/parents/{parent_id}/link", response_model=ParentRecord)
async def link_parent_to_center(
    center_id: uuid.UUID,
    parent_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> ParentRecord:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    # Verify the parent exists with a Parent role somewhere.
    parent = await db.fetchrow(
        """
        SELECT u.id, u.name, u.mobile_number, u.email, u.status
        FROM "user" u
        WHERE u.id = $1 AND u.is_deleted = FALSE
          AND EXISTS (
              SELECT 1 FROM user_role ur
              WHERE ur.user_id = u.id AND ur.role = 'Parent'
                AND ur.is_deleted = FALSE AND ur.is_active = TRUE
          )
        """,
        parent_id,
    )
    if not parent:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent not found.")

    # Already mapped (via user_role)?
    existing = await db.fetchrow(
        """
        SELECT 1 FROM user_role
        WHERE user_id=$1 AND role='Parent' AND center_id=$2
          AND is_deleted=FALSE AND is_active=TRUE
        """,
        parent_id, center_id,
    )

    if not existing:
        try:
            await db.execute(
                """
                INSERT INTO user_role (
                    id, user_id, role, center_id, assigned_at,
                    created_by, created_date, is_active, is_deleted, version_number, source_system
                ) VALUES (
                    gen_random_uuid(), $1, 'Parent', $2, NOW() AT TIME ZONE 'UTC',
                    $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
                )
                """,
                parent_id, center_id, owner.user_id,
            )
        except asyncpg.UniqueViolationError:
            # Race-condition safe: another request mapped them concurrently.
            pass

    await write_audit_log(
        db, owner.user_id, "Link", "ParentCenter", parent_id,
        "{}", f'{{"center_id":"{center_id}"}}',
    )

    student_count_row = await db.fetchrow(
        """
        SELECT COUNT(DISTINCT s.id) AS c
        FROM student s
        JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
        WHERE s.parent_id = $1 AND s.is_deleted = FALSE AND cs.center_id = $2
        """,
        parent_id, center_id,
    )

    return ParentRecord(
        id=parent["id"], name=parent["name"],
        mobile_number=parent["mobile_number"], email=parent["email"],
        status=parent["status"],
        student_count=student_count_row["c"] or 0,
    )


# ─────────────────────────────────────────────────────────────────────────────
# POST /owner/centers/{center_id}/parents
# ─────────────────────────────────────────────────────────────────────────────
@router.post("/centers/{center_id}/parents", response_model=ParentRecord, status_code=201)
async def create_parent_for_center(
    center_id: uuid.UUID,
    request: ParentCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> ParentRecord:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    mobile = request.mobile_number.strip()
    email = (request.email or "").strip().lower() or None

    # Mobile must be unique (DB-enforced) — friendly 409 with redirect hint.
    dup = await db.fetchrow(
        'SELECT id FROM "user" WHERE mobile_number=$1 AND is_deleted=FALSE',
        mobile,
    )
    if dup:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "A user with this mobile number already exists. Use search to find them.",
        )
    if email:
        dup_email = await db.fetchrow(
            'SELECT id FROM "user" WHERE email=$1 AND is_deleted=FALSE', email,
        )
        if dup_email:
            raise HTTPException(
                status.HTTP_409_CONFLICT,
                "A user with this email already exists. Use search to find them.",
            )

    new_id = uuid.uuid4()
    reset_link: Optional[str] = None

    # Firebase account is only created when the parent has an email — parents
    # with mobile-only access don't need a Firebase login here.
    if email:
        await create_firebase_user(email, request.name)
        reset_link = await generate_password_reset_link(email)

    address = (request.address or "").strip() or None
    emergency = (request.emergency_contact or "").strip() or None

    async with db.transaction():
        await db.execute(
            """
            INSERT INTO "user" (
                id, name, email, mobile_number, status,
                address, emergency_contact,
                preferred_language, created_by, created_date,
                is_active, is_deleted, version_number, source_system
            ) VALUES (
                $1, $2, $3, $4, 'Active',
                $6, $7,
                'en', $5, NOW() AT TIME ZONE 'UTC',
                TRUE, FALSE, 1, 'OwnerPortal'
            )
            """,
            new_id, request.name.strip(), email, mobile, owner.user_id,
            address, emergency,
        )

        await db.execute(
            """
            INSERT INTO user_role (
                id, user_id, role, center_id, assigned_at,
                created_by, created_date, is_active, is_deleted, version_number, source_system
            ) VALUES (
                gen_random_uuid(), $1, 'Parent', $2, NOW() AT TIME ZONE 'UTC',
                $3, NOW() AT TIME ZONE 'UTC', TRUE, FALSE, 1, 'OwnerPortal'
            )
            """,
            new_id, center_id, owner.user_id,
        )

    await write_audit_log(
        db, owner.user_id, "Create", "Parent", new_id,
        "{}", f'{{"center_id":"{center_id}","mobile":"{mobile}"}}',
    )

    return ParentRecord(
        id=new_id, name=request.name.strip(), mobile_number=mobile,
        email=email, status="Active", student_count=0,
        address=address, emergency_contact=emergency,
    )
