import asyncpg
from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user
from ..models.ClientPageData import ClientPageData
from ..settings.database import get_session
from .schemas import ClientPageDataRead, ClientPageDataWrite, ClientPageKey


router = APIRouter(prefix="/api/client-data", tags=["client data"])


@router.get("/{page_key}", response_model=ClientPageDataRead)
async def read_client_page_data(
    page_key: ClientPageKey,
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> ClientPageDataRead:
    record = await session.scalar(
        select(ClientPageData).where(
            ClientPageData.customer_id == user["customer_id"],
            ClientPageData.page_key == page_key,
        )
    )
    return ClientPageDataRead(
        page_key=page_key,
        data=record.data if record is not None else {},
    )


@router.put("/{page_key}", response_model=ClientPageDataRead)
async def write_client_page_data(
    page_key: ClientPageKey,
    data: ClientPageDataWrite,
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> ClientPageDataRead:
    statement = (
        insert(ClientPageData)
        .values(
            customer_id=user["customer_id"],
            page_key=page_key,
            data=data.data,
        )
        .on_conflict_do_update(
            constraint="uq_client_page_data_owner",
            set_={"data": data.data, "updated_at": func.now()},
        )
        .returning(ClientPageData.data)
    )
    saved_data = await session.scalar(statement)
    await session.commit()
    return ClientPageDataRead(page_key=page_key, data=saved_data)
