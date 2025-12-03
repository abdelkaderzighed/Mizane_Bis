from __future__ import annotations

import json
import os
import urllib.request
from calendar import monthrange
from contextlib import closing
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

import numpy as np
import psycopg2
import requests
from psycopg2.extras import RealDictCursor, register_default_json, register_default_jsonb
from flask import Blueprint, jsonify, request
from sentence_transformers import SentenceTransformer
from ..r2_storage import build_public_url, generate_presigned_url, get_r2_session

mizane_bp = Blueprint("mizane", __name__)

# Ensure JSON/JSONB fields are automatically converted to Python dict/list.
register_default_json(loads=json.loads, globally=True)
register_default_jsonb(loads=json.loads, globally=True)

DEFAULT_LIMIT = 20
_R2_SESSION = get_r2_session()
DB_DSN = os.getenv("MIZANE_DB_URL") or os.getenv("DATABASE_URL")
if not DB_DSN:
    raise RuntimeError("Configure MIZANE_DB_URL (ou DATABASE_URL) pour accéder à MizaneDb.")

VALID_SORT_FIELDS = {"date", "year", "number"}
VALID_SORT_ORDER = {"asc", "desc"}
_CS_EMBED_MODEL = None
_CS_EMBED_CACHE = None
_JORADP_EMBED_CACHE = None
_WARMED_UP = False
_WARM_LOCK = False
CACHE_DIR = os.getenv("EMBED_CACHE_DIR")


def _get_cache_file(corpus: str) -> Path | None:
    if not CACHE_DIR:
        return None
    try:
        path = Path(CACHE_DIR).expanduser().resolve()
        path.mkdir(parents=True, exist_ok=True)
        return path / f"{corpus}_embed_cache_v1.json"
    except Exception:
        return None


def _load_cache_from_disk(corpus: str):
    cache_file = _get_cache_file(corpus)
    if not cache_file or not cache_file.exists():
        return None
    try:
        with cache_file.open("r", encoding="utf-8") as f:
            payload = json.load(f)
        items = []
        for raw in payload.get("items", []):
            vec = raw.get("vector")
            if vec is None:
                continue
            arr = np.array(vec, dtype=np.float32)
            if arr.size == 0:
                continue
            norm = np.linalg.norm(arr)
            if norm == 0:
                continue
            arr = arr / norm
            raw["vector"] = arr
            items.append(raw)
        return items
    except Exception:
        return None


def _persist_cache_to_disk(corpus: str, items: List[Dict[str, Any]]):
    cache_file = _get_cache_file(corpus)
    if not cache_file:
        return
    try:
        serializable: List[Dict[str, Any]] = []
        for row in items:
            vec = row.get("vector")
            if vec is None:
                continue
            serializable.append(
                {
                    **{k: v for k, v in row.items() if k != "vector"},
                    "vector": vec.tolist() if isinstance(vec, np.ndarray) else vec,
                }
            )
        tmp_path = cache_file.with_suffix(".tmp")
        with tmp_path.open("w", encoding="utf-8") as f:
            json.dump({"items": serializable, "created_at": datetime.utcnow().isoformat()}, f)
        tmp_path.replace(cache_file)
    except Exception:
        return


def get_connection():
    return psycopg2.connect(DB_DSN, cursor_factory=RealDictCursor)


def _split_keywords(param: str) -> list[str]:
    raw = (request.args.get(param) or "").strip()
    if not raw:
        return []
    return [token.strip() for token in raw.replace(";", ",").split(",") if token.strip()]


def _parse_date(value: str, is_end: bool = False) -> str | None:
    """
    Accepte formats JJ/MM/AAAA, AAAA-MM-JJ, AAAA.
    Retourne une date au format ISO (YYYY-MM-DD) ou None si invalide.
    """
    value = (value or "").strip()
    if not value:
        return None

    # Format jour/mois/année
    for fmt in ("%d/%m/%Y", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt).date().isoformat()
        except ValueError:
            continue

    # Année seule
    if value.isdigit() and len(value) == 4:
        year = int(value)
        month = 12 if is_end else 1
        day = monthrange(year, month)[1] if is_end else 1
        return f"{year:04d}-{month:02d}-{day:02d}"

    return None


def _serialize_date(value: Any) -> Any:
    if hasattr(value, "isoformat"):
        try:
            return value.isoformat()
        except Exception:
            return value
    return value


