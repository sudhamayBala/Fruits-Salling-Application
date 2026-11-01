from datetime import date, datetime
from typing import Literal
from uuid import UUID

from pydantic import Field

from .schemas import ApiSchema


class PackagingCreate(ApiSchema):
    product_name: str = Field(min_length=1, max_length=150)
    status: Literal["Pending", "Complete"] = "Pending"
    estimated_completion_date: date
    location: str = Field(min_length=1, max_length=200)


class PackagingRead(PackagingCreate):
    packaging_id: UUID
    created_at: datetime
    updated_at: datetime