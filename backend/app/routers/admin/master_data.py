from typing import Optional
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel

from app.database import get_db
from app.dependencies import CurrentUser, require_admin
from app.schemas.common import SuccessResponse

router = APIRouter()

ALLOWED_GROUPS = {"category", "age_group", "operating_days", "city", "facilities", "fee_range", "board", "language", "rejection_category", "suspension_reason"}


# ── Schemas ────────────────────────────────────────────────────────────────────

class MasterDataItem(BaseModel):
    id: str
    group_name: str
    label: str
    value: str
    sort_order: int
    is_active: bool


class MasterDataCreateRequest(BaseModel):
    group_name: str
    label: str
    value: str
    sort_order: int = 0


class MasterDataUpdateRequest(BaseModel):
    label: Optional[str] = None
    value: Optional[str] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("", response_model=list[MasterDataItem])
async def list_master_data(
    group: Optional[str] = Query(None, description="Filter by group_name"),
    include_inactive: bool = Query(False),
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> list[MasterDataItem]:
    """Return master data rows, optionally filtered by group."""
    if group and group not in ALLOWED_GROUPS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown group '{group}'. Allowed: {sorted(ALLOWED_GROUPS)}",
        )

    conditions = ["is_deleted = FALSE"]
    params: list = []

    if group:
        params.append(group)
        conditions.append(f"group_name = ${len(params)}")

    if not include_inactive:
        conditions.append("is_active = TRUE")

    where = " AND ".join(conditions)
    rows = await db.fetch(
        f"""
        SELECT id::text, group_name, label, value, sort_order, is_active
        FROM siraguwin.master_data
        WHERE {where}
        ORDER BY group_name, sort_order, label
        """,
        *params,
    )
    return [MasterDataItem(**dict(r)) for r in rows]


@router.post("", response_model=MasterDataItem, status_code=status.HTTP_201_CREATED)
async def create_master_data(
    body: MasterDataCreateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> MasterDataItem:
    """Add a new dropdown option to a group."""
    if body.group_name not in ALLOWED_GROUPS:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unknown group '{body.group_name}'. Allowed: {sorted(ALLOWED_GROUPS)}",
        )

    try:
        row = await db.fetchrow(
            """
            INSERT INTO siraguwin.master_data
                (group_name, label, value, sort_order, created_by)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id::text, group_name, label, value, sort_order, is_active
            """,
            body.group_name, body.label.strip(), body.value.strip(),
            body.sort_order, admin.user_id,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            f"Value '{body.value}' already exists in group '{body.group_name}'.",
        )

    return MasterDataItem(**dict(row))


@router.patch("/{item_id}", response_model=MasterDataItem)
async def update_master_data(
    item_id: UUID,
    body: MasterDataUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> MasterDataItem:
    """Update label, value, sort_order, or is_active for a master data row."""
    existing = await db.fetchrow(
        "SELECT id FROM siraguwin.master_data WHERE id=$1 AND is_deleted=FALSE",
        item_id,
    )
    if not existing:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Master data item not found.")

    updates: dict = {}
    if body.label is not None:
        updates["label"] = body.label.strip()
    if body.value is not None:
        updates["value"] = body.value.strip()
    if body.sort_order is not None:
        updates["sort_order"] = body.sort_order
    if body.is_active is not None:
        updates["is_active"] = body.is_active

    if not updates:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "No fields to update.")

    set_clauses = [f"{k}=${i + 2}" for i, k in enumerate(updates)]
    set_clauses += [
        f"modified_by=${len(updates) + 2}",
        f"modified_date=NOW() AT TIME ZONE 'UTC'",
        f"version_number=version_number+1",
    ]

    try:
        row = await db.fetchrow(
            f"""
            UPDATE siraguwin.master_data
            SET {', '.join(set_clauses)}
            WHERE id=$1
            RETURNING id::text, group_name, label, value, sort_order, is_active
            """,
            item_id, *updates.values(), admin.user_id,
        )
    except asyncpg.UniqueViolationError:
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Value already exists in this group.",
        )

    return MasterDataItem(**dict(row))


@router.delete("/{item_id}", response_model=SuccessResponse)
async def delete_master_data(
    item_id: UUID,
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """Soft-delete a master data item."""
    result = await db.execute(
        """
        UPDATE siraguwin.master_data
        SET is_deleted=TRUE, modified_by=$2,
            modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
        WHERE id=$1 AND is_deleted=FALSE
        """,
        item_id, admin.user_id,
    )
    if result == "UPDATE 0":
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Master data item not found.")
    return SuccessResponse(message="Item deleted.")


@router.post("/reorder", response_model=SuccessResponse)
async def reorder_master_data(
    items: list[dict],
    db: asyncpg.Connection = Depends(get_db),
    admin: CurrentUser = Depends(require_admin),
) -> SuccessResponse:
    """
    Batch-update sort_order. Body: [{"id": "uuid", "sort_order": 1}, ...]
    """
    async with db.transaction():
        for item in items:
            await db.execute(
                """
                UPDATE siraguwin.master_data
                SET sort_order=$1, modified_by=$2,
                    modified_date=NOW() AT TIME ZONE 'UTC', version_number=version_number+1
                WHERE id=$3 AND is_deleted=FALSE
                """,
                item["sort_order"], admin.user_id, UUID(item["id"]),
            )
    return SuccessResponse(message="Sort order updated.")
