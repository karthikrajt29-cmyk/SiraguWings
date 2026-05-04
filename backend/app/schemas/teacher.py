"""Schemas for the /teacher/* mobile endpoints."""
from datetime import date as date_type
from datetime import datetime, time
from decimal import Decimal
from typing import Literal, Optional
import uuid

from pydantic import BaseModel, Field


class TeacherMe(BaseModel):
    user_id: uuid.UUID
    name: str
    email: Optional[str]
    mobile_number: Optional[str]
    profile_image_url: Optional[str]
    centers: list["TeacherCenter"]


class TeacherCenter(BaseModel):
    center_id: uuid.UUID
    center_name: str
    teacher_link_id: uuid.UUID
    specialisation: Optional[str]
    qualification: Optional[str]
    is_active: bool


class TeacherBatch(BaseModel):
    id: uuid.UUID
    center_id: uuid.UUID
    center_name: str
    course_name: str
    batch_name: str
    category_type: Optional[str]
    class_days: str
    start_time: time
    end_time: time
    student_count: int
    is_active: bool


class TeacherBatchStudent(BaseModel):
    student_id: uuid.UUID
    name: str
    profile_image_url: Optional[str]
    parent_id: Optional[uuid.UUID]
    parent_mobile: Optional[str]


class TeacherAttendanceMark(BaseModel):
    student_id: uuid.UUID
    # attendance.status check constraint allows only Present | Absent today.
    status: Literal["Present", "Absent"]


class TeacherAttendanceRequest(BaseModel):
    attendance_date: date_type
    marks: list[TeacherAttendanceMark] = Field(min_length=1)


class TeacherActivityCreate(BaseModel):
    center_id: uuid.UUID
    batch_id: Optional[uuid.UUID] = None
    title: str = Field(min_length=1, max_length=200)
    body: Optional[str] = Field(None, max_length=2000)
    image_base64: Optional[str] = None
    activity_date: Optional[date_type] = None


class TeacherActivity(BaseModel):
    id: uuid.UUID
    center_id: uuid.UUID
    center_name: str
    batch_id: Optional[uuid.UUID]
    batch_name: Optional[str]
    title: str
    body: Optional[str]
    image_url: Optional[str]
    activity_date: date_type
    created_date: datetime


class TeacherNotificationItem(BaseModel):
    id: uuid.UUID
    center_id: Optional[uuid.UUID]
    type: str
    category: str
    title: str
    body: str
    read_at: Optional[datetime]
    created_date: datetime


TeacherMe.model_rebuild()
