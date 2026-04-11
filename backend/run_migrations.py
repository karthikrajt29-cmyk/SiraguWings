"""Run schema + migrations against Neon DB."""
import asyncio
import ssl as _ssl

import asyncpg

from app.config import settings
from app.database import _clean_dsn

SCHEMA_FILE = "../Document/SiraguWing_schema_v3.sql"
MIGRATION_FILE = "migrations/001_add_missing_tables.sql"


async def run_sql_file(conn: asyncpg.Connection, path: str):
    with open(path, "r", encoding="utf-8") as f:
        sql = f.read()
    await conn.execute(sql)
    print(f"  OK: {path}")


async def main():
    dsn, needs_ssl = _clean_dsn(settings.database_url)
    ssl_ctx = _ssl.create_default_context() if needs_ssl else None

    print("Connecting to Neon DB...")
    conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
    try:
        print("Running base schema...")
        await run_sql_file(conn, SCHEMA_FILE)

        print("Running migration 001...")
        await run_sql_file(conn, MIGRATION_FILE)

        print("\nAll migrations complete.")
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
