from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import Field

from .schemas import ApiSchema


class OrderStatusUpdate(ApiSchema):
    status: Literal["pending", "successful", "cancelled", "returned"]


class OrderFeedbackUpdate(ApiSchema):
    product_feedback: str = Field(default="", max_length=1000)
    distributor_feedback: str = Field(default="", max_length=1000)


class OrderItemRead(ApiSchema):
    order_item_id: UUID
    product_id: UUID | None
    product_name: str
    product_price: Decimal
    quantity: int
    subtotal: Decimal
    fulfillment_status: Literal["pending", "delivered", "cancelled", "returned"]
    product_feedback: str
    distributor_feedback: str


class OrderPageRead(ApiSchema):
    order_id: UUID
    customer_id: UUID
    status: Literal[
        "pending", "successful", "cancelled", "return_requested", "returned"
    ]
    total_amount: Decimal
    delivery_address: str
    created_at: datetime
    updated_at: datetime
    items: list[OrderItemRead]