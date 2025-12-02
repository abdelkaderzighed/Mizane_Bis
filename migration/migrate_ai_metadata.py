#!/usr/bin/env python3
"""
Migration des métadonnées IA de harvester.db vers la table
public.document_ai_metadata de MizaneDb.

Usage :
    MIZANEDB_URL=postgres://... python migration/migrate_ai_metadata.py
"""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

import psycopg2
from psycopg2.extras import Json, execute_batch
from dotenv import load_dotenv
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
SQLITE_PATH = ROOT / "BB" / "harvester.db"

# Charger un éventuel .env local pour récupérer DATABASE_URL/MIZANEDB_URL
load_dotenv(ROOT / "BB" / "backend" / ".env")

PG_DSN = (
    os.getenv("MIZANEDB_URL")
    or os.getenv("DATABASE_URL")
    or "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"
)


def parse_json(value: Any) -> Optional[Any]:
    if value is None:
        return None
    if isinstance(value, (dict, list)):
        return value
    raw = str(value).strip()
    if not raw:
        return None
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        return None


def parse_keywords(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    parsed = parse_json(value)
    if isinstance(parsed, list):
        return [str(item).strip() for item in parsed if str(item).strip()]
    if isinstance(parsed, dict):
        # Exemple { "fr": ["mot"], "ar": [...] }
        items = parsed.get("fr") or parsed.get("ar") or parsed.get("en") or []
        if isinstance(items, list):
            return [str(item).strip() for item in items if str(item).strip()]
    tokens = str(value).replace(";", ",").split(",")
    return [token.strip() for token in tokens if token.strip()]


def pick_language(value: Optional[str]) -> str:
    if not value:
        return "fr"
    value = value.strip().lower()
    if value in {"fr", "fr-fr", "french"}:
        return "fr"
    if value in {"ar", "ar-ar", "arabic"}:
        return "ar"
    return "fr"


def extract_dates(metadata: Dict[str, Any]) -> Optional[Any]:
    for key in ("dates_extracted", "dates", "timeline", "procedural_dates", "events"):
        if key in metadata and metadata[key]:
            return metadata[key]
    return None


def normalize_entities(value: Any) -> Optional[Any]:
    if value is None:
        return None
    if isinstance(value, (list, dict)):
        return value
    parsed = parse_json(value)
    if parsed is not None:
        return parsed
    lines = [line.strip() for line in str(value).splitlines() if line.strip()]
    if not lines:
        return None
    return lines


def normalize_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    formats = ("%Y-%m-%d", "%d-%m-%Y", "%d/%m/%Y", "%Y/%m/%d")
    for fmt in formats:
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def load_joradp_entries(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            d.id AS document_id,
            d.publication_date AS doc_publication_date,
            dm.title AS metadata_title,
            dm.publication_date AS metadata_publication_date,
            dm.language AS metadata_language,
            dm.description AS metadata_description,
            dm.page_count AS metadata_page_count,
            ai.summary,
            ai.keywords,
            ai.named_entities,
            ai.additional_metadata,
            ai.created_at,
            ai.updated_at
        FROM documents d
        JOIN document_ai_analysis ai ON ai.document_id = d.id
        LEFT JOIN document_metadata dm ON dm.document_id = d.id
        """
    )

    for row in cursor.fetchall():
        analysis_meta = parse_json(row["additional_metadata"]) or {}
        title = row["metadata_title"] or analysis_meta.get("title") or analysis_meta.get("document_title")
        publication_date = (
            normalize_date(row["doc_publication_date"])
            or normalize_date(row["metadata_publication_date"])
            or normalize_date(analysis_meta.get("document_date"))
            or normalize_date(analysis_meta.get("draft_date"))
        )
        summary = analysis_meta.get("summary") or row["summary"]
        if isinstance(summary, dict):
            summary = summary.get("fr") or summary.get("ar") or summary.get("en")

        keywords = parse_keywords(analysis_meta.get("keywords") or row["keywords"])
        entities = normalize_entities(analysis_meta.get("entities") or analysis_meta.get("named_entities") or row["named_entities"])
        dates_extracted = extract_dates(analysis_meta)

        extra_metadata = {
            "analysis": analysis_meta or None,
            "metadata_description": row["metadata_description"],
            "metadata_page_count": row["metadata_page_count"],
        }
        # Nettoyer les clés vides
        extra_metadata = {k: v for k, v in extra_metadata.items() if v not in (None, "", [])}

        entries.append(
            {
                "document_id": row["document_id"],
                "corpus": "joradp",
                "language": pick_language(row["metadata_language"] or analysis_meta.get("language")),
                "title": title,
                "publication_date": publication_date,
                "summary": summary,
                "keywords": keywords or None,
                "entities": entities,
                "dates_extracted": dates_extracted,
                "extra_metadata": extra_metadata or None,
            }
        )

    return entries


def load_cour_supreme_entries(conn: sqlite3.Connection) -> List[Dict[str, Any]]:
    entries: List[Dict[str, Any]] = []
    cursor = conn.cursor()
    cursor.execute(
        """
        SELECT
            id,
            decision_number,
            decision_date,
            title_fr,
            title_ar,
            summary_fr,
            summary_ar,
            keywords_fr,
            keywords_ar,
            entities_fr,
            entities_ar,
            object_fr,
            object_ar,
            parties_fr,
            parties_ar,
            legal_reference_fr,
            legal_reference_ar
        FROM supreme_court_decisions
        """
    )

    for row in cursor.fetchall():
        for lang in ("fr", "ar"):
            summary = row[f"summary_{lang}"]
            keywords = parse_keywords(row[f"keywords_{lang}"])
            entities = normalize_entities(row[f"entities_{lang}"])
            title = row[f"title_{lang}"] or row[f"object_{lang}"]

            if not any([summary, keywords, entities, title]):
                continue

            extra_metadata = {
                "decision_number": row["decision_number"],
                "object": row[f"object_{lang}"],
                "parties": row[f"parties_{lang}"],
                "legal_reference": row[f"legal_reference_{lang}"],
            }
            extra_metadata = {k: v for k, v in extra_metadata.items() if v}

            entries.append(
                {
                    "document_id": row["id"],
                    "corpus": "cour_supreme",
                    "language": lang,
                    "title": title,
                "publication_date": normalize_date(row["decision_date"]),
                    "summary": summary,
                    "keywords": keywords or None,
                    "entities": entities,
                    "dates_extracted": None,
                    "extra_metadata": extra_metadata or None,
                }
            )

    return entries


def upsert_entries(pg_conn, rows: List[Dict[str, Any]]) -> None:
    if not rows:
        return
    sql = """
        INSERT INTO document_ai_metadata (
            document_id, corpus, language, title, publication_date,
            summary, keywords, entities, dates_extracted, extra_metadata
        )
        VALUES (
            %(document_id)s, %(corpus)s, %(language)s, %(title)s, %(publication_date)s,
            %(summary)s, %(keywords)s, %(entities)s, %(dates_extracted)s, %(extra_metadata)s
        )
        ON CONFLICT (document_id, corpus, language) DO UPDATE
        SET
            title = EXCLUDED.title,
            publication_date = EXCLUDED.publication_date,
            summary = EXCLUDED.summary,
            keywords = EXCLUDED.keywords,
            entities = EXCLUDED.entities,
            dates_extracted = EXCLUDED.dates_extracted,
            extra_metadata = EXCLUDED.extra_metadata,
            updated_at = timezone('utc', now());
    """
    formatted = []
    for row in rows:
        formatted.append(
            {
                **row,
                "keywords": row["keywords"],
                "entities": Json(row["entities"]) if row["entities"] is not None else None,
                "dates_extracted": Json(row["dates_extracted"]) if row["dates_extracted"] is not None else None,
                "extra_metadata": Json(row["extra_metadata"]) if row["extra_metadata"] is not None else None,
            }
        )
    execute_batch(pg_conn.cursor(), sql, formatted, page_size=500)
    pg_conn.commit()


def main():
    if not SQLITE_PATH.exists():
        raise SystemExit(f"Base SQLite introuvable: {SQLITE_PATH}")

    if not PG_DSN:
        raise SystemExit("Définissez MIZANEDB_URL ou DATABASE_URL pour pointer vers MizaneDb.")

    sqlite_conn = sqlite3.connect(SQLITE_PATH)
    sqlite_conn.row_factory = sqlite3.Row
    pg_conn = psycopg2.connect(PG_DSN)

    try:
        print("📥 Extraction des métadonnées JORADP...")
        joradp_entries = load_joradp_entries(sqlite_conn)
        print(f"   → {len(joradp_entries)} lignes prêtes à être migrées")

        print("📥 Extraction des métadonnées Cour Suprême...")
        cour_sup_entries = load_cour_supreme_entries(sqlite_conn)
        print(f"   → {len(cour_sup_entries)} lignes prêtes à être migrées")

        print("🚀 Insertion/Update dans document_ai_metadata...")
        upsert_entries(pg_conn, joradp_entries + cour_sup_entries)
        print("✅ Migration terminée.")
    finally:
        sqlite_conn.close()
        pg_conn.close()


if __name__ == "__main__":
    main()
