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
