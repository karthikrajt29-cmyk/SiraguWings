"""Schemas for /sos/* endpoints — emergency alerts."""
from datetime import datetime
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


class SosAlertCreate(BaseModel):
    center_id: Optional[uuid.UUID] = None
    latitude: Optional[Decimal] = Field(None, ge=-90, le=90)
    longitude: Optional[Decimal] = Field(None, ge=-180, le=180)
    accuracy_meters: Optional[Decimal] = Field(None, ge=0, le=100000)
    message: Optional[str] = Field(None, max_length=500)
    source_role: Literal["Parent", "Teacher", "Staff", "Owner"] = "Parent"


class SosAlertItem(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    user_name: str
    center_id: Optional[uuid.UUID]
    center_name: Optional[str]
    latitude: Optional[Decimal]
    longitude: Optional[Decimal]
    message: Optional[str]
    status: str
    source_role: str
    created_date: datetime
    acknowledged_at: Optional[datetime]
    resolved_at: Optional[datetime]


class SosContact(BaseModel):
    name: str
    role: str
    mobile_number: Optional[str]
    email: Optional[str]
