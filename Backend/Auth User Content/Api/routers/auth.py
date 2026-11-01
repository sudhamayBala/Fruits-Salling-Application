import asyncio
import re
from datetime import datetime, timezone
from uuid import UUID, uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.exc import SQLAlchemyError

from shared.auth import get_current_user, require_admin
from shared.jwt_auth import access_token_expiry, create_access_token, hash_token

from ..models import (
    consume_employee_id,
    get_credential,
    store_credential,
)
from ..schemas import (
    AuthResponse,
    CustomerLogin,
    CustomerRead,
    CustomerRegister,
    CustomerUpdate,
    PasswordChange,
    RoleChange,
)
from ..services.auth import (
    change_customer_password,
    hash_password,
    list_customers,
    register_customer,
    update_customer,
    update_customer_role,
    verify_password,
)


router = APIRouter(prefix="/api/auth", tags=["authentication"])
OWNER_EMAIL_PATTERN = re.compile(
    r"^[a-z0-9-]+\.\d{4}\.[a-z0-9-]+\.([0-9]{6})@indkan\.com$"
)
LEGACY_OWNER_EMAIL_PATTERN = re.compile(
    r"^[a-z0-9_-]+\.\d{4}\.[a-z0-9_-]+\.([0-9]{6})\.?@indikan\.com$"
)


def _owner_employee_id(email: str) -> str | None:
    match = OWNER_EMAIL_PATTERN.fullmatch(email) or LEGACY_OWNER_EMAIL_PATTERN.fullmatch(
        email
    )
    return match.group(1) if match else None


def _pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool


@router.post("/register", response_model=AuthResponse, status_code=status.HTTP_201_CREATED)
async def register(data: CustomerRegister, request: Request) -> AuthResponse:
    owner_email = data.email.endswith(("@indkan.com", "@indikan.com"))
    employee_id = _owner_employee_id(data.email)
    if owner_email and employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Owner email must use "
                "first-name.joining-year.employee-type.employee-id@indkan.com"
            ),
        )
    if employee_id is None and not data.email.endswith("@gmail.com"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Client accounts require a Gmail address ending in @gmail.com. "
                "Owner accounts must use an unused email issued by an admin."
            ),
        )
    if employee_id is not None and not await consume_employee_id(
        employee_id, data.email
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This owner employee ID is invalid or has already been used.",
        )

    account_password_hash = await asyncio.to_thread(hash_password, data.password)
    try:
        user, token = await register_customer(
            _pool(request),
            full_name=data.full_name,
            email=data.email,
            password=data.password,
            contract_number=data.contract_number,
            phone=data.phone,
            address=data.address,
            role="admin" if employee_id is not None else "customer",
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail=str(exc)
        ) from exc
    try:
        await store_credential(
            customer_id=user["customer_id"],
            email=data.email,
            password_hash=account_password_hash,
            is_owner=employee_id is not None,
        )
    except SQLAlchemyError as exc:
        async with _pool(request).acquire() as connection:
            async with connection.transaction():
                await connection.execute(
                    "DELETE FROM auth_sessions WHERE customer_id = $1",
                    user["customer_id"],
                )
                await connection.execute(
                    "DELETE FROM customers WHERE customer_id = $1",
                    user["customer_id"],
                )
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to finish account creation. Please try again.",
        ) from exc
    return AuthResponse(access_token=token, user=CustomerRead(**dict(user)))


@router.post("/login", response_model=AuthResponse)
async def login(data: CustomerLogin, request: Request) -> AuthResponse:
    pool = _pool(request)
    owner_email = data.email.endswith(("@indkan.com", "@indikan.com"))
    employee_id = _owner_employee_id(data.email)
    if owner_email and employee_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    stored_credential = await get_credential(
        data.email,
        is_owner=employee_id is not None,
    )
    if stored_credential is not None:
        user = await pool.fetchrow(
            """
            SELECT customer_id, full_name, email, contract_number,
                   phone, address, role, created_at
            FROM customers
            WHERE customer_id = $1
            """,
            stored_credential[0],
        )
        password_hash = stored_credential[1]
    elif employee_id is None:
        user = await pool.fetchrow(
            """
            SELECT customer_id, full_name, email, password_hash, phone, address, role,
                   created_at
            FROM customers
            WHERE email = $1
            """,
            data.email,
        )
        password_hash = user["password_hash"] if user is not None else ""
    else:
        user = None
        password_hash = ""

    if user is None or not await asyncio.to_thread(
        verify_password, data.password, password_hash
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    expires_at = access_token_expiry()
    token = create_access_token(user["customer_id"], expires_at=expires_at)
    await pool.execute(
        """
        INSERT INTO auth_sessions (session_id, customer_id, token_hash, expires_at)
        VALUES ($1, $2, $3, $4)
        """,
        uuid4(),
        user["customer_id"],
        hash_token(token),
        expires_at,
    )
    return AuthResponse(
        access_token=token,
        user=CustomerRead(
            **{key: value for key, value in dict(user).items() if key != "password_hash"}
        ),
    )


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> None:
    credentials = request.headers.get("authorization", "")
    token = credentials.partition(" ")[2]
    result = await _pool(request).execute(
        """
        UPDATE auth_sessions
        SET revoked_at = $1
        WHERE customer_id = $2 AND token_hash = $3 AND revoked_at IS NULL
        """,
        datetime.now(timezone.utc),
        user["customer_id"],
        hash_token(token),
    )
    if result.endswith(" 0"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session already revoked",
        )


@router.get("/me", response_model=CustomerRead)
async def current_user(
    user: asyncpg.Record = Depends(get_current_user),
) -> CustomerRead:
    return CustomerRead(**dict(user))


@router.patch("/me", response_model=CustomerRead)
async def update_current_user(
    data: CustomerUpdate,
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> CustomerRead:
    updated_user = await update_customer(
        _pool(request),
        user["customer_id"],
        data.model_dump(exclude_unset=True),
    )
    if updated_user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return CustomerRead(**dict(updated_user))


@router.post("/password", response_model=AuthResponse)
async def change_password(
    data: PasswordChange,
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> AuthResponse:
    try:
        token = await change_customer_password(
            _pool(request),
            user["customer_id"],
            data.current_password,
            data.new_password,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    return AuthResponse(access_token=token, user=CustomerRead(**dict(user)))


@router.get("/users", response_model=list[CustomerRead])
async def get_customers(
    request: Request,
    _admin: asyncpg.Record = Depends(require_admin),
) -> list[CustomerRead]:
    users = await list_customers(_pool(request))
    return [CustomerRead(**dict(user)) for user in users]


@router.patch("/users/{customer_id}/role", response_model=CustomerRead)
async def change_role(
    customer_id: UUID,
    data: RoleChange,
    request: Request,
    admin: asyncpg.Record = Depends(require_admin),
) -> CustomerRead:
    try:
        user = await update_customer_role(
            _pool(request),
            customer_id,
            data.role,
            admin["customer_id"],
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return CustomerRead(**dict(user))