def _get_embedding_model():
    global _CS_EMBED_MODEL
    if _CS_EMBED_MODEL is None:
        _CS_EMBED_MODEL = SentenceTransformer("all-MiniLM-L6-v2")
    return _CS_EMBED_MODEL


def _build_embedding_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    signed = generate_presigned_url(raw_path)
    if signed:
        return signed
    return build_public_url(raw_path)


def _download_embedding(url: str) -> bytes | None:
    try:
        resp = _R2_SESSION.get(url, timeout=20)
        if resp.ok:
            return resp.content
    except Exception:
        return None
    return None


def _decode_embedding(blob: bytes | None) -> np.ndarray | None:
    if not blob:
        return None
    if isinstance(blob, memoryview):
        blob = blob.tobytes()
    try:
        vec = np.frombuffer(blob, dtype=np.float32)
        if vec.size == 0:
            return None
        norm = np.linalg.norm(vec)
        if norm == 0:
            return None
        return vec / norm
    except Exception:
        return None


def _build_filters(config: Dict[str, Any]) -> Tuple[List[str], List[Any]]:
    url_col = config["url"]
    date_col = config["date"]
    text_cols: List[str] = config.get("text_cols", [])
    where: List[str] = []
    params: List[Any] = []
    if request.args.get("year"):
        where.append(f"EXTRACT(YEAR FROM {date_col}) = %s")
        params.append(request.args["year"])
    if request.args.get("from"):
        parsed_from = _parse_date(request.args["from"])
        if parsed_from:
            where.append(f"{date_col} >= %s")
            params.append(parsed_from)
    if request.args.get("to"):
        parsed_to = _parse_date(request.args["to"], is_end=True)
        if parsed_to:
            where.append(f"{date_col} <= %s")
            params.append(parsed_to)
    search = (request.args.get("search") or "").strip()
    if search:
        like = f"%{search}%"
        targets = [url_col] + text_cols
        where.append("(" + " OR ".join(f"{col} ILIKE %s" for col in targets) + ")")
        params.extend([like] * len(targets))
    document_number = (request.args.get("document_number") or "").strip()
    if document_number:
        like = f"%{document_number}%"
        where.append(f"{url_col} ILIKE %s")
        params.append(like)

    keywords_and = _split_keywords("keywords_and")
    keywords_or = _split_keywords("keywords_or")
    keywords_not = _split_keywords("keywords_not")

    def _keywords_like(keyword: str) -> Tuple[str, List[str]]:
        like = f"%{keyword}%"
        if not text_cols:
            return f"{url_col} ILIKE %s", [like]
        clause = "(" + " OR ".join(f"{col} ILIKE %s" for col in text_cols) + ")"
        return clause, [like] * len(text_cols)

    for keyword in keywords_and:
        clause, values = _keywords_like(keyword)
        where.append(clause)
        params.extend(values)
    if keywords_or:
        or_clauses = []
        or_params: List[str] = []
        for keyword in keywords_or:
            clause, values = _keywords_like(keyword)
            or_clauses.append(clause)
            or_params.extend(values)
        where.append("(" + " OR ".join(or_clauses) + ")")
        params.extend(or_params)
    for keyword in keywords_not:
        like = f"%{keyword}%"
        if not text_cols:
            where.append(f"{url_col} NOT ILIKE %s")
            params.append(like)
            continue
        parts = [f"{col} NOT ILIKE %s" for col in text_cols]
        where.append("(" + " AND ".join(parts) + ")")
        params.extend([like] * len(text_cols))
    return where, params


