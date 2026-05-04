from fastapi import APIRouter

from app.routers.teacher import (
    activities, attendance, batches, me, notifications,
)

router = APIRouter()

router.include_router(me.router,            tags=["Teacher — Me"])
router.include_router(batches.router,       tags=["Teacher — Batches"])
router.include_router(attendance.router,    tags=["Teacher — Attendance"])
router.include_router(activities.router,    tags=["Teacher — Activities"])
router.include_router(notifications.router, tags=["Teacher — Notifications"])
