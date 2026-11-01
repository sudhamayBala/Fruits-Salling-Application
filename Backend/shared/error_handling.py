import logging
from uuid import uuid4

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.types import ASGIApp, Message, Receive, Scope, Send


logger = logging.getLogger("fruit_house.api")


class RequestIdMiddleware:
    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(
        self,
        scope: Scope,
        receive: Receive,
        send: Send,
    ) -> None:
        if scope["type"] != "http":
            await self.app(scope, receive, send)
            return

        request_id = str(uuid4())
        scope.setdefault("state", {})["request_id"] = request_id
        response_started = False

        async def send_with_request_id(message: Message) -> None:
            nonlocal response_started
            if message["type"] == "http.response.start":
                response_started = True
                headers = [
                    (name, value)
                    for name, value in message.get("headers", [])
                    if name.lower() != b"x-request-id"
                ]
                headers.append((b"x-request-id", request_id.encode("ascii")))
                message["headers"] = headers
            await send(message)

        try:
            await self.app(scope, receive, send_with_request_id)
        except Exception:
            if response_started:
                raise
            logger.exception(
                "Unhandled API error request_id=%s method=%s path=%s",
                request_id,
                scope.get("method", "UNKNOWN"),
                scope.get("path", ""),
            )
            response = JSONResponse(
                status_code=500,
                content={
                    "detail": "An unexpected error occurred.",
                    "request_id": request_id,
                },
            )
            await response(scope, receive, send_with_request_id)


def install_error_handling(app: FastAPI) -> None:
    app.add_middleware(RequestIdMiddleware)

    @app.exception_handler(StarletteHTTPException)
    async def handle_http_error(
        request: Request,
        exc: StarletteHTTPException,
    ) -> JSONResponse:
        request_id = request.state.request_id
        if exc.status_code >= 500:
            logger.error(
                "HTTP server error request_id=%s status=%s method=%s path=%s",
                request_id,
                exc.status_code,
                request.method,
                request.url.path,
            )
        return JSONResponse(
            status_code=exc.status_code,
            content={
                "detail": jsonable_encoder(exc.detail),
                "request_id": request_id,
            },
            headers=exc.headers,
        )

    @app.exception_handler(RequestValidationError)
    async def handle_validation_error(
        request: Request,
        exc: RequestValidationError,
    ) -> JSONResponse:
        errors = [
            {
                "loc": error["loc"],
                "msg": error["msg"],
                "type": error["type"],
            }
            for error in exc.errors()
        ]
        return JSONResponse(
            status_code=422,
            content={
                "detail": errors,
                "request_id": request.state.request_id,
            },
        )
