from dotenv import load_dotenv
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import DeclarativeBase
from sqlalchemy import text

from shared.database import build_async_sqlalchemy_url

load_dotenv()


class Base(DeclarativeBase):
    pass


engine = create_async_engine(build_async_sqlalchemy_url())
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


async def get_session():
    async with SessionLocal() as session:
        yield session


async def initialize_models() -> None:
    from ..models import ORM_MODELS

    if not ORM_MODELS:
        raise RuntimeError("No SQLAlchemy models are registered")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(
            text(
                """
                ALTER TABLE categories
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE categories
                ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now()
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE products
                ADD COLUMN IF NOT EXISTS cost_price NUMERIC(10, 2)
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE orders
                DROP CONSTRAINT IF EXISTS orders_status_check
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE orders
                ADD CONSTRAINT orders_status_check
                CHECK (status IN (
                    'pending',
                    'successful',
                    'cancelled',
                    'return_requested',
                    'returned'
                ))
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE orders
                ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE order_items
                ADD COLUMN IF NOT EXISTS fulfillment_status VARCHAR(16) NOT NULL DEFAULT 'pending',
                ADD COLUMN IF NOT EXISTS product_feedback TEXT NOT NULL DEFAULT '',
                ADD COLUMN IF NOT EXISTS distributor_feedback TEXT NOT NULL DEFAULT ''
                """
            )
        )


async def close_model_database() -> None:
    await engine.dispose()
