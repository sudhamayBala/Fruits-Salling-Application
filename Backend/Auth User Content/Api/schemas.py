import re
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class ApiSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")


class CustomerRegister(ApiSchema):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=254)
    password: str = Field(min_length=8, max_length=128)
    contract_number: str | None = Field(default=None, min_length=1, max_length=50)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=2000)

    @field_validator("full_name")
    @classmethod
    def normalize_full_name(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2:
            raise ValueError("Full name must contain at least two characters")
        return normalized

    @field_validator("phone", "address")
    @classmethod
    def trim_optional_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else None

    @field_validator("contract_number")
    @classmethod
    def normalize_contract_number(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Contract number cannot be blank")
        return normalized

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
    contract_number: str
    phone: str | None
    address: str | None
    role: str
    created_at: datetime


class AuthResponse(ApiSchema):
    access_token: str
    token_type: str = "bearer"
    user: CustomerRead


class CustomerUpdate(ApiSchema):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    phone: str | None = Field(default=None, max_length=32)
    address: str | None = Field(default=None, max_length=2000)

    @field_validator("full_name", "phone", "address")
    @classmethod
    def trim_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        if not normalized:
            raise ValueError("Text fields cannot be blank")
        return normalized

    @model_validator(mode="after")
    def require_update(self) -> "CustomerUpdate":
        if not self.model_fields_set:
            raise ValueError("Provide at least one field to update")
        if "full_name" in self.model_fields_set and self.full_name is None:
            raise ValueError("Full name cannot be null")
        return self


class PasswordChange(ApiSchema):
    current_password: str = Field(min_length=8, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class RoleChange(ApiSchema):
    role: Literal["customer", "admin"]
