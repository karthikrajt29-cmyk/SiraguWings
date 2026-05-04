"""GET /parent/children — list children + their center enrollments."""
import uuid
from collections import defaultdict

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser, require_parent
from app.schemas.parent import ChildCenter, ChildSummary

router = APIRouter()


@router.get("/children", response_model=list[ChildSummary])
async def list_children(
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> list[ChildSummary]:
    rows = await db.fetch(
        """
        SELECT s.id, s.name, s.date_of_birth, s.gender,
               s.profile_image_url, s.blood_group,
               s.current_class, s.school_name,
               cs.center_id, c.name AS center_name,
               cs.invite_status, cs.status AS link_status, cs.added_at
        FROM student s
        LEFT JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
        LEFT JOIN center c          ON c.id = cs.center_id  AND c.is_deleted = FALSE
        WHERE s.parent_id = $1 AND s.is_deleted = FALSE
        ORDER BY s.name, cs.added_at DESC NULLS LAST
        """,
        parent.user_id,
    )

    by_student: dict[uuid.UUID, dict] = {}
    centers_by_student: dict[uuid.UUID, list[ChildCenter]] = defaultdict(list)

    for r in rows:
        sid = r["id"]
        if sid not in by_student:
            by_student[sid] = {
                "id": sid,
                "name": r["name"],
                "date_of_birth": r["date_of_birth"],
                "gender": r["gender"],
                "profile_image_url": r["profile_image_url"],
                "blood_group": r["blood_group"],
                "current_class": r["current_class"],
                "school_name": r["school_name"],
            }
        if r["center_id"]:
            centers_by_student[sid].append(
                ChildCenter(
                    center_id=r["center_id"],
                    center_name=r["center_name"] or "",
                    invite_status=r["invite_status"] or "—",
                    status=r["link_status"] or "—",
                    added_at=r["added_at"],
                )
            )

    return [
        ChildSummary(**by_student[sid], centers=centers_by_student.get(sid, []))
        for sid in by_student
    ]


@router.get("/children/{child_id}", response_model=ChildSummary)
async def get_child(
    child_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> ChildSummary:
    row = await db.fetchrow(
        """
        SELECT id, name, date_of_birth, gender, profile_image_url,
               blood_group, current_class, school_name
        FROM student
        WHERE id = $1 AND parent_id = $2 AND is_deleted = FALSE
        """,
        child_id, parent.user_id,
    )
    if not row:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Child not found.")

    center_rows = await db.fetch(
        """
        SELECT cs.center_id, c.name AS center_name,
               cs.invite_status, cs.status, cs.added_at
        FROM center_student cs
        JOIN center c ON c.id = cs.center_id AND c.is_deleted = FALSE
        WHERE cs.student_id = $1 AND cs.is_deleted = FALSE
        ORDER BY cs.added_at DESC NULLS LAST
        """,
        child_id,
    )

    return ChildSummary(
        id=row["id"], name=row["name"], date_of_birth=row["date_of_birth"],
        gender=row["gender"], profile_image_url=row["profile_image_url"],
        blood_group=row["blood_group"], current_class=row["current_class"],
        school_name=row["school_name"],
        centers=[
            ChildCenter(
                center_id=cr["center_id"], center_name=cr["center_name"],
                invite_status=cr["invite_status"] or "—",
                status=cr["status"] or "—",
                added_at=cr["added_at"],
            )
            for cr in center_rows
        ],
    )