def _load_cour_supreme_embeddings_cache():
    global _CS_EMBED_CACHE
    if _CS_EMBED_CACHE is not None:
        return _CS_EMBED_CACHE
    disk_cache = _load_cache_from_disk("cour_supreme")
    if disk_cache is not None:
        _CS_EMBED_CACHE = disk_cache
        return _CS_EMBED_CACHE
    _warm_cache_async()

    cache: List[Dict[str, Any]] = []
    with closing(get_connection()) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                id,
                decision_number,
                COALESCE(decision_date, created_at) AS publication_date,
                url,
                file_path_fr_r2,
                file_path_ar_r2,
                html_content_fr_r2,
                html_content_ar_r2,
                embeddings_fr_r2,
                embeddings_ar_r2
            FROM supreme_court_decisions
            WHERE embeddings_fr_r2 IS NOT NULL OR embeddings_ar_r2 IS NOT NULL
            """
        )
        rows = cur.fetchall()

    def worker(row: Dict[str, Any]):
        emb_url = _build_embedding_url(row.get("embeddings_fr_r2") or row.get("embeddings_ar_r2"))
        if not emb_url:
            return None
        blob = _download_embedding(emb_url)
        vec = _decode_embedding(blob)
        if vec is None:
            return None
        return {
            "id": row["id"],
            "decision_number": row.get("decision_number"),
            "publication_date": _serialize_date(row.get("publication_date")),
            "url": row.get("url"),
            "file_path_fr": row.get("file_path_fr_r2"),
            "file_path_ar": row.get("file_path_ar_r2"),
            "text_path_fr": row.get("html_content_fr_r2"),
            "text_path_ar": row.get("html_content_ar_r2"),
            "vector": vec,
        }

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = [executor.submit(worker, row) for row in rows]
        for fut in as_completed(futures):
            item = fut.result()
            if item:
                cache.append(item)

    _CS_EMBED_CACHE = cache
    _persist_cache_to_disk("cour_supreme", cache)
    return _CS_EMBED_CACHE


def _load_joradp_embeddings_cache():
    global _JORADP_EMBED_CACHE
    if _JORADP_EMBED_CACHE is not None:
        return _JORADP_EMBED_CACHE
    disk_cache = _load_cache_from_disk("joradp")
    if disk_cache is not None:
        _JORADP_EMBED_CACHE = disk_cache
        return _JORADP_EMBED_CACHE
    _warm_cache_async()

    cache: List[Dict[str, Any]] = []
    with closing(get_connection()) as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT
                d.id,
                COALESCE(d.publication_date, d.created_at) AS publication_date,
                d.url,
                d.file_path_r2 AS file_path,
                d.text_path_r2 AS text_path,
                d.embeddings_r2
            FROM joradp_documents d
            WHERE d.embeddings_r2 IS NOT NULL
            """
        )
        rows = cur.fetchall()

    def worker(row: Dict[str, Any]):
        emb_url = _build_embedding_url(row.get("embeddings_r2"))
        if not emb_url:
            return None
        blob = _download_embedding(emb_url)
        vec = _decode_embedding(blob)
        if vec is None:
            return None
        return {
            "id": row["id"],
            "publication_date": _serialize_date(row.get("publication_date")),
            "url": row.get("url"),
            "file_path": row.get("file_path"),
            "text_path": row.get("text_path"),
            "vector": vec,
        }

    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = [executor.submit(worker, row) for row in rows]
        for fut in as_completed(futures):
            item = fut.result()
            if item:
                cache.append(item)

    _JORADP_EMBED_CACHE = cache
    _persist_cache_to_disk("joradp", cache)
    return _JORADP_EMBED_CACHE


def _warm_cache_async():
    global _WARMED_UP, _WARM_LOCK
    if _WARMED_UP or _WARM_LOCK:
        return
    _WARM_LOCK = True

    def worker():
        try:
            _load_joradp_embeddings_cache()
            _load_cour_supreme_embeddings_cache()
        finally:
            _WARMED_UP = True
            _WARM_LOCK = False

    with ThreadPoolExecutor(max_workers=2) as executor:
        executor.submit(worker)


