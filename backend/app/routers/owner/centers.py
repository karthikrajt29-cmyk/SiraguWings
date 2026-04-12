import uuid
from typing import Optional

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status

from app.database import get_db
from app.dependencies import (
    CurrentUser,
    assert_owns_center,
    get_owned_center_ids,
    require_owner,
)
from app.schemas.center import CenterDetail, CenterSummary, CenterUpdateRequest
from app.schemas.common import SuccessResponse
from app.services.center_service import get_center_or_404

router = APIRouter()

# Fields an owner may edit on their own center. Anything not in this set is
# ignored — owners cannot change category, status, admin_notes, etc.
OWNER_EDITABLE_FIELDS = {
    "name", "owner_name", "mobile_number",
    "address", "city", "state", "pincode",
    "description", "operating_days", "operating_timings",
    "age_group", "fee_range", "facilities",
    "social_link", "website_link",
    "latitude", "longitude", "logo_url",
}


# ---------------------------------------------------------------------------
# LIST centers owned by caller
# ---------------------------------------------------------------------------
@router.get("/centers", response_model=list[CenterSummary])
async def list_my_centers(
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> list[CenterSummary]:
    center_ids = get_owned_center_ids(owner)
    if not center_ids:
        return []

    rows = await db.fetch(
        """
        SELECT id, name, category, owner_name, mobile_number, city,
               registration_status, subscription_status, created_date, approved_at
        FROM center
        WHERE id = ANY($1::uuid[]) AND is_deleted = FALSE
        ORDER BY name
        """,
        center_ids,
    )

    return [
        CenterSummary(
            id=r["id"], name=r["name"], category=r["category"],
            owner_name=r["owner_name"], mobile_number=r["mobile_number"],
            city=r["city"],
            registration_status=r["registration_status"],
            subscription_status=r["subscription_status"],
            created_date=r["created_date"], approved_at=r["approved_at"],
            hours_since_submission=None, is_approaching_sla=False,
        )
        for r in rows
    ]


# ---------------------------------------------------------------------------
# GET detail for a single owned center
# ---------------------------------------------------------------------------
@router.get("/centers/{center_id}", response_model=CenterDetail)
async def get_my_center(
    center_id: uuid.UUID,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> CenterDetail:
    assert_owns_center(center_id, owner)
    r = await get_center_or_404(db, center_id)

    return CenterDetail(
        id=r["id"], name=r["name"], category=r["category"],
        owner_name=r["owner_name"], mobile_number=r["mobile_number"], city=r["city"],
        state=r["state"] if "state" in r.keys() else "Tamil Nadu",
        pincode=r["pincode"] if "pincode" in r.keys() else None,
        registration_status=r["registration_status"],
        subscription_status=r["subscription_status"],
        created_date=r["created_date"], approved_at=r["approved_at"],
        hours_since_submission=None, is_approaching_sla=False,
        address=r["address"],
        latitude=float(r["latitude"]) if r["latitude"] else None,
        longitude=float(r["longitude"]) if r["longitude"] else None,
        operating_days=r["operating_days"], operating_timings=r["operating_timings"],
        age_group=r["age_group"], description=r["description"],
        logo_url=r["logo_url"], cover_image_url=r["cover_image_url"],
        fee_range=r["fee_range"], facilities=r["facilities"],
        social_link=r["social_link"], website_link=r["website_link"],
        rejection_reason=r["rejection_reason"], rejection_category=r["rejection_category"],
        admin_notes=None,  # owners don't see admin notes
        registration_cert_url=r["registration_cert_url"],
        premises_proof_url=r["premises_proof_url"],
        owner_id_proof_url=r["owner_id_proof_url"],
        safety_cert_url=r["safety_cert_url"],
        trial_ends_at=r["trial_ends_at"],
        suspended_at=r["suspended_at"],
        data_purge_at=r["data_purge_at"],
    )


# ---------------------------------------------------------------------------
# PATCH an owned center — restricted field set
# ---------------------------------------------------------------------------
@router.patch("/centers/{center_id}", response_model=SuccessResponse)
async def update_my_center(
    center_id: uuid.UUID,
    request: CenterUpdateRequest,
    db: asyncpg.Connection = Depends(get_db),
    owner: CurrentUser = Depends(require_owner),
) -> SuccessResponse:
    assert_owns_center(center_id, owner)
    await get_center_or_404(db, center_id, select="id")

    raw = request.model_dump(exclude_none=True)
    fields = {k: v for k, v in raw.items() if k in OWNER_EDITABLE_FIELDS}
    if not fields:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            "No editable fields provided. Category, status, and admin notes cannot be changed by owners.",
        )

    set_clauses = ", ".join(f"{k} = ${i+1}" for i, k in enumerate(fields))
    values = list(fields.values())
    idx = len(values) + 1
    values.append(owner.user_id)  # modified_by
    values.append(center_id)      # WHERE id

    await db.execute(
        f"""
        UPDATE center SET {set_clauses},
            modified_by = ${idx},
            modified_date = NOW() AT TIME ZONE 'UTC',
            version_number = version_number + 1
        WHERE id = ${idx + 1}
        """,
        *values,
    )
    return SuccessResponse(message="Center updated successfully.")
