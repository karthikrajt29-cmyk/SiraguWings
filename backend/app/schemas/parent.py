"""Schemas for the /parent/* mobile endpoints."""
from datetime import date as date_type
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


class ParentMe(BaseModel):
    user_id: uuid.UUID
    name: str
    email: Optional[str]
    mobile_number: Optional[str]
    profile_image_url: Optional[str]
    children_count: int
    centers_count: int


class ChildCenter(BaseModel):
    center_id: uuid.UUID
    center_name: str
    invite_status: str
    status: str
    added_at: Optional[datetime]


class ChildSummary(BaseModel):
    id: uuid.UUID
    name: str
    date_of_birth: Optional[date_type]
    gender: Optional[str]
    profile_image_url: Optional[str]
    blood_group: Optional[str]
    current_class: Optional[str]
    school_name: Optional[str]
    centers: list[ChildCenter]


class ChildAttendanceDay(BaseModel):
    attendance_date: date_type
    batch_id: uuid.UUID
    batch_name: str
    course_name: Optional[str]
    status: str  # Present | Absent | Late | Excused


class ParentFeeItem(BaseModel):
    id: uuid.UUID
    center_id: uuid.UUID
    center_name: str
    student_id: uuid.UUID
    student_name: str
    batch_name: Optional[str]
    course_name: Optional[str]
    amount: Decimal
    paid_amount: Decimal
    outstanding: Decimal
    due_date: date_type
    status: str
    notes: Optional[str]


class ParentPayIntentRequest(BaseModel):
    method: Literal["UPI", "Card", "NetBanking"] = "UPI"


class ParentPayIntentResponse(BaseModel):
    fee_id: uuid.UUID
    method: str
    amount: Decimal
    payment_url: Optional[str]
    upi_deeplink: Optional[str]
    expires_at: datetime


class ParentNotificationItem(BaseModel):
    id: uuid.UUID
    center_id: Optional[uuid.UUID]
    center_name: Optional[str]
    type: str
    category: str
    title: str
    body: str
    read_at: Optional[datetime]
    created_date: datetime


class UnlinkRequestCreate(BaseModel):
    student_id: uuid.UUID
    reason: Optional[str] = Field(None, max_length=500)
