import uuid
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, status
import asyncpg

from app.core.firebase import verify_firebase_token
from app.database import get_db
from app.dependencies import CurrentUser, get_current_user
from app.schemas.auth import (
    RegisterRequest,
    TokenResponse,
    TokenVerifyRequest,
    UserMeResponse,
)

router = APIRouter()


@router.post("/token", response_model=TokenResponse)
async def verify_token(
    request: TokenVerifyRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> TokenResponse:
    """
    Verify a Firebase ID token (obtained after Email/Password or Google Sign-In)
    and return the user profile with roles.
    """
    try:
        decoded = await verify_firebase_token(request.firebase_id_token)
    except Exception as exc:
        import traceback; traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Firebase error: {exc}",
        )

    email: Optional[str] = decoded.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain an email address.",
        )

    user = await db.fetchrow(
        'SELECT id, name, email, status FROM "user" WHERE email = $1 AND is_deleted = FALSE',
        email,
    )
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not registered. Contact your administrator or use /auth/register.",
        )

    if user["status"] == "Suspended":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is suspended.")
    if user["status"] == "Locked":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is locked.")

    await db.execute(
        'UPDATE "user" SET last_login_at = NOW() AT TIME ZONE \'UTC\', failed_login_attempts = 0 WHERE id = $1',
        user["id"],
    )

    roles = await db.fetch(
        "SELECT role, center_id::text FROM user_role WHERE user_id = $1 AND is_active = TRUE AND is_deleted = FALSE",
        user["id"],
    )

    return TokenResponse(
        user_id=str(user["id"]),
        name=user["name"],
        email=user["email"],
        roles=[dict(r) for r in roles],
    )


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: RegisterRequest,
    db: asyncpg.Connection = Depends(get_db),
) -> TokenResponse:
    """
    First-time registration: verify Firebase token and create a user row.
    Used by admin seeding or self-service registration flows.
    """
    try:
        decoded = await verify_firebase_token(request.firebase_id_token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired Firebase token.",
        )

    email: Optional[str] = decoded.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token does not contain an email address.",
        )

    existing = await db.fetchrow(
        'SELECT id FROM "user" WHERE email = $1 AND is_deleted = FALSE', email
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email is already registered.",
        )

    new_id = uuid.uuid4()
    await db.execute(
        """
        INSERT INTO "user"
            (id, mobile_number, name, email, status, created_by, created_date)
        VALUES ($1, '', $2, $3, 'Active', $1, NOW() AT TIME ZONE 'UTC')
        """,
        new_id, request.name, email,
    )

    return TokenResponse(
        user_id=str(new_id),
        name=request.name,
        email=email,
        roles=[],
        is_new_user=True,
    )


@router.get("/me", response_model=UserMeResponse)
async def get_me(
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_db),
) -> UserMeResponse:
    """Return the current authenticated user's profile and roles."""
    row = await db.fetchrow(
        'SELECT id, name, email, status, preferred_language FROM "user" WHERE id = $1',
        current_user.user_id,
    )
    return UserMeResponse(
        user_id=str(row["id"]),
        name=row["name"],
        email=row["email"],
        status=row["status"],
        roles=current_user.roles,
        preferred_language=row["preferred_language"],
    )
