import re
from datetime import date

from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator


class EmployeeIdCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employee_name: str = Field(min_length=2, max_length=160)
    date_of_birth: date
    joining_date: date
    employee_type: str = Field(min_length=2, max_length=80)
    phone: str = Field(min_length=7, max_length=32)
    address: str = Field(min_length=3, max_length=2000)

    @field_validator("employee_name")
    @classmethod
    def validate_employee_name(cls, value: str) -> str:
        normalized = " ".join(value.split())
        if len(normalized) < 2 or not all(
            character.isalpha() or character in " '-" for character in normalized
        ):
            raise ValueError("Employee name must contain letters and name separators only")
        return normalized

    @field_validator("employee_type")
    @classmethod
    def validate_employee_type(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 2 or not re.fullmatch(
            r"[A-Za-z][A-Za-z0-9 &/\-]*", normalized
        ):
            raise ValueError("Enter a valid employee type")
        return normalized

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, value: str) -> str:
        normalized = value.strip()
        if not re.fullmatch(r"[0-9+().\-\s]{7,32}", normalized) or not any(
            character.isdigit() for character in normalized
        ):
            raise ValueError("Enter a valid phone number")
        return normalized

    @field_validator("address")
    @classmethod
    def validate_address(cls, value: str) -> str:
        normalized = value.strip()
        if len(normalized) < 3:
            raise ValueError("Enter the employee's address")
        return normalized

    @field_validator("date_of_birth", "joining_date")
    @classmethod
    def validate_employee_dates(cls, value: date) -> date:
        if value > date.today():
            raise ValueError("Employee dates cannot be in the future")
        if value.year < 1900:
            raise ValueError("Employee dates must be 1900 or later")
        return value

    @field_validator("joining_date")
    @classmethod
    def validate_joining_after_birth(
        cls, value: date, info: ValidationInfo
    ) -> date:
        date_of_birth = info.data.get("date_of_birth")
        if date_of_birth is not None and value < date_of_birth:
            raise ValueError("Joining date cannot be before date of birth")
        return value


class EmployeeIdRead(BaseModel):
    model_config = ConfigDict(extra="forbid")

    employee_id: str
    employee_name: str
    date_of_birth: date
    joining_date: date
    employee_type: str
    phone: str
    address: str
    email: str
