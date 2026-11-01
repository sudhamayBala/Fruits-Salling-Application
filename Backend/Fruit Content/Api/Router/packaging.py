from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import require_admin
from ..models.packaging import PackagingModel
from ..Schema.packaging import PackagingCreate, PackagingRead
from ..settings.database import get_session


router = APIRouter(prefix="/api/packaging", tags=["packaging"])


@router.get("", response_model=list[PackagingRead])
async def list_packaging(
    session: AsyncSession = Depends(get_session),
) -> list[PackagingModel]:
    result = await session.scalars(
        select(PackagingModel).order_by(PackagingModel.updated_at.desc())
    )
    return list(result)


@router.post("", response_model=PackagingRead, status_code=status.HTTP_201_CREATED)
async def create_packaging(
    data: PackagingCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> PackagingModel:
    packaging = PackagingModel(**data.model_dump())
    session.add(packaging)
    await session.commit()
    await session.refresh(packaging)
    return packaging


@router.put("/{packaging_id}", response_model=PackagingRead)
async def update_packaging(
    packaging_id: UUID,
    data: PackagingCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> PackagingModel:
    packaging = await session.get(PackagingModel, packaging_id)
    if packaging is None:
        raise HTTPException(status_code=404, detail="Packaging record not found")
    for field, value in data.model_dump().items():
        setattr(packaging, field, value)
    await session.commit()
    await session.refresh(packaging)
    return packaging


@router.delete(
    "/{packaging_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_packaging(
    packaging_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    packaging = await session.get(PackagingModel, packaging_id)
    if packaging is None:
        raise HTTPException(status_code=404, detail="Packaging record not found")
    await session.delete(packaging)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
