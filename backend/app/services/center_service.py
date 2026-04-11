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
