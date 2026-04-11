import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel, field_validator

RegistrationStatus = Literal[
    "Draft", "Submitted", "UnderReview", "Approved", "Rejected", "Suspended",
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
    state: str = 'Tamil Nadu'
    pincode: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    operating_days: str
    operating_timings: str
    age_group: str
    description: str
    logo_url: Optional[str] = None
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
    rejection_category: str
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


class CenterCreateRequest(BaseModel):
    name: str
    category: str
    owner_name: str
    mobile_number: str
    address: str
    city: str
    state: str = 'Tamil Nadu'
    pincode: Optional[str] = None
    operating_days: str
    operating_timings: str
    age_group: str
    description: Optional[str] = None
    fee_range: Optional[str] = None
    facilities: Optional[str] = None
    social_link: Optional[str] = None
    website_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class CenterUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    owner_name: Optional[str] = None
    mobile_number: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    pincode: Optional[str] = None
    description: Optional[str] = None
    operating_days: Optional[str] = None
    operating_timings: Optional[str] = None
    age_group: Optional[str] = None
    fee_range: Optional[str] = None
    facilities: Optional[str] = None
    social_link: Optional[str] = None
    website_link: Optional[str] = None
    admin_notes: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    logo_url: Optional[str] = None


class CenterUserSummary(BaseModel):
    user_id: uuid.UUID
    name: str
    email: Optional[str] = None
    mobile_number: str
    role: str
    status: str
    joined_at: Optional[datetime] = None


class AddCenterUserRequest(BaseModel):
    mobile_number: str
    role: str  # Owner | Teacher | Staff


class BatchSummary(BaseModel):
    id: uuid.UUID
    course_name: str
    batch_name: str
    category_type: Optional[str] = None
    class_days: str
    start_time: str
    end_time: str
    strength_limit: Optional[int] = None
    fee_amount: float
    is_active: bool
    teacher_name: Optional[str] = None
    teacher_id: Optional[uuid.UUID] = None
    created_date: datetime


class BatchCreateRequest(BaseModel):
    course_name: str
    batch_name: str
    category_type: Optional[str] = None
    class_days: str
    start_time: str   # "HH:MM"
    end_time: str     # "HH:MM"
    strength_limit: Optional[int] = None
    fee_amount: float
    teacher_id: Optional[uuid.UUID] = None
