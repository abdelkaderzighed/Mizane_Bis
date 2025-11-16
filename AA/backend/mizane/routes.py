from __future__ import annotations

import json
from pathlib import Path
from re import split as re_split
from sqlite3 import Row, connect
from typing import Any, Dict

from flask import Blueprint, jsonify, request

mizane_bp = Blueprint("mizane", __name__)

ROOT = Path(__file__).resolve().parents[3]
DB_PATH = ROOT / "BB" / "backend" / "harvester.db"

DEFAULT_LIMIT = 20


def get_connection():
    if not DB_PATH.exists():
        raise RuntimeError("La base harvester.db est introuvable.")
    conn = connect(str(DB_PATH))
    conn.row_factory = Row
    return conn


def serialize_document(row: Row) -> Dict[str, Any]:
    metadata = row.get("extra_metadata")
    parsed_metadata = metadata
    if isinstance(metadata, str):
        try:
            parsed_metadata = json.loads(metadata)
        except json.JSONDecodeError:
            parsed_metadata = metadata
    return {
        "id": row["id"],
        "publication_date": row["publication_date"],
        "url": row["url"],
        "file_path": row["file_path"],
        "metadata_collected_at": row["metadata_collected_at"],
        "extra_metadata": parsed_metadata,
        "text_path": row["text_path"],
    }


def _split_keywords(param: str) -> list[str]:
    raw = (request.args.get(param) or "").strip()
    if not raw:
        return []
    return [token.strip() for token in re_split(r"[,;]+", raw) if token.strip()]


@mizane_bp.route("/documents", methods=["GET"])
def list_documents():
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, int(request.args.get("limit", DEFAULT_LIMIT)))
    offset = (page - 1) * limit
    corpus = request.args.get("corpus", "joradp")

    where = []
    params: list[Any] = []
    if request.args.get("year"):
        where.append("strftime('%Y', publication_date) = ?")
        params.append(request.args["year"])
    search = request.args.get("search")
    if search:
        pattern = f"%{search}%"
        where.append("(url LIKE ? OR extra_metadata LIKE ?)")
        params.extend([pattern, pattern])
    if request.args.get("from"):
        where.append("publication_date >= ?")
        params.append(request.args["from"])
    if request.args.get("to"):
        where.append("publication_date <= ?")
        params.append(request.args["to"])
    document_number = (request.args.get("document_number") or "").strip()
    if document_number:
        pattern = f"%{document_number}%"
        where.append("(url LIKE ? OR extra_metadata LIKE ?)")
        params.extend([pattern, pattern])
    keywords_and = _split_keywords("keywords_and")
    keywords_or = _split_keywords("keywords_or")
    keywords_not = _split_keywords("keywords_not")
    for keyword in keywords_and:
        pattern = f"%{keyword}%"
        where.append("(url LIKE ? OR extra_metadata LIKE ?)")
        params.extend([pattern, pattern])
    if keywords_or:
        or_parts = []
        or_params: list[Any] = []
        for keyword in keywords_or:
            pattern = f"%{keyword}%"
            or_parts.append("(url LIKE ? OR extra_metadata LIKE ?)")
            or_params.extend([pattern, pattern])
        where.append("(" + " OR ".join(or_parts) + ")")
        params.extend(or_params)
    for keyword in keywords_not:
        pattern = f"%{keyword}%"
        where.append("(url NOT LIKE ? AND extra_metadata NOT LIKE ?)")
        params.extend([pattern, pattern])

    where_clause = f"WHERE {' AND '.join(where)}" if where else ""
    order_by = "ORDER BY publication_date DESC"

    with get_connection() as conn:
        total_stmt = f"SELECT COUNT(*) AS total FROM documents {where_clause}"
        total = conn.execute(total_stmt, params).fetchone()["total"]
        stmt = (
            f"SELECT id, publication_date, url, file_path, metadata_collected_at, extra_metadata, text_path "
            f"FROM documents {where_clause} {order_by} LIMIT ? OFFSET ?"
        )
        rows = conn.execute(stmt, [*params, limit, offset]).fetchall()

    return jsonify(
        total=total,
        documents=[serialize_document(row) for row in rows],
    )


@mizane_bp.route("/statistics", methods=["GET"])
def statistics():
    with get_connection() as conn:
        row = conn.execute("SELECT COUNT(*) AS total, MAX(publication_date) AS last_updated FROM documents").fetchone()
    return jsonify(total=row["total"] or 0, last_updated=row["last_updated"])


@mizane_bp.route("/semantic-search", methods=["POST"])
def semantic_search():
    payload = request.get_json(silent=True) or {}
    query = (payload.get("query") or "").strip()
    if not query:
        return jsonify({"query": query, "results": [], "message": "Saisissez une question."})

    pattern = f"%{query}%"
    with get_connection() as conn:
        rows = conn.execute(
            "SELECT id, publication_date, url, file_path, metadata_collected_at, extra_metadata, text_path "
            "FROM documents WHERE url LIKE ? OR extra_metadata LIKE ? ORDER BY publication_date DESC LIMIT 5",
            (pattern, pattern),
        ).fetchall()
    results = [serialize_document(row) for row in rows]
    message = f"{len(results)} documents potentiellement associés à votre requête."
    return jsonify(query=query, results=results, message=message)
