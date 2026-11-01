from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import require_admin
from ..models.distributor import DealerModel, DistributorModel
from ..Schema.distributors import (
    DealerCreate,
    DealerRead,
    DistributorCreate,
    DistributorRead,
)
from ..settings.database import get_session


router = APIRouter(prefix="/api", tags=["distributors"])


@router.get("/distributors", response_model=list[DistributorRead])
async def list_distributors(
    session: AsyncSession = Depends(get_session),
) -> list[DistributorModel]:
    result = await session.scalars(
        select(DistributorModel).order_by(DistributorModel.name)
    )
    return list(result)


@router.post(
    "/distributors",
    response_model=DistributorRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_distributor(
    data: DistributorCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> DistributorModel:
    distributor = DistributorModel(**data.model_dump())
    session.add(distributor)
    await session.commit()
    await session.refresh(distributor)
    return distributor


@router.put("/distributors/{distributor_id}", response_model=DistributorRead)
async def update_distributor(
    distributor_id: UUID,
    data: DistributorCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> DistributorModel:
    distributor = await session.get(DistributorModel, distributor_id)
    if distributor is None:
        raise HTTPException(status_code=404, detail="Distributor not found")
    for field, value in data.model_dump().items():
        setattr(distributor, field, value)
    await session.commit()
    await session.refresh(distributor)
    return distributor


@router.delete(
    "/distributors/{distributor_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_distributor(
    distributor_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    distributor = await session.get(DistributorModel, distributor_id)
    if distributor is None:
        raise HTTPException(status_code=404, detail="Distributor not found")
    await session.delete(distributor)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.get("/dealers", response_model=list[DealerRead])
async def list_dealers(
    session: AsyncSession = Depends(get_session),
) -> list[DealerModel]:
    result = await session.scalars(select(DealerModel).order_by(DealerModel.name))
    return list(result)


@router.post(
    "/dealers",
    response_model=DealerRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_dealer(
    data: DealerCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> DealerModel:
    dealer = DealerModel(**data.model_dump())
    session.add(dealer)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="A dealer with this contract number already exists.",
        ) from exc
    await session.refresh(dealer)
    return dealer


@router.put("/dealers/{dealer_id}", response_model=DealerRead)
async def update_dealer(
    dealer_id: UUID,
    data: DealerCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> DealerModel:
    dealer = await session.get(DealerModel, dealer_id)
    if dealer is None:
        raise HTTPException(status_code=404, detail="Dealer not found")
    for field, value in data.model_dump().items():
        setattr(dealer, field, value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="A dealer with this contract number already exists.",
        ) from exc
    await session.refresh(dealer)
    return dealer


@router.delete("/dealers/{dealer_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dealer(
    dealer_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    dealer = await session.get(DealerModel, dealer_id)
    if dealer is None:
        raise HTTPException(status_code=404, detail="Dealer not found")
    await session.delete(dealer)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