def _semantic_search_cour_supreme(query: str, limit: int = 50, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
    model = _get_embedding_model()
    if model is None:
        raise RuntimeError("Modèle d'embedding indisponible")

    cache = _load_cour_supreme_embeddings_cache()
    if not cache:
        return []

    q_vec = model.encode(query, convert_to_numpy=True)
    norm = np.linalg.norm(q_vec)
    if norm == 0:
        return []
    q_vec = q_vec / norm

    scored: List[Dict[str, Any]] = []
    for item in cache:
        score = float(np.dot(q_vec, item["vector"]))
        if score_threshold and score < score_threshold:
            continue
        entry = {
            "id": item["id"],
            "decision_number": item.get("decision_number"),
            "publication_date": _serialize_date(item.get("publication_date")),
            "url": item.get("url"),
            "file_path_fr": item.get("file_path_fr"),
            "file_path_ar": item.get("file_path_ar"),
            "text_path_fr": item.get("text_path_fr"),
            "text_path_ar": item.get("text_path_ar"),
            "score": score,
        }
        scored.append(entry)

    scored.sort(key=lambda x: x.get("score") or 0.0, reverse=True)
    if limit and limit > 0:
        scored = scored[:limit]

    labels = _fetch_classification_labels([item["id"] for item in scored])
    for row in scored:
        meta = labels.get(row["id"], {})
        if meta.get("chamber_name"):
            row["chamber_name"] = meta["chamber_name"]
        if meta.get("theme_name"):
            row["theme_name"] = meta["theme_name"]

        # URLs signées pour l'affichage front
        row["file_path"] = row.get("file_path_fr") or row.get("file_path_ar")
        row["text_path"] = row.get("text_path_fr") or row.get("text_path_ar")
        row["file_path_signed"] = generate_presigned_url(row.get("file_path"))
        row["file_path_fr_signed"] = generate_presigned_url(row.get("file_path_fr"))
        row["file_path_ar_signed"] = generate_presigned_url(row.get("file_path_ar"))
        row["text_path_signed"] = generate_presigned_url(row.get("text_path"))
        row["text_path_fr_signed"] = generate_presigned_url(row.get("text_path_fr"))
        row["text_path_ar_signed"] = generate_presigned_url(row.get("text_path_ar"))
    return scored


def _semantic_search_joradp(query: str, limit: int = 50, score_threshold: float = 0.0) -> List[Dict[str, Any]]:
    model = _get_embedding_model()
    if model is None:
        raise RuntimeError("Modèle d'embedding indisponible")

    cache = _load_joradp_embeddings_cache()
    if not cache:
        return []

    q_vec = model.encode(query, convert_to_numpy=True)
    norm = np.linalg.norm(q_vec)
    if norm == 0:
        return []
    q_vec = q_vec / norm

    scored: List[Dict[str, Any]] = []
    for item in cache:
        score = float(np.dot(q_vec, item["vector"]))
        if score_threshold and score < score_threshold:
            continue
        row = {
            "id": item["id"],
            "publication_date": _serialize_date(item.get("publication_date")),
            "url": item.get("url"),
            "file_path": item.get("file_path"),
            "text_path": item.get("text_path"),
            "score": score,
        }
        scored.append(row)

    scored.sort(key=lambda x: x.get("score") or 0.0, reverse=True)
    if limit and limit > 0:
        scored = scored[:limit]

    # URLs signées pour le front
    for row in scored:
        row["file_path_signed"] = generate_presigned_url(row.get("file_path"))
        row["text_path_signed"] = generate_presigned_url(row.get("text_path"))
    return scored


def _fetch_classification_labels(decision_ids: List[int]) -> Dict[int, Dict[str, str]]:
    if not decision_ids:
        return {}
    labels: Dict[int, Dict[str, str]] = {}
    placeholders = ",".join(["%s"] * len(decision_ids))
    with closing(get_connection()) as conn, conn.cursor() as cur:
        cur.execute(
            f"""
            SELECT dc.decision_id,
                   string_agg(DISTINCT c.name_fr, ', ' ORDER BY c.name_fr) AS chamber_name
            FROM supreme_court_decision_classifications dc
            JOIN supreme_court_chambers c ON c.id = dc.chamber_id
            WHERE dc.decision_id IN ({placeholders})
              AND c.name_fr <> 'Décisions classées par thèmes'
            GROUP BY dc.decision_id
            """,
            decision_ids,
        )
        for row in cur.fetchall():
            labels.setdefault(row["decision_id"], {})["chamber_name"] = row["chamber_name"]

        cur.execute(
            f"""
            SELECT dc.decision_id,
                   string_agg(DISTINCT t.name_fr, ', ' ORDER BY t.name_fr) AS theme_name
            FROM supreme_court_decision_classifications dc
            JOIN supreme_court_themes t ON t.id = dc.theme_id
            WHERE dc.decision_id IN ({placeholders})
            GROUP BY dc.decision_id
            """,
            decision_ids,
        )
        for row in cur.fetchall():
            labels.setdefault(row["decision_id"], {})["theme_name"] = row["theme_name"]
    return labels


def _fetch_joradp_documents(limit: int, offset: int) -> Tuple[int, List[Dict[str, Any]]]:
    where, params = _build_filters(
        {
            "url": "d.url",
            "date": "COALESCE(d.publication_date, d.created_at)",
            "text_cols": [
                "COALESCE(ai.summary, '')",
                "COALESCE(array_to_string(ai.keywords, ','), '')",
            ],
        }
    )
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    sort_field = request.args.get("sort_field", "date")
    sort_order = request.args.get("sort_order", "desc").lower()
    if sort_field not in VALID_SORT_FIELDS:
        sort_field = "date"
    if sort_order not in VALID_SORT_ORDER:
        sort_order = "desc"
    sort_expr = {
        "date": "COALESCE(d.publication_date, d.created_at)",
        "year": "EXTRACT(YEAR FROM d.publication_date)",
        "number": "d.id",
    }[sort_field]
    order_clause = f"ORDER BY {sort_expr} {sort_order.upper()}"

    select_sql = f"""
        SELECT
            d.id,
            d.publication_date,
            d.url,
            d.file_path_r2 AS file_path,
            d.text_path_r2 AS text_path,
            d.metadata_collected_at,
            jsonb_strip_nulls(
                jsonb_build_object(
                    'title', COALESCE(ai.title, jm.title),
                    'publication_date', COALESCE(ai.publication_date, jm.publication_date),
                    'language', COALESCE(ai.language, jm.language),
                    'summary', ai.summary,
                    'keywords', ai.keywords,
                    'entities', ai.entities,
                    'dates', ai.dates_extracted,
                    'page_count', jm.page_count,
                    'description', jm.description
                )
            ) AS extra_metadata
        FROM joradp_documents d
        LEFT JOIN document_ai_metadata ai
            ON ai.document_id = d.id AND ai.corpus = 'joradp'
        LEFT JOIN joradp_metadata jm
            ON jm.document_id = d.id
        {where_clause}
        {order_clause}
        LIMIT %s OFFSET %s
    """
    count_sql = f"SELECT COUNT(*) AS total FROM joradp_documents d LEFT JOIN document_ai_metadata ai ON ai.document_id = d.id AND ai.corpus = 'joradp' {where_clause}"

    with closing(get_connection()) as conn, conn.cursor() as cur:
        cur.execute(count_sql, params)
        total = cur.fetchone()["total"]
        cur.execute(select_sql, [*params, limit, offset])
        rows = cur.fetchall()
    for row in rows:
        row["publication_date"] = _serialize_date(row.get("publication_date"))
        row["file_path_signed"] = generate_presigned_url(row.get("file_path"))
        row["text_path_signed"] = generate_presigned_url(row.get("text_path"))
    return total, rows


def _fetch_cour_supreme_documents(limit: int, offset: int) -> Tuple[int, List[Dict[str, Any]]]:
    where, params = _build_filters(
        {
            "url": "sc.url",
            "date": "COALESCE(sc.decision_date, sc.created_at)",
            "text_cols": [
                "COALESCE(ai_fr.summary, '')",
                "COALESCE(ai_ar.summary, '')",
                "COALESCE(array_to_string(ai_fr.keywords, ','), '')",
                "COALESCE(array_to_string(ai_ar.keywords, ','), '')",
            ],
        }
    )
    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    sort_field = request.args.get("sort_field", "date")
    sort_order = request.args.get("sort_order", "desc").lower()
    if sort_field not in VALID_SORT_FIELDS:
        sort_field = "date"
    if sort_order not in VALID_SORT_ORDER:
        sort_order = "desc"
    sort_expr = {
        "date": "COALESCE(sc.decision_date, sc.created_at)",
        "year": "EXTRACT(YEAR FROM sc.decision_date)",
        "number": "sc.decision_number",
    }[sort_field]
    order_clause = f"ORDER BY {sort_expr} {sort_order.upper()}"
    chamber_lookup = {}
    theme_lookup = {}
    try:
        with closing(get_connection()) as conn, conn.cursor() as cur:
            cur.execute("SELECT id, name_fr FROM supreme_court_chambers")
            chamber_lookup = {row["id"]: row["name_fr"] for row in cur.fetchall() if row["id"] != 1}
            cur.execute("SELECT id, name_fr FROM supreme_court_themes")
            theme_lookup = {row["id"]: row["name_fr"] for row in cur.fetchall()}
    except Exception:
        chamber_lookup = {}
        theme_lookup = {}

    select_sql = f"""
        SELECT
            sc.id,
            sc.decision_number,
            COALESCE(sc.decision_date, sc.created_at) AS publication_date,
            sc.url,
            sc.file_path_fr_r2 AS file_path,
            sc.file_path_fr_r2 AS file_path_fr,
            sc.file_path_ar_r2 AS file_path_ar,
            sc.html_content_fr_r2 AS text_path,
            sc.html_content_fr_r2 AS text_path_fr,
            sc.html_content_ar_r2 AS text_path_ar,
            sc.updated_at AS metadata_collected_at,
            jsonb_strip_nulls(
                jsonb_build_object(
                    'title_fr', COALESCE(ai_fr.title, sc.title_fr),
                    'title_ar', COALESCE(ai_ar.title, sc.title_ar),
                    'summary_fr', ai_fr.summary,
                    'summary_ar', ai_ar.summary,
                    'keywords_fr', ai_fr.keywords,
                    'keywords_ar', ai_ar.keywords,
                    'entities_fr', ai_fr.entities,
                    'entities_ar', ai_ar.entities,
                    'object_fr', sc.object_fr,
                    'object_ar', sc.object_ar,
                    'legal_reference_fr', sc.legal_reference_fr,
                    'legal_reference_ar', sc.legal_reference_ar,
                    'parties_fr', sc.parties_fr,
                    'parties_ar', sc.parties_ar
                )
            ) AS extra_metadata
        FROM supreme_court_decisions sc
        LEFT JOIN document_ai_metadata ai_fr
            ON ai_fr.document_id = sc.id AND ai_fr.corpus = 'cour_supreme' AND ai_fr.language = 'fr'
        LEFT JOIN document_ai_metadata ai_ar
            ON ai_ar.document_id = sc.id AND ai_ar.corpus = 'cour_supreme' AND ai_ar.language = 'ar'
        {where_clause}
        {order_clause}
        LIMIT %s OFFSET %s
    """
    count_sql = f"""
        SELECT COUNT(*) AS total
        FROM supreme_court_decisions sc
        LEFT JOIN document_ai_metadata ai_fr
            ON ai_fr.document_id = sc.id AND ai_fr.corpus = 'cour_supreme' AND ai_fr.language = 'fr'
        LEFT JOIN document_ai_metadata ai_ar
            ON ai_ar.document_id = sc.id AND ai_ar.corpus = 'cour_supreme' AND ai_ar.language = 'ar'
        {where_clause}
    """
    with closing(get_connection()) as conn, conn.cursor() as cur:
        cur.execute(count_sql, params)
        total = cur.fetchone()["total"]
        cur.execute(select_sql, [*params, limit, offset])
        rows = cur.fetchall()
        decision_ids = [row["id"] for row in rows]

        chamber_map: Dict[int, str] = {}
        theme_map: Dict[int, str] = {}
        if decision_ids:
            placeholders = ",".join(["%s"] * len(decision_ids))
            cur.execute(
                f"""
                SELECT dc.decision_id,
                       string_agg(DISTINCT c.name_fr, ', ' ORDER BY c.name_fr) AS chamber_name
                FROM supreme_court_decision_classifications dc
                JOIN supreme_court_chambers c ON c.id = dc.chamber_id
                WHERE dc.decision_id IN ({placeholders})
                  AND c.name_fr <> 'Décisions classées par thèmes'
                GROUP BY dc.decision_id
                """,
                decision_ids,
            )
            for item in cur.fetchall():
                chamber_map[item["decision_id"]] = item["chamber_name"]

            cur.execute(
                f"""
                SELECT dc.decision_id,
                       string_agg(DISTINCT t.name_fr, ', ' ORDER BY t.name_fr) AS theme_name
                FROM supreme_court_decision_classifications dc
                JOIN supreme_court_themes t ON t.id = dc.theme_id
                WHERE dc.decision_id IN ({placeholders})
                GROUP BY dc.decision_id
                """,
                decision_ids,
            )
            for item in cur.fetchall():
                theme_map[item["decision_id"]] = item["theme_name"]

    for row in rows:
        row["file_path_signed"] = generate_presigned_url(row.get("file_path"))
        row["text_path_signed"] = generate_presigned_url(row.get("text_path"))
        row["file_path_fr_signed"] = generate_presigned_url(row.get("file_path_fr"))
        row["file_path_ar_signed"] = generate_presigned_url(row.get("file_path_ar"))
        row["text_path_fr_signed"] = generate_presigned_url(row.get("text_path_fr"))
        row["text_path_ar_signed"] = generate_presigned_url(row.get("text_path_ar"))
        chamber_name = chamber_map.get(row["id"]) or chamber_lookup.get(row.get("chamber_id"))
        theme_name = theme_map.get(row["id"]) or theme_lookup.get(row.get("theme_id"))
        if chamber_name:
            row["chamber_name"] = chamber_name
        if theme_name:
            row["theme_name"] = theme_name
        row["publication_date"] = _serialize_date(row.get("publication_date"))
    return total, rows


def _fetch_documents_for_corpus(corpus: str, limit: int, offset: int) -> Tuple[int, List[Dict[str, Any]]]:
    if corpus == "cour_supreme":
        return _fetch_cour_supreme_documents(limit, offset)
    return _fetch_joradp_documents(limit, offset)

@mizane_bp.route("/document-content", methods=["GET"])
def document_content():
    url = request.args.get("url")
    if not url:
        return jsonify({"error": "Paramètre url manquant"}), 400

    # Si l'URL pointe vers notre bucket sans signature, regénérer une URL signée.
    def _maybe_sign(raw: str) -> str:
        if "r2.cloudflarestorage.com" in raw and "X-Amz-Signature" not in raw:
            signed = generate_presigned_url(raw)
            return signed or raw
        return raw

    url_to_fetch = _maybe_sign(url)

    try:
        with urllib.request.urlopen(url_to_fetch, timeout=15) as resp:
            data = resp.read()
    except Exception as e:
        return jsonify({"error": f"Fetch échoué: {e}"}), 500

    # Si c'est un PDF, prévenir plutôt que d'afficher du binaire illisible.
    if data.startswith(b"%PDF"):
        return jsonify({"content": "Document PDF détecté. Utilisez l'aperçu ou téléchargez le fichier."})

    for enc in ("utf-8", "latin-1"):
        try:
            return jsonify({"content": data.decode(enc)})
        except Exception:
            continue
    return jsonify({"error": "Impossible de décoder le contenu"}), 500


@mizane_bp.route("/documents", methods=["GET"])
def list_documents():
    corpus = request.args.get("corpus", "joradp")
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, int(request.args.get("limit", DEFAULT_LIMIT)))
    offset = (page - 1) * limit

    total, rows = _fetch_documents_for_corpus(corpus, limit, offset)
    for row in rows:
        # Assurer des champs cohérents côté front.
        row.setdefault("metadata_collected_at", None)
        row.setdefault("extra_metadata", {})
    return jsonify(total=total, documents=rows)


