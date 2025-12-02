"""
Helper utilities to interact with MizaneDb (PostgreSQL) from the BB backend.

This module centralizes the psycopg2 connection pool so every blueprint
can reuse the same settings instead of opening SQLite connections.
"""

from __future__ import annotations

import os
from contextlib import contextmanager

import psycopg2
from psycopg2 import pool
from psycopg2.extras import RealDictCursor


DEFAULT_DSN = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

_POOL: pool.SimpleConnectionPool | None = None


def _get_dsn() -> str:
    return os.getenv("MIZANEDB_URL") or os.getenv("DATABASE_URL") or DEFAULT_DSN


def get_pool(minconn: int = 1, maxconn: int = 5) -> pool.SimpleConnectionPool:
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
                ...
    """
    pool = get_pool()
    conn = pool.getconn()
    try:
        yield conn
    finally:
        pool.putconn(conn)


def close_pool():
    global _POOL
    if _POOL is not None:
        _POOL.closeall()
        _POOL = None
