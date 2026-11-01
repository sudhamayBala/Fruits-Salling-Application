from datetime import datetime
from typing import Literal
from uuid import UUID

from .schemas import ApiSchema


class BulkOrderRead(ApiSchema):
    bulk_order_id: UUID
    contact_name: str
    email: str
    phone: str
    company_name: str | None
    product_name: str
    quantity: int
    message: str | None
    status: Literal["pending", "reviewed", "completed", "cancelled"]
    created_at: datetime


class BulkOrderStatusUpdate(ApiSchema):
    status: Literal["pending", "reviewed", "completed", "cancelled"]


class BulkOrderCreated(ApiSchema):
    bulk_order_id: UUID
    message: str