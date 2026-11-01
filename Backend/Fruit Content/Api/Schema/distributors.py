from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from .schemas import ApiSchema, CustomerRegister


class DistributorCreate(ApiSchema):
    name: str = Field(min_length=1, max_length=150)
    place: str = Field(min_length=1, max_length=200)
    contact_email: str | None = Field(default=None, max_length=254)
    contact_phone: str | None = Field(default=None, max_length=32)

    @field_validator("contact_email")
    @classmethod
    def normalize_contact_email(cls, value: str | None) -> str | None:
        return CustomerRegister.normalize_email(value) if value is not None else None


class DistributorRead(DistributorCreate):
    distributor_id: UUID
    created_at: datetime


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


class DealerRead(DealerCreate):
    dealer_id: UUID
    created_at: datetime