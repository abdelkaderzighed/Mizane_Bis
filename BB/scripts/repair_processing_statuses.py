#!/usr/bin/env python3
"""Vérifie et répare les statuts de téléchargement, extraction et embedding (Postgres)."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
sys.path.insert(0, str(ROOT / "backend"))

from backend.modules.joradp import routes as joradp_routes
from backend.shared.postgres import get_connection as get_pg_connection


def _normalize_status(status: str | None) -> str:
    if status is None:
        return "pending"
    return str(status).strip().lower()


def _has_embedding(cursor, document_id: int) -> bool:
    cursor.execute(
        """
        SELECT extra_metadata
        FROM document_ai_metadata
        WHERE document_id = %s
          AND corpus = 'joradp'
        ORDER BY updated_at DESC
        LIMIT 1
        """,
        (document_id,),
    )
    row = cursor.fetchone()
    if not row or not row.get('extra_metadata'):
        return False
    extra = row['extra_metadata']
    if isinstance(extra, str):
        try:
            extra = json.loads(extra)
        except json.JSONDecodeError:
            return False
    embedding = extra.get('embedding') if isinstance(extra, dict) else None
    if isinstance(embedding, dict):
        vector = embedding.get('vector')
        if isinstance(vector, list) and vector:
            return True
    return False


def repair_statuses(limit: int | None = None, apply: bool = False, verbose: bool = False) -> tuple[int, int, int]:
    processed = 0
    candidates = 0
    applied = 0

    with get_pg_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                file_path_r2,
                text_path_r2,
                download_status,
                text_extraction_status,
                embedding_status
            FROM joradp_documents
            ORDER BY id ASC
            """
        )
        rows = cur.fetchall()

        for row in rows:
            if limit is not None and processed >= limit:
                break
            processed += 1

            document_id = row['id']
            joradp_routes._r2_exists.cache_clear()
            file_exists = bool(row['file_path_r2']) and joradp_routes._r2_exists(row['file_path_r2'])
            text_exists = bool(row['text_path_r2']) and joradp_routes._r2_exists(row['text_path_r2'])
            embedding_exists = _has_embedding(cur, document_id)

            updates = []
            download_status = _normalize_status(row['download_status'])
            text_status = _normalize_status(row['text_extraction_status'])
            embedding_status = _normalize_status(row['embedding_status'])

            if file_exists and download_status != 'success':
                updates.append("download_status = 'success'")
            if text_exists and text_status != 'success':
                updates.append("text_extraction_status = 'success'")
            if embedding_exists and embedding_status != 'success':
                updates.append("embedding_status = 'success'")

            if updates:
                candidates += 1
                if verbose:
                    print(f"Document {document_id}: corrections -> {', '.join(updates)}")
                if apply:
                    cur.execute(
                        f"UPDATE joradp_documents SET {', '.join(updates)}, error_log = NULL WHERE id = %s",
                        (document_id,),
                    )
                    applied += 1
        if apply:
            conn.commit()

    return processed, candidates, applied


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Vérifie les ressources existantes et met à jour les statuts."
    )
    parser.add_argument(
        "--limit",
        type=int,
        help="Limiter le nombre de documents inspectés.",
    )
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Applique les mises à jour en base (sinon mode lecture seule).",
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Afficher les documents corrigés.",
    )

    args = parser.parse_args()
    processed, candidates, applied = repair_statuses(args.limit, args.apply, args.verbose)

    summary = f"✅ {processed} documents inspectés"
    if candidates:
        summary += f", {candidates} documents corrigeables."
        summary += " Modifications appliquées." if args.apply else " Mode simulation (aucune écriture)."
    else:
        summary += ", aucun document à corriger."
    if args.apply and applied:
        summary += f" {applied} lignes mises à jour."
    print(summary)


if __name__ == "__main__":
    main()
