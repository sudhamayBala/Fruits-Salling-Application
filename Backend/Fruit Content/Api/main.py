
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

for env_file in (
    Path(backend_root) / ".env",
    Path(backend_root) / "Fruit Content" / ".env",
):
    load_dotenv(env_file)

from shared.error_handling import install_error_handling
from shared.jwt_auth import validate_jwt_secret
from .ClientData.router import router as client_data_router
from .database import create_database_pool
from .Router.bulk_orders import router as bulk_orders_router
from .Router.contracts import router as contracts_router
from .Router.distributors import router as distributors_router
from .Router.gallery import router as gallery_router
from .Router.orders import router as orders_router
from .Router.packaging import router as packaging_router
from .Router.product_images import (
    UPLOAD_DIRECTORY,
    router as product_images_router,
)
from .Router.products import router as products_router
from .Router.status import router as status_router
from .settings.database import close_model_database, initialize_models


@asynccontextmanager
async def lifespan(app: FastAPI):
    validate_jwt_secret()
    app.state.pool = await create_database_pool()
    try:
        UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
        await initialize_models()
        yield
    finally:
        await app.state.pool.close()
        await close_model_database()


app = FastAPI(
    title="INDKAN Product API",
    description="Product catalog, categories, and order management.",
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
app.include_router(products_router)
app.include_router(product_images_router)
app.include_router(orders_router)
app.include_router(bulk_orders_router)
app.include_router(contracts_router)
app.include_router(distributors_router)
app.include_router(gallery_router)
app.include_router(packaging_router)
app.include_router(status_router)
app.include_router(client_data_router)
app.mount(
    "/uploads",
    StaticFiles(directory=str(UPLOAD_DIRECTORY), check_dir=False),
    name="product-uploads",
)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"service": "products", "status": "ok"}