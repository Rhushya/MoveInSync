from __future__ import annotations

from contextlib import contextmanager
from time import perf_counter

from prometheus_client import Counter, Histogram

CACHE_HITS = Counter(
    "moveinsync_cache_hits_total",
    "Number of cache hits grouped by logical scope",
    labelnames=("scope",),
)
CACHE_MISSES = Counter(
    "moveinsync_cache_misses_total",
    "Number of cache misses grouped by logical scope",
    labelnames=("scope",),
)
REPORT_LATENCY = Histogram(
    "moveinsync_report_latency_seconds",
    "Latency for generating analytical reports",
    labelnames=("report_type",),
    buckets=(0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10),
)


def record_cache_hit(scope: str) -> None:
    CACHE_HITS.labels(scope=scope).inc()


def record_cache_miss(scope: str) -> None:
    CACHE_MISSES.labels(scope=scope).inc()


@contextmanager
def track_report_generation(report_type: str):
    start = perf_counter()
    try:
        yield
    finally:
        REPORT_LATENCY.labels(report_type=report_type).observe(perf_counter() - start)
