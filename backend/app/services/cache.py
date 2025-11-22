from __future__ import annotations

import json
import logging
from datetime import datetime
from decimal import Decimal
from functools import lru_cache
from typing import Any, Optional

import redis
from redis.exceptions import RedisError

from app.core.config import settings
from app.services.monitoring import record_cache_hit, record_cache_miss

logger = logging.getLogger(__name__)


@lru_cache()
def get_cache_client() -> redis.Redis:
    """Return a singleton Redis client configured via settings."""
    return redis.Redis.from_url(settings.REDIS_URL, decode_responses=True)


def _json_serializer(value: Any) -> Any:
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, datetime):
        return value.isoformat()
    if hasattr(value, "model_dump"):
        return value.model_dump()
    raise TypeError(f"Object of type {type(value)} is not JSON serializable")


def cache_get_json(key: str, scope: Optional[str] = None) -> Any:
    """Fetch and decode cached JSON payloads with optional metric tracking."""
    try:
        payload = get_cache_client().get(key)
    except RedisError as exc:
        logger.warning("Redis read failed for %s: %s", key, exc)
        return None

    if payload is None:
        if scope:
            record_cache_miss(scope)
        return None

    if scope:
        record_cache_hit(scope)

    try:
        return json.loads(payload)
    except json.JSONDecodeError:
        logger.debug("Cache payload for %s is not valid JSON", key)
        return None


def cache_set_json(key: str, value: Any, ttl_seconds: int = 300) -> None:
    """Serialize and cache Python objects with a TTL."""
    try:
        encoded = json.dumps(value, default=_json_serializer)
        get_cache_client().setex(key, ttl_seconds, encoded)
    except (TypeError, RedisError) as exc:
        logger.warning("Redis write failed for %s: %s", key, exc)


def invalidate_pattern(pattern: str) -> None:
    """Delete every key that matches the supplied glob pattern."""
    try:
        client = get_cache_client()
        keys: list[str] = list(client.scan_iter(match=pattern))
        if keys:
            client.delete(*keys)
    except RedisError as exc:
        logger.warning("Redis invalidation failed for %s: %s", pattern, exc)


def build_cache_key(namespace: str, *parts: object) -> str:
    normalized = [str(part) if part is not None else "all" for part in parts]
    return f"{namespace}:" + ":".join(normalized)


def invalidate_dashboard_slice(client_id: Optional[int], vendor_id: Optional[int] = None) -> None:
    client_part = client_id if client_id is not None else "all"
    vendor_part = vendor_id if vendor_id is not None else "all"
    invalidate_pattern(f"dashboard:stats:{client_part}:{vendor_part}")


def invalidate_report_windows(
    client_id: Optional[int] = None,
    vendor_id: Optional[int] = None,
    employee_id: Optional[int] = None,
) -> None:
    patterns: list[str] = []
    if client_id:
        patterns.append(f"reports:client:{client_id}:*")
    if vendor_id:
        patterns.append(f"reports:vendor:{vendor_id}:*")
    if employee_id:
        patterns.append(f"reports:employee:{employee_id}:*")

    for pattern in patterns:
        invalidate_pattern(pattern)
