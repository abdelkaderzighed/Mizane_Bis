"""
Helper utilities to interact with MizaneDb (PostgreSQL).

This module centralizes the psycopg2 connection pool so every module
(AA and BB) can reuse the same settings.

Unified version combining AA and BB implementations with connection pooling.
"""

from __future__ import annotations

import os
from contextlib import contextmanager
from typing import Optional

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor


class PostgresConfigurationError(RuntimeError):
    """Raised when PostgreSQL configuration is missing or invalid."""


_POOL: Optional[pool.SimpleConnectionPool] = None


def _get_dsn() -> str:
    """
    Get the PostgreSQL DSN from environment variables.
    Tries multiple variable names for compatibility:
    - MIZANEDB_URL (preferred)
    - MIZANE_DB_URL (AA legacy)
    - DATABASE_URL (generic)
    """
    dsn = (
        os.getenv("MIZANEDB_URL")
        or os.getenv("MIZANE_DB_URL")
        or os.getenv("DATABASE_URL")
    )
    if not dsn:
        raise PostgresConfigurationError(
            "Missing PostgreSQL configuration. Set MIZANEDB_URL, MIZANE_DB_URL, or DATABASE_URL."
        )
    return dsn


def get_pool(minconn: int = 1, maxconn: int = 10) -> pool.SimpleConnectionPool:
    """
    Get or create the global connection pool.
    The pool is lazily initialized on first access.
    """
    global _POOL
    if _POOL is None:
        _POOL = psycopg2.pool.SimpleConnectionPool(
            minconn,
            maxconn,
            dsn=_get_dsn(),
            cursor_factory=RealDictCursor,
        )
    return _POOL


@contextmanager
def get_connection():
    """
    Context manager returning a psycopg2 connection from the shared pool.

    Usage:
        with get_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT * FROM table")
                results = cur.fetchall()
            conn.commit()  # if needed

    The connection is automatically returned to the pool after use.
    """
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)


def get_connection_simple():
    """
    Get a simple connection (not from pool) for cases where you need
    to manage the connection lifecycle manually.

    Usage:
        conn = get_connection_simple()
        try:
            cur = conn.cursor()
            cur.execute("SELECT * FROM table")
            results = cur.fetchall()
        finally:
            conn.close()

    Note: Prefer using get_connection() context manager when possible.
    """
    dsn = _get_dsn()
    return psycopg2.connect(dsn, cursor_factory=RealDictCursor)


def close_pool():
    """
    Close all connections in the pool and reset it.
    Useful for cleanup during application shutdown.
    """
    global _POOL
    if _POOL is not None:
        _POOL.closeall()
        _POOL = None
