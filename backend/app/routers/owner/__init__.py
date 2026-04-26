from fastapi import APIRouter

from app.routers.owner import (
    attendance, batches, centers, fees, notifications, parents, students, teachers,
)

router = APIRouter()

router.include_router(centers.router,       tags=["Owner — Centers"])
router.include_router(teachers.router,      tags=["Owner — Teachers"])
router.include_router(students.router,      tags=["Owner — Students"])
router.include_router(batches.router,       tags=["Owner — Batches"])
router.include_router(attendance.router,    tags=["Owner — Attendance"])
router.include_router(fees.router,          tags=["Owner — Fees"])
router.include_router(notifications.router, tags=["Owner — Notifications"])
router.include_router(parents.router,       tags=["Owner — Parents"])
