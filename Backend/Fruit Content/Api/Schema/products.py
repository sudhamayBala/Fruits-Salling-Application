from decimal import Decimal
from uuid import UUID

from .schemas import ApiSchema


class CategoryPageRead(ApiSchema):
    id: UUID
    name: str


class ProductPageRead(ApiSchema):
    id: UUID
    name: str
    description: str | None
    category_id: UUID
    category_name: str
    price: Decimal
    cost_price: Decimal | None = None
    unit: str
    stock_quantity: int
    image_url: str | None
    is_active: bool
    category: CategoryPageRead


class ManagedProductRead(ProductPageRead):
    cost_price: Decimal | None