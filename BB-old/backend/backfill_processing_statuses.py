#!/usr/bin/env python3
"""
Backfill processing statuses for documents based on files present on disk.

- Vérifie l'existence des PDF et textes extraits pour positionner les statuts 1-3.
- Réinitialise les statuts d'analyse IA et d'embedding à 'pending'.
- Fournit un résumé des actions réalisées.
"""

import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional
import requests

import sys
sys.path.append(str(Path(__file__).resolve().parent))
from shared.r2_storage import generate_presigned_url, build_public_url

DB_PATH = Path(__file__).resolve().with_name("harvester.db")


def build_r2_url(raw_path: Optional[str]) -> Optional[str]:
    if not raw_path:
        return None
    return generate_presigned_url(raw_path) or build_public_url(raw_path)


def r2_exists(raw_path: Optional[str]) -> bool:
    url = build_r2_url(raw_path)
    if not url:
        return False
    try:
        resp = requests.head(url, timeout=10)
        if resp.status_code == 403:
            probe = requests.get(url, stream=True, timeout=10)
            exists = probe.status_code == 200
            probe.close()
            return exists
        return resp.status_code == 200
    except Exception:
        return False


def current_timestamp() -> str:
    """Retourne un timestamp au format SQLite."""
    return datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")


def main() -> None:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute(
        """
        SELECT
            id, url, file_path, text_path,
            metadata_collection_status, download_status, text_extraction_status,
            ai_analysis_status, embedding_status,
            downloaded_at, text_extracted_at, analyzed_at, embedded_at,
            error_log
        FROM documents
        """
    )

    documents = cursor.fetchall()

    stats = {
        "total": len(documents),
        "pdf_success": 0,
        "pdf_missing": 0,
        "text_success": 0,
        "text_missing": 0,
        "updated": 0,
    }
    missing_pdfs: list[int] = []
    missing_texts: list[int] = []

    for row in documents:
        doc_id = row["id"]
        file_path = row["file_path"]
        text_path = row["text_path"]

        pdf_exists = r2_exists(file_path)
        if pdf_exists:
            stats["pdf_success"] += 1
        else:
            stats["pdf_missing"] += 1
            missing_pdfs.append(doc_id)

        text_exists = r2_exists(text_path)
        if text_exists:
            stats["text_success"] += 1
        else:
            stats["text_missing"] += 1
            if pdf_exists:
                missing_texts.append(doc_id)

        updates: list[str] = []
        params: list[object] = []

        # Phase 1: collecte -> succès dès que document présent en base.
        if row["metadata_collection_status"] != "success":
            updates.append("metadata_collection_status = ?")
            params.append("success")

        # Phase 2: téléchargement (PDF)
        desired_download_status = "success" if pdf_exists else "pending"
        if row["download_status"] != desired_download_status:
            updates.append("download_status = ?")
            params.append(desired_download_status)
            if desired_download_status == "success":
                updates.append("downloaded_at = ?")
                params.append(current_timestamp())
            else:
                updates.append("downloaded_at = NULL")
        else:
            if desired_download_status != "success" and row["downloaded_at"] is not None:
                updates.append("downloaded_at = NULL")

        # Phase 3: extraction texte
        desired_text_status = "success" if text_exists else "pending"
        if row["text_extraction_status"] != desired_text_status:
            updates.append("text_extraction_status = ?")
            params.append(desired_text_status)
            if desired_text_status == "success":
                updates.append("text_extracted_at = ?")
                params.append(current_timestamp())
            else:
                updates.append("text_extracted_at = NULL")
        else:
            if desired_text_status != "success" and row["text_extracted_at"] is not None:
                updates.append("text_extracted_at = NULL")

        # Phases 4 & 5: remettre à pending pour relancer proprement.
        if row["ai_analysis_status"] != "pending":
            updates.append("ai_analysis_status = ?")
            params.append("pending")
        if row["analyzed_at"] is not None:
            updates.append("analyzed_at = NULL")

        if row["embedding_status"] != "pending":
            updates.append("embedding_status = ?")
            params.append("pending")
        if row["embedded_at"] is not None:
            updates.append("embedded_at = NULL")

        # Nettoyer les erreurs si tout est OK sur les phases 1-3.
        if row["error_log"] and pdf_exists and text_exists:
            updates.append("error_log = NULL")

        if updates:
            sql = f"UPDATE documents SET {', '.join(updates)} WHERE id = ?"
            params.append(doc_id)
            cursor.execute(sql, params)
            stats["updated"] += 1

    conn.commit()
    conn.close()

    print("=== Backfill statuses summary ===")
    print(f"Documents traités : {stats['total']}")
    print(f" - PDFs présents   : {stats['pdf_success']}")
    print(f" - PDFs manquants  : {stats['pdf_missing']}")
    print(f" - Textes présents : {stats['text_success']}")
    print(f" - Textes manquants: {stats['text_missing']}")
    print(f"Mises à jour effectuées : {stats['updated']}")

    if missing_pdfs:
        print("PDF manquants (ids) :", ", ".join(map(str, missing_pdfs)))
    if missing_texts:
        print("Textes manquants pour PDFs présents (ids) :", ", ".join(map(str, missing_texts)))


if __name__ == "__main__":
    main()
