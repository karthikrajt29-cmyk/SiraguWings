import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel

MatchPriority = Literal["1_Auto", "2_Fuzzy", "3_Manual", "4_Partial"]


class DuplicatePair(BaseModel):
    student_kept_id: uuid.UUID
    student_kept_name: str
    student_kept_dob: date
    student_kept_parent: Optional[str] = None
    student_merged_id: uuid.UUID
    student_merged_name: str
    student_merged_dob: date
    student_merged_parent: Optional[str] = None
    match_priority: str
    matched_fields: str
    flagged_at: Optional[datetime] = None


class MergeStudentsRequest(BaseModel):
    student_kept_id: uuid.UUID
    student_merged_id: uuid.UUID
    match_priority: MatchPriority
    matched_fields: str
    notes: Optional[str] = None


class KeepSeparateRequest(BaseModel):
    student_kept_id: uuid.UUID
    student_merged_id: uuid.UUID
    match_priority: MatchPriority
    matched_fields: str
    notes: Optional[str] = None


class MergeHistoryEntry(BaseModel):
    id: uuid.UUID
    student_kept_id: uuid.UUID
    student_kept_name: str
    student_merged_id: uuid.UUID
    match_priority: str
    matched_fields: str
    action: str
    actioned_by_name: str
    actioned_at: datetime
    notes: Optional[str] = None
