import hashlib
import os
from datetime import datetime, timedelta, timezone
from uuid import UUID, uuid4

import jwt


JWT_ALGORITHM = "HS256"
JWT_ISSUER = "fruit-house"
JWT_AUDIENCE = "fruit-house-api"
ACCESS_TOKEN_LIFETIME = timedelta(days=7)
_MINIMUM_SECRET_BYTES = 32


class InvalidAccessTokenError(ValueError):
    pass


def validate_jwt_secret() -> None:
    secret = os.environ.get("JWT_SECRET", "")
    if len(secret.encode("utf-8")) < _MINIMUM_SECRET_BYTES:
        raise RuntimeError(
            "JWT_SECRET must be set to a random secret of at least 32 bytes."
        )


def access_token_expiry() -> datetime:
    return datetime.now(timezone.utc) + ACCESS_TOKEN_LIFETIME


def create_access_token(
    customer_id: UUID,
    *,
    expires_at: datetime | None = None,
) -> str:
    validate_jwt_secret()
    issued_at = datetime.now(timezone.utc)
    expiry = expires_at or issued_at + ACCESS_TOKEN_LIFETIME
    claims = {
        "sub": str(customer_id),
        "jti": str(uuid4()),
        "token_use": "access",
        "iat": issued_at,
        "exp": expiry,
        "iss": JWT_ISSUER,
        "aud": JWT_AUDIENCE,
    }
    return jwt.encode(
        claims,
        os.environ["JWT_SECRET"],
        algorithm=JWT_ALGORITHM,
    )


def decode_access_token(token: str) -> UUID:
    validate_jwt_secret()
    try:
        claims = jwt.decode(
            token,
            os.environ["JWT_SECRET"],
            algorithms=[JWT_ALGORITHM],
            audience=JWT_AUDIENCE,
            issuer=JWT_ISSUER,
            options={"require": ["sub", "jti", "token_use", "iat", "exp"]},
        )
        if claims["token_use"] != "access":
            raise InvalidAccessTokenError("Invalid access token")
        return UUID(claims["sub"])
    except (jwt.InvalidTokenError, ValueError, TypeError) as exc:
        raise InvalidAccessTokenError("Invalid or expired access token") from exc


def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()
