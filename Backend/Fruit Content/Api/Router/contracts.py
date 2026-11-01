from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from ..dependencies import get_current_user, require_admin
from ..models.contract import Contract
from ..Schema.contract import ContractCreate, ContractRead
from ..settings.database import get_session


router = APIRouter(prefix="/api/contracts", tags=["contracts"])


@router.get("", response_model=list[ContractRead])
async def list_contracts(
    session: AsyncSession = Depends(get_session),
    _user=Depends(get_current_user),
) -> list[Contract]:
    result = await session.scalars(select(Contract).order_by(Contract.created_at.desc()))
    return list(result)


@router.get("/{contract_id}", response_model=ContractRead)
async def get_contract(
    contract_id: UUID,
    session: AsyncSession = Depends(get_session),
    _user=Depends(get_current_user),
) -> Contract:
    contract = await session.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    return contract


@router.post("", response_model=ContractRead, status_code=status.HTTP_201_CREATED)
async def create_contract(
    data: ContractCreate,
    session: AsyncSession = Depends(get_session),
    _admin=Depends(require_admin),
) -> Contract:
    contract = Contract(**data.model_dump())
    session.add(contract)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="A contract with this number and email already exists.",
        ) from exc
    await session.refresh(contract)
    return contract


@router.put("/{contract_id}", response_model=ContractRead)
async def update_contract(
    contract_id: UUID,
    data: ContractCreate,
    session: AsyncSession = Depends(get_session),
    _admin=Depends(require_admin),
) -> Contract:
    contract = await session.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    for field, value in data.model_dump().items():
        setattr(contract, field, value)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(
            status_code=409,
            detail="A contract with this number and email already exists.",
        ) from exc
    await session.refresh(contract)
    return contract


@router.delete("/{contract_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_contract(
    contract_id: UUID,
    session: AsyncSession = Depends(get_session),
    _admin=Depends(require_admin),
) -> Response:
    contract = await session.get(Contract, contract_id)
    if contract is None:
        raise HTTPException(status_code=404, detail="Contract not found")
    await session.delete(contract)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
