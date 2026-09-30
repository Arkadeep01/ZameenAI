"""Structured API error envelope + exception handlers.

All errors surface as ``{"error": {...}}`` with code/status/detail and never
leak stack traces, DSNs, secrets, or absolute filesystem paths.
"""
from __future__ import annotations

import logging
import re
from typing import Any, Optional

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger("zameenai.api")

_SECRET_PATTERNS = [
    re.compile(r"postgresql(\+\w+)?://[^\s'\"]+", re.I),
    re.compile(r"Bearer\s+[A-Za-z0-9\-._~+/=]+"),
    re.compile(r"(api[_-]?key\s*[:=]\s*)['\"]?[^'\"\s,}]+", re.I),
    re.compile(r"[A-Za-z]:\\[^\s'\"]*"),
    re.compile(r"/home/[^\s'\"]*"),
]


def sanitize_detail(detail: Any) -> Any:
    if not isinstance(detail, str):
        return detail
    redacted = detail
    for pat in _SECRET_PATTERNS:
        redacted = pat.sub("[redacted]", redacted)
    return redacted


def error_body(*, code: str, message: str, status_code: int,
               details: Optional[Any] = None,
               request_id: Optional[str] = None) -> dict[str, Any]:
    body: dict[str, Any] = {
        "error": {"code": code, "message": sanitize_detail(message), "status": status_code}
    }
    if details is not None:
        body["error"]["details"] = details
    if request_id:
        body["error"]["request_id"] = request_id
    return body


def register_error_handlers(app: FastAPI) -> None:
    @app.exception_handler(StarletteHTTPException)
    async def _http_exc(request: Request, exc: StarletteHTTPException) -> JSONResponse:
        detail = exc.detail
        code: str
        message: str
        if isinstance(detail, dict):
            code = str(detail.get("code", "HTTP_ERROR"))
            message = str(detail.get("message", code))
            rid = detail.get("request_id") or getattr(request.state, "request_id", None)
        else:
            rid = getattr(request.state, "request_id", None)
            if exc.status_code == 401:
                code = "AUTHENTICATION_REQUIRED"
            elif exc.status_code == 403:
                code = "PERMISSION_DENIED"
            elif exc.status_code == 404:
                code = "RESOURCE_NOT_FOUND"
            else:
                code = "FORBIDDEN" if exc.status_code == 403 else (
                    "UNAUTHORIZED" if exc.status_code == 401 else (
                        "NOT_FOUND" if exc.status_code == 404 else "HTTP_ERROR"))
            message = str(detail)
        # Canonical mapping: legacy envelopes -> canonical codes.
        if code == "UNAUTHORIZED":
            code = "AUTHENTICATION_REQUIRED"
        elif code == "FORBIDDEN":
            code = "PERMISSION_DENIED"
        elif code == "NOT_FOUND":
            code = "RESOURCE_NOT_FOUND"
        logger.warning("HTTP %s %s -> %s: %s", request.method, request.url.path,
                       exc.status_code, message)
        return JSONResponse(
            error_body(code=code, message=sanitize_detail(message),
                       status_code=exc.status_code, request_id=rid),
            status_code=exc.status_code)

    @app.exception_handler(RequestValidationError)
    async def _validation_exc(request: Request, exc: RequestValidationError) -> JSONResponse:
        logger.warning("Validation error %s %s: %s", request.method, request.url.path, exc.errors())
        return JSONResponse(
            error_body(code="INVALID_INPUT", message="Request validation failed",
                       status_code=422, details=exc.errors(),
                       request_id=getattr(request.state, "request_id", None)),
            status_code=422)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled error %s %s", request.method, request.url.path)
        return JSONResponse(
            error_body(code="INTERNAL_ERROR", message="Internal server error",
                       status_code=500,
                       request_id=getattr(request.state, "request_id", None)),
            status_code=500)
