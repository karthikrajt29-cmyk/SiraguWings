import uuid
from datetime import date, datetime
from typing import Literal, Optional

from pydantic import BaseModel

FeedRejectionCategory = Literal[
    "MisleadingContent",
    "InappropriateContent",
    "CategoryMismatch",
    "Spam",
    "PolicyViolation",
    "Other",
]


class FeedPostSummary(BaseModel):
    id: uuid.UUID
    center_id: uuid.UUID
    center_name: str
    title: str
    description: str
    category_tag: str
    image_url: Optional[str] = None
    cta_url: Optional[str] = None
    validity_date: Optional[date] = None
    status: str
    created_date: datetime
    published_at: Optional[datetime] = None
    rejection_category: Optional[str] = None
    rejection_reason: Optional[str] = None


class FeedPostApproveRequest(BaseModel):
    pass  # no body required


class FeedPostRejectRequest(BaseModel):
    rejection_category: FeedRejectionCategory
    rejection_reason: str
