import asyncio
import hashlib
import hmac
import secrets
from datetime import datetime, timezone
from uuid import UUID, uuid4

import asyncpg

from shared.jwt_auth import access_token_expiry, create_access_token, hash_token


_PASSWORD_ITERATIONS = 600_000
_PASSWORD_ALGORITHM = "pbkdf2_sha256"


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    password_hash = hashlib.pbkdf2_hmac(
        "sha256", password.encode("utf-8"), salt, _PASSWORD_ITERATIONS
    )
    return (
        f"{_PASSWORD_ALGORITHM}${_PASSWORD_ITERATIONS}"
        f"${salt.hex()}${password_hash.hex()}"
    )


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        algorithm, iterations_text, salt_hex, expected_hash = stored_hash.split("$")
        iterations = int(iterations_text)
        if algorithm != _PASSWORD_ALGORITHM or iterations < 1:
            return False
        calculated_hash = hashlib.pbkdf2_hmac(
            "sha256", password.encode("utf-8"), bytes.fromhex(salt_hex), iterations
        ).hex()
    except (ValueError, TypeError):
        return False
    return hmac.compare_digest(calculated_hash, expected_hash)


async def register_customer(
    pool: asyncpg.Pool,
    *,
    full_name: str,
    email: str,
    password: str,
    contract_number: str | None,
    phone: str | None,
    address: str | None,
    role: str = "customer",
) -> tuple[asyncpg.Record, str]:
    password_hash = await asyncio.to_thread(hash_password, password)
    customer_id = uuid4()
    account_contract_number = contract_number or (
        f"OWN-{customer_id.hex.upper()}"
        if role == "admin"
        else f"CLI-{customer_id.hex.upper()}"
    )
    session_id = uuid4()
    expires_at = access_token_expiry()
    token = create_access_token(customer_id, expires_at=expires_at)

    try:
        async with pool.acquire() as connection:
            async with connection.transaction():
                user = await connection.fetchrow(
                    """
                    INSERT INTO customers (
                        customer_id, full_name, email, password_hash,
                        contract_number, phone, address, role
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    RETURNING customer_id, full_name, email, contract_number,
                              phone, address, role, created_at
                    """,
                    customer_id,
                    full_name,
                    email,
                    password_hash,
                    account_contract_number,
                    phone,
                    address,
                    role,
                )
                await connection.execute(
                    """
                    INSERT INTO auth_sessions (session_id, customer_id, token_hash, expires_at)
                    VALUES ($1, $2, $3, $4)
                    """,
                    session_id,
                    customer_id,
                    hash_token(token),
                    expires_at,
                )
    except asyncpg.UniqueViolationError as exc:
        if exc.constraint_name == "ix_customers_contract_number_unique":
            raise ValueError("A client with this contract number already exists") from exc
        raise ValueError("An account with this email already exists") from exc

    return user, token


async def update_customer(
    pool: asyncpg.Pool,
    customer_id: UUID,
    updates: dict[str, str | None],
) -> asyncpg.Record | None:
    allowed_fields = {"full_name", "phone", "address"}
    if not updates or not set(updates).issubset(allowed_fields):
        raise ValueError("Only full_name, phone, and address can be updated")

    fields = list(updates)
    assignments = ", ".join(
        f"{field} = ${index}" for index, field in enumerate(fields, start=1)
    )
    values = [updates[field] for field in fields]
    query = f"""
        UPDATE customers
        SET {assignments}
        WHERE customer_id = ${len(values) + 1}
        RETURNING customer_id, full_name, email, contract_number,
                  phone, address, role, created_at
    """
    async with pool.acquire() as connection:
        return await connection.fetchrow(query, *values, customer_id)


async def change_customer_password(
    pool: asyncpg.Pool,
    customer_id: UUID,
    current_password: str,
    new_password: str,
) -> str:
    async with pool.acquire() as connection:
        async with connection.transaction():
            credential_table = None
            stored_hash = await connection.fetchval(
                """
                SELECT password_hash FROM auth_owner_credentials
                WHERE customer_id = $1 FOR UPDATE
                """,
                customer_id,
            )
            if stored_hash is not None:
                credential_table = "auth_owner_credentials"
            else:
                stored_hash = await connection.fetchval(
                    """
                    SELECT password_hash FROM auth_client_credentials
                    WHERE customer_id = $1 FOR UPDATE
                    """,
                    customer_id,
                )
                if stored_hash is not None:
                    credential_table = "auth_client_credentials"
            if stored_hash is None:
                stored_hash = await connection.fetchval(
                    """
                    SELECT password_hash FROM customers
                    WHERE customer_id = $1 FOR UPDATE
                    """,
                    customer_id,
                )
            if stored_hash is None or not await asyncio.to_thread(
                verify_password, current_password, stored_hash
            ):
                raise ValueError("Current password is incorrect")
            if await asyncio.to_thread(verify_password, new_password, stored_hash):
                raise ValueError("New password must be different from the current password")

            new_hash = await asyncio.to_thread(hash_password, new_password)
            if credential_table is None:
                await connection.execute(
                    "UPDATE customers SET password_hash = $1 WHERE customer_id = $2",
                    new_hash,
                    customer_id,
                )
            else:
                await connection.execute(
                    f"UPDATE {credential_table} SET password_hash = $1 WHERE customer_id = $2",
                    new_hash,
                    customer_id,
                )
            await connection.execute(
                """
                UPDATE auth_sessions SET revoked_at = $1
                WHERE customer_id = $2 AND revoked_at IS NULL
                """,
                datetime.now(timezone.utc),
                customer_id,
            )

            expires_at = access_token_expiry()
            token = create_access_token(customer_id, expires_at=expires_at)
            await connection.execute(
                """
                INSERT INTO auth_sessions (session_id, customer_id, token_hash, expires_at)
                VALUES ($1, $2, $3, $4)
                """,
                uuid4(),
                customer_id,
                hash_token(token),
                expires_at,
            )
    return token


async def list_customers(pool: asyncpg.Pool) -> list[asyncpg.Record]:
    async with pool.acquire() as connection:
        return await connection.fetch(
            """
            SELECT customer_id, full_name, email, contract_number,
                   phone, address, role, created_at
            FROM customers
            ORDER BY created_at DESC
            """
        )


async def update_customer_role(
    pool: asyncpg.Pool,
    customer_id: UUID,
    role: str,
    acting_admin_id: UUID,
) -> asyncpg.Record | None:
    if customer_id == acting_admin_id and role != "admin":
        raise ValueError("Administrators cannot remove their own administrator role")
    async with pool.acquire() as connection:
        return await connection.fetchrow(
            """
            UPDATE customers
            SET role = $1
            WHERE customer_id = $2
            RETURNING customer_id, full_name, email, contract_number,
                      phone, address, role, created_at
            """,
            role,
            customer_id,
        )
