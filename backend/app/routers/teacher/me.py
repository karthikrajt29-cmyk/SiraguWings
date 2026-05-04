"""GET /teacher/me — current teacher profile + center memberships."""
import asyncpg
from fastapi import APIRouter, Depends

from app.database import get_db
from app.dependencies import CurrentUser, require_teacher
from app.schemas.teacher import TeacherCenter, TeacherMe

router = APIRouter()


@router.get("/me", response_model=TeacherMe)
async def get_me(
    db: asyncpg.Connection = Depends(get_db),
    teacher: CurrentUser = Depends(require_teacher),
) -> TeacherMe:
    user = await db.fetchrow(
        """
        SELECT id, name, email, mobile_number, profile_image_url
        FROM "user"
        WHERE id = $1 AND is_deleted = FALSE
        """,
        teacher.user_id,
    )

    rows = await db.fetch(
        """
        SELECT ct.id AS teacher_link_id, ct.center_id, c.name AS center_name,
               ct.specialisation, ct.qualification, ct.is_active
        FROM center_teacher ct
        JOIN center c ON c.id = ct.center_id AND c.is_deleted = FALSE
        WHERE ct.user_id = $1 AND ct.is_deleted = FALSE
        ORDER BY ct.is_active DESC, c.name
        """,
        teacher.user_id,
    )

    return TeacherMe(
        user_id=user["id"], name=user["name"], email=user["email"],
        mobile_number=user["mobile_number"],
        profile_image_url=user["profile_image_url"],
        centers=[
            TeacherCenter(
                center_id=r["center_id"], center_name=r["center_name"],
                teacher_link_id=r["teacher_link_id"],
                specialisation=r["specialisation"],
                qualification=r["qualification"],
                is_active=r["is_active"],
            )
            for r in rows
        ],
    )
