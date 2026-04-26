import uuid
from typing import List, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.center import (
    StudentBulkDeleteRequest,
    StudentCenterLink,
    StudentCreateRequest,
    StudentEnrollRequest,
    StudentStatsResponse,
    StudentSummary,
    StudentUpdateRequest,
)
from app.schemas.common import PagedResponse, SuccessResponse
from app.schemas.student import (
    DuplicatePair,
    KeepSeparateRequest,
    MergeHistoryEntry,
    MergeStudentsRequest,
)
from app.services.student_service import execute_merge

router = APIRouter()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
async def _validate_gender(db: asyncpg.Connection, gender: str) -> None:
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


async def _resolve_parent(db: asyncpg.Connection, parent_mobile: Optional[str]) -> Optional[uuid.UUID]:
    if not parent_mobile:
        return None
    row = await db.fetchrow(
        """
        SELECT u.id FROM "user" u
        JOIN user_role ur ON ur.user_id = u.id
        WHERE u.mobile_number = $1 AND u.is_deleted = FALSE
          AND ur.role = 'Parent' AND ur.is_active = TRUE AND ur.is_deleted = FALSE
        LIMIT 1
        """,
        parent_mobile,
    )
    if not row:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            f"No Parent user found with mobile {parent_mobile}. "
            "Create the parent via /admin/users first.",
        )
    return row["id"]