@mizane_bp.route("/statistics", methods=["GET"])
def statistics():
    corpus = request.args.get("corpus", "joradp")
    if corpus == "cour_supreme":
        sql = "SELECT COUNT(*) AS total, MAX(updated_at) AS last_updated FROM supreme_court_decisions"
    else:
        sql = "SELECT COUNT(*) AS total, MAX(updated_at) AS last_updated FROM joradp_documents"
    with closing(get_connection()) as conn, conn.cursor() as cur:
        cur.execute(sql)
        row = cur.fetchone()
    return jsonify(total=row["total"] or 0, last_updated=row["last_updated"])


@mizane_bp.route("/semantic-search", methods=["POST"])
def semantic_search():
    payload = request.get_json(silent=True) or {}
    corpus = payload.get("corpus", "joradp")
    query = (payload.get("query") or "").strip()
    limit = int(payload.get("limit") or 50)
    score_threshold = float(payload.get("score_threshold") or 0.0)
    if not query:
        return jsonify({"query": query, "results": [], "message": "Saisissez une question."})

    _warm_cache_async()

    try:
        if corpus == "cour_supreme":
            results = _semantic_search_cour_supreme(query, limit=limit, score_threshold=score_threshold)
            return jsonify(query=query, results=results, count=len(results))
        else:
            results = _semantic_search_joradp(query, limit=limit, score_threshold=score_threshold)
            return jsonify(query=query, results=results, count=len(results))
    except Exception as e:
        return jsonify({"error": str(e), "query": query, "results": []}), 500
