#!/usr/bin/env python3
"""
Convert Cour Suprême file paths stored in harvester.db to Cloudflare R2 URLs.

Usage:
    HARVESTER_R2_BASE_URL=https://... python migrate_coursupreme_paths_to_r2.py
"""

from __future__ import annotations

import os
import sqlite3
from pathlib import Path

DB_PATH = Path("harvester.db")
BASE_URL = os.getenv("HARVESTER_R2_BASE_URL", "").rstrip("/")

MARKER = "Textes_juridiques_DZ"


def build_r2_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None

    raw = str(raw_path).strip()
    if not raw:
        return None

    if raw.startswith("http://") or raw.startswith("https://"):
        return raw

    normalized = raw.replace("\\", "/")
    idx = normalized.find(MARKER)
    if idx == -1:
        return None

    relative = normalized[idx:].lstrip("/")
    if not BASE_URL:
        raise RuntimeError("HARVESTER_R2_BASE_URL must be set for this migration.")
    return f"{BASE_URL}/{relative}"


def migrate():
    if not DB_PATH.exists():
        raise FileNotFoundError(f"Database file not found: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT id, file_path_ar, file_path_fr
        FROM supreme_court_decisions
        WHERE (file_path_ar IS NOT NULL AND file_path_ar LIKE '%' || ? || '%')
           OR (file_path_fr IS NOT NULL AND file_path_fr LIKE '%' || ? || '%')
        """,
        (MARKER, MARKER),
    )
    rows = cursor.fetchall()
    total = len(rows)
    print(f"🔄 Conversion de {total} décisions Cour Suprême...")

    updated = 0
    for row in rows:
        new_ar = build_r2_url(row["file_path_ar"])
        new_fr = build_r2_url(row["file_path_fr"])
        cursor.execute(
            """
            UPDATE supreme_court_decisions
            SET file_path_ar = ?, file_path_fr = ?
            WHERE id = ?
            """,
            (new_ar, new_fr, row["id"]),
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
        raise SystemExit("HARVESTER_R2_BASE_URL must be configured.")
    migrate()
