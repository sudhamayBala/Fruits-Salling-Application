import re
from datetime import datetime
from uuid import UUID

from pydantic import Field, field_validator

from .schemas import ApiSchema


class ContractCreate(ApiSchema):
    contract_number: str = Field(min_length=1, max_length=50)
    dealer_name: str = Field(min_length=1, max_length=150)
    email: str = Field(min_length=5, max_length=254)
    distributor_name: str = Field(min_length=1, max_length=150)
    responsible_for: str = Field(min_length=1, max_length=150)
    location: str = Field(min_length=1, max_length=350)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        normalized = value.strip().lower()
        if not re.fullmatch(
            r"[^@\s]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}",
            normalized,
        ):
            raise ValueError("Enter a valid email address")
        return normalized


class ContractRead(ContractCreate):
    id: UUID
    created_at: datetime
    updated_at: datetime
