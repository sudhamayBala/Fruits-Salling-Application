from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


ClientPageKey = Literal["cart", "preferences", "order_feedback"]


class ClientPageDataWrite(BaseModel):
    model_config = ConfigDict(extra="forbid")

    data: dict[str, Any] = Field(max_length=100)


class ClientPageDataRead(BaseModel):
    page_key: ClientPageKey
    data: dict[str, Any]
