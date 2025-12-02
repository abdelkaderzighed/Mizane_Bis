"""
Backfill analyses and embeddings from the legacy SQLite harvester.db into MizaneDb + R2.

What it does:
- Cour Suprême: uploads embedding_ar/embedding_fr from SQLite to R2, updates
  supreme_court_decisions.embeddings_ar_r2 / embeddings_fr_r2,
  and marks analysis_*_r2 as present when AI metadata exists.
- JORADP: uploads document_embeddings.embedding to R2, updates
  joradp_documents.embeddings_r2 and embedding_status, and marks ai_analysis_r2 / ai_analysis_status
  when AI metadata exists.

This script is intended as a one-off migration to remove dependency on harvester.db.
"""

from __future__ import annotations

import os
import sys
import sqlite3
from typing import Dict, Tuple, Optional

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(SCRIPT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.append(BACKEND_ROOT)

from shared.postgres import get_connection
from shared.r2_storage import upload_bytes, get_base_url, normalize_key

# Paths: prefer the repo-level harvester.db (with data); fallback to backend/harvester.db
REPO_ROOT = os.path.abspath(os.path.join(BACKEND_ROOT, ".."))
SQLITE_CANDIDATES = [
    os.path.join(REPO_ROOT, "harvester.db"),
    os.path.join(BACKEND_ROOT, "harvester.db"),
]


def resolve_sqlite_path() -> str:
    for path in SQLITE_CANDIDATES:
        if os.path.exists(path):
            return path
    raise FileNotFoundError("Could not find harvester.db in expected locations.")

# R2 prefixes
CS_EMB_PREFIX = "Textes_juridiques_DZ/Cour_supreme/embeddings"
JOR_EMB_PREFIX = "Textes_juridiques_DZ/joradp.dz/embeddings"


def load_sqlite_connection() -> sqlite3.Connection:
    path = resolve_sqlite_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    return conn


def build_cs_pg_map(cur_pg) -> Dict[int, dict]:
    cur_pg.execute(
        """
        SELECT id, decision_number,
               file_path_ar_r2, file_path_fr_r2,
               analysis_ar_r2, analysis_fr_r2,
               embeddings_ar_r2, embeddings_fr_r2
        FROM supreme_court_decisions
        """
    )
    return {row["id"]: dict(row) for row in cur_pg.fetchall()}


def build_jp_pg_map(cur_pg) -> Dict[int, dict]:
    cur_pg.execute(
        """
        SELECT id, embeddings_r2, embedding_status, ai_analysis_r2, ai_analysis_status
        FROM joradp_documents
        """
    )
    return {row["id"]: dict(row) for row in cur_pg.fetchall()}


def upload_embedding(blob: bytes, key_prefix: str, identifier: str, lang: Optional[str] = None) -> str:
    suffix = f"_{lang}" if lang else ""
    key = f"{key_prefix}/{identifier}{suffix}.bin"
    return upload_bytes(key, blob, content_type="application/octet-stream")


def backfill_cour_supreme(sqlite_conn, pg_conn, batch_size: int = 200):
    cur_sql = sqlite_conn.cursor()
    cur_pg = pg_conn.cursor()

    # Map of pg rows
    pg_map = build_cs_pg_map(cur_pg)

    # AI metadata presence per decision (expecting 2 rows per id)
    cur_pg.execute(
        """
        SELECT document_id, COUNT(*) AS cnt
        FROM document_ai_metadata
        WHERE corpus = 'cour_supreme'
        GROUP BY document_id
        """
    )
    meta_present = {row["document_id"]: row["cnt"] for row in cur_pg.fetchall()}

    cur_sql.execute(
        """
        SELECT id, decision_number, embedding_ar, embedding_fr
        FROM supreme_court_decisions
        """
    )
    rows = cur_sql.fetchall()

    updates = []
    uploaded = 0
    updated_rows = 0

    for idx, row in enumerate(rows, 1):
        sid = row["id"]
        number = row["decision_number"]
        pg_row = pg_map.get(sid)
        if not pg_row:
            continue

        set_analysis_ar = pg_row.get("analysis_ar_r2") is None and meta_present.get(sid, 0) >= 2
        set_analysis_fr = pg_row.get("analysis_fr_r2") is None and meta_present.get(sid, 0) >= 2

        emb_ar_url = pg_row.get("embeddings_ar_r2")
        emb_fr_url = pg_row.get("embeddings_fr_r2")

        if not emb_ar_url and row["embedding_ar"]:
            emb_ar_url = upload_embedding(row["embedding_ar"], CS_EMB_PREFIX, number, "AR")
            uploaded += 1
        if not emb_fr_url and row["embedding_fr"]:
            emb_fr_url = upload_embedding(row["embedding_fr"], CS_EMB_PREFIX, number, "FR")
            uploaded += 1

        if set_analysis_ar or set_analysis_fr or emb_ar_url or emb_fr_url:
            updates.append(
                (
                    emb_ar_url,
                    emb_fr_url,
                    "present" if set_analysis_ar else pg_row.get("analysis_ar_r2"),
                    "present" if set_analysis_fr else pg_row.get("analysis_fr_r2"),
                    sid,
                )
            )

        if len(updates) >= batch_size:
            cur_pg.executemany(
                """
                UPDATE supreme_court_decisions
                SET embeddings_ar_r2 = COALESCE(%s, embeddings_ar_r2),
                    embeddings_fr_r2 = COALESCE(%s, embeddings_fr_r2),
                    analysis_ar_r2   = COALESCE(%s, analysis_ar_r2),
                    analysis_fr_r2   = COALESCE(%s, analysis_fr_r2)
                WHERE id = %s
                """,
                updates,
            )
            updated_rows += len(updates)
            pg_conn.commit()
            updates.clear()
            if idx % (batch_size * 2) == 0:
                print(f"[CS] Progress {idx}/{len(rows)} uploaded={uploaded} updated={updated_rows}")

    if updates:
        cur_pg.executemany(
            """
            UPDATE supreme_court_decisions
            SET embeddings_ar_r2 = COALESCE(%s, embeddings_ar_r2),
                embeddings_fr_r2 = COALESCE(%s, embeddings_fr_r2),
                analysis_ar_r2   = COALESCE(%s, analysis_ar_r2),
                analysis_fr_r2   = COALESCE(%s, analysis_fr_r2)
            WHERE id = %s
            """,
            updates,
        )
        updated_rows += len(updates)
        pg_conn.commit()

    return {"cs_uploaded": uploaded, "cs_updated": updated_rows}


def backfill_joradp(sqlite_conn, pg_conn, batch_size: int = 500):
    cur_sql = sqlite_conn.cursor()
    cur_pg = pg_conn.cursor()

    pg_map = build_jp_pg_map(cur_pg)
    missing_ids = {doc_id for doc_id, row in pg_map.items() if row.get("embeddings_r2") is None}

    # AI metadata presence per doc
    cur_pg.execute(
        """
        SELECT document_id, COUNT(*) AS cnt
        FROM document_ai_metadata
        WHERE corpus = 'joradp'
        GROUP BY document_id
        """
    )
    meta_present = {row["document_id"]: row["cnt"] for row in cur_pg.fetchall()}

    if not missing_ids:
        return {"jor_uploaded": 0, "jor_updated": 0}

    placeholders = ",".join("?" * len(missing_ids))
    cur_sql.execute(
        f"""
        SELECT e.document_id, e.embedding, e.model_name
        FROM document_embeddings e
        WHERE e.document_id IN ({placeholders})
        """,
        tuple(missing_ids),
    )
    rows = cur_sql.fetchall()

    updates = []
    uploaded = 0
    updated_rows = 0
    for idx, row in enumerate(rows, 1):
        doc_id = row["document_id"]
        pg_row = pg_map.get(doc_id)
        if not pg_row:
            continue

        emb_url = pg_row.get("embeddings_r2")
        if not emb_url and row["embedding"]:
            emb_url = upload_embedding(row["embedding"], JOR_EMB_PREFIX, str(doc_id))
            uploaded += 1

        set_analysis = pg_row.get("ai_analysis_r2") is None and meta_present.get(doc_id, 0) >= 1

        updates.append(
            (
                emb_url,
                "success" if emb_url else pg_row.get("embedding_status"),
                "present" if set_analysis else pg_row.get("ai_analysis_r2"),
                "success" if set_analysis else pg_row.get("ai_analysis_status"),
                doc_id,
            )
        )

        if len(updates) >= batch_size:
            cur_pg.executemany(
                """
                UPDATE joradp_documents
                SET embeddings_r2      = COALESCE(%s, embeddings_r2),
                    embedding_status   = COALESCE(%s, embedding_status),
                    ai_analysis_r2     = COALESCE(%s, ai_analysis_r2),
                    ai_analysis_status = COALESCE(%s, ai_analysis_status)
                WHERE id = %s
                """,
                updates,
            )
            updated_rows += len(updates)
            pg_conn.commit()
            updates.clear()
            if idx % (batch_size * 2) == 0:
                print(f"[JOR] Progress {idx}/{len(rows)} uploaded={uploaded} updated={updated_rows}")

    if updates:
        cur_pg.executemany(
            """
            UPDATE joradp_documents
            SET embeddings_r2      = COALESCE(%s, embeddings_r2),
                embedding_status   = COALESCE(%s, embedding_status),
                ai_analysis_r2     = COALESCE(%s, ai_analysis_r2),
                ai_analysis_status = COALESCE(%s, ai_analysis_status)
            WHERE id = %s
            """,
            updates,
        )
        updated_rows += len(updates)
        pg_conn.commit()

    return {"jor_uploaded": uploaded, "jor_updated": updated_rows}


def main():
    print("Starting backfill using R2 base:", get_base_url())
    sqlite_conn = load_sqlite_connection()
    print("Using SQLite:", resolve_sqlite_path())
    with get_connection() as pg_conn:
        stats_cs = backfill_cour_supreme(sqlite_conn, pg_conn)
        stats_jor = backfill_joradp(sqlite_conn, pg_conn)
        pg_conn.commit()
    print("Done.")
    print(stats_cs | stats_jor)


if __name__ == "__main__":
    main()
