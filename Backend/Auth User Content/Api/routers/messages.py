import base64
import binascii
from datetime import datetime
from uuid import UUID, uuid4

import asyncpg
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel, ConfigDict, Field, field_validator

from shared.auth import get_current_user


router = APIRouter(prefix="/api/auth/messages", tags=["messages"])
MAX_VOICE_MESSAGE_BYTES = 5 * 1024 * 1024
ALLOWED_AUDIO_TYPES = {"audio/webm", "audio/ogg", "audio/mp4", "audio/wav"}


class MessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_id: UUID
    body: str = Field(min_length=1, max_length=4000)

    @field_validator("body")
    @classmethod
    def reject_blank_body(cls, value: str) -> str:
        body = value.strip()
        if not body:
            raise ValueError("Message cannot be blank")
        return body


class VoiceMessageCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    recipient_id: UUID
    audio_base64: str = Field(min_length=1, max_length=7_000_000)
    audio_content_type: str = Field(min_length=1, max_length=100)


class MessageRead(BaseModel):
    message_id: UUID
    sender_id: UUID
    recipient_id: UUID
    body: str
    created_at: datetime
    read_at: datetime | None
    audio_url: str | None = None


def _pool(request: Request) -> asyncpg.Pool:
    return request.app.state.pool


async def delete_expired_messages(pool: asyncpg.Pool) -> str:
    return await pool.execute(
        "DELETE FROM auth_messages WHERE created_at < NOW() - INTERVAL '3 months'"
    )


def _audio_url(
    contact_id: UUID, message_id: UUID, audio_content_type: str | None
) -> str | None:
    if audio_content_type is None:
        return None
    return f"/messages/{contact_id}/{message_id}/audio"


async def _require_other_role(
    pool: asyncpg.Pool,
    current_user: asyncpg.Record,
    contact_id: UUID,
) -> asyncpg.Record:
    if contact_id == current_user["customer_id"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot message your own account.",
        )

    contact = await pool.fetchrow(
        """
        SELECT customer_id, full_name, email, role
        FROM customers
        WHERE customer_id = $1
        """,
        contact_id,
    )
    if contact is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message recipient not found.",
        )

    is_allowed_pair = (
        (current_user["role"] == "admin" and contact["role"] != "admin")
        or (current_user["role"] != "admin" and contact["role"] == "admin")
    )
    if not is_allowed_pair:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Messages can only be sent between clients and owners.",
        )
    return contact


