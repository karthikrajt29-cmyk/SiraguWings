import uuid
from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel


class BillingDashboard(BaseModel):
    total_students_billed: int
    total_centers_paying: int
    monthly_recurring_revenue: float
    outstanding_amount: float
    overdue_amount: float
    trial_centers: int


class CenterBillingSummary(BaseModel):
    center_id: uuid.UUID
    center_name: str
    subscription_status: str
    total_students: int
    latest_invoice_amount: Optional[float] = None
    latest_invoice_status: Optional[str] = None
    last_payment_date: Optional[datetime] = None
    next_due_date: Optional[date] = None
    trial_ends_at: Optional[datetime] = None


class WaiveFeeRequest(BaseModel):
    invoice_id: uuid.UUID
    reason: str


class ExtendTrialRequest(BaseModel):
    days: int
    reason: str


class InvoiceSummary(BaseModel):
    id: uuid.UUID
    center_id: uuid.UUID
    center_name: str
    invoice_number: str
    student_count: int
    total_amount: float
    due_date: date
    status: str
    generated_at: datetime


class InvoiceDetail(InvoiceSummary):
    rate_per_student: float
    sub_total: float
    gst_rate: float
    gst_amount: float
    billing_period_start: date
    billing_period_end: date
    gst_invoice_url: Optional[str] = None
    payments: List[dict] = []
