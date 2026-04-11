import uuid
from typing import List, Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import PagedResponse, SuccessResponse
from app.schemas.student import (
    DuplicatePair,
    KeepSeparateRequest,
    MergeHistoryEntry,
    MergeStudentsRequest,
)
from app.services.student_service import execute_merge

router = APIRouter()


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
