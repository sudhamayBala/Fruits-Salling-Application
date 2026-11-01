import asyncio
import importlib.util
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path
from types import ModuleType

import asyncpg
from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles


BACKEND_ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(BACKEND_ROOT))
load_dotenv(BACKEND_ROOT / ".env")


def _load_service(name: str, api_directory: Path) -> ModuleType:
    package = ModuleType(name)
    package.__path__ = [str(api_directory)]
    package.__package__ = name
    sys.modules[name] = package

    module_name = f"{name}.main"
    spec = importlib.util.spec_from_file_location(
        module_name,
        api_directory / "main.py",
    )
    if spec is None or spec.loader is None:
        raise ImportError(f"Unable to load API module from {api_directory}")

    module = importlib.util.module_from_spec(spec)
    sys.modules[module_name] = module
    spec.loader.exec_module(module)
    return module


auth_api = _load_service(
    "auth_service",
    BACKEND_ROOT / "Auth User Content" / "Api",
)
fruit_api = _load_service(
    "fruit_service",
    BACKEND_ROOT / "Fruit Content" / "Api",
)

from shared.database import create_database_pool
from shared.error_handling import install_error_handling
from shared.jwt_auth import validate_jwt_secret

from auth_service.models import close_auth_database, create_auth_tables
from auth_service.routers.messages import delete_expired_messages
from fruit_service.Router.product_images import UPLOAD_DIRECTORY
from fruit_service.settings.database import close_model_database, initialize_models

logger = logging.getLogger(__name__)


async def _message_retention_worker(pool: asyncpg.Pool) -> None:
    while True:
        await asyncio.sleep(60 * 60)
        try:
            deleted = await delete_expired_messages(pool)
            logger.info("Expired messages cleanup completed: %s", deleted)
        except Exception:
            logger.exception("Unable to delete expired messages")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting combined backend service.")
    validate_jwt_secret()
    logger.info("JWT configuration validated.")
    app.state.pool = await create_database_pool()
    logger.info("Connected to the configured PostgreSQL database.")
    retention_task = None
    try:
        await create_auth_tables()
        logger.info("Authentication tables initialized.")
        await initialize_models()
        logger.info("Fruit Content tables initialized.")
        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
        await delete_expired_messages(app.state.pool)
        retention_task = asyncio.create_task(
            _message_retention_worker(app.state.pool)
        )
        yield
    finally:
        if retention_task is not None:
            retention_task.cancel()
            try:
                await retention_task
            except asyncio.CancelledError:
                pass
        await app.state.pool.close()
        await close_auth_database()
        await close_model_database()


app = FastAPI(
    title="INDKAN Backend API",
    description="Combined authentication, product, order, and messaging API.",
    version="1.0.0",
    lifespan=lifespan,
)
install_error_handling(app)

origins = [
    origin.strip()
    for origin in os.environ.get(
        "CORS_ORIGINS", "http://localhost:2000,http://127.0.0.1:2000"
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID"],
)

app.include_router(auth_api.auth_router)
app.include_router(auth_api.messages_router)
app.include_router(auth_api.employee_ids_router)
app.include_router(fruit_api.products_router)
app.include_router(fruit_api.product_images_router)
app.include_router(fruit_api.orders_router)
app.include_router(fruit_api.bulk_orders_router)
app.include_router(fruit_api.contracts_router)
app.include_router(fruit_api.distributors_router)
app.include_router(fruit_api.gallery_router)
app.include_router(fruit_api.packaging_router)
app.include_router(fruit_api.status_router)
app.include_router(fruit_api.client_data_router)
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIRECTORY), check_dir=False),
    name="product-uploads",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"service": "combined-backend", "status": "ok"}
