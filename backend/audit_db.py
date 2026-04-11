"""Audit actual DB schema against expected schema."""
import asyncio
import ssl as _ssl
import asyncpg
from app.config import settings
from app.database import _clean_dsn

EXPECTED_TABLES = [
    "user", "user_role", "otp_log", "center", "student", "center_student",
    "student_invite", "center_teacher", "batch", "batch_student", "attendance",
    "material", "announcement", "message", "fee", "payment",
    "platform_invoice", "platform_payment", "merge_log", "notification_log",
    "audit_log", "app_config", "feed_post", "unlink_request",
]

async def main():
    dsn, needs_ssl = _clean_dsn(settings.database_url)
    ssl_ctx = _ssl.create_default_context() if needs_ssl else None
    conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
    await conn.execute("SET search_path TO siraguwin, public")

    # 1. Check tables
    actual_tables = await conn.fetch(
        """SELECT table_name FROM information_schema.tables
           WHERE table_schema = 'siraguwin' ORDER BY table_name"""
    )
    actual_set = {r["table_name"] for r in actual_tables}
    expected_set = set(EXPECTED_TABLES)

    print("=== TABLE CHECK ===")
    missing = expected_set - actual_set
    extra   = actual_set - expected_set
    if missing:
        print(f"  MISSING tables: {sorted(missing)}")
    if extra:
        print(f"  EXTRA tables (not in schema): {sorted(extra)}")
    if not missing and not extra:
        print(f"  All {len(expected_set)} expected tables present OK")

    # 2. Column audit per table
    print("\n=== COLUMN CHECK (nullability & types) ===")
    for tbl in sorted(expected_set & actual_set):
        cols = await conn.fetch(
            """SELECT column_name, data_type, is_nullable, column_default
               FROM information_schema.columns
               WHERE table_schema='siraguwin' AND table_name=$1
               ORDER BY ordinal_position""",
            tbl,
        )
        print(f"\n  {tbl} ({len(cols)} cols)")
        for c in cols:
            nullable = "NULL" if c["is_nullable"] == "YES" else "NOT NULL"
            default = f" DEFAULT {c['column_default'][:30]}" if c["column_default"] else ""
            print(f"    {c['column_name']:35s} {c['data_type']:20s} {nullable}{default}")

    # 3. Check constraints
    print("\n=== CONSTRAINTS ===")
    constraints = await conn.fetch(
        """SELECT tc.table_name, tc.constraint_name, tc.constraint_type
           FROM information_schema.table_constraints tc
           WHERE tc.table_schema='siraguwin'
           ORDER BY tc.table_name, tc.constraint_type, tc.constraint_name"""
    )
    cur_tbl = None
    for c in constraints:
        if c["table_name"] != cur_tbl:
            cur_tbl = c["table_name"]
            print(f"\n  {cur_tbl}")
        print(f"    [{c['constraint_type']:11s}] {c['constraint_name']}")

    # 4. Row counts
    print("\n=== ROW COUNTS ===")
    for tbl in sorted(expected_set & actual_set):
        count = await conn.fetchval(f'SELECT COUNT(*) FROM "{tbl}"')
        print(f"  {tbl:30s}: {count}")

    await conn.close()

if __name__ == "__main__":
    asyncio.run(main())
