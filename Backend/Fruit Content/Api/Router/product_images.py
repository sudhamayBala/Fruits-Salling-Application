from pathlib import Path
from uuid import UUID, uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status

from ..dependencies import require_admin


router = APIRouter(prefix="/api/product-images", tags=["product images"])
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "uploads"
MAX_IMAGE_SIZE = 5 * 1024 * 1024
IMAGE_TYPES = {
    "image/jpeg": lambda data: data.startswith(b"\xff\xd8\xff"),
    "image/png": lambda data: data.startswith(b"\x89PNG\r\n\x1a\n"),
    "image/webp": lambda data: (
        len(data) >= 12
        and data.startswith(b"RIFF")
        and data[8:12] == b"WEBP"
    ),
}


@router.post("", status_code=status.HTTP_201_CREATED)
async def upload_product_image(
    request: Request,
    _admin=Depends(require_admin),
) -> dict[str, str]:
    content_type = request.headers.get("content-type", "").split(";", 1)[0].lower()
    image_type = IMAGE_TYPES.get(content_type)
    if image_type is None:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Upload a JPEG, PNG, or WebP image.",
        )

    content_length = request.headers.get("content-length")
    if content_length is not None:
        try:
            declared_size = int(content_length)
        except ValueError as exc:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image content length.",
            ) from exc
        if declared_size > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Product images must be 5 MB or smaller.",
            )

    image = bytearray()
    async for chunk in request.stream():
        image.extend(chunk)
        if len(image) > MAX_IMAGE_SIZE:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="Product images must be 5 MB or smaller.",
            )

    if not image_type(image):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The selected file does not match its image format.",
        )

    image_id = uuid4()
    try:
        await request.app.state.pool.execute(
            """
            INSERT INTO product_image_blobs (image_id, content_type, image_data)
            VALUES ($1, $2, $3)
            """,
            image_id,
            content_type,
            bytes(image),
        )
    except asyncpg.PostgresError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save the product image to the database. Please try again.",
        ) from exc

    image_url = (
        str(request.base_url).rstrip("/")
        + f"/api/product-images/{image_id}"
    )
    return {"image_url": image_url}


@router.get("/{image_id}")
async def get_product_image(image_id: UUID, request: Request) -> Response:
    try:
        image = await request.app.state.pool.fetchrow(
            """
            SELECT content_type, image_data
            FROM product_image_blobs
            WHERE image_id = $1
            """,
            image_id,
        )
    except asyncpg.PostgresError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to retrieve the product image. Please try again.",
        ) from exc

    if image is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Product image not found.",
        )
    return Response(
        content=bytes(image["image_data"]),
        media_type=image["content_type"],
        headers={
            "Cache-Control": "public, max-age=31536000, immutable",
            "X-Content-Type-Options": "nosniff",
        },
    )
