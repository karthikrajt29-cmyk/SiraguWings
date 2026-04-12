import uuid
from datetime import date, datetime
from typing import Optional
from pydantic import BaseModel


class SubscriptionPlan(BaseModel):
    id: uuid.UUID
    name: str
    price: float
    student_limit: int
    storage_limit_mb: int
    extra_student_price: float
    is_active: bool
    sort_order: int


class StorageAddOn(BaseModel):
    id: uuid.UUID
    name: str
    storage_mb: int
    price: float
    is_active: bool
    sort_order: int


class CenterSubscriptionSummary(BaseModel):
    center_id: uuid.UUID
    center_name: str
    plan_id: uuid.UUID
    plan_name: str
    plan_price: float
    student_limit: int
    storage_limit_mb: int
    extra_student_price: float
    start_date: date
    end_date: Optional[date] = None
    status: str
    # usage
    current_student_count: int
    storage_used_mb: float
    # purchased add-on storage (sum)
    addon_storage_mb: int
    total_storage_mb: int
    # computed billing
    extra_students: int
    extra_amount: float
    storage_addon_amount: float
    estimated_total: float


class CenterSubscriptionDetail(CenterSubscriptionSummary):
    storage_purchases: list[dict]
    billing_history: list[dict]


class PlanCreateRequest(BaseModel):
    name: str
    price: float
    student_limit: int
    storage_limit_mb: int
    extra_student_price: float
    sort_order: int = 0
    is_active: bool = True


class PlanUpdateRequest(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    student_limit: Optional[int] = None
    storage_limit_mb: Optional[int] = None
    extra_student_price: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class StorageAddOnCreateRequest(BaseModel):
    name: str
    storage_mb: int
    price: float
    sort_order: int = 0
    is_active: bool = True


class StorageAddOnUpdateRequest(BaseModel):
    name: Optional[str] = None
    storage_mb: Optional[int] = None
    price: Optional[float] = None
    sort_order: Optional[int] = None
    is_active: Optional[bool] = None


class AssignPlanRequest(BaseModel):
    plan_id: uuid.UUID
    effective_date: Optional[date] = None   # defaults to today; controls billing adjustment
    end_date: Optional[date] = None
    notes: Optional[str] = None


class PurchaseStorageRequest(BaseModel):
    add_on_id: uuid.UUID
    effective_date: Optional[date] = None   # defaults to today


class BillingHistoryEntry(BaseModel):
    id: uuid.UUID
    center_id: uuid.UUID
    center_name: str
    billing_month: date
    plan_name: str
    plan_amount: float
    student_count: int
    extra_students: int
    extra_amount: float
    storage_amount: float
    total_amount: float
    payment_status: str
    notes: Optional[str] = None
    created_date: datetime


class UpdateBillingStatusRequest(BaseModel):
    payment_status: str
    notes: Optional[str] = None


class SubscriptionDashboard(BaseModel):
    total_centers: int
    active_subscriptions: int
    free_plan_count: int
    paid_plan_count: int
    mrr: float                  # monthly recurring revenue from paid plans
    total_extra_student_revenue: float
    total_storage_addon_revenue: float
    plan_breakdown: list[dict]  # [{name, count, revenue}]
