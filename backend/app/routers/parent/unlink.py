"""POST /parent/unlink-request — request to unlink a child from a center.

Approval is handled in the existing admin module (`/admin/users/unlink-requests`).
This endpoint just queues a row in `unlink_request` with status='Pending'.
"""
import uuid

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import CurrentUser, require_parent
from app.schemas.common import SuccessResponse
from app.schemas.parent import UnlinkRequestCreate

router = APIRouter()


@router.post("/unlink-request", response_model=SuccessResponse, status_code=201)
async def create_unlink_request(
    request: UnlinkRequestCreate,
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> SuccessResponse:
    # Confirm child belongs to this parent and is enrolled at exactly one
    # center — multi-center children would need a center_id in the request.
    rows = await db.fetch(
        """
        SELECT cs.center_id
        FROM student s
        JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
        WHERE s.id = $1 AND s.parent_id = $2 AND s.is_deleted = FALSE
        """,
        request.student_id, parent.user_id,
    )
    if not rows:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Child not found or not enrolled.")
    if len(rows) > 1:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "Child is enrolled at multiple centers. Specify which one in a future build.",
        )
    center_id = rows[0]["center_id"]

    # Reject duplicates (already pending for this triple)
    dup = await db.fetchrow(
        """SELECT 1 FROM unlink_request
           WHERE parent_id=$1 AND student_id=$2 AND center_id=$3
             AND status='Pending' AND is_deleted=FALSE""",
        parent.user_id, request.student_id, center_id,
    )
    if dup:
        raise HTTPException(status.HTTP_409_CONFLICT, "An unlink request is already pending.")

    await db.execute(
        """
        INSERT INTO unlink_request
            (id, parent_id, student_id, center_id, reason, status, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Pending', $1)
        """,
        parent.user_id, request.student_id, center_id, request.reason,
    )
    return SuccessResponse(message="Unlink request submitted. Pending admin approval.")
