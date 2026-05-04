from fastapi import APIRouter

from app.routers.parent import (
    attendance, children, fees, me, notifications, unlink,
)

router = APIRouter()

router.include_router(me.router,            tags=["Parent — Me"])
router.include_router(children.router,      tags=["Parent — Children"])
router.include_router(attendance.router,    tags=["Parent — Attendance"])
router.include_router(fees.router,          tags=["Parent — Fees"])
router.include_router(notifications.router, tags=["Parent — Notifications"])
router.include_router(unlink.router,        tags=["Parent — Unlink"])
