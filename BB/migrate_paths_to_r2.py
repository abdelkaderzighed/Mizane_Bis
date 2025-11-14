#!/usr/bin/env python3
"""
Utility script to convert legacy local paths stored in harvester.db to the
new Cloudflare R2 URLs.

Usage:
    HARVESTER_R2_BASE_URL=https://... python migrate_paths_to_r2.py
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB_PATH = Path("harvester.db")
BASE_URL = os.getenv("HARVESTER_R2_BASE_URL", "").rstrip("/")


def build_r2_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    raw = str(raw_path).strip()
    if not raw:
        return None
    if raw.startswith("http://") or raw.startswith("https://"):
        return raw
    normalized = raw.replace("\\", "/").lstrip("/")
    if normalized.startswith("downloads/"):
        normalized = normalized[len("downloads/") :]
    if not BASE_URL:
        raise RuntimeError(
            "HARVESTER_R2_BASE_URL is required to build the new URLs."
        )
    return f"{BASE_URL}/{normalized}"


def migrate():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database file not found: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, file_path, text_path
        FROM documents
        WHERE file_path LIKE 'downloads/%'
           OR text_path LIKE 'downloads/%'
        """
    )
    rows = cursor.fetchall()
    total = len(rows)
    print(f"🔄 Mise à jour de {total} documents vers R2...")

    updated = 0
    for row in rows:
        new_file = build_r2_url(row["file_path"])
        new_text = build_r2_url(row["text_path"])
        cursor.execute(
            """
            UPDATE documents
            SET file_path = ?, text_path = ?
            WHERE id = ?
            """,
            (new_file, new_text, row["id"]),
        )
        updated += 1

        if updated % 500 == 0:
            conn.commit()
            print(f"   ✓ {updated}/{total} lignes converties")

    conn.commit()
    conn.close()
    print(f"✅ Conversion terminée ({updated} lignes).")


if __name__ == "__main__":
    if not BASE_URL:
        raise SystemExit(
            "HARVESTER_R2_BASE_URL must be set to run this migration."
        )
    migrate()
