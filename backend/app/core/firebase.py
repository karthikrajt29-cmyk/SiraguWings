import asyncio
from functools import partial
from typing import Optional

import firebase_admin
from firebase_admin import auth, credentials

from app.config import settings

_app: Optional[firebase_admin.App] = None


def _init() -> firebase_admin.App:
    global _app
    if _app is None:
        cred = credentials.Certificate(settings.firebase_credentials_path)
        _app = firebase_admin.initialize_app(cred)
    return _app


def _verify_sync(token: str) -> dict:
    _init()
    try:
        return auth.verify_id_token(token, clock_skew_seconds=60)
    except Exception as e:
        # If clock skew > 60s, fall back to PyJWT with relaxed leeway
        if "too early" in str(e).lower() or "clock_skew" in str(e).lower():
            import jwt as pyjwt
            import urllib.request, json as _json
            keys_url = "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com"
            with urllib.request.urlopen(keys_url) as r:
                certs = _json.loads(r.read())
            from cryptography.x509 import load_pem_x509_certificate
            from cryptography.hazmat.backends import default_backend
            header = pyjwt.get_unverified_header(token)
            kid = header.get("kid")
            cert = load_pem_x509_certificate(certs[kid].encode(), default_backend())
            pub_key = cert.public_key()
            project_id = _app.project_id
            return pyjwt.decode(
                token,
                pub_key,
                algorithms=["RS256"],
                audience=project_id,
                leeway=180,
            )
        raise


async def verify_firebase_token(token: str) -> dict:
    """Verify a Firebase ID token and return the decoded claims."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _verify_sync, token)


def _update_user_sync(current_email: str, new_name: Optional[str], new_email: Optional[str]) -> None:
    """Update display name and/or email in Firebase Auth."""
    _init()
    fb_user = auth.get_user_by_email(current_email)
    kwargs: dict = {}
    if new_name:
        kwargs["display_name"] = new_name
    if new_email:
        kwargs["email"] = new_email
    if kwargs:
        auth.update_user(fb_user.uid, **kwargs)


async def update_firebase_user(current_email: str, new_name: Optional[str] = None, new_email: Optional[str] = None) -> None:
    """Update Firebase Auth user profile."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, partial(_update_user_sync, current_email, new_name, new_email))


def _reset_link_sync(email: str) -> str:
    _init()
    return auth.generate_password_reset_link(email)


async def generate_password_reset_link(email: str) -> str:
    """Generate a Firebase password reset link for the given email."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _reset_link_sync, email)


def _create_user_sync(email: str, display_name: str) -> str:
    """Create a Firebase user (no password — user sets it via reset link). Returns UID."""
    _init()
    fb_user = auth.create_user(email=email, display_name=display_name, email_verified=False)
    return fb_user.uid


async def create_firebase_user(email: str, display_name: str) -> str:
    """Create a Firebase Auth account and return the UID."""
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, partial(_create_user_sync, email, display_name))


def _delete_user_sync(email: str) -> None:
    _init()
    try:
        fb_user = auth.get_user_by_email(email)
        auth.delete_user(fb_user.uid)
    except auth.UserNotFoundError:
        pass  # already gone — that's fine


async def delete_firebase_user(email: str) -> None:
    """Delete a Firebase Auth account by email (no-op if not found)."""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _delete_user_sync, email)
