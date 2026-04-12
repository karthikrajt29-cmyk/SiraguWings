import uuid
import asyncpg
from fastapi import HTTPException, status


async def get_center_or_404(
    db: asyncpg.Connection,
    center_id: uuid.UUID,
    *,
    select: str = "*",
) -> asyncpg.Record:
    row = await db.fetchrow(
        f'SELECT {select} FROM center WHERE id = $1 AND is_deleted = FALSE',
        center_id,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Center not found.")
    return row


async def get_center_detail_with_owner(
    db: asyncpg.Connection,
    center_id: uuid.UUID,
) -> asyncpg.Record:
    """
    Fetch full center row joined with owner user details.
    Returns all center columns plus owner_user_name, owner_user_email, owner_user_mobile.
    """
    row = await db.fetchrow(
        """
        SELECT c.*,
               COALESCE(u.name,          ur_u.name)          AS owner_user_name,
               COALESCE(u.email,         ur_u.email)         AS owner_user_email,
               COALESCE(u.mobile_number, ur_u.mobile_number) AS owner_user_mobile
        FROM center c
        -- primary join: user linked via center.owner_id
        LEFT JOIN "user" u
               ON u.id = c.owner_id AND u.is_deleted = FALSE
        -- fallback join: user linked via user_role when owner_id is not set
        LEFT JOIN user_role ur
               ON ur.center_id = c.id AND ur.role = 'Owner'
              AND ur.is_active = TRUE AND ur.is_deleted = FALSE
              AND c.owner_id IS NULL
        LEFT JOIN "user" ur_u
               ON ur_u.id = ur.user_id AND ur_u.is_deleted = FALSE
        WHERE c.id = $1 AND c.is_deleted = FALSE
        """,
        center_id,
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Center not found.")
    return row


def requires_daycare_docs(category: str) -> bool:
    """Returns True if the category mandates extra verification documents."""
    return category in ("Daycare", "KidsSchool")


def daycare_docs_complete(row: asyncpg.Record) -> bool:
    """Check that all mandatory daycare/kids school docs are uploaded."""
    return all([
        row.get("registration_cert_url"),
        row.get("premises_proof_url"),
        row.get("owner_id_proof_url"),
        row.get("safety_cert_url"),
    ])
