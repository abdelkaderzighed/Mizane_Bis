#!/usr/bin/env python3
"""Reconcilie les statuts Download/Text des documents JORADP avec R2 (MizaneDb)."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.modules.joradp import routes as joradp_routes
from backend.shared.postgres import get_connection as get_pg_connection


def refresh_statuses(limit: int | None = None) -> tuple[int, int]:
    """Vérifie la présence réelle des fichiers R2 et ajuste les statuts Postgres."""
    processed = 0
    updated = 0

    with get_pg_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                file_path_r2,
                text_path_r2,
                download_status,
                text_extraction_status
            FROM joradp_documents
            ORDER BY id ASC
            """
        )
        rows = cur.fetchall()

        for row in rows:
            if limit is not None and processed >= limit:
                break
            processed += 1

            file_exists = bool(row['file_path_r2']) and joradp_routes._r2_exists(row['file_path_r2'])
            text_exists = bool(row['text_path_r2']) and joradp_routes._r2_exists(row['text_path_r2'])

            updates = []
            params = []

            if file_exists and row['download_status'] != 'success':
                updates.append("download_status = %s")
                params.append('success')
                updates.append("downloaded_at = COALESCE(downloaded_at, timezone('utc', now()))")
            elif not file_exists and row['download_status'] == 'success':
                updates.append("download_status = %s")
                params.append('failed')

            if text_exists and row['text_extraction_status'] != 'success':
                updates.append("text_extraction_status = %s")
                params.append('success')
                updates.append("text_extracted_at = COALESCE(text_extracted_at, timezone('utc', now()))")
            elif not text_exists and row['text_extraction_status'] == 'success':
                updates.append("text_extraction_status = %s")
                params.append('failed')

            if updates:
                updates.append("error_log = NULL")
                cur.execute(
                    f"UPDATE joradp_documents SET {', '.join(updates)} WHERE id = %s",
                    params + [row['id']],
                )
                updated += 1

        conn.commit()
    return processed, updated


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
