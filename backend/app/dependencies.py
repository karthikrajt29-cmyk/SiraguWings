import uuid
from dataclasses import dataclass, field
from typing import Dict, List, Optional

import asyncpg
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.core.firebase import verify_firebase_token
from app.database import get_db

security = HTTPBearer()


@dataclass
class CurrentUser:
    user_id: uuid.UUID
    name: str
    email: str
    roles: List[Dict] = field(default_factory=list)

    def is_admin(self) -> bool:
        return any(r["role"] == "Admin" for r in self.roles)

    def is_owner(self, center_id: Optional[uuid.UUID] = None) -> bool:
        if center_id:
            return any(
                r["role"] == "Owner" and str(r.get("center_id")) == str(center_id)
                for r in self.roles
            )
        return any(r["role"] == "Owner" for r in self.roles)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: asyncpg.Connection = Depends(get_db),
) -> CurrentUser:
    try:
        decoded = await verify_firebase_token(credentials.credentials)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    email: Optional[str] = decoded.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain an email address.",
        )

    user = await db.fetchrow(
        """
        SELECT id, name, email, status
        FROM "user"
        WHERE email = $1 AND is_deleted = FALSE
        """,
        email,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found. Please register or contact your administrator.",
        )
    if user["status"] == "Suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Contact support.",
        )
    if user["status"] == "Locked":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is temporarily locked.",
        )

    roles = await db.fetch(
        """
        SELECT role, center_id
        FROM user_role
        WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE
        """,
        user["id"],
    )

    # Update last login
    await db.execute(
        """
        UPDATE "user"
        SET last_login_at = NOW() AT TIME ZONE 'UTC', failed_login_attempts = 0
        WHERE id = $1
        """,
        user["id"],
    )

    return CurrentUser(
        user_id=user["id"],
        name=user["name"],
        email=user["email"],
        roles=[dict(r) for r in roles],
    )


async def require_admin(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    if not current_user.is_admin():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return current_user


async def require_owner(
    current_user: CurrentUser = Depends(get_current_user),
) -> CurrentUser:
    """Caller must have Owner role on at least one center."""
    if not current_user.is_owner():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Owner access required.",
        )
    return current_user


def get_owned_center_ids(user: CurrentUser) -> List[uuid.UUID]:
    """Return UUIDs of centers the user owns. Empty list for non-owners."""
    ids: List[uuid.UUID] = []
    for r in user.roles:
        if r["role"] == "Owner" and r.get("center_id") is not None:
            ids.append(uuid.UUID(str(r["center_id"])))
    return ids


def assert_owns_center(center_id: uuid.UUID, user: CurrentUser) -> None:
    """Raise 403 if user does not own the given center. Admins bypass."""
    if user.is_admin():
        return
    if not user.is_owner(center_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You do not have access to this center.",
        )
