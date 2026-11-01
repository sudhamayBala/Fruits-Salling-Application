import asyncpg
from fastapi import Depends, HTTPException, Request, status

from .jwt_auth import InvalidAccessTokenError, decode_access_token, hash_token


async def get_current_user(request: Request) -> asyncpg.Record:
    auth_header = request.headers.get("authorization", "")
    scheme, _, token = auth_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    try:
        customer_id = decode_access_token(token)
    except InvalidAccessTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    user = await request.app.state.pool.fetchrow(
        """
        SELECT c.customer_id, c.full_name, c.email, c.contract_number,
               c.phone, c.address, c.role, c.created_at
        FROM auth_sessions AS s
        JOIN customers AS c ON c.customer_id = s.customer_id
        WHERE s.token_hash = $1
          AND c.customer_id = $2
          AND s.revoked_at IS NULL
          AND s.expires_at > NOW()
        ORDER BY s.created_at DESC
        LIMIT 1
        """,
        hash_token(token),
        customer_id,
    )
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return user


async def require_admin(
    user: asyncpg.Record = Depends(get_current_user),
) -> asyncpg.Record:
    if user["role"] != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
    return user
