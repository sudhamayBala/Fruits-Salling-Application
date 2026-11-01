from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from .schemas import ApiSchema


class ExportShipmentCreate(ApiSchema):
    product_id: UUID | None = None
    product_name: str = Field(min_length=1, max_length=150)
    image_url: str | None = Field(default=None, max_length=2048)
    dealer_id: UUID | None = None
    dealer_name: str = Field(min_length=1, max_length=150)
    distributor_name: str = Field(min_length=1, max_length=150)
    ordered_date: date
    delivered_location: str = Field(min_length=1, max_length=200)
    delivery_completion_date: date | None = None


class ExportShipmentRead(ExportShipmentCreate):
    export_id: UUID
    created_at: datetime


class ShipmentStatusCreate(ApiSchema):
    status: Literal["pending", "in_transit", "delivered", "cancelled"]
    location: str | None = Field(default=None, max_length=200)
    notes: str | None = Field(default=None, max_length=2000)


class ShipmentStatusRead(ShipmentStatusCreate):
    status_id: UUID
    export_id: UUID
    updated_at: datetime