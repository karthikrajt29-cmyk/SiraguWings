"""SOS emergency alerts.

Used by Parent and Teacher mobile apps. A POST records the event and fans out
push notifications to:
  - the owner(s) of the affected center, if a center is provided;
  - all platform admins (always — they're the global on-call).

The Parent app sends `center_id` automatically when the parent has a single
child enrolled at one center; the user can pick which center otherwise.
"""
import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.database import get_db
from app.dependencies import CurrentUser, get_current_user
from app.schemas.sos import SosAlertCreate, SosAlertItem, SosContact
from app.services.notification_service import (
    notify_all_admins,
    notify_center_owner,
)

router = APIRouter()


@router.get("/sos/contacts", response_model=list[SosContact])
async def list_emergency_contacts(
    center_id: Optional[uuid.UUID] = Query(None),
    db: asyncpg.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[SosContact]:
    """Return numbers the user can call directly in case of emergency.

    For a parent this is the owner + active teachers at the child's center.
    """
    contacts: list[SosContact] = []

    if center_id:
        rows = await db.fetch(
            """
            SELECT u.name, ur.role, u.mobile_number, u.email
            FROM user_role ur
            JOIN "user" u ON u.id = ur.user_id
            WHERE ur.center_id = $1
              AND ur.role IN ('Owner', 'Teacher')
              AND ur.is_active = TRUE AND ur.is_deleted = FALSE
              AND u.status = 'Active' AND u.is_deleted = FALSE
            ORDER BY ur.role DESC, u.name
            LIMIT 20
            """,
            center_id,
        )
        for r in rows:
            contacts.append(SosContact(
                name=r["name"], role=r["role"],
                mobile_number=r["mobile_number"], email=r["email"],
            ))

    return contacts


@router.post("/sos/alert", response_model=SosAlertItem, status_code=201)
async def raise_alert(
    request: SosAlertCreate,
    db: asyncpg.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> SosAlertItem:
    new_id = uuid.uuid4()
    async with db.transaction():
        await db.execute(
            """
            INSERT INTO sos_event
                (id, user_id, center_id, latitude, longitude, accuracy_meters,
                 message, source_role, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $2)
            """,
            new_id, user.user_id, request.center_id,
            request.latitude, request.longitude, request.accuracy_meters,
            request.message, request.source_role,
        )

    # Fire push notifications. Failures here must not roll back the alert.
    title = f"🚨 SOS from {user.name}"
    body = (request.message or "Emergency alert raised.")[:200]
    try:
        if request.center_id:
            await notify_center_owner(
                db=db,
                center_id=request.center_id,
                notification_type="Push",
                category="SOS",
                title=title,
                body=body,
                reference_type="sos_event",
                reference_id=new_id,
                admin_user_id=user.user_id,
            )
        await notify_all_admins(
            db=db,
            notification_type="Push",
            category="SOS",
            title=title,
            body=body,
            center_id=request.center_id,
            reference_type="sos_event",
            reference_id=new_id,
            created_by=user.user_id,
        )
    except Exception:
        # Best-effort fan-out; SOS row is durable regardless.
        pass

    row = await db.fetchrow(
        """
        SELECT se.id, se.user_id, u.name AS user_name,
               se.center_id, c.name AS center_name,
               se.latitude, se.longitude, se.message, se.status, se.source_role,
               se.created_date, se.acknowledged_at, se.resolved_at
        FROM sos_event se
        JOIN "user" u    ON u.id = se.user_id
        LEFT JOIN center c ON c.id = se.center_id
        WHERE se.id = $1
        """,
        new_id,
    )
    return SosAlertItem(**dict(row))


@router.get("/sos/alerts", response_model=list[SosAlertItem])
async def list_alerts(
    only_open: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    db: asyncpg.Connection = Depends(get_db),
    user: CurrentUser = Depends(get_current_user),
) -> list[SosAlertItem]:
    """Returns alerts visible to the caller.

    - Admins see all alerts.
    - Owners see alerts for their centers + alerts they raised themselves.
    - Other users see only the alerts they raised.
    """
    clauses: list[str] = ["se.is_deleted = FALSE"]
    params: list = []

    if not user.is_admin():
        # Visibility OR-block: caller's own alerts + alerts at any owned center.
        params.append(user.user_id)
        visibility = [f"se.user_id = ${len(params)}"]

        owned_ids = [
            uuid.UUID(str(r["center_id"]))
            for r in user.roles
            if r["role"] == "Owner" and r.get("center_id") is not None
        ]
        if owned_ids:
            params.append(owned_ids)
            visibility.append(f"se.center_id = ANY(${len(params)}::uuid[])")

        clauses.append("(" + " OR ".join(visibility) + ")")

    if only_open:
        clauses.append("se.status = 'Open'")

    where_sql = "WHERE " + " AND ".join(clauses)
    params.append(limit)

    rows = await db.fetch(
        f"""
        SELECT se.id, se.user_id, u.name AS user_name,
               se.center_id, c.name AS center_name,
               se.latitude, se.longitude, se.message, se.status, se.source_role,
               se.created_date, se.acknowledged_at, se.resolved_at
        FROM sos_event se
        JOIN "user" u    ON u.id = se.user_id
        LEFT JOIN center c ON c.id = se.center_id
        {where_sql}
        ORDER BY se.created_date DESC
        LIMIT ${len(params)}
        """,
        *params,
    )
    return [SosAlertItem(**dict(r)) for r in rows]
