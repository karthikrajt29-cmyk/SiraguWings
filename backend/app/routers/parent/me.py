"""GET /parent/me — current parent profile + counts."""
import asyncpg
from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import CurrentUser, require_parent
from app.schemas.parent import ParentMe

router = APIRouter()


@router.get("/me", response_model=ParentMe)
async def get_me(
    db: asyncpg.Connection = Depends(get_db),
    parent: CurrentUser = Depends(require_parent),
) -> ParentMe:
    user = await db.fetchrow(
        """
        SELECT u.id, u.name, u.email, u.mobile_number, u.profile_image_url
        FROM "user" u
        WHERE u.id = $1 AND u.is_deleted = FALSE
        """,
        parent.user_id,
    )

    children_count: int = await db.fetchval(
        """
        SELECT COUNT(*) FROM student
        WHERE parent_id = $1 AND is_deleted = FALSE
        """,
        parent.user_id,
    )

    centers_count: int = await db.fetchval(
        """
        SELECT COUNT(DISTINCT cs.center_id)
        FROM student s
        JOIN center_student cs ON cs.student_id = s.id AND cs.is_deleted = FALSE
        WHERE s.parent_id = $1 AND s.is_deleted = FALSE
        """,
        parent.user_id,
    )

    return ParentMe(
        user_id=user["id"],
        name=user["name"],
        email=user["email"],
        mobile_number=user["mobile_number"],
        profile_image_url=user["profile_image_url"],
        children_count=children_count or 0,
        centers_count=centers_count or 0,
    )
