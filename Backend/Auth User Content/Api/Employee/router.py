import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError

from shared.auth import require_admin

from .schemas import EmployeeIdCreate, EmployeeIdRead
from .service import issue_employee_id


router = APIRouter(prefix="/api/auth/employee-ids", tags=["employee IDs"])


@router.post(
    "",
    response_model=EmployeeIdRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_employee_id(
    data: EmployeeIdCreate,
    admin: asyncpg.Record = Depends(require_admin),
) -> EmployeeIdRead:
    try:
        employee = await issue_employee_id(
            admin["customer_id"],
            employee_name=data.employee_name,
            date_of_birth=data.date_of_birth,
            joining_date=data.joining_date,
            employee_type=data.employee_type,
            phone=data.phone,
            address=data.address,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        ) from exc
    except SQLAlchemyError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to create an employee ID. Please try again.",
        ) from exc
    return EmployeeIdRead(**employee)
