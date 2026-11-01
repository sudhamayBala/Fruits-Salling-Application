from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import require_admin
from ..models.gallery import GalleryModel
from ..Schema.gallery import GalleryImageCreate, GalleryImageRead
from ..settings.database import get_session


router = APIRouter(prefix="/api/gallery", tags=["gallery"])


@router.get("", response_model=list[GalleryImageRead])
async def list_gallery(
    session: AsyncSession = Depends(get_session),
) -> list[GalleryModel]:
    result = await session.scalars(
        select(GalleryModel)
        .where(GalleryModel.is_active.is_(True))
        .order_by(GalleryModel.display_order, GalleryModel.created_at.desc())
    )
    return list(result)


@router.get("/manage", response_model=list[GalleryImageRead])
async def list_all_gallery(
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> list[GalleryModel]:
    result = await session.scalars(
        select(GalleryModel).order_by(
            GalleryModel.display_order, GalleryModel.created_at.desc()
        )
    )
    return list(result)


@router.post(
    "",
    response_model=GalleryImageRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_gallery_image(
    data: GalleryImageCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> GalleryModel:
    image = GalleryModel(**data.model_dump())
    session.add(image)
    await session.commit()
    await session.refresh(image)
    return image


@router.put("/{image_id}", response_model=GalleryImageRead)
async def update_gallery_image(
    image_id: UUID,
    data: GalleryImageCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> GalleryModel:
    image = await session.get(GalleryModel, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    for field, value in data.model_dump().items():
        setattr(image, field, value)
    await session.commit()
    await session.refresh(image)
    return image


@router.delete("/{image_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_gallery_image(
    image_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    image = await session.get(GalleryModel, image_id)
    if image is None:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    await session.delete(image)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
