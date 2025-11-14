#!/usr/bin/env python3
"""Reconcilie les indicateurs `file_exists`/`text_exists` en base avec R2."""

from __future__ import annotations

import argparse
import sqlite3
from typing import Iterable

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.modules.joradp import routes as joradp_routes


def _iter_documents(conn: sqlite3.Connection) -> Iterable[sqlite3.Row]:
    cursor = conn.cursor()
    cursor.execute("""
        SELECT id, file_path, text_path, file_exists, text_exists
        FROM documents
    """)
    for row in cursor.fetchall():
        yield row


def refresh_statuses(limit: int | None = None) -> tuple[int, int]:
    conn = joradp_routes.get_db_connection()
    try:
        joradp_routes._ensure_documents_status_columns()
    finally:
        conn.close()

    conn = joradp_routes.get_db_connection()
    try:
        processed = 0
        updated = 0
        for row in _iter_documents(conn):
            if limit is not None and processed >= limit:
                break
            processed += 1

            current_file_exists = bool(row['file_exists'])
            current_text_exists = bool(row['text_exists'])

            joradp_routes._r2_exists.cache_clear()

            new_file_exists = bool(row['file_path']) and joradp_routes._r2_exists(row['file_path'])
            new_text_exists = bool(row['text_path']) and joradp_routes._r2_exists(row['text_path'])

            if new_file_exists != current_file_exists or new_text_exists != current_text_exists:
                joradp_routes._update_document_exists_flags(
                    row['id'],
                    file_exists=new_file_exists,
                    text_exists=new_text_exists,
                )
                updated += 1
        return processed, updated
    finally:
        conn.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Met à jour les indicateurs file/text exists.")
    parser.add_argument(
        "--limit",
        type=int,
        help="Limite le nombre de documents vérifiés (utile pour les gros jeux).",
    )
    args = parser.parse_args()

    processed, updated = refresh_statuses(args.limit)
    print(f"✅ {processed} documents analysés, {updated} statuts mis à jour.")


if __name__ == "__main__":
    main()