@router.get("/contacts")
async def list_message_contacts(
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> list[dict[str, object]]:
    contacts = await _pool(request).fetch(
        """
        SELECT
            contact.customer_id,
            contact.full_name,
            contact.email,
            contact.role,
            latest.body AS last_message,
            latest.created_at AS last_message_at,
            COALESCE(unread.message_count, 0)::INTEGER AS unread_count
        FROM customers AS contact
        LEFT JOIN LATERAL (
            SELECT message.message_id, message.body, message.created_at
            FROM auth_messages AS message
            WHERE (
                message.sender_id = $1
                AND message.recipient_id = contact.customer_id
            ) OR (
                message.recipient_id = $1
                AND message.sender_id = contact.customer_id
            )
            ORDER BY message.created_at DESC, message.message_id DESC
            LIMIT 1
        ) AS latest ON TRUE
        LEFT JOIN LATERAL (
            SELECT COUNT(*) AS message_count
            FROM auth_messages AS message
            WHERE message.sender_id = contact.customer_id
              AND message.recipient_id = $1
              AND message.read_at IS NULL
        ) AS unread ON TRUE
        WHERE contact.customer_id <> $1
          AND (
              ($2 = 'admin' AND contact.role <> 'admin')
              OR ($2 <> 'admin' AND contact.role = 'admin')
          )
        ORDER BY latest.created_at DESC NULLS LAST,
                 latest.message_id DESC NULLS LAST,
                 contact.full_name
        """,
        user["customer_id"],
        user["role"],
    )
    return [dict(contact) for contact in contacts]


@router.get("/{contact_id}", response_model=list[MessageRead])
async def get_conversation(
    contact_id: UUID,
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> list[MessageRead]:
    pool = _pool(request)
    await _require_other_role(pool, user, contact_id)
    async with pool.acquire() as connection:
        async with connection.transaction():
            await connection.execute(
                """
                UPDATE auth_messages
                SET read_at = NOW()
                WHERE sender_id = $1
                  AND recipient_id = $2
                  AND read_at IS NULL
                """,
                contact_id,
                user["customer_id"],
            )
            messages = await connection.fetch(
                """
                SELECT message_id, sender_id, recipient_id, body, created_at,
                       read_at, audio_content_type
                FROM (
                    SELECT message_id, sender_id, recipient_id, body, created_at,
                           read_at, audio_content_type
                    FROM auth_messages
                    WHERE (
                        sender_id = $1 AND recipient_id = $2
                    ) OR (
                        sender_id = $2 AND recipient_id = $1
                    )
                    ORDER BY created_at DESC, message_id DESC
                    LIMIT 200
                ) AS recent_messages
                ORDER BY created_at, message_id
                """,
                user["customer_id"],
                contact_id,
            )
    return [
        MessageRead(
            **dict(message),
            audio_url=_audio_url(
                contact_id, message["message_id"], message["audio_content_type"]
            ),
        )
        for message in messages
    ]


@router.post("", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_message(
    data: MessageCreate,
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> MessageRead:
    pool = _pool(request)
    await _require_other_role(pool, user, data.recipient_id)
    message = await pool.fetchrow(
        """
        INSERT INTO auth_messages (
            message_id, sender_id, recipient_id, body, created_at
        )
        VALUES ($1, $2, $3, $4, clock_timestamp())
        RETURNING message_id, sender_id, recipient_id, body, created_at, read_at
        """,
        uuid4(),
        user["customer_id"],
        data.recipient_id,
        data.body,
    )
    return MessageRead(**dict(message))


@router.post("/voice", response_model=MessageRead, status_code=status.HTTP_201_CREATED)
async def send_voice_message(
    data: VoiceMessageCreate,
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> MessageRead:
    content_type = data.audio_content_type.partition(";")[0].strip().lower()
    if content_type not in ALLOWED_AUDIO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Use a supported audio recording format.",
        )
    try:
        audio_data = base64.b64decode(data.audio_base64, validate=True)
    except (binascii.Error, ValueError) as error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The voice recording is invalid.",
        ) from error
    if not audio_data or len(audio_data) > MAX_VOICE_MESSAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Voice recordings must be smaller than 5 MB.",
        )

    pool = _pool(request)
    await _require_other_role(pool, user, data.recipient_id)
    message = await pool.fetchrow(
        """
        INSERT INTO auth_messages (
            message_id, sender_id, recipient_id, body, audio_data,
            audio_content_type, created_at
        )
        VALUES ($1, $2, $3, 'Voice message', $4, $5, clock_timestamp())
        RETURNING message_id, sender_id, recipient_id, body, created_at,
                  read_at, audio_content_type
        """,
        uuid4(),
        user["customer_id"],
        data.recipient_id,
        audio_data,
        content_type,
    )
    return MessageRead(
        **dict(message),
        audio_url=_audio_url(
            data.recipient_id, message["message_id"], content_type
        ),
    )


@router.get("/{contact_id}/{message_id}/audio")
async def get_voice_message_audio(
    contact_id: UUID,
    message_id: UUID,
    request: Request,
    user: asyncpg.Record = Depends(get_current_user),
) -> Response:
    pool = _pool(request)
    await _require_other_role(pool, user, contact_id)
    message = await pool.fetchrow(
        """
        SELECT audio_data, audio_content_type
        FROM auth_messages
        WHERE message_id = $1
          AND audio_content_type IS NOT NULL
          AND (
              (sender_id = $2 AND recipient_id = $3)
              OR (sender_id = $3 AND recipient_id = $2)
          )
        """,
        message_id,
        user["customer_id"],
        contact_id,
    )
    if message is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Voice message not found.",
        )
    return Response(
        content=message["audio_data"],
        media_type=message["audio_content_type"],
        headers={"X-Content-Type-Options": "nosniff"},
    )
