"""One-off runner for migration 013_owner_subscription.sql."""
import asyncio
import os
import ssl as _ssl
from pathlib import Path

import asyncpg


def load_env() -> str:
    env_path = Path(__file__).parent / ".env"
    if not env_path.exists():
        raise SystemExit(".env not found")
    for line in env_path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        if "=" in line:
            k, _, v = line.partition("=")
            if k.strip() == "DATABASE_URL":
                return v.strip().strip('"').strip("'")
    raise SystemExit("DATABASE_URL not in .env")


async def main():
    raw = load_env()
    needs_ssl = "sslmode" in raw or "neon.tech" in raw
    # Strip query string for asyncpg (it doesn't accept channel_binding etc.)
    dsn = raw.split("?")[0]
    ssl_ctx = _ssl.create_default_context() if needs_ssl else None

    sql = (Path(__file__).parent / "migrations" / "013_owner_subscription.sql").read_text()

    print("Connecting...")
    conn = await asyncpg.connect(dsn, ssl=ssl_ctx)
    try:
        print("Applying migration 013...")
        await conn.execute(sql)
        # Verify
        rows = await conn.fetch(
            "SELECT to_regclass('siraguwin.owner_subscription') AS a, "
            "       to_regclass('siraguwin.owner_storage_purchase') AS b, "
            "       to_regclass('siraguwin.owner_billing_history') AS c, "
            "       to_regclass('siraguwin.center_subscription') AS d_old"
        )
        print("Tables now:", dict(rows[0]))
        sub_count = await conn.fetchval("SELECT COUNT(*) FROM siraguwin.owner_subscription")
        print(f"owner_subscription rows: {sub_count}")
        sample = await conn.fetch(
            """SELECT os.owner_id, sp.name AS plan, os.status
               FROM siraguwin.owner_subscription os
               JOIN siraguwin.subscription_plan sp ON sp.id = os.plan_id
               LIMIT 5"""
        )
        for r in sample:
            print("  ", dict(r))
    finally:
        await conn.close()


if __name__ == "__main__":
    asyncio.run(main())
