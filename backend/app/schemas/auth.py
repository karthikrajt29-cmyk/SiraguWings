from typing import List, Optional

from pydantic import BaseModel, EmailStr


class TokenVerifyRequest(BaseModel):
    firebase_id_token: str


class RegisterRequest(BaseModel):
    firebase_id_token: str
    name: str


class TokenResponse(BaseModel):
    user_id: str
    name: str
    email: str
    roles: List[dict]
    is_new_user: bool = False


class UserMeResponse(BaseModel):
    user_id: str
    name: str
    email: str
    status: str
    roles: List[dict]
    preferred_language: Optional[str] = "en"
