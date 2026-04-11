"""Seed a sample center owner + center record."""
import asyncio
import ssl as _ssl
import uuid

import asyncpg
import firebase_admin
from firebase_admin import auth, credentials

from app.config import settings
from app.database import _clean_dsn

# Center owner credentials
OWNER_EMAIL    = "owner@siraguwings.com"
OWNER_PASSWORD = "Owner@123"
OWNER_NAME     = "Priya Sharma"
OWNER_MOBILE   = "9876543210"


def init_firebase():
    cred = credentials.Certificate(settings.firebase_credentials_path)
    return firebase_admin.initialize_app(cred)


async def main():
    # 1. Firebase user
    print("Creating Firebase user for center owner...")
    try:
        fb_user = auth.create_user(
            email=OWNER_EMAIL,
            password=OWNER_PASSWORD,
            display_name=OWNER_NAME,
            email_verified=True,
        )
        print(f"  Firebase UID: {fb_user.uid}")
    except auth.EmailAlreadyExistsError:
        fb_user = auth.get_user_by_email(OWNER_EMAIL)
        auth.update_user(fb_user.uid, password=OWNER_PASSWORD)
        print(f"  Already exists — password reset. UID: {fb_user.uid}")

    # 2. DB connection
    dsn, needs_ssl = _clean_dsn(settings.database_url)
    ssl_ctx = _ssl.create_default_context() if needs_ssl else None
    conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
    await conn.execute("SET search_path TO siraguwin, public")

    try:
        # 3. Insert owner user
        existing = await conn.fetchrow(
            'SELECT id FROM "user" WHERE email = $1 AND is_deleted = FALSE',
            OWNER_EMAIL,
        )
        if existing:
            owner_id = existing["id"]
            print(f"  Owner user already in DB. ID: {owner_id}")
        else:
            owner_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO "user"
                    (id, mobile_number, name, email, status,
                     preferred_language, created_by, created_date)
                VALUES ($1, $2, $3, $4, 'Active', 'en', $1, NOW() AT TIME ZONE 'UTC')
                """,
                owner_id, OWNER_MOBILE, OWNER_NAME, OWNER_EMAIL,
            )
            print(f"  Owner user inserted. ID: {owner_id}")

        # 4. Insert center
        existing_center = await conn.fetchrow(
            "SELECT id FROM center WHERE owner_id = $1 AND is_deleted = FALSE",
            owner_id,
        )
        if existing_center:
            center_id = existing_center["id"]
            print(f"  Center already exists. ID: {center_id}")
        else:
            center_id = uuid.uuid4()
            await conn.execute(
                """
                INSERT INTO center (
                    id, owner_id, name, category, owner_name, mobile_number,
                    address, city, latitude, longitude,
                    operating_days, operating_timings, age_group, description,
                    logo_url, fee_range, facilities,
                    registration_status, subscription_status,
                    approved_at, trial_ends_at,
                    created_by, created_date
                ) VALUES (
                    $1, $2,
                    'Priya''s Tuition Centre', 'Tuition', $3, $4,
                    '12, Anna Nagar 2nd Street, Chennai', 'Chennai',
                    13.0827, 80.2707,
                    'Mon-Sat', '9:00 AM - 7:00 PM', '6-16 years',
                    'Priya''s Tuition Centre offers quality coaching for grades 6–12 in Maths, Science, and English with experienced faculty.',
                    'https://placehold.co/200x200?text=Logo',
                    '₹1500 - ₹3000/month',
                    'AC Classrooms, Study Material, Online Classes',
                    'Approved', 'Trial',
                    NOW() AT TIME ZONE 'UTC',
                    NOW() AT TIME ZONE 'UTC' + INTERVAL '30 days',
                    $2, NOW() AT TIME ZONE 'UTC'
                )
                """,
                center_id, owner_id, OWNER_NAME, OWNER_MOBILE,
            )
            print(f"  Center inserted. ID: {center_id}")

        # 5. Assign Owner role
        existing_role = await conn.fetchrow(
            """SELECT id FROM user_role
               WHERE user_id = $1 AND role = 'Owner' AND center_id = $2
               AND is_deleted = FALSE""",
            owner_id, center_id,
        )
        if existing_role:
            print("  Owner role already assigned.")
        else:
            await conn.execute(
                """
                INSERT INTO user_role
                    (id, user_id, center_id, role, is_active, created_by, created_date)
                VALUES (gen_random_uuid(), $1, $2, 'Owner', TRUE, $1, NOW() AT TIME ZONE 'UTC')
                """,
                owner_id, center_id,
            )
            print("  Owner role assigned.")

    finally:
        await conn.close()

    print("\n=== Center Owner Login ===")
    print(f"  Email   : {OWNER_EMAIL}")
    print(f"  Password: {OWNER_PASSWORD}")
    print(f"  Role    : Owner")
    print(f"  Center  : Priya's Tuition Centre")


if __name__ == "__main__":
    init_firebase()
    asyncio.run(main())
