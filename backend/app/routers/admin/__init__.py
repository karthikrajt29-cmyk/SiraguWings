from fastapi import APIRouter

from app.routers.admin import billing, centers, content, settings, students, users

router = APIRouter()

router.include_router(centers.router,  prefix="/centers",  tags=["Admin — Centers"])
router.include_router(users.router,    prefix="/users",    tags=["Admin — Users"])
router.include_router(billing.router,  prefix="/billing",  tags=["Admin — Billing"])
router.include_router(content.router,  prefix="/content",  tags=["Admin — Content"])
router.include_router(settings.router, prefix="/settings", tags=["Admin — Settings"])
router.include_router(students.router, prefix="/students", tags=["Admin — Students"])
