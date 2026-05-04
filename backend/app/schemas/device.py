from typing import Literal, Optional
from pydantic import BaseModel, Field


class DeviceTokenRegisterRequest(BaseModel):
    token: str = Field(min_length=10, max_length=4096)
    platform: Literal["Android", "iOS", "Web", "Unknown"] = "Unknown"
    app_version: Optional[str] = Field(None, max_length=40)


class DeviceTokenResponse(BaseModel):
    id: str
    platform: str
    app_version: Optional[str]
    last_seen_at: str
