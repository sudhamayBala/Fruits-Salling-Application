from decimal import Decimal
from uuid import UUID

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from ..dependencies import get_current_user, require_admin
from ..models.Order import Order, OrderItem
from ..models.Product import Product
from ..Schema.orders import OrderFeedbackUpdate, OrderPageRead, OrderStatusUpdate
from ..Schema.schemas import OrderCreate
from ..settings.database import get_session


router = APIRouter(prefix="/api/orders", tags=["orders"])


async def _load_order(
    session: AsyncSession,
    order_id: UUID,
    customer_id: UUID | None = None,
) -> Order:
    query = select(Order).options(selectinload(Order.items)).where(
        Order.order_id == order_id
    )
    if customer_id is not None:
        query = query.where(Order.customer_id == customer_id)
    order = await session.scalar(query)
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _list_orders(
    session: AsyncSession,
    customer_id: UUID | None,
    order_status: str | None = None,
) -> list[Order]:
    query = select(Order).options(selectinload(Order.items))
    if customer_id is not None:
        query = query.where(Order.customer_id == customer_id)
    if order_status is not None:
        query = query.where(Order.status == order_status)
    result = await session.scalars(query.order_by(Order.created_at.desc()))
    return list(result)


@router.get("/manage", response_model=list[OrderPageRead])
async def list_all_orders(
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> list[Order]:
    return await _list_orders(session, None)


@router.get("", response_model=list[OrderPageRead])
async def list_customer_orders(
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> list[Order]:
    return await _list_orders(session, user["customer_id"])


@router.get("/pending", response_model=list[OrderPageRead])
async def list_pending_orders(
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> list[Order]:
    return await _list_orders(session, user["customer_id"], "pending")


@router.get("/successful", response_model=list[OrderPageRead])
@router.get("/successfully-delivered", response_model=list[OrderPageRead])
async def list_successful_orders(
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> list[Order]:
    return await _list_orders(session, user["customer_id"], "successful")


@router.get("/cancelled", response_model=list[OrderPageRead])
@router.get("/cancel", response_model=list[OrderPageRead])
async def list_cancelled_orders(
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> list[Order]:
    return await _list_orders(session, user["customer_id"], "cancelled")


async def _cancel_pending_order(session: AsyncSession, order: Order) -> None:
    if order.status != "pending":
        raise HTTPException(
            status_code=409,
            detail="Only pending orders can be cancelled.",
        )
    items = await session.scalars(
        select(OrderItem).where(OrderItem.order_id == order.order_id)
    )
    for item in items:
        if item.product_id is not None:
            await session.execute(
                update(Product)
                .where(Product.product_id == item.product_id)
                .values(stock_quantity=Product.stock_quantity + item.quantity)
            )
        item.fulfillment_status = "cancelled"
    order.status = "cancelled"


@router.patch("/{order_id}/cancel", response_model=OrderPageRead)
async def cancel_order(
    order_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> Order:
    order = await session.scalar(
        select(Order)
        .where(
            Order.order_id == order_id,
            Order.customer_id == user["customer_id"],
        )
        .with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    await _cancel_pending_order(session, order)
    await session.commit()
    return await _load_order(session, order_id, user["customer_id"])


@router.patch("/{order_id}/return", response_model=OrderPageRead)
async def request_order_return(
    order_id: UUID,
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> Order:
    order = await session.scalar(
        select(Order)
        .where(
            Order.order_id == order_id,
            Order.customer_id == user["customer_id"],
        )
        .with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status != "successful":
        raise HTTPException(
            status_code=409,
            detail="Only delivered orders can be submitted for return.",
        )
    order.status = "return_requested"
    await session.commit()
    return await _load_order(session, order_id, user["customer_id"])


@router.patch("/{order_id}/status", response_model=OrderPageRead)
async def update_order_status(
    order_id: UUID,
    data: OrderStatusUpdate,
    session: AsyncSession = Depends(get_session),
    _admin: asyncpg.Record = Depends(require_admin),
) -> Order:
    order = await session.scalar(
        select(Order).where(Order.order_id == order_id).with_for_update()
    )
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    if order.status in {"cancelled", "returned"} and data.status != order.status:
        raise HTTPException(
            status_code=409,
            detail="Cancelled or returned orders cannot be reopened.",
        )
    if data.status == "returned":
        if order.status != "return_requested":
            raise HTTPException(
                status_code=409,
                detail="Only a client-requested return can be confirmed.",
            )
        items = await session.scalars(
            select(OrderItem).where(OrderItem.order_id == order_id)
        )
        for item in items:
            if item.product_id is not None:
                await session.execute(
                    update(Product)
                    .where(Product.product_id == item.product_id)
                    .values(stock_quantity=Product.stock_quantity + item.quantity)
                )
            item.fulfillment_status = "returned"
        order.status = "returned"
        await session.commit()
        return await _load_order(session, order_id)
    if order.status == "return_requested":
        raise HTTPException(
            status_code=409,
            detail="A return request can only be confirmed as returned.",
        )
    if order.status != "pending" and data.status != order.status:
        raise HTTPException(
            status_code=409,
            detail="Only pending orders can change status.",
        )
    if order.status == "pending" and data.status == "cancelled":
        await _cancel_pending_order(session, order)
    elif order.status == "pending" and data.status == "successful":
        items = await session.scalars(
            select(OrderItem).where(OrderItem.order_id == order_id)
        )
        for item in items:
            item.fulfillment_status = "delivered"
        order.status = "successful"
    elif order.status == "pending" and data.status == "pending":
        pass
    elif order.status == "successful" and data.status == "successful":
        pass
    else:
        raise HTTPException(
            status_code=409,
            detail=(
                "Orders can only move from pending to delivered or cancelled. "
                "Clients must request returns for delivered orders."
            ),
        )
    await session.commit()
    return await _load_order(session, order_id)


@router.put(
    "/{order_id}/items/{item_id}/feedback",
    response_model=OrderPageRead,
)
async def save_order_feedback(
    order_id: UUID,
    item_id: UUID,
    data: OrderFeedbackUpdate,
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> Order:
    item = await session.scalar(
        select(OrderItem)
        .join(Order)
        .where(
            OrderItem.order_item_id == item_id,
            OrderItem.order_id == order_id,
            Order.customer_id == user["customer_id"],
            OrderItem.fulfillment_status == "delivered",
        )
    )
    if item is None:
        raise HTTPException(
            status_code=404,
            detail="Delivered order item not found for this account.",
        )
    item.product_feedback = data.product_feedback
    item.distributor_feedback = data.distributor_feedback
    await session.commit()
    return await _load_order(session, order_id, user["customer_id"])


@router.post("", response_model=OrderPageRead, status_code=status.HTTP_201_CREATED)
async def create_order(
    data: OrderCreate,
    session: AsyncSession = Depends(get_session),
    user: asyncpg.Record = Depends(get_current_user),
) -> Order:
    customer_id = user["customer_id"]
    total = Decimal("0.00")
    order_items: list[OrderItem] = []

    async with session.begin():
        for requested_item in sorted(data.items, key=lambda item: str(item.product_id)):
            product = await session.scalar(
                select(Product)
                .where(
                    Product.product_id == requested_item.product_id,
                    Product.is_active.is_(True),
                )
                .with_for_update()
            )
            if product is None:
                raise HTTPException(
                    status_code=404,
                    detail=f"Product {requested_item.product_id} is unavailable",
                )
            if product.stock_quantity < requested_item.quantity:
                raise HTTPException(
                    status_code=409,
                    detail=f"Not enough stock for {product.name}",
                )
            price = Decimal(product.price)
            subtotal = price * requested_item.quantity
            total += subtotal
            if total > Decimal("9999999999.99"):
                raise HTTPException(
                    status_code=422,
                    detail="Order total exceeds the supported maximum",
                )
            product.stock_quantity -= requested_item.quantity
            order_items.append(
                OrderItem(
                    product_id=product.product_id,
                    product_name=product.name,
                    product_price=price,
                    quantity=requested_item.quantity,
                    subtotal=subtotal,
                )
            )

        order = Order(
            customer_id=customer_id,
            delivery_address=data.delivery_address,
            total_amount=total,
            items=order_items,
        )
        session.add(order)

    return await _load_order(session, order.order_id, customer_id)
