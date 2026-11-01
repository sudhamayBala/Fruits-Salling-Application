import os

import asyncpg


def build_database_url() -> str:
    database_url = os.getenv("DATABASE_URL")
    if database_url:
        return database_url

    db_name = os.getenv("DB", "FRUITS")
    db_user = os.getenv("DB_USER", "postgres")
    db_password = os.getenv("DB_PASSWORD", "")
    db_host = os.getenv("DB_HOST", "localhost")
    db_port = os.getenv("DB_PORT", "5432")
    return (
        f"postgresql://{db_user}:{db_password}@{db_host}:{db_port}/{db_name}"
    )


def build_asyncpg_dsn() -> str:
    url = build_database_url()
    if url.startswith("postgresql+asyncpg://"):
        return url.replace("postgresql+asyncpg://", "postgresql://", 1)
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql://", 1)
    if url.startswith("postgresql://"):
        return url
    raise ValueError("DATABASE_URL must use PostgreSQL")


async def create_database_pool() -> asyncpg.Pool:
    return await asyncpg.create_pool(
        build_asyncpg_dsn(),
        min_size=5,
        max_size=20,
    )
