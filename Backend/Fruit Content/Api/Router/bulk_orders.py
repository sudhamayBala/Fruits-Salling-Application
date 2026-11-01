from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import require_admin
from ..models.bulk_order import BulkOrderModel
from ..Schema.bulk_orders import BulkOrderRead, BulkOrderStatusUpdate
from ..Schema.schemas import BulkOrderCreate
from ..settings.database import get_session


router = APIRouter(prefix="/api/bulk-orders", tags=["bulk orders"])


@router.get("", response_model=list[BulkOrderRead])
async def list_bulk_orders(
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> list[BulkOrderModel]:
    result = await session.scalars(
        select(BulkOrderModel).order_by(BulkOrderModel.created_at.desc())
    )
    return list(result)


@router.post("", response_model=BulkOrderRead, status_code=status.HTTP_201_CREATED)
async def create_bulk_order(
    data: BulkOrderCreate,
    session: AsyncSession = Depends(get_session),
) -> BulkOrderModel:
    bulk_order = BulkOrderModel(**data.model_dump())
    session.add(bulk_order)
    await session.commit()
    await session.refresh(bulk_order)
    return bulk_order


@router.patch("/{bulk_order_id}/status", response_model=BulkOrderRead)
async def update_bulk_order_status(
    bulk_order_id: UUID,
    data: BulkOrderStatusUpdate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> BulkOrderModel:
    bulk_order = await session.get(BulkOrderModel, bulk_order_id)
    if bulk_order is None:
        raise HTTPException(status_code=404, detail="Bulk order not found")
    bulk_order.status = data.status
    await session.commit()
    await session.refresh(bulk_order)
    return bulk_order


@router.delete(
    "/{bulk_order_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_bulk_order(
    bulk_order_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    bulk_order = await session.get(BulkOrderModel, bulk_order_id)
    if bulk_order is None:
        raise HTTPException(status_code=404, detail="Bulk order not found")
    await session.delete(bulk_order)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
