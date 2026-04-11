import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, field_validator

CenterCategory = Literal[
    "Tuition", "Daycare", "KidsSchool", "PlaySchool", "Dance",
    "Music", "ArtPainting", "Abacus", "SpokenEnglish", "YogaActivity",
]

RegistrationStatus = Literal[
    "Draft", "Submitted", "UnderReview", "Approved", "Rejected", "Suspended",
]

RejectionCategory = Literal[
    "IncompleteInfo", "UnverifiableLocation", "Duplicate",
    "MissingDocs", "CategoryMismatch", "Other",
]

SubscriptionStatus = Literal[
    "Trial", "Active", "Grace", "Restricted", "Suspended",
]


class CenterSummary(BaseModel):
    id: uuid.UUID
    name: str
    category: str
    owner_name: str
    mobile_number: str
    city: str
    registration_status: str
    subscription_status: str
    created_date: datetime
    approved_at: Optional[datetime] = None
    hours_since_submission: Optional[float] = None
    is_approaching_sla: bool = False


class CenterDetail(CenterSummary):
    address: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_days: str
    operating_timings: str
    age_group: str
    description: str
    logo_url: str
    cover_image_url: Optional[str] = None
    fee_range: Optional[str] = None
    facilities: Optional[str] = None
    social_link: Optional[str] = None
    website_link: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejection_category: Optional[str] = None
    admin_notes: Optional[str] = None
    registration_cert_url: Optional[str] = None
    premises_proof_url: Optional[str] = None
    owner_id_proof_url: Optional[str] = None
    safety_cert_url: Optional[str] = None
    trial_ends_at: Optional[datetime] = None
    suspended_at: Optional[datetime] = None
    data_purge_at: Optional[datetime] = None


class CenterApproveRequest(BaseModel):
    admin_notes: Optional[str] = None


class CenterRejectRequest(BaseModel):
    rejection_category: RejectionCategory
    rejection_reason: str
    admin_notes: Optional[str] = None

    @field_validator("rejection_reason")
    @classmethod
    def reason_required_for_other(cls, v: str, info) -> str:
        if not v or not v.strip():
            raise ValueError("rejection_reason cannot be blank")
        return v.strip()


class CenterSuspendRequest(BaseModel):
    reason: str
    admin_notes: Optional[str] = None


class CenterReinstateRequest(BaseModel):
    admin_notes: Optional[str] = None


class BulkApproveRequest(BaseModel):
    center_ids: List[uuid.UUID]
    admin_notes: Optional[str] = None
