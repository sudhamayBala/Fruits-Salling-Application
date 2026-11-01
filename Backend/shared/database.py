import os
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

import asyncpg


def build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    required_settings = ("DB", "DB_USER", "DB_PASSWORD", "DB_HOST", "DB_PORT")
    missing_settings = [
        setting for setting in required_settings if not os.getenv(setting)
    ]
    if missing_settings:
        missing = ", ".join(missing_settings)
        raise RuntimeError(
            "Database configuration is missing. Set DATABASE_URL, or set all "
            f"database settings: {missing}."
        )

    db_name = quote(os.environ["DB"], safe="")
    db_user = quote(os.environ["DB_USER"], safe="")
    db_password = quote(os.environ["DB_PASSWORD"], safe="")
    db_host = os.environ["DB_HOST"]
    db_port = os.environ["DB_PORT"]
    return f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"


def _normalize_postgres_url(url: str, *, async_driver: bool) -> str:
    parts = urlsplit(url)
    scheme = parts.scheme
    if scheme == "postgres":
        scheme = "postgresql"
    elif scheme == "postgresql+asyncpg":
        scheme = "postgresql"
    if scheme != "postgresql":
        raise ValueError("DATABASE_URL must use PostgreSQL")

    query = parse_qsl(parts.query, keep_blank_values=True)
    sslmode = next(
        (value for key, value in query if key.lower() == "sslmode"),
        None,
    )
    query = [(key, value) for key, value in query if key.lower() != "sslmode"]
    if sslmode is not None and not any(key.lower() == "ssl" for key, _ in query):
        query.append(("ssl", sslmode))

    if async_driver:
        scheme = "postgresql+asyncpg"
    return urlunsplit(
        (scheme, parts.netloc, parts.path, urlencode(query), parts.fragment)
    )


def build_asyncpg_dsn() -> str:
    return _normalize_postgres_url(build_database_url(), async_driver=False)


def build_async_sqlalchemy_url() -> str:
    return _normalize_postgres_url(build_database_url(), async_driver=True)


async def create_database_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        build_asyncpg_dsn(),
        min_size=5,
        max_size=20,
    )