async def _insert_student(
    db: asyncpg.Connection,
    *,
    name: str,
    date_of_birth,
    gender: str,
    parent_id: Optional[uuid.UUID],
    medical_notes: Optional[str],
    created_by: uuid.UUID,
) -> uuid.UUID:
    student_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO student
            (id, parent_id, name, date_of_birth, gender, medical_notes,
             created_by_path, created_by, created_date, is_active, is_deleted,
             version_number, source_system)
        VALUES
            ($1, $2, $3, $4, $5, $6, 'Center', $7, NOW() AT TIME ZONE 'UTC',
             TRUE, FALSE, 1, 'AdminPortal')
        """,
        student_id, parent_id, name, date_of_birth, gender, medical_notes, created_by,
    )
    return student_id


async def _hydrate_student(db: asyncpg.Connection, student_id: uuid.UUID) -> StudentSummary:
    """Fetch a single student with its parent + center enrollments."""
    s = await db.fetchrow(
        """
        SELECT s.id, s.name, s.date_of_birth, s.gender, s.parent_id,
               s.medical_notes, s.profile_image_url, s.created_date,
               u.name AS parent_name, u.mobile_number AS parent_mobile
        FROM student s
        LEFT JOIN "user" u ON u.id = s.parent_id AND u.is_deleted = FALSE
        WHERE s.id = $1 AND s.is_deleted = FALSE
        """,
        student_id,
    )
    if not s:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")

    centers_rows = await db.fetch(
        """
        SELECT cs.center_id, c.name AS center_name, cs.status AS link_status,
               cs.invite_status, cs.added_at
        FROM center_student cs
        JOIN center c ON c.id = cs.center_id AND c.is_deleted = FALSE
        WHERE cs.student_id = $1 AND cs.is_deleted = FALSE
        ORDER BY cs.added_at DESC
        """,
        student_id,
    )

    return StudentSummary(
        id=s["id"], name=s["name"], date_of_birth=s["date_of_birth"],
        gender=s["gender"], parent_id=s["parent_id"],
        parent_name=s["parent_name"], parent_mobile=s["parent_mobile"],
        medical_notes=s["medical_notes"], profile_image_url=s["profile_image_url"],
        invite_status="Linked" if centers_rows else "None",
        status="Active",
        added_at=s["created_date"],
        centers=[
            StudentCenterLink(
                center_id=r["center_id"], center_name=r["center_name"],
                link_status=r["link_status"], invite_status=r["invite_status"],
                enrolled_at=r["added_at"],
            ) for r in centers_rows
        ],
    )


# ---------------------------------------------------------------------------
# LIST students (paged, search, filters)
# ---------------------------------------------------------------------------
@router.get("", response_model=PagedResponse[StudentSummary])
async def list_students(
    search: Optional[str] = Query(None),
    center_id: Optional[uuid.UUID] = Query(None),
    gender: Optional[str] = Query(None),
    has_parent: Optional[bool] = Query(None),
    page: int = Query(0, ge=0),
    size: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[StudentSummary]:
    where = "WHERE s.is_deleted = FALSE"
    params: list = []
    idx = 1

    if search:
        where += (
            f" AND (s.name ILIKE ${idx} "
            f"OR EXISTS (SELECT 1 FROM \"user\" pu WHERE pu.id = s.parent_id "
            f"AND (pu.name ILIKE ${idx} OR pu.mobile_number ILIKE ${idx})))"
        )
        params.append(f"%{search}%")
        idx += 1

    if gender:
        where += f" AND s.gender = ${idx}"
        params.append(gender)
        idx += 1

    if has_parent is True:
        where += " AND s.parent_id IS NOT NULL"
    elif has_parent is False:
        where += " AND s.parent_id IS NULL"

    if center_id:
        where += (
            f" AND EXISTS (SELECT 1 FROM center_student cs "
            f"WHERE cs.student_id = s.id AND cs.center_id = ${idx} "
            f"AND cs.is_deleted = FALSE)"
        )
        params.append(center_id)
        idx += 1

    total: int = await db.fetchval(f"SELECT COUNT(*) FROM student s {where}", *params)
    offset = page * size

    rows = await db.fetch(
        f"""
        SELECT s.id, s.name, s.date_of_birth, s.gender, s.parent_id,
               s.medical_notes, s.profile_image_url, s.created_date,
               u.name AS parent_name, u.mobile_number AS parent_mobile
        FROM student s
        LEFT JOIN "user" u ON u.id = s.parent_id AND u.is_deleted = FALSE
        {where}
        ORDER BY s.created_date DESC
        LIMIT ${idx} OFFSET ${idx+1}
        """,
        *params, size, offset,
    )

    items: list[StudentSummary] = []
    for r in rows:
        centers_rows = await db.fetch(
            """
            SELECT cs.center_id, c.name AS center_name, cs.status AS link_status,
                   cs.invite_status, cs.added_at
            FROM center_student cs
            JOIN center c ON c.id = cs.center_id AND c.is_deleted = FALSE
            WHERE cs.student_id = $1 AND cs.is_deleted = FALSE
            ORDER BY cs.added_at DESC
            """,
            r["id"],
        )
        items.append(StudentSummary(
            id=r["id"], name=r["name"], date_of_birth=r["date_of_birth"],
            gender=r["gender"], parent_id=r["parent_id"],
            parent_name=r["parent_name"], parent_mobile=r["parent_mobile"],
            medical_notes=r["medical_notes"], profile_image_url=r["profile_image_url"],
            invite_status="Linked" if centers_rows else "None",
            status="Active",
            added_at=r["created_date"],
            centers=[
                StudentCenterLink(
                    center_id=cr["center_id"], center_name=cr["center_name"],
                    link_status=cr["link_status"], invite_status=cr["invite_status"],
                    enrolled_at=cr["added_at"],
                ) for cr in centers_rows
            ],
        ))

    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )


# ---------------------------------------------------------------------------
# STATS
# ---------------------------------------------------------------------------
@router.get("/stats", response_model=StudentStatsResponse)
async def get_student_stats(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> StudentStatsResponse:
    total = await db.fetchval("SELECT COUNT(*) FROM student WHERE is_deleted=FALSE")
    active = await db.fetchval(
        "SELECT COUNT(*) FROM student WHERE is_deleted=FALSE AND is_active=TRUE"
    )
    with_parent = await db.fetchval(
        "SELECT COUNT(*) FROM student WHERE is_deleted=FALSE AND parent_id IS NOT NULL"
    )
    without_parent = (total or 0) - (with_parent or 0)

    gender_rows = await db.fetch(
        """SELECT gender, COUNT(*) AS cnt FROM student
           WHERE is_deleted=FALSE GROUP BY gender"""
    )
    by_gender = {r["gender"]: r["cnt"] for r in gender_rows}

    return StudentStatsResponse(
        total=total or 0, active=active or 0,
        with_parent=with_parent or 0, without_parent=without_parent,
        by_gender=by_gender,
    )


# ---------------------------------------------------------------------------
# CREATE student
# ---------------------------------------------------------------------------
@router.post("", response_model=StudentSummary, status_code=201)
async def create_student(
    request: StudentCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> StudentSummary:
    await _validate_gender(db, request.gender)
    # Prefer the explicit parent_id from the picker; fall back to the legacy
    # mobile-lookup path for back-compat with existing tooling/scripts.
    if request.parent_id:
        parent_row = await db.fetchrow(
            """
            SELECT u.id FROM "user" u
            WHERE u.id = $1 AND u.is_deleted = FALSE
              AND EXISTS (
                  SELECT 1 FROM user_role ur
                  WHERE ur.user_id = u.id AND ur.role = 'Parent'
                    AND ur.is_deleted = FALSE AND ur.is_active = TRUE
              )
            """,
            request.parent_id,
        )
        if not parent_row:
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Parent not found.")
        parent_id = parent_row["id"]
    else:
        parent_id = await _resolve_parent(db, request.parent_mobile)
    student_id = await _insert_student(
        db,
        name=request.name, date_of_birth=request.date_of_birth,
        gender=request.gender, parent_id=parent_id,
        medical_notes=request.medical_notes, created_by=admin.user_id,
    )
    return await _hydrate_student(db, student_id)


# ---------------------------------------------------------------------------
# DETAIL
# ---------------------------------------------------------------------------
@router.get("/{student_id}", response_model=StudentSummary)
async def get_student(
    student_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> StudentSummary:
    return await _hydrate_student(db, student_id)


# ---------------------------------------------------------------------------
# UPDATE
# ---------------------------------------------------------------------------
@router.patch("/{student_id}", response_model=StudentSummary)
async def update_student(
    student_id: uuid.UUID,
    request: StudentUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> StudentSummary:
    existing = await db.fetchrow(
        "SELECT id FROM student WHERE id=$1 AND is_deleted=FALSE", student_id,
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")

    if request.gender:
        await _validate_gender(db, request.gender)

    updates = request.model_dump(exclude_none=True)
    if not updates:
        return await _hydrate_student(db, student_id)

    set_parts: list[str] = []
    params: list = []
    idx = 1
    for field, val in updates.items():
        set_parts.append(f"{field} = ${idx}")
        params.append(val)
        idx += 1
    set_parts.append(f"modified_by = ${idx}")
    params.append(admin.user_id)
    idx += 1
    set_parts.append("modified_date = NOW() AT TIME ZONE 'UTC'")
    set_parts.append("version_number = version_number + 1")

    params.append(student_id)
    await db.execute(
        f"UPDATE student SET {', '.join(set_parts)} WHERE id = ${idx}",
        *params,
    )
    return await _hydrate_student(db, student_id)


# ---------------------------------------------------------------------------
# DELETE (soft)
# ---------------------------------------------------------------------------
@router.delete("/{student_id}", response_model=SuccessResponse)
async def delete_student(
    student_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    async with db.transaction():
        result = await db.execute(
            """
            UPDATE student
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE id=$1 AND is_deleted=FALSE
            """,
            student_id, admin.user_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(status.HTTP_404_NOT_FOUND, "Student not found.")
        # Cascade soft-delete to center_student
        await db.execute(
            """
            UPDATE center_student
            SET is_deleted=TRUE, is_active=FALSE, status='Removed',
                removed_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE student_id=$1 AND is_deleted=FALSE
            """,
            student_id, admin.user_id,
        )
        # Cascade to batch_student as well
        await db.execute(
            """
            UPDATE batch_student
            SET is_deleted=TRUE, is_active=FALSE,
                removed_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE student_id=$1 AND is_deleted=FALSE
            """,
            student_id, admin.user_id,
        )
    return SuccessResponse(message="Student deleted.")


# ---------------------------------------------------------------------------
# BULK DELETE
# ---------------------------------------------------------------------------
@router.post("/bulk-delete", response_model=SuccessResponse)
async def bulk_delete_students(
    request: StudentBulkDeleteRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    if not request.student_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No student IDs provided.")

    async with db.transaction():
        result = await db.execute(
            """
            UPDATE student
            SET is_deleted=TRUE, is_active=FALSE,
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE id = ANY($1::uuid[]) AND is_deleted=FALSE
            """,
            request.student_ids, admin.user_id,
        )
        await db.execute(
            """
            UPDATE center_student
            SET is_deleted=TRUE, is_active=FALSE, status='Removed',
                removed_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE student_id = ANY($1::uuid[]) AND is_deleted=FALSE
            """,
            request.student_ids, admin.user_id,
        )
        await db.execute(
            """
            UPDATE batch_student
            SET is_deleted=TRUE, is_active=FALSE,
                removed_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE student_id = ANY($1::uuid[]) AND is_deleted=FALSE
            """,
            request.student_ids, admin.user_id,
        )
    affected = int(result.split()[-1]) if result.startswith("UPDATE") else 0
    return SuccessResponse(message=f"{affected} student(s) deleted.")


# ---------------------------------------------------------------------------
# ENROLL students into a center
# ---------------------------------------------------------------------------
@router.post("/enroll", response_model=SuccessResponse)
async def enroll_students(
    request: StudentEnrollRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    if not request.student_ids:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No student IDs provided.")

    center = await db.fetchrow(
        "SELECT id, name FROM center WHERE id=$1 AND is_deleted=FALSE", request.center_id,
    )
    if not center:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Center not found.")

    # Validate all students exist and aren't deleted
    valid = await db.fetch(
        "SELECT id FROM student WHERE id = ANY($1::uuid[]) AND is_deleted=FALSE",
        request.student_ids,
    )
    valid_ids = {r["id"] for r in valid}
    if len(valid_ids) != len(request.student_ids):
        missing = [str(s) for s in request.student_ids if s not in valid_ids]
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Some students not found: {missing}",
        )

    enrolled = 0
    async with db.transaction():
        for sid in request.student_ids:
            # Check for existing row (active or removed)
            existing = await db.fetchrow(
                """SELECT id, is_deleted, status FROM center_student
                   WHERE center_id=$1 AND student_id=$2""",
                request.center_id, sid,
            )
            if existing and not existing["is_deleted"] and existing["status"] == "Active":
                continue  # already actively enrolled
            if existing:
                # Revive removed enrollment
                await db.execute(
                    """
                    UPDATE center_student
                    SET is_deleted=FALSE, is_active=TRUE, status='Active',
                        invite_status='Linked', removed_at=NULL,
                        modified_by=$2, modified_date=NOW() AT TIME ZONE 'UTC',
                        version_number = version_number + 1
                    WHERE id=$1
                    """,
                    existing["id"], admin.user_id,
                )
            else:
                await db.execute(
                    """
                    INSERT INTO center_student
                        (id, center_id, student_id, invite_status, status, added_at,
                         created_by, created_date, is_active, is_deleted,
                         version_number, source_system)
                    VALUES
                        (gen_random_uuid(), $1, $2, 'Linked', 'Active',
                         NOW() AT TIME ZONE 'UTC', $3, NOW() AT TIME ZONE 'UTC',
                         TRUE, FALSE, 1, 'AdminPortal')
                    """,
                    request.center_id, sid, admin.user_id,
                )
            enrolled += 1

    return SuccessResponse(
        message=f"{enrolled} student(s) enrolled in {center['name']}.",
    )


# ---------------------------------------------------------------------------
# UNENROLL from a center
# ---------------------------------------------------------------------------
@router.delete("/{student_id}/centers/{center_id}", response_model=SuccessResponse)
async def unenroll_student(
    student_id: uuid.UUID,
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    async with db.transaction():
        result = await db.execute(
            """
            UPDATE center_student
            SET is_deleted=TRUE, is_active=FALSE, status='Removed',
                removed_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$3, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            WHERE student_id=$1 AND center_id=$2 AND is_deleted=FALSE
            """,
            student_id, center_id, admin.user_id,
        )
        if result == "UPDATE 0":
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                "Enrollment not found.",
            )
        # Also remove from any batches in that center
        await db.execute(
            """
            UPDATE batch_student bs
            SET is_deleted=TRUE, is_active=FALSE,
                removed_at=NOW() AT TIME ZONE 'UTC',
                modified_by=$3, modified_date=NOW() AT TIME ZONE 'UTC',
                version_number = version_number + 1
            FROM batch b
            WHERE bs.batch_id = b.id AND b.center_id = $2
              AND bs.student_id = $1 AND bs.is_deleted = FALSE
            """,
            student_id, center_id, admin.user_id,
        )
    return SuccessResponse(message="Student unenrolled from center.")


@router.get("/duplicates", response_model=List[DuplicatePair])
async def list_duplicate_pairs(
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> List[DuplicatePair]:
    """
    Return student pairs flagged for manual review.
    Priority 3 (3_Manual) and 4_Partial are the ones needing admin attention.
    Excludes already Merged or Rejected pairs.
    """
    rows = await db.fetch(
        """
        SELECT
            ml.student_kept_id,   sk.name AS kept_name,   sk.date_of_birth AS kept_dob,
            pk.name AS kept_parent,
            ml.student_merged_id, sm.name AS merged_name, sm.date_of_birth AS merged_dob,
            pm.name AS merged_parent,
            ml.match_priority, ml.matched_fields, ml.actioned_at AS flagged_at
        FROM merge_log ml
        JOIN student sk ON sk.id = ml.student_kept_id
        JOIN student sm ON sm.id = ml.student_merged_id
        LEFT JOIN "user" pk ON pk.id = sk.parent_id
        LEFT JOIN "user" pm ON pm.id = sm.parent_id
        WHERE ml.action = 'Rejected'   -- previously kept separate but admin may revisit
           OR ml.match_priority IN ('3_Manual', '4_Partial')
        ORDER BY ml.actioned_at DESC
        LIMIT 100
        """
    )

    return [
        DuplicatePair(
            student_kept_id=r["student_kept_id"],
            student_kept_name=r["kept_name"],
            student_kept_dob=r["kept_dob"],
            student_kept_parent=r["kept_parent"],
            student_merged_id=r["student_merged_id"],
            student_merged_name=r["merged_name"],
            student_merged_dob=r["merged_dob"],
            student_merged_parent=r["merged_parent"],
            match_priority=r["match_priority"],
            matched_fields=r["matched_fields"],
            flagged_at=r["flagged_at"],
        )
        for r in rows
    ]


@router.post("/merge", response_model=SuccessResponse)
async def merge_students(
    request: MergeStudentsRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """
    Merge two student records: reassign all related data from merged → kept,
    soft-delete the merged record, and log in merge_log.
    """
    kept = await db.fetchrow(
        "SELECT id FROM student WHERE id=$1 AND is_deleted=FALSE", request.student_kept_id
    )
    if not kept:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student to keep not found.")

    merged = await db.fetchrow(
        "SELECT id FROM student WHERE id=$1 AND is_deleted=FALSE", request.student_merged_id
    )
    if not merged:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Student to merge not found.")

    if request.student_kept_id == request.student_merged_id:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Cannot merge a student with themselves.")

    await execute_merge(
        db=db,
        student_kept_id=request.student_kept_id,
        student_merged_id=request.student_merged_id,
        match_priority=request.match_priority,
        matched_fields=request.matched_fields,
        actioned_by=admin.user_id,
        notes=request.notes,
    )

    return SuccessResponse(message="Students merged successfully. Duplicate record archived.")


@router.post("/keep-separate", response_model=SuccessResponse)
async def keep_separate(
    request: KeepSeparateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """Log that two flagged students are intentionally kept as separate records."""
    await db.execute(
        """
        INSERT INTO merge_log
            (id, student_kept_id, student_merged_id, match_priority,
             matched_fields, action, actioned_by, actioned_at, notes,
             created_by, created_date)
        VALUES
            (gen_random_uuid(), $1, $2, $3, $4, 'Rejected', $5,
             NOW() AT TIME ZONE 'UTC', $6, $5, NOW() AT TIME ZONE 'UTC')
        """,
        request.student_kept_id, request.student_merged_id,
        request.match_priority, request.matched_fields,
        admin.user_id, request.notes,
    )
    return SuccessResponse(message="Recorded as separate students.")


@router.get("/merge-history", response_model=PagedResponse[MergeHistoryEntry])
async def merge_history(
    page: int = Query(0, ge=0),
    size: int = Query(20, ge=1, le=100),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> PagedResponse[MergeHistoryEntry]:
    total: int = await db.fetchval(
        "SELECT COUNT(*) FROM merge_log WHERE is_deleted=FALSE"
    )
    offset = page * size

    rows = await db.fetch(
        """
        SELECT ml.id, ml.student_kept_id, sk.name AS kept_name,
               ml.student_merged_id,
               ml.match_priority, ml.matched_fields, ml.action,
               u.name AS actioned_by_name, ml.actioned_at, ml.notes
        FROM merge_log ml
        JOIN student sk ON sk.id = ml.student_kept_id
        JOIN "user" u   ON u.id  = ml.actioned_by
        WHERE ml.is_deleted = FALSE
        ORDER BY ml.actioned_at DESC
        LIMIT $1 OFFSET $2
        """,
        size, offset,
    )

    items = [
        MergeHistoryEntry(
            id=r["id"],
            student_kept_id=r["student_kept_id"],
            student_kept_name=r["kept_name"],
            student_merged_id=r["student_merged_id"],
            match_priority=r["match_priority"],
            matched_fields=r["matched_fields"],
            action=r["action"],
            actioned_by_name=r["actioned_by_name"],
            actioned_at=r["actioned_at"],
            notes=r["notes"],
        )
        for r in rows
    ]
    return PagedResponse(
        items=items, total=total, page=page, size=size,
        total_pages=max(1, (total + size - 1) // size),
    )
