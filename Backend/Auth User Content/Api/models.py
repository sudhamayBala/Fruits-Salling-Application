from datetime import date as DateValue, datetime, timezone
from uuid import UUID

from sqlalchemy import Date, DateTime, String, Uuid, select, text
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from shared.database import build_database_url


class Base(DeclarativeBase):
    pass


class OwnerEmployeeId(Base):
    __tablename__ = "auth_owner_employee_ids"

    employee_id: Mapped[str] = mapped_column(String(6), primary_key=True)
    issued_by: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), nullable=False)
    first_name: Mapped[str | None] = mapped_column(String(80))
    employee_name: Mapped[str | None] = mapped_column(String(160))
    date_of_birth: Mapped[DateValue | None] = mapped_column(Date)
    joining_date: Mapped[DateValue | None] = mapped_column(Date)
    employee_type: Mapped[str | None] = mapped_column(String(80))
    phone: Mapped[str | None] = mapped_column(String(32))
    address: Mapped[str | None] = mapped_column(String(2000))
    generated_email: Mapped[str | None] = mapped_column(String(254))
    issued_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class ClientCredential(Base):
    __tablename__ = "auth_client_credentials"

    customer_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


class OwnerCredential(Base):
    __tablename__ = "auth_owner_credentials"

    customer_id: Mapped[UUID] = mapped_column(Uuid(as_uuid=True), primary_key=True)
    email: Mapped[str] = mapped_column(String(254), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(String(512), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=lambda: datetime.now(timezone.utc),
    )


_database_url = build_database_url()
if _database_url.startswith("postgresql+asyncpg://"):
    pass
elif _database_url.startswith("postgres://"):
    _database_url = _database_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif _database_url.startswith("postgresql://"):
    _database_url = _database_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(_database_url)
SessionFactory = async_sessionmaker(engine, expire_on_commit=False)


async def create_auth_tables() -> None:
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
        await connection.execute(
            text(
                """
                ALTER TABLE auth_owner_employee_ids
                    ADD COLUMN IF NOT EXISTS first_name VARCHAR(80),
                    ADD COLUMN IF NOT EXISTS employee_name VARCHAR(160),
                    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
                    ADD COLUMN IF NOT EXISTS joining_date DATE,
                    ADD COLUMN IF NOT EXISTS employee_type VARCHAR(80),
                    ADD COLUMN IF NOT EXISTS phone VARCHAR(32),
                    ADD COLUMN IF NOT EXISTS address VARCHAR(2000),
                    ADD COLUMN IF NOT EXISTS generated_email VARCHAR(254)
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS
                    ix_auth_owner_employee_ids_generated_email
                ON auth_owner_employee_ids (generated_email)
                WHERE generated_email IS NOT NULL
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE TABLE IF NOT EXISTS auth_messages (
                    message_id UUID PRIMARY KEY,
                    sender_id UUID NOT NULL REFERENCES customers(customer_id)
                        ON DELETE CASCADE,
                    recipient_id UUID NOT NULL REFERENCES customers(customer_id)
                        ON DELETE CASCADE,
                    body TEXT NOT NULL CHECK (char_length(btrim(body)) > 0),
                    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                    read_at TIMESTAMPTZ,
                    CHECK (sender_id <> recipient_id)
                )
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE auth_messages
                    ADD COLUMN IF NOT EXISTS audio_data BYTEA,
                    ADD COLUMN IF NOT EXISTS audio_content_type VARCHAR(100)
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_auth_messages_conversation
                ON auth_messages (sender_id, recipient_id, created_at)
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_auth_messages_retention
                ON auth_messages (created_at)
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE INDEX IF NOT EXISTS ix_auth_messages_unread
                ON auth_messages (recipient_id, sender_id, created_at)
                WHERE read_at IS NULL
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE customers
                    ADD COLUMN IF NOT EXISTS contract_number VARCHAR(50)
                """
            )
        )
        await connection.execute(
            text(
                """
                UPDATE customers
                SET contract_number = 'CLI-' || UPPER(REPLACE(customer_id::text, '-', ''))
                WHERE contract_number IS NULL
                """
            )
        )
        await connection.execute(
            text(
                """
                ALTER TABLE customers
                    ALTER COLUMN contract_number SET NOT NULL
                """
            )
        )
        await connection.execute(
            text(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS
                    ix_customers_contract_number_unique
                ON customers (LOWER(contract_number))
                """
            )
        )
        await connection.execute(
            text(
                """
                UPDATE customers
                SET role = 'customer'
                WHERE lower(email) LIKE '%@gmail.com'
                  AND role <> 'customer'
                """
            )
        )


async def close_auth_database() -> None:
    await engine.dispose()


async def consume_employee_id(employee_id: str, email: str) -> bool:
    async with SessionFactory() as session:
        async with session.begin():
            result = await session.execute(
                select(OwnerEmployeeId)
                .where(OwnerEmployeeId.employee_id == employee_id)
                .with_for_update()
            )
            issued_id = result.scalar_one_or_none()
            if (
                issued_id is None
                or issued_id.used_at is not None
                or (
                    issued_id.generated_email is not None
                    and issued_id.generated_email != email
                )
            ):
                return False
            issued_id.used_at = datetime.now(timezone.utc)
            return True


async def store_credential(
    *,
    customer_id: UUID,
    email: str,
    password_hash: str,
    is_owner: bool,
) -> None:
    credential_type = OwnerCredential if is_owner else ClientCredential
    async with SessionFactory() as session:
        session.add(
            credential_type(
                customer_id=customer_id,
                email=email,
                password_hash=password_hash,
            )
        )
        await session.commit()


async def get_credential(email: str, *, is_owner: bool) -> tuple[UUID, str] | None:
    credential_type = OwnerCredential if is_owner else ClientCredential
    async with SessionFactory() as session:
        result = await session.execute(
            select(credential_type.customer_id, credential_type.password_hash)
            .where(credential_type.email == email)
        )
        return result.one_or_none()
