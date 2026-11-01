"""Compatibility exports for page-specific API schemas."""

from .bulk_orders import BulkOrderCreated, BulkOrderRead, BulkOrderStatusUpdate
from .distributors import (
    DealerCreate,
    DealerRead,
    DistributorCreate,
    DistributorRead,
)
from .gallery import GalleryImageCreate, GalleryImageRead
from .orders import OrderFeedbackUpdate, OrderItemRead, OrderPageRead, OrderStatusUpdate
from .packaging import PackagingCreate, PackagingRead
from .products import CategoryPageRead, ProductPageRead
from .status import (
    ExportShipmentCreate,
    ExportShipmentRead,
    ShipmentStatusCreate,
    ShipmentStatusRead,
)

__all__ = [
    "BulkOrderCreated",
    "BulkOrderRead",
    "BulkOrderStatusUpdate",
    "CategoryPageRead",
    "DealerCreate",
    "DealerRead",
    "DistributorCreate",
    "DistributorRead",
    "ExportShipmentCreate",
    "ExportShipmentRead",
    "GalleryImageCreate",
    "GalleryImageRead",
    "OrderFeedbackUpdate",
    "OrderItemRead",
    "OrderPageRead",
    "OrderStatusUpdate",
    "PackagingCreate",
    "PackagingRead",
    "ProductPageRead",
    "ShipmentStatusCreate",
    "ShipmentStatusRead",
]
