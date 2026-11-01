from datetime import datetime
from uuid import UUID

from pydantic import Field

from .schemas import ApiSchema


class GalleryImageCreate(ApiSchema):
    image_url: str = Field(min_length=1, max_length=2048)
    alt_text: str = Field(min_length=1, max_length=250)
    product_id: UUID | None = None
    display_order: int = Field(default=0, ge=0)
    is_active: bool = True


class GalleryImageRead(GalleryImageCreate):
    image_id: UUID
    created_at: datetime