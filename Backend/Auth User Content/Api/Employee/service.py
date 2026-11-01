import re
import secrets
import unicodedata
from datetime import date
from uuid import UUID

from sqlalchemy.exc import IntegrityError

from ..models import OwnerEmployeeId, SessionFactory


def _email_part(value: str) -> str:
    ascii_value = (
        unicodedata.normalize("NFKD", value)
        .encode("ascii", "ignore")
        .decode("ascii")
        .lower()
    )
    return re.sub(r"[^a-z0-9]+", "-", ascii_value).strip("-")


async def issue_employee_id(
    issued_by: UUID,
    *,
    employee_name: str,
    date_of_birth: date,
    joining_date: date,
    employee_type: str,
    phone: str,
    address: str,
) -> dict[str, str | date]:
    name_part = _email_part(employee_name.split()[0])
    type_part = _email_part(employee_type)
    if not name_part or not type_part:
        raise ValueError("Employee name and type must form valid email parts")

    async with SessionFactory() as session:
        for _ in range(100):
            employee_id = f"{secrets.randbelow(900000) + 100000:06d}"
            email = (
                f"{name_part}.{joining_date.year}.{type_part}."
                f"{employee_id}@indkan.com"
            )
            session.add(
                OwnerEmployeeId(
                    employee_id=employee_id,
                    issued_by=issued_by,
                    first_name=name_part,
                    employee_name=employee_name,
                    date_of_birth=date_of_birth,
                    joining_date=joining_date,
                    employee_type=type_part,
                    phone=phone,
                    address=address,
                    generated_email=email,
                )
            )
            try:
                await session.commit()
                return {
                    "employee_id": employee_id,
                    "employee_name": employee_name,
                    "date_of_birth": date_of_birth,
                    "joining_date": joining_date,
                    "employee_type": type_part,
                    "phone": phone,
                    "address": address,
                    "email": email,
                }
            except IntegrityError:
                await session.rollback()
                if await session.get(OwnerEmployeeId, employee_id) is not None:
                    continue
                raise
    raise RuntimeError("Unable to issue a unique six-digit employee ID")
