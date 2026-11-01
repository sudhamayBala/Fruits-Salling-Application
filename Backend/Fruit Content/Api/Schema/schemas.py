"""Request and response validation models for the INDKAN API."""

from datetime import date, datetime
from decimal import Decimal
import re
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator


class ApiSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        str_strip_whitespace=True,
        from_attributes=True,
    )


class CustomerRegister(ApiSchema):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.lower()
        if not re.fullmatch(
            r"[^@\s]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}",
            normalized,
        ):
            raise ValueError("Enter a valid email address")
        return normalized


class CustomerLogin(ApiSchema):
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return CustomerRegister.normalize_email(value)


class CustomerRead(ApiSchema):
    customer_id: UUID
    full_name: str
    email: str
    phone: str | None
    address: str | None
    created_at: datetime


class ProductDetailsCreate(ApiSchema):
    name: str = Field(min_length=1, max_length=150)
    description: str | None = None
    category: str = Field(min_length=1, max_length=80)
    price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    cost_price: Decimal = Field(ge=0, max_digits=10, decimal_places=2)
    unit: str = Field(min_length=1, max_length=20)
    stock_quantity: int = Field(default=0, ge=0, le=2_147_483_647)
    image_url: str | None = Field(default=None, max_length=2048)
    is_active: bool = True


class ProductDetailsUpdate(ProductDetailsCreate):
    pass


class GalleryImageCreate(ApiSchema):
    image_url: str = Field(min_length=1, max_length=2048)
    alt_text: str = Field(min_length=1, max_length=250)
    product_id: UUID | None = None
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True


class PackagingRecordCreate(ApiSchema):
    product_name: str = Field(min_length=1, max_length=150)
    status: Literal["Pending", "Complete"] = "Pending"
    estimated_completion_date: date
    location: str = Field(min_length=1, max_length=200)


class DealerCreate(ApiSchema):
    name: str = Field(min_length=1, max_length=150)
    contract_number: str = Field(min_length=1, max_length=80)
    place: str = Field(min_length=1, max_length=200)
    distributed_product: str = Field(min_length=1, max_length=200)
    email: str = Field(min_length=5, max_length=254)
    phone: str | None = Field(default=None, max_length=32)
    responsibility: str = Field(min_length=1, max_length=250)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return CustomerRegister.normalize_email(value)


class ExportShipmentCreate(ApiSchema):
    product_id: UUID
    dealer_id: UUID
    distributor_name: str = Field(min_length=1, max_length=150)
    ordered_date: date
    delivered_location: str = Field(min_length=1, max_length=200)
    delivery_completion_date: date | None = None


class ContactInquiryCreate(ApiSchema):
    contact_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    phone: str | None = Field(default=None, max_length=32)
    subject: str = Field(min_length=1, max_length=200)
    message: str = Field(min_length=1)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return CustomerRegister.normalize_email(value)


class DistributorCreate(ApiSchema):
    name: str = Field(min_length=1, max_length=150)
    place: str = Field(min_length=1, max_length=200)
    contact_email: str | None = Field(default=None, max_length=254)
    contact_phone: str | None = Field(default=None, max_length=32)

    @field_validator("contact_email")
    @classmethod
    def normalize_email(cls, value: str | None) -> str | None:
        return CustomerRegister.normalize_email(value) if value is not None else None


class OrderItemCreate(ApiSchema):
    product_id: UUID
    quantity: int = Field(gt=0, le=2_147_483_647)


class OrderCreate(ApiSchema):
    delivery_address: str = Field(min_length=5, max_length=2000)
    items: list[OrderItemCreate] = Field(min_length=1, max_length=100)

    @field_validator("items")
    @classmethod
    def require_unique_products(cls, items: list[OrderItemCreate]) -> list[OrderItemCreate]:
        product_ids = [item.product_id for item in items]
        if len(product_ids) != len(set(product_ids)):
            raise ValueError("Each product can appear only once in an order")
        return items


class OrderRead(ApiSchema):
    order_id: UUID
    customer_id: UUID
    status: Literal["pending", "successful", "cancelled"]
    total_amount: Decimal = Field(ge=0, max_digits=12, decimal_places=2)
    delivery_address: str
    created_at: datetime


class BulkOrderCreate(ApiSchema):
    contact_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    phone: str = Field(min_length=5, max_length=32)
    company_name: str | None = Field(default=None, max_length=150)
    product_name: str = Field(min_length=1, max_length=150)
    quantity: int = Field(gt=0, le=1000)
    message: str | None = None

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return CustomerRegister.normalize_email(value)


class OrderPendingCreate(ApiSchema):
    order_id: UUID
    pending_reason: str | None = None


class OrderSuccessCreate(ApiSchema):
    order_id: UUID
    payment_reference: str | None = Field(default=None, max_length=150)


class OrderCancellationCreate(ApiSchema):
    order_id: UUID
    cancellation_reason: str = Field(min_length=3, max_length=2000)
