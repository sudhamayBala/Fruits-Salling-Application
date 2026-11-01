import asyncio
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Request, status

from ..dependencies import require_admin


router = APIRouter(prefix="/api/product-images", tags=["product images"])
UPLOAD_DIRECTORY = Path(__file__).resolve().parents[1] / "uploads"
MAX_IMAGE_SIZE = 5 * 1024 * 1024
IMAGE_TYPES = {
    "image/jpeg": (".jpg", lambda data: data.startswith(b"\xff\xd8\xff")),
    "image/png": (".png", lambda data: data.startswith(b"\x89PNG\r\n\x1a\n")),
    "image/webp": (
        ".webp",
        lambda data: (
            len(data) >= 12
            and data.startswith(b"RIFF")
            and data[8:12] == b"WEBP"
        ),
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

    extension, matches_signature = image_type
    if not matches_signature(image):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="The selected file does not match its image format.",
        )

    filename = f"{uuid4().hex}{extension}"
    try:
        await asyncio.to_thread(
            _save_image,
            filename,
            bytes(image),
        )
    except OSError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to save the product image. Please try again.",
        ) from exc

    image_url = str(request.base_url).rstrip("/") + f"/uploads/{filename}"
    return {"image_url": image_url}


def _save_image(filename: str, image: bytes) -> None:
    UPLOAD_DIRECTORY.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIRECTORY / filename).write_bytes(image)
