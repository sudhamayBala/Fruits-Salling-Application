from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..dependencies import require_admin
from ..models.Product import Category, Product
from ..Schema.products import (
    CategoryPageRead,
    ManagedProductRead,
    ProductPageRead,
)
from ..Schema.schemas import ProductDetailsCreate, ProductDetailsUpdate
from ..settings.database import get_session


router = APIRouter(prefix="/api", tags=["products"])


def _product_read(product: Product, *, include_cost_price: bool = False) -> dict:
    result = {
        "id": product.product_id,
        "name": product.name,
        "description": product.description,
        "category_id": product.category_id,
        "category_name": product.category.name,
        "price": product.price,
        "unit": product.unit,
        "stock_quantity": product.stock_quantity,
        "image_url": product.image_url,
        "is_active": product.is_active,
        "category": {
            "id": product.category.category_id,
            "name": product.category.name,
        },
    }
    if include_cost_price:
        result["cost_price"] = product.cost_price
    return result


async def _get_category(
    session: AsyncSession,
    category_name: str,
) -> Category:
    category = await session.scalar(
        select(Category).where(Category.name == category_name)
    )
    if category is None:
        category = Category(name=category_name)
        session.add(category)
        await session.flush()
    return category


@router.get("/products", response_model=list[ProductPageRead])
async def list_products(
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    products = await session.scalars(
        select(Product)
        .options(selectinload(Product.category))
        .where(Product.is_active.is_(True))
        .order_by(Product.created_at.desc())
    )
    return [_product_read(product) for product in products]


@router.get("/categories", response_model=list[CategoryPageRead])
async def list_categories(
    session: AsyncSession = Depends(get_session),
) -> list[dict]:
    categories = await session.scalars(
        select(Category)
        .where(Category.products.any(Product.is_active.is_(True)))
        .order_by(Category.name)
    )
    return [
        {"id": category.category_id, "name": category.name}
        for category in categories
    ]


@router.get("/products/manage", response_model=list[ManagedProductRead])
async def list_products_for_admin(
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> list[dict]:
    products = await session.scalars(
        select(Product)
        .options(selectinload(Product.category))
        .order_by(Product.created_at.desc())
    )
    return [_product_read(product, include_cost_price=True) for product in products]


@router.post(
    "/products",
    response_model=ManagedProductRead,
    status_code=status.HTTP_201_CREATED,
)
async def create_product(
    data: ProductDetailsCreate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> dict:
    category = await _get_category(session, data.category)
    product = Product(
        category=category,
        name=data.name,
        description=data.description,
        price=data.price,
        cost_price=data.cost_price,
        unit=data.unit,
        stock_quantity=data.stock_quantity,
        image_url=data.image_url,
        is_active=data.is_active,
    )
    session.add(product)
    await session.commit()
    await session.refresh(product, attribute_names=["category"])
    return _product_read(product, include_cost_price=True)

@router.put("/products/{product_id}", response_model=ManagedProductRead)
async def update_product(
    product_id: UUID,
    data: ProductDetailsUpdate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> dict:
    product = await session.get(Product, product_id)
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    category = await _get_category(session, data.category)
    product.category = category
    product.name = data.name
    product.description = data.description
    product.price = data.price
    product.cost_price = data.cost_price
    product.unit = data.unit
    product.stock_quantity = data.stock_quantity
    product.image_url = data.image_url
    product.is_active = data.is_active
    await session.commit()
    await session.refresh(product, attribute_names=["category"])
    return _product_read(product, include_cost_price=True)


@router.delete("/products/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
async def deactivate_product(
    product_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Response:
    product = await session.get(Product, product_id)
    if product is None or not product.is_active:
        raise HTTPException(status_code=404, detail="Product not found")
    product.is_active = False
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
