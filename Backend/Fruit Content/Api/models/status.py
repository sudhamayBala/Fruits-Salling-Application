import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from ..settings.database import Base


class ExportShipmentModel(Base):
    __tablename__ = "export_shipments"

    export_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    product_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("products.product_id", ondelete="SET NULL")
    )
    product_name: Mapped[str] = mapped_column(String(150), nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(2048))
    dealer_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dealers.dealer_id", ondelete="SET NULL")
    )
    dealer_name: Mapped[str] = mapped_column(String(150), nullable=False)
    distributor_name: Mapped[str] = mapped_column(String(150), nullable=False)
    ordered_date: Mapped[date] = mapped_column(Date, nullable=False)
    delivered_location: Mapped[str] = mapped_column(String(200), nullable=False)
    delivery_completion_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )


class ShipmentStatus(Base):
    __tablename__ = "shipment_status_records"

    status_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    export_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("export_shipments.export_id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    location: Mapped[str | None] = mapped_column(String(200))
    notes: Mapped[str | None] = mapped_column(Text)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
