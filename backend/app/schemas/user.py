import uuid
from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


class UserSummary(BaseModel):
    id: uuid.UUID
    name: str
    mobile_number: str
    email: Optional[str] = None
    status: str
    roles: List[dict]
    last_login_at: Optional[datetime] = None
    created_date: datetime


class UserDetail(UserSummary):
    preferred_language: str
    device_platform: Optional[str] = None
    failed_login_attempts: int
    center_connections: List[dict] = []  # [{center_id, center_name, role}]


class UserStatusUpdate(BaseModel):
    status: Literal["Active", "Suspended"]
    reason: Optional[str] = None


class UserUpdateRequest(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None


class UserCreateRequest(BaseModel):
    name: str
    email: str
    mobile_number: str
    role: Optional[str] = None          # Admin | Owner | Teacher | Parent | Staff
    center_id: Optional[uuid.UUID] = None  # required when role is center-scoped


class UserRoleRequest(BaseModel):
    role: str
    center_id: Optional[uuid.UUID] = None


class UserStatsResponse(BaseModel):
    total: int
    active: int
    suspended: int
    by_role: dict  # {Admin: N, Owner: N, Teacher: N, Parent: N, Staff: N}


class UnlinkRequestSummary(BaseModel):
    id: uuid.UUID
    parent_id: uuid.UUID
    parent_name: str
    center_id: uuid.UUID
    center_name: str
    student_id: uuid.UUID
    student_name: str
    reason: Optional[str] = None
    status: str
    created_date: datetime


class UnlinkRequestAction(BaseModel):
    action: Literal["Approved", "Rejected"]
    rejection_reason: Optional[str] = None
