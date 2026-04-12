from fastapi import APIRouter

from app.routers.owner import batches, centers, students, teachers

router = APIRouter()

router.include_router(centers.router,  tags=["Owner — Centers"])
router.include_router(teachers.router, tags=["Owner — Teachers"])
router.include_router(students.router, tags=["Owner — Students"])
router.include_router(batches.router,  tags=["Owner — Batches"])
