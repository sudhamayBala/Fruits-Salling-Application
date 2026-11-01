"""SQLAlchemy ORM models for the Fruit Content API."""

from .ClientPageData import ClientPageData
from .Order import Order, OrderItem
from .Product import Category, ComingSoonProduct, Product
from .bulk_order import BulkOrderModel
from .contact import ContactInquiry
from .contract import Contract
from .distributor import DealerModel, DistributorModel
from .gallery import GalleryModel
from .packaging import PackagingModel
from .status import ExportShipmentModel, ShipmentStatus

ORM_MODELS = (
    ClientPageData,
    ContactInquiry,
    Contract,
    DealerModel,
    DistributorModel,
    ExportShipmentModel,
    ShipmentStatus,
    PackagingModel,
    GalleryModel,
    Category,
    Product,
    ComingSoonProduct,
    Order,
    OrderItem,
    BulkOrderModel,
)

__all__ = ["ORM_MODELS"]
