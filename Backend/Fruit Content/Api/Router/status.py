from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, require_admin
from ..models.status import ExportShipmentModel, ShipmentStatus
from ..Schema.status import (
    ExportShipmentCreate,
    ExportShipmentRead,
    ShipmentStatusCreate,
    ShipmentStatusRead,
)
from ..settings.database import get_session


router = APIRouter(prefix="/api/shipments", tags=["shipment status"])


@router.get("", response_model=list[ExportShipmentRead])
async def list_shipments(
    session: AsyncSession = Depends(get_session),
    _user: asyncpg.Record = Depends(get_current_user),
) -> list[ExportShipmentModel]:
    result = await session.scalars(
        select(ExportShipmentModel).order_by(ExportShipmentModel.created_at.desc())
    )
    return list(result)


@router.post(
    "",
    response_model=ExportShipmentRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_shipment(
    data: ExportShipmentCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> ExportShipmentModel:
    shipment = ExportShipmentModel(**data.model_dump())
    session.add(shipment)
    await session.commit()
    await session.refresh(shipment)
    return shipment


@router.get("/{export_id}/status", response_model=list[ShipmentStatusRead])
async def list_shipment_status(
    export_id: UUID,
    session: AsyncSession = Depends(get_session),
    _user: asyncpg.Record = Depends(get_current_user),
) -> list[ShipmentStatus]:
    if await session.get(ExportShipmentModel, export_id) is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    result = await session.scalars(
        select(ShipmentStatus)
        .where(ShipmentStatus.export_id == export_id)
        .order_by(ShipmentStatus.updated_at.desc())
    )
    return list(result)


@router.post(
    "/{export_id}/status",
    response_model=ShipmentStatusRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_shipment_status(
    export_id: UUID,
    data: ShipmentStatusCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> ShipmentStatus:
    if await session.get(ExportShipmentModel, export_id) is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    record = ShipmentStatus(export_id=export_id, **data.model_dump())
    session.add(record)
    await session.commit()
    await session.refresh(record)
    return record


@router.delete(
    "/{export_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_shipment(
    export_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    shipment = await session.get(ExportShipmentModel, export_id)
    if shipment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    await session.delete(shipment)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
