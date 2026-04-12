import uuid
from datetime import date, datetime
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
    description: Optional[str] = None
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
    # owner mapping
    owner_id: Optional[uuid.UUID] = None
    owner_user_name: Optional[str] = None
    owner_user_email: Optional[str] = None
    owner_user_mobile: Optional[str] = None


class AssignOwnerRequest(BaseModel):
    user_id: Optional[uuid.UUID] = None      # preferred: look up by UUID
    mobile_number: Optional[str] = None      # fallback: look up by mobile


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


def _empty_str_to_none(v: Optional[str]) -> Optional[str]:
    """Coerce empty string to None so optional text fields store NULL in DB."""
    if isinstance(v, str) and v.strip() == '':
        return None
    return v


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
    description: str
    fee_range: Optional[str] = None
    facilities: Optional[str] = None
    social_link: Optional[str] = None
    website_link: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None

    @field_validator('fee_range', 'facilities', 'social_link',
                     'website_link', 'pincode', mode='before')
    @classmethod
    def blank_to_none(cls, v: object) -> object:
        return _empty_str_to_none(v) if isinstance(v, str) else v


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

    @field_validator('description', 'fee_range', 'facilities', 'social_link',
                     'website_link', 'pincode', 'admin_notes', mode='before')
    @classmethod
    def blank_to_none(cls, v: object) -> object:
        return _empty_str_to_none(v) if isinstance(v, str) else v


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


class BatchUpdateRequest(BaseModel):
    course_name: Optional[str] = None
    batch_name: Optional[str] = None
    category_type: Optional[str] = None
    class_days: Optional[str] = None
    start_time: Optional[str] = None
    end_time: Optional[str] = None
    strength_limit: Optional[int] = None
    fee_amount: Optional[float] = None
    teacher_id: Optional[uuid.UUID] = None
    is_active: Optional[bool] = None


# ── Teacher CRUD (owner-scoped) ────────────────────────────────────────────

class TeacherSummary(BaseModel):
    id: uuid.UUID                   # center_teacher.id
    user_id: uuid.UUID
    name: str
    email: Optional[str] = None
    mobile_number: str
    specialisation: Optional[str] = None
    joined_at: datetime
    is_active: bool


class TeacherCreateRequest(BaseModel):
    mobile_number: str
    specialisation: Optional[str] = None


class TeacherUpdateRequest(BaseModel):
    specialisation: Optional[str] = None
    is_active: Optional[bool] = None


# ── Student CRUD (owner-scoped) ────────────────────────────────────────────

class StudentSummary(BaseModel):
    id: uuid.UUID
    name: str
    date_of_birth: date
    gender: str
    parent_id: Optional[uuid.UUID] = None
    parent_name: Optional[str] = None
    parent_mobile: Optional[str] = None
    medical_notes: Optional[str] = None
    profile_image_url: Optional[str] = None
    invite_status: str
    status: str
    added_at: datetime


class StudentCreateRequest(BaseModel):
    name: str
    date_of_birth: date
    gender: str  # validated against master_data('gender') in endpoint
    parent_mobile: Optional[str] = None
    medical_notes: Optional[str] = None


class StudentUpdateRequest(BaseModel):
    name: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    medical_notes: Optional[str] = None
