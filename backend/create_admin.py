"""One-time script to create an admin user in Firebase + DB."""
import asyncio
import uuid
import sys

import asyncpg
import firebase_admin
from firebase_admin import auth, credentials

from app.config import settings
from app.database import _clean_dsn

EMAIL = "karthikrajt1@gmail.com"
PASSWORD = "Karthik@123"
NAME = "Karthik Raj T"


def init_firebase():
    cred = credentials.Certificate(settings.firebase_credentials_path)
    return firebase_admin.initialize_app(cred)


async def main():
    # 1. Create Firebase user
    print("Creating Firebase user...")
    try:
        firebase_user = auth.create_user(
            email=EMAIL,
            password=PASSWORD,
            display_name=NAME,
            email_verified=True,
        )
        print(f"  Firebase UID: {firebase_user.uid}")
    except auth.EmailAlreadyExistsError:
        firebase_user = auth.get_user_by_email(EMAIL)
        print(f"  Firebase user already exists. UID: {firebase_user.uid}")

    # 2. Insert into DB
    print("Inserting into database...")
    dsn, needs_ssl = _clean_dsn(settings.database_url)
    import ssl as _ssl
    ssl_ctx = _ssl.create_default_context() if needs_ssl else None

    conn = await asyncpg.connect(dsn, ssl=ssl_ctx,
                                  server_settings={"search_path": "siraguwin,public"})
    try:
        existing = await conn.fetchrow(
            'SELECT id FROM "user" WHERE email = $1 AND is_deleted = FALSE', EMAIL
        )
        if existing:
            user_id = existing["id"]
            print(f"  User already in DB. ID: {user_id}")
        else:
            user_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO "user"
                    (id, mobile_number, name, email, status,
                     preferred_language, created_by, created_date)
                VALUES ($1, '', $2, $3, 'Active', 'en', $1, NOW() AT TIME ZONE 'UTC')
                """,
                user_id, NAME, EMAIL,
            )
            print(f"  User inserted. ID: {user_id}")

        # 3. Assign Admin role
        existing_role = await conn.fetchrow(
            "SELECT id FROM user_role WHERE user_id = $1 AND role = 'Admin' AND is_deleted = FALSE",
            user_id,
        )
        if existing_role:
            print("  Admin role already assigned.")
        else:
            await conn.execute(
                """
                INSERT INTO user_role
                    (id, user_id, role, is_active, created_by, created_date)
                VALUES (gen_random_uuid(), $1, 'Admin', TRUE, $1, NOW() AT TIME ZONE 'UTC')
                """,
                user_id,
            )
            print("  Admin role assigned.")
    finally:
        await conn.close()

    print("\nDone!")
    print(f"  Email   : {EMAIL}")
    print(f"  Password: {PASSWORD}")
    print(f"  Role    : Admin")


if __name__ == "__main__":
    init_firebase()
    asyncio.run(main())
