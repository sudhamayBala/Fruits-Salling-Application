import asyncio
import logging
import os
import sys
from contextlib import asynccontextmanager
from pathlib import Path

import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

backend_root = str(Path(__file__).resolve().parents[2])
if backend_root not in sys.path:
    sys.path.insert(0, backend_root)

for env_file in (
    Path(backend_root) / ".env",
    Path(backend_root) / "Fruit Content" / ".env",
):
    load_dotenv(env_file)

from shared.error_handling import install_error_handling
from shared.database import create_database_pool
from shared.jwt_auth import validate_jwt_secret

from .models import close_auth_database, create_auth_tables
from .routers.auth import router as auth_router
from .routers.messages import delete_expired_messages, router as messages_router
from .Employee.router import router as employee_ids_router


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
    validate_jwt_secret()
    app.state.pool = await create_database_pool()
    retention_task = None
    try:
        await create_auth_tables()
        await delete_expired_messages(app.state.pool)
        retention_task = asyncio.create_task(_message_retention_worker(app.state.pool))
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


app = FastAPI(
    title="INDKAN Authentication API",
    description="User registration, login, session management, and authorization.",
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
app.include_router(auth_router)
app.include_router(messages_router)
app.include_router(employee_ids_router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"service": "authentication", "status": "ok"}
