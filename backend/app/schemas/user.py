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
