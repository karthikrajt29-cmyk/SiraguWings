import uuid
from typing import Optional

import asyncpg


async def write_audit_log(
    db: asyncpg.Connection,
    user_id: uuid.UUID,
    action: str,
    entity_type: str,
    entity_id: uuid.UUID,
    old_values: Optional[str],
    new_values: Optional[str],
    ip_address: Optional[str] = None,
    session_id: Optional[str] = None,
) -> None:
    """Insert a row into audit_log for every mutating admin action."""
    await db.execute(
        """
        INSERT INTO audit_log
            (id, user_id, action, entity_type, entity_id,
             old_values, new_values, ip_address, "timestamp",
             session_id, created_by, created_date)
        VALUES
            (gen_random_uuid(), $1, $2, $3, $4,
             $5, $6, $7, NOW() AT TIME ZONE 'UTC',
             $8, $1, NOW() AT TIME ZONE 'UTC')
        """,
        user_id, action, entity_type, entity_id,
        old_values, new_values, ip_address, session_id,
    )
