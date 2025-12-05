from __future__ import annotations
from flask import Blueprint, jsonify, request, send_file, Response
import sys
import re
from pathlib import Path
# Migration SQLite → PostgreSQL
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent.parent))
from shared.postgres import get_connection_simple
import requests
import unicodedata
from datetime import datetime
import numpy as np
import os
import io
import zipfile
import time
import json
from html import unescape
from dotenv import load_dotenv
from concurrent.futures import ThreadPoolExecutor, as_completed
from sentence_transformers import SentenceTransformer

os.environ.setdefault("KMP_DUPLICATE_LIB_OK", "1")
os.environ.setdefault("OMP_NUM_THREADS", "1")
root_env = Path(__file__).resolve().parents[3] / ".env"
if root_env.exists():
    load_dotenv(root_env)

USE_SEMANTIC_SEARCH = os.getenv("COURSUPREME_ENABLE_SEMANTIC", "0") == "1"
USE_SEMANTIC_SEARCH = True

from shared.r2_storage import (
    generate_presigned_url,
    build_public_url,
    get_r2_client,
    get_bucket_name,
    normalize_key,
    R2ConfigurationError,
)
from shared.postgres import get_connection as get_pg_connection

NORMALIZED_DECISION_DATE = (
    "CASE WHEN length(decision_date)=10 AND substr(decision_date,3,1)='-' AND substr(decision_date,6,1)='-' "
    "THEN substr(decision_date,7,4)||'-'||substr(decision_date,4,2)||'-'||substr(decision_date,1,2) "
    "ELSE decision_date END"
)


def normalize_term(value):
    if not value:
        return ''
    normalized = unicodedata.normalize('NFD', str(value))
    normalized = ''.join(ch for ch in normalized if not unicodedata.combining(ch))
    return normalized.lower().strip()

def _strip_html(value: str | None) -> str:
    if not value:
        return ''
    text = re.sub('<[^<]+?>', '', value)
    return unescape(text).strip()

def _build_decision_filename(decision: dict, lang: str) -> str:
    number = decision.get('decision_number') or str(decision.get('id', 'doc'))
    date = (decision.get('decision_date') or '').replace('-', '')
    safe = re.sub(r'[^0-9A-Za-z_-]', '_', f"{number}_{lang}_{date}")
    return f"decision_{safe}.txt"


def parse_fuzzy_date(value, is_end=False):
    if not value:
        return None
    value = value.strip()
    candidates = [
        ('%d/%m/%Y', '%Y-%m-%d'),
        ('%Y-%m-%d', '%Y-%m-%d'),
        ('%Y/%m/%d', '%Y-%m-%d'),
        ('%m/%Y', '%Y-%m-%d'),
        ('%Y-%m', '%Y-%m-%d'),
        ('%Y', '%Y-%m-%d'),
    ]
    for fmt, target_fmt in candidates:
        try:
            dt = datetime.strptime(value, fmt)
            if fmt in ('%Y', '%Y-%m', '%m/%Y'):
                if fmt == '%Y':
                    month = 1 if not is_end else 12
                    day = 1 if not is_end else 31
                else:
                    month = dt.month
                    day = 1 if not is_end else 31
                dt = datetime(dt.year, month, day)
            elif fmt == '%Y-%m':
                day = 1 if not is_end else 31
                dt = datetime(dt.year, dt.month, day)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    return '9999-12-31' if is_end else '1900-01-01'


def normalize_decision_date_value(value: str | None) -> str | None:
    """Normalise une date trouvée dans le texte vers YYYY-MM-DD si possible."""
    if not value:
        return None
    raw = value.strip()
    candidates = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%Y/%m/%d']
    for fmt in candidates:
        try:
            dt = datetime.strptime(raw, fmt)
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            continue
    # Gestion des jours à 0 (ex: 2021/04/0) -> on force le jour à 01
    m = re.match(r'(\d{4})[/-](\d{2})[/-]0$', raw)
    if m:
        try:
            dt = datetime.strptime(f"{m.group(1)}-{m.group(2)}-01", "%Y-%m-%d")
            return dt.strftime('%Y-%m-%d')
        except ValueError:
            return None
    return None


def format_display_date(value: str | None) -> str:
    """Retourne une date au format JJ-MM-AAAA pour l'affichage."""
    if not value:
        return ''
    value = str(value).strip()
    candidates = ['%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d', '%Y/%m/%d']
    for fmt in candidates:
        try:
            dt = datetime.strptime(value, fmt)
            return dt.strftime('%d-%m-%Y')
        except ValueError:
            continue
    return value.replace('/', '-')


def _parse_id_list(value: str) -> list[int]:
    """Parse une liste d'ids séparés par virgule en entiers."""
    ids = []
    for part in (value or '').split(','):
        part = part.strip()
        if not part:
            continue
        try:
            ids.append(int(part))
        except ValueError:
            continue
    return ids


FRENCH_INDEX_TABLE = 'french_keyword_index'
FRENCH_INDEX_FIELDS = ['object_fr', 'summary_fr', 'title_fr']
TOKEN_PATTERN = re.compile(r'[a-z0-9]+')

EMBEDDING_MODEL = None


def extract_french_tokens(value: str) -> list:
    if not value:
        return []
    normalized = normalize_term(value)
    return TOKEN_PATTERN.findall(normalized)


def ensure_french_index(conn) -> None:
    conn.execute(f"""
        CREATE TABLE IF NOT EXISTS {FRENCH_INDEX_TABLE} (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            token TEXT NOT NULL,
            decision_id INTEGER NOT NULL
        )
    """)
    conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{FRENCH_INDEX_TABLE}_token ON {FRENCH_INDEX_TABLE}(token)")
    conn.execute(f"CREATE INDEX IF NOT EXISTS idx_{FRENCH_INDEX_TABLE}_decision ON {FRENCH_INDEX_TABLE}(decision_id)")


def rebuild_french_index_entries(conn) -> int:
    ensure_french_index(conn)
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM {FRENCH_INDEX_TABLE}")
    cursor.execute(f"""
        SELECT id, {', '.join(FRENCH_INDEX_FIELDS)}
        FROM supreme_court_decisions
    """)
    rows = cursor.fetchall()
    entries = []
    for row in rows:
        decision_id = row[0]
        tokens = set()
        for idx, field in enumerate(FRENCH_INDEX_FIELDS, start=1):
            tokens.update(extract_french_tokens(row[idx]))
        for token in tokens:
            entries.append((token, decision_id))
    if entries:
        cursor.executemany(f"""
            INSERT INTO {FRENCH_INDEX_TABLE}(token, decision_id)
            VALUES (?, ?)
        """, entries)
    conn.commit()
    return len(entries)


def tokenize_query_param(value: str) -> list:
    tokens = []
    for part in value.split(','):
        tokens.extend(extract_french_tokens(part))
    return [token for token in tokens if token]


def get_decision_ids_for_token(cursor, token: str) -> set:
    cursor.execute(f"SELECT decision_id FROM {FRENCH_INDEX_TABLE} WHERE token = %s", (token,))
    return {row[0] for row in cursor.fetchall()}


def get_decision_ids_for_classification(
    cursor,
    column: str,
    ids: list[int],
    require_all: bool = False,
) -> set:
    """Récupère les décisions qui matchent un ensemble de chambres/thèmes.
    require_all=True => l'entrée doit contenir TOUTES les valeurs fournies (AND via HAVING).
    require_all=False => au moins une correspondance (IN).
    """
    if not ids:
        return set()
    placeholders = ','.join('?' for _ in ids)
    if require_all:
        cursor.execute(f"""
            SELECT decision_id
            FROM supreme_court_decision_classifications
            WHERE {column} IN ({placeholders})
            GROUP BY decision_id
            HAVING COUNT(DISTINCT {column}) >= ?
        """, (*ids, len(ids)))
    else:
        cursor.execute(f"""
            SELECT DISTINCT decision_id
            FROM supreme_court_decision_classifications
            WHERE {column} IN ({placeholders})
        """, ids)
    return {row[0] for row in cursor.fetchall()}


def get_embedding_model():
    global EMBEDDING_MODEL
    if EMBEDDING_MODEL is not None:
        return EMBEDDING_MODEL
    if not USE_SEMANTIC_SEARCH:
        fallback_results, fallback_count = run_text_fallback(limit)
        return jsonify({
            'results': fallback_results,
            'count': fallback_count,
            'max_score': None,
            'min_score': None,
            'score_threshold': score_threshold,
            'limit': limit,
            'error': 'semantic search disabled, fallback applied'
        })

    try:
        from sentence_transformers import SentenceTransformer
    except Exception:
        return None
    EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return EMBEDDING_MODEL


def decode_embedding(blob):
    if not blob:
        return None
    if isinstance(blob, memoryview):
        blob = blob.tobytes()
    return np.frombuffer(blob, dtype=np.float32)


# Embeddings cour suprême (cache R2 + modèle)
_CS_EMBED_CACHE = None
_CS_EMBED_MODEL = None


def get_embedding_model():
    global _CS_EMBED_MODEL
    if _CS_EMBED_MODEL is None:
        _CS_EMBED_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return _CS_EMBED_MODEL


def _build_embedding_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    presigned = generate_presigned_url(raw_path)
    if presigned:
        return presigned
    return build_public_url(raw_path)


def _download_embedding(url: str) -> bytes | None:
    try:
        resp = requests.get(url, timeout=20)
        if resp.ok:
            return resp.content
    except Exception:
        return None
    return None


def _load_cs_embeddings_cache():
    global _CS_EMBED_CACHE
    if _CS_EMBED_CACHE is not None:
        return _CS_EMBED_CACHE

    cache = []
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, decision_number, decision_date, url,
                       embeddings_ar_r2, embeddings_fr_r2
                FROM supreme_court_decisions
                WHERE embeddings_ar_r2 IS NOT NULL OR embeddings_fr_r2 IS NOT NULL
                """
            )
            rows = cur.fetchall()

    def worker(row):
        emb_url = _build_embedding_url(row.get("embeddings_fr_r2") or row.get("embeddings_ar_r2"))
        if not emb_url:
            return None
        blob = _download_embedding(emb_url)
        vec = decode_embedding(blob)
        if vec is None or vec.size == 0:
            return None
        norm = np.linalg.norm(vec)
        if norm == 0:
            return None
        vec = vec / norm
        return {
            "id": row["id"],
            "decision_number": row["decision_number"],
            "decision_date": row["decision_date"],
            "url": row["url"],
            "vector": vec,
        }

    with ThreadPoolExecutor(max_workers=8) as executor:
        futures = [executor.submit(worker, row) for row in rows]
        for fut in as_completed(futures):
            item = fut.result()
            if item:
                cache.append(item)

    _CS_EMBED_CACHE = cache
    return _CS_EMBED_CACHE


def cosine_similarity(query_vec, target_vec):
    if query_vec is None or target_vec is None:
        return None
    numerator = float(np.dot(query_vec, target_vec))
    denominator = np.linalg.norm(query_vec) * np.linalg.norm(target_vec)
    if denominator == 0:
        return None
    return numerator / denominator

coursupreme_bp = Blueprint('coursupreme', __name__)

HARVESTERS_DIR = Path(__file__).resolve().parents[2] / 'harvesters'
if str(HARVESTERS_DIR) not in sys.path:
    sys.path.append(str(HARVESTERS_DIR))


def _build_access_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    try:
        return generate_presigned_url(raw_path) or build_public_url(raw_path)
    except R2ConfigurationError:
        # R2 not configured: caller will fall back to any in-DB HTML content
        return None


def _fetch_text_from_r2(raw_path: str | None, fallback: str | None = None) -> str | None:
    url = _build_access_url(raw_path)
    if not url:
        return fallback
    try:
        resp = requests.get(url, timeout=30)
        if resp.ok:
            resp.encoding = 'utf-8'
            return resp.text
    except Exception as exc:
        print(f"⚠️ Impossible de charger {raw_path}: {exc}")
    return fallback


def _decode_text(value):
    """Convert memoryview/bytes to utf-8 string for JSON responses."""
    if value is None:
        return None
    if isinstance(value, memoryview):
        value = value.tobytes()
    if isinstance(value, (bytes, bytearray)):
        try:
            return value.decode('utf-8', errors='ignore')
        except Exception:
            return value.decode('latin-1', errors='ignore')
    return value


def _decode_row_strings(row: dict) -> dict:
    """Decode any memoryview/bytes values in a DB row."""
    if not isinstance(row, dict):
        return row
    for key, value in list(row.items()):
        if isinstance(value, (memoryview, bytes, bytearray)):
            row[key] = _decode_text(value)
    return row


def _serialize_entities(raw):
    if raw is None:
        return None
    if isinstance(raw, (list, dict)):
        try:
            return json.dumps(raw, ensure_ascii=False)
        except Exception:
            return str(raw)
    return raw


def _delete_r2_object(raw_path: str | None) -> bool:
    if not raw_path:
        return False
    try:
        client = get_r2_client()
        key = normalize_key(raw_path)
        if not key:
            return False
        bucket = get_bucket_name()
        client.delete_object(Bucket=bucket, Key=key)
        return True
    except R2ConfigurationError:
        return False
    except Exception as exc:
        print(f"⚠️ Impossible de supprimer {raw_path} de R2: {exc}")
        return False

@coursupreme_bp.route('/chambers', methods=['GET'])
def get_chambers():
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        c.id,
                        c.name_ar,
                        c.name_fr,
                        COUNT(DISTINCT t.id) AS theme_count,
                        COUNT(DISTINCT dc.decision_id) AS decision_count
                    FROM supreme_court_chambers c
                    LEFT JOIN supreme_court_themes t ON t.chamber_id = c.id
                    LEFT JOIN supreme_court_decision_classifications dc ON dc.chamber_id = c.id
                    GROUP BY c.id
                    ORDER BY c.id
                    """
                )
                chambers = [dict(row) for row in cur.fetchall()]
        return jsonify({'chambers': chambers})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/collect', methods=['POST'])
def collect_decisions():
    """Relancer la collecte incrémentale (optionnellement ciblée sur une chambre)"""
    try:
        from harvester_coursupreme_v4_intelligent import HarvesterCourSupremeV4Intelligent

        data = request.get_json() or {}
        chamber_id = data.get('chamber_id')

        # TODO: Migrer les harvesters vers PostgreSQL
        return jsonify({'error': 'Fonction de harvesting temporairement désactivée (migration PostgreSQL en cours)'}), 501

        # db_path = Path(DB_PATH).resolve()
        # harvester = HarvesterCourSupremeV4Intelligent(db_path=str(db_path))

        if chamber_id:
            result = harvester.harvest_section(chamber_id)
            return jsonify({
                'success': True,
                'mode': 'section',
                'chamber_id': chamber_id,
                'result': result
            })

        stats = harvester.harvest_incremental()
        return jsonify({
            'success': True,
            'mode': 'incremental',
            'stats': stats
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/chambers/<int:chamber_id>/themes', methods=['GET'])
def get_themes(chamber_id):
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        t.id,
                        t.name_ar,
                        t.name_fr,
                        t.url,
                        COUNT(DISTINCT dc.decision_id) AS decision_count
                    FROM supreme_court_themes t
                    LEFT JOIN supreme_court_decision_classifications dc ON dc.theme_id = t.id
                    WHERE t.chamber_id = %s
                    GROUP BY t.id
                    ORDER BY t.id
                    """,
                    (chamber_id,),
                )
                themes = [dict(row) for row in cur.fetchall()]
        return jsonify({'themes': themes})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/themes/<int:theme_id>/decisions', methods=['GET'])
def get_decisions(theme_id):
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                primary_sql = f"""
                    SELECT DISTINCT
                        d.id,
                        d.decision_number,
                        d.decision_date,
                        d.object_ar,
                        d.object_fr,
                        d.url,
                        d.download_status,
                        d.file_path_ar_r2,
                        d.file_path_fr_r2,
                        d.html_content_ar_r2,
                        d.html_content_fr_r2
                    FROM supreme_court_decisions d
                    JOIN supreme_court_decision_classifications c ON d.id = c.decision_id
                    WHERE c.theme_id = %s
                    ORDER BY d.decision_date DESC NULLS LAST, d.id DESC
                """
                fallback_sql = f"""
                    SELECT DISTINCT
                        d.id,
                        d.decision_number,
                        d.decision_date,
                        d.object_ar,
                        d.object_fr,
                        d.url,
                        d.download_status,
                        d.file_path_ar AS file_path_ar_r2,
                        d.file_path_fr AS file_path_fr_r2,
                        d.html_content_ar AS html_content_ar_r2,
                        d.html_content_fr AS html_content_fr_r2
                    FROM supreme_court_decisions d
                    JOIN supreme_court_decision_classifications c ON d.id = c.decision_id
                    WHERE c.theme_id = %s
                    ORDER BY d.decision_date DESC NULLS LAST, d.id DESC
                """
                try:
                    cur.execute(primary_sql, (theme_id,))
                    rows = cur.fetchall()
                except Exception as exc:
                    conn.rollback()
                    print(f"⚠️ Fallback to legacy columns for theme {theme_id}: {exc}")
                    cur.execute(fallback_sql, (theme_id,))
                    rows = cur.fetchall()

        decisions = []
        for row in rows:
            row = _decode_row_strings(dict(row))
            html_ar = _decode_text(row.pop('html_content_ar_r2', None))
            html_fr = _decode_text(row.pop('html_content_fr_r2', None))
            row['content_ar'] = _fetch_text_from_r2(row.get('file_path_ar_r2'), html_ar)
            row['content_fr'] = _fetch_text_from_r2(row.get('file_path_fr_r2'), html_fr)
            row.pop('file_path_ar_r2', None)
            row.pop('file_path_fr_r2', None)
            decisions.append(row)

        return jsonify({'decisions': decisions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/decisions/<int:decision_id>', methods=['GET'])
def get_decision(decision_id):
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        d.id, d.decision_number, d.decision_date,
                        d.object_ar, d.object_fr, d.url,
                        d.file_path_ar_r2, d.file_path_fr_r2,
                        d.html_content_ar_r2, d.html_content_fr_r2,
                        d.arguments_r2, d.analysis_ar_r2, d.analysis_fr_r2,
                        d.legal_reference_ar, d.legal_reference_fr,
                        d.parties_ar, d.parties_fr,
                        d.president, d.rapporteur,
                        d.title_ar, d.title_fr
                    FROM supreme_court_decisions d
                    WHERE d.id = %s
                    """,
                    (decision_id,),
                )
                row = cur.fetchone()

        if row:
            decision = dict(row)

            html_ar = decision.pop('html_content_ar_r2', None)
            html_fr = decision.pop('html_content_fr_r2', None)
            decision['content_ar'] = _fetch_text_from_r2(decision.get('file_path_ar_r2'), html_ar)
            decision['content_fr'] = _fetch_text_from_r2(decision.get('file_path_fr_r2'), html_fr)

            decision.pop('file_path_ar_r2', None)
            decision.pop('file_path_fr_r2', None)

            return jsonify(decision)
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return 
    jsonify({'error': str(e)}), 500
@coursupreme_bp.route('/metadata/<int:decision_id>', methods=['GET'])   
def get_metadata(decision_id):
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        d.decision_number,
                        d.decision_date,
                        d.file_path_ar_r2,
                        d.file_path_fr_r2,
                        d.html_content_ar_r2,
                        d.html_content_fr_r2,
                        ai_ar.title AS title_ar,
                        ai_fr.title AS title_fr,
                        ai_ar.summary AS summary_ar,
                        ai_fr.summary AS summary_fr,
                        ai_ar.keywords AS keywords_ar,
                        ai_fr.keywords AS keywords_fr,
                        ai_ar.entities AS entities_ar,
                        ai_fr.entities AS entities_fr,
                        ai_ar.publication_date,
                        ai_ar.extra_metadata AS extra_metadata_ar,
                        ai_fr.extra_metadata AS extra_metadata_fr
                    FROM supreme_court_decisions d
                    LEFT JOIN document_ai_metadata ai_ar 
                        ON ai_ar.document_id = d.id 
                        AND ai_ar.corpus = 'cour_supreme' 
                        AND ai_ar.language = 'ar'
                    LEFT JOIN document_ai_metadata ai_fr 
                        ON ai_fr.document_id = d.id 
                        AND ai_fr.corpus = 'cour_supreme' 
                        AND ai_fr.language = 'fr'
                    WHERE d.id = %s
                    """,
                    (decision_id,),
                )
                row = cur.fetchone()

        if row:
            metadata = dict(row)

            # Lire les contenus depuis R2
            html_ar = metadata.pop('html_content_ar_r2', None)
            html_fr = metadata.pop('html_content_fr_r2', None)
            metadata['content_ar'] = _fetch_text_from_r2(metadata.get('file_path_ar_r2'), html_ar)
            metadata['content_fr'] = _fetch_text_from_r2(metadata.get('file_path_fr_r2'), html_fr)

            # Nettoyer les champs inutiles
            metadata.pop('file_path_ar_r2', None)
            metadata.pop('file_path_fr_r2', None)

            return jsonify(metadata)
        return jsonify({'error': 'Not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500
 

@coursupreme_bp.route('/search', methods=['GET'])
def search():
    from flask import request
    query = request.args.get('q', '')
    try:
        conn = get_connection_simple()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, decision_number, decision_date, object_ar
            FROM supreme_court_decisions
            WHERE decision_number LIKE %s OR decision_date LIKE %s OR object_ar LIKE %s
            LIMIT 50
        """, (f'%{query}%', f'%{query}%', f'%{query}%'))
        results = [dict(row) for row in cursor.fetchall()]
        conn.close()
        return jsonify({'results': results})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/decisions/<int:decision_id>', methods=['DELETE'])
def delete_decision(decision_id):
    try:
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer les chemins des fichiers AVANT suppression
        cursor.execute("SELECT file_path_ar, file_path_fr FROM supreme_court_decisions WHERE id = %s", (decision_id,))
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({'error': 'Décision non trouvée'}), 404
        
        file_ar = row['file_path_ar']
        file_fr = row['file_path_fr']
        
        # Supprimer de la BD
        cursor.execute("DELETE FROM supreme_court_decisions WHERE id = %s", (decision_id,))
        conn.commit()
        conn.close()
        
        # Supprimer les objets R2
        deleted_files = []
        if file_ar and _delete_r2_object(file_ar):
            deleted_files.append(file_ar)
        
        if file_fr and _delete_r2_object(file_fr):
            deleted_files.append(file_fr)
        
        return jsonify({
            'message': 'Décision et fichiers supprimés',
            'deleted_files': deleted_files
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ROUTE DE GESTION DES DÉCISIONS - Vue de statut complète
# ============================================================================

@coursupreme_bp.route('/decisions/status', methods=['GET'])
def get_decisions_status():
    """Récupérer toutes les décisions avec leur statut de complétion détaillé"""
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        d.id,
                        d.decision_number,
                        d.decision_date,
                        d.url,
                        d.file_path_ar_r2,
                        d.file_path_fr_r2,
                        d.html_content_ar_r2,
                        d.html_content_fr_r2,
                        d.analysis_ar_r2,
                        d.analysis_fr_r2,
                        d.embeddings_ar_r2,
                        d.embeddings_fr_r2,
                        d.title_ar,
                        d.title_fr,
                        d.object_ar,
                        d.object_fr
                    FROM supreme_court_decisions d
                    ORDER BY d.decision_date DESC NULLS LAST, d.decision_number DESC
                    """
                )
                decisions_raw = cur.fetchall()

                # Précharger chambres et thèmes pour limiter les requêtes
                cur.execute(
                    """
                    SELECT DISTINCT dc.decision_id, c.name_fr, c.name_ar
                    FROM supreme_court_decision_classifications dc
                    JOIN supreme_court_chambers c ON c.id = dc.chamber_id
                    """
                )
                chamber_map = {}
                for row in cur.fetchall():
                    dec_id = row['decision_id']
                    chamber_map.setdefault(dec_id, [])
                    entry = {'name_fr': row['name_fr'], 'name_ar': row['name_ar']}
                    if entry not in chamber_map[dec_id]:
                        chamber_map[dec_id].append(entry)

                cur.execute(
                    """
                    SELECT DISTINCT dc.decision_id, t.name_fr, t.name_ar
                    FROM supreme_court_decision_classifications dc
                    JOIN supreme_court_themes t ON t.id = dc.theme_id
                    """
                )
                theme_map = {}
                for row in cur.fetchall():
                    dec_id = row['decision_id']
                    theme_map.setdefault(dec_id, [])
                    entry = {'name_fr': row['name_fr'], 'name_ar': row['name_ar']}
                    name_fr = (entry.get('name_fr') or '').strip().lower()
                    if name_fr == 'décisions classées par thèmes':
                        continue
                    if entry not in theme_map[dec_id]:
                        theme_map[dec_id].append(entry)

        decisions = []

        for row in decisions_raw:
            dec = dict(row)

            downloaded_status = 'missing'
            if any([
                dec.get('file_path_ar_r2'),
                dec.get('file_path_fr_r2'),
                dec.get('html_content_ar_r2'),
                dec.get('html_content_fr_r2'),
            ]):
                downloaded_status = 'complete'

            translated_status = 'complete' if dec.get('file_path_fr_r2') or dec.get('html_content_fr_r2') else 'missing'

            has_analysis = bool(dec.get('analysis_ar_r2') or dec.get('analysis_fr_r2'))
            has_titles = bool(dec.get('title_ar') or dec.get('title_fr') or dec.get('object_ar') or dec.get('object_fr'))
            analyzed_status = 'complete' if has_analysis else ('partial' if has_titles else 'missing')

            emb_ar = bool(dec.get('embeddings_ar_r2'))
            emb_fr = bool(dec.get('embeddings_fr_r2'))
            embeddings_status = 'complete' if (emb_ar and emb_fr) else ('partial' if (emb_ar or emb_fr) else 'missing')

            decisions.append({
                'id': dec['id'],
                'decision_number': dec['decision_number'],
                'decision_date': dec['decision_date'],
                'url': dec['url'],
                'status': {
                    'downloaded': downloaded_status,
                    'translated': translated_status,
                    'analyzed': analyzed_status,
                    'embeddings': embeddings_status
                },
                'chambers': chamber_map.get(dec['id'], []),
                'themes': theme_map.get(dec['id'], []),
                'summary_ar': dec.get('analysis_ar_r2'),
                'summary_fr': dec.get('analysis_fr_r2'),
                'object_ar': dec.get('object_ar'),
                'object_fr': dec.get('object_fr')
            })

        return jsonify({
            'decisions': decisions,
            'count': len(decisions)
        })

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ROUTES BATCH - Actions groupées
# ============================================================================

@coursupreme_bp.route('/batch/status', methods=['POST'])
def batch_status():
    """Obtenir le statut de plusieurs décisions"""
    from flask import request
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, download_status,
                   file_path_ar, file_path_fr,
                   title_ar IS NOT NULL as analyzed,
                   embedding IS NOT NULL as has_embedding
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        statuses = [dict(row) for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({'statuses': statuses})
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/batch/download', methods=['POST'])
def batch_download():
    """Télécharger plusieurs décisions"""
    from flask import request
    import sys
    import os
    sys.path.append(os.path.join(os.path.dirname(__file__), '../../harvesters'))
    from harvester_coursupreme import HarvesterCourSupreme
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer les décisions avec leur statut
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, url, download_status, html_content_ar
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Séparer déjà téléchargées vs à télécharger
        already_downloaded = []
        to_download = []
        
        for decision in decisions:
            dec_id, number, url, status, html = decision
            if html and status in ('downloaded', 'completed') and not force:
                already_downloaded.append(number)
            else:
                to_download.append({'id': dec_id, 'number': number, 'url': url})
        
        # Si déjà téléchargées sans force, demander confirmation
        if already_downloaded and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_downloaded_count': len(already_downloaded),
                'to_download_count': len(to_download),
                'message': f'{len(already_downloaded)} décisions déjà téléchargées. Voulez-vous les re-télécharger ?'
            })
        
        # Télécharger
        # TODO: Migrer les harvesters vers PostgreSQL
        return jsonify({'error': 'Fonction de téléchargement temporairement désactivée (migration PostgreSQL en cours)'}), 501
        # harvester = HarvesterCourSupreme(DB_PATH)
        # results = {
        #     'success': [],
        #     'failed': [],
        #     'skipped': already_downloaded
        # }
        
        for dec in to_download:
            try:
                print(f"📥 Téléchargement {dec['number']}...")
                content_dict = harvester.download_decision(dec['url'])
                
                if content_dict and 'html_content_ar' in content_dict:
                    cursor.execute("""
                        UPDATE supreme_court_decisions
                        SET html_content_ar = %s,
                            download_status = 'downloaded',
                            updated_at = CURRENT_TIMESTAMP
                        WHERE id = %s
                    """, (content_dict['html_content_ar'], dec['id']))
                    
                    results['success'].append(dec['number'])
                    print(f"   ✅ {dec['number']} téléchargée")
                else:
                    results['failed'].append(dec['number'])
                    print(f"   ❌ {dec['number']} échec")
                    
            except Exception as e:
                print(f"   ❌ Erreur {dec['number']}: {e}")
                results['failed'].append(dec['number'])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'skipped_count': len(results['skipped']),
            'results': results,
            'message': f"✅ {len(results['success'])} téléchargées, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/batch/translate', methods=['POST'])
def batch_translate():
    """Traduire plusieurs décisions AR -> FR avec OpenAI"""
    from flask import request
    import os
    from openai import OpenAI
    from bs4 import BeautifulSoup
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        # Vérifier la clé API
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY non trouvée dans .env'}), 500
        
        client = OpenAI(api_key=api_key)
        
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer les décisions
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, html_content_ar, html_content_fr, download_status,
                   file_path_ar, file_path_fr
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier les dépendances et statuts
        missing_download = []
        already_translated = []
        to_translate = []
        
        for dec in decisions:
            dec_id, number, html_ar, html_fr, dl_status, file_ar, file_fr = dec

            available_ar = bool(html_ar) or (file_ar and file_exists(file_ar))
            available_fr = bool(html_fr) or (file_fr and file_exists(file_fr))

            if not available_ar or dl_status not in ('downloaded', 'completed'):
                missing_download.append(number)
            elif available_fr and not force:
                already_translated.append(number)
            else:
                to_translate.append({
                    'id': dec_id,
                    'number': number,
                    'html_ar': html_ar,
                    'file_path_ar': file_ar
                })
        
        # Erreurs de dépendance
        if missing_download:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_download': missing_download,
                'message': f'{len(missing_download)} décisions doivent être téléchargées avant traduction'
            }), 400
        
        # Confirmation si déjà traduites
        if already_translated and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_translated_count': len(already_translated),
                'to_translate_count': len(to_translate),
                'message': f'{len(already_translated)} décisions déjà traduites. Voulez-vous les re-traduire ?'
            })
        
        # Traduire
        results = {
            'success': [],
            'failed': [],
            'skipped': already_translated
        }
        
        for dec in to_translate:
            try:
                print(f"🌐 Traduction {dec['number']}...")

                html_content = load_html_content(dec.get('html_ar'), dec.get('file_path_ar'))
                if not html_content:
                    raise ValueError("Contenu AR introuvable (ni en base, ni sur disque)")

                # Extraire le texte du HTML
                soup = BeautifulSoup(html_content, 'html.parser')
                text_ar = soup.get_text(separator='\\n', strip=True)
                
                # Limiter à 3000 caractères pour ne pas dépasser les tokens
                text_to_translate = text_ar[:3000]
                
                # Traduire avec OpenAI
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un traducteur juridique professionnel. Traduis le texte arabe en français en conservant la structure et la terminologie juridique."},
                        {"role": "user", "content": f"Traduis cette décision de justice:\n\n{text_to_translate}"}
                    ],
                    max_tokens=2000,
                    temperature=0.3
                )
                
                text_fr = response.choices[0].message.content.strip()
                
                # Recréer le HTML avec le texte traduit
                html_fr = f"<article>{text_fr}</article>"
                
                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET html_content_fr = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (html_fr, dec['id']))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} traduite")
                
            except Exception as e:
                print(f"   ❌ Erreur {dec['number']}: {e}")
                results['failed'].append(dec['number'])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'skipped_count': len(results['skipped']),
            'results': results,
            'message': f"✅ {len(results['success'])} traduites, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/batch/analyze', methods=['POST'])
def batch_analyze():
    """Analyser plusieurs décisions avec OpenAI + extraction mots-clés"""
    from flask import request
    import os
    import json
    from openai import OpenAI
    from bs4 import BeautifulSoup
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        # Vérifier la clé API
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY non trouvée dans .env'}), 500
        
        client = OpenAI(api_key=api_key)
        
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer les décisions
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, decision_date, html_content_ar, html_content_fr, 
                   download_status, summary_ar, summary_fr,
                   file_path_ar, file_path_fr
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier dépendances
        missing_download = []
        missing_translation = []
        already_analyzed = []
        to_analyze = []
        
        for dec in decisions:
            dec_id, number, dec_date, html_ar, html_fr, dl_status, sum_ar, sum_fr, file_ar, file_fr = dec

            available_ar = bool(html_ar) or (file_ar and file_exists(file_ar))
            available_fr = bool(html_fr) or (file_fr and file_exists(file_fr))

            if not available_ar or dl_status not in ('downloaded', 'completed'):
                missing_download.append(number)
            elif not available_fr:
                missing_translation.append(number)
            elif sum_ar and sum_fr and not force:
                already_analyzed.append(number)
            else:
                to_analyze.append({
                    'id': dec_id,
                    'number': number,
                    'html_ar': html_ar,
                    'html_fr': html_fr,
                    'file_path_ar': file_ar,
                    'file_path_fr': file_fr
                })
        
        # Erreurs de dépendance
        if missing_download:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_download': missing_download,
                'message': f'{len(missing_download)} décisions doivent être téléchargées'
            }), 400
        
        if missing_translation:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_translation': missing_translation,
                'message': f'{len(missing_translation)} décisions doivent être traduites'
            }), 400
        
        # Confirmation si déjà analysées
        if already_analyzed and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_analyzed_count': len(already_analyzed),
                'to_analyze_count': len(to_analyze),
                'message': f'{len(already_analyzed)} décisions déjà analysées. Voulez-vous les re-analyser ?'
            })
        
        # Analyser
        results = {
            'success': [],
            'failed': [],
            'skipped': already_analyzed
        }
        
        for dec in to_analyze:
            try:
                print(f"🤖 Analyse IA {dec['number']}...")

                html_ar = load_html_content(dec.get('html_ar'), dec.get('file_path_ar'))
                html_fr = load_html_content(dec.get('html_fr'), dec.get('file_path_fr'))
                if not html_ar or not html_fr:
                    raise ValueError("Contenu AR/FR introuvable pour l'analyse")

                # Extraire textes
                soup_ar = BeautifulSoup(html_ar, 'html.parser')
                text_ar = soup_ar.get_text(separator='\n', strip=True)[:3000]

                soup_fr = BeautifulSoup(html_fr, 'html.parser')
                text_fr = soup_fr.get_text(separator='\n', strip=True)[:3000]
                
                # Analyse AR
                ar_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un analyste juridique. Réponds UNIQUEMENT en JSON valide."},
                        {"role": "user", "content": f"""Analyse cette décision de justice en ARABE et retourne un JSON avec:
1. "summary": résumé en 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste d'objets {{"type": "person/institution/location/legal", "name": "..."}}
4. "keywords": liste de 5-8 mots-clés juridiques importants
5. "decision_date": date de la décision au format YYYY-MM-DD si elle est clairement identifiable, sinon null

Décision:
{text_ar}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""}
                    ],
                    max_tokens=1000,
                    temperature=0.3
                )
                
                ar_content = ar_response.choices[0].message.content.strip()
                ar_content = ar_content.replace('```json', '').replace('```', '').strip()
                ar_json = json.loads(ar_content)
                
                # Analyse FR
                fr_response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "Tu es un analyste juridique. Réponds UNIQUEMENT en JSON valide."},
                        {"role": "user", "content": f"""Analyse cette décision de justice en FRANÇAIS et retourne un JSON avec:
1. "summary": résumé en 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste d'objets {{"type": "person/institution/location/legal", "name": "..."}}
4. "keywords": liste de 5-8 mots-clés juridiques importants
5. "decision_date": date de la décision au format YYYY-MM-DD si elle est clairement identifiable, sinon null

Décision:
{text_fr}

Réponds UNIQUEMENT avec le JSON, sans texte avant ou après."""}
                    ],
                    max_tokens=1000,
                    temperature=0.3
                )
                
                fr_content = fr_response.choices[0].message.content.strip()
                fr_content = fr_content.replace('```json', '').replace('```', '').strip()
                fr_json = json.loads(fr_content)
                
                # Déterminer une date à corriger si besoin
                existing_date = normalize_decision_date_value(dec.get('decision_date') if isinstance(dec, dict) else dec_date)
                ar_date = normalize_decision_date_value((ar_json or {}).get('decision_date')) if isinstance(ar_json, dict) else None
                fr_date = normalize_decision_date_value((fr_json or {}).get('decision_date')) if isinstance(fr_json, dict) else None
                chosen_date = existing_date or fr_date or ar_date

                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET decision_date = COALESCE(%s, decision_date),
                        summary_ar = ?,
                        summary_fr = ?,
                        title_ar = ?,
                        title_fr = ?,
                        entities_ar = ?,
                        entities_fr = ?,
                        keywords_ar = ?,
                        keywords_fr = ?,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (
                    chosen_date,
                    ar_json.get('summary'),
                    fr_json.get('summary'),
                    ar_json.get('title'),
                    fr_json.get('title'),
                    json.dumps(ar_json.get('entities', []), ensure_ascii=False),
                    json.dumps(fr_json.get('entities', []), ensure_ascii=False),
                    json.dumps(ar_json.get('keywords', []), ensure_ascii=False),
                    json.dumps(fr_json.get('keywords', []), ensure_ascii=False),
                    dec['id']
                ))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} analysée")
                
            except Exception as e:
                print(f"   ❌ Erreur {dec['number']}: {e}")
                results['failed'].append(dec['number'])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'skipped_count': len(results['skipped']),
            'results': results,
            'message': f"✅ {len(results['success'])} analysées, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/batch/embed', methods=['POST'])
def batch_embed():
    """Générer embeddings pour plusieurs décisions avec SentenceTransformer"""
    from flask import request
    from sentence_transformers import SentenceTransformer
    from bs4 import BeautifulSoup
    import numpy as np
    
    try:
        data = request.get_json()
        decision_ids = data.get('decision_ids', [])
        force = data.get('force', False)
        
        if not decision_ids:
            return jsonify({'error': 'Aucune décision spécifiée'}), 400
        
        # Initialiser le modèle d'embedding
        print("🧬 Chargement du modèle d'embedding...")
        embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
        
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer les décisions
        placeholders = ','.join('?' * len(decision_ids))
        cursor.execute(f"""
            SELECT id, decision_number, html_content_ar, html_content_fr, 
                   download_status, summary_ar, summary_fr, embedding_ar, embedding_fr,
                   file_path_ar, file_path_fr
            FROM supreme_court_decisions
            WHERE id IN ({placeholders})
        """, decision_ids)
        
        decisions = cursor.fetchall()
        
        # Vérifier dépendances
        missing_download = []
        missing_translation = []
        already_embedded = []
        to_embed = []
        
        for dec in decisions:
            dec_id, number, html_ar, html_fr, dl_status, sum_ar, sum_fr, embedding_ar, embedding_fr, file_ar, file_fr = dec

            available_ar = bool(html_ar) or (file_ar and file_exists(file_ar))
            available_fr = bool(html_fr) or (file_fr and file_exists(file_fr))

            if not available_ar or dl_status not in ('downloaded', 'completed'):
                missing_download.append(number)
            elif not available_fr:
                missing_translation.append(number)
            elif embedding_ar and embedding_fr and not force:
                already_embedded.append(number)
            else:
                to_embed.append({
                    'id': dec_id,
                    'number': number,
                    'html_fr': html_fr,
                    'html_ar': html_ar,
                    'file_path_ar': file_ar,
                    'file_path_fr': file_fr,
                    'summary_ar': sum_ar,
                    'summary_fr': sum_fr
                })
        
        # Erreurs de dépendance
        if missing_download:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_download': missing_download,
                'message': f'{len(missing_download)} décisions doivent être téléchargées'
            }), 400
        
        if missing_translation:
            conn.close()
            return jsonify({
                'error': 'Dépendances manquantes',
                'missing_translation': missing_translation,
                'message': f'{len(missing_translation)} décisions doivent être traduites'
            }), 400
        
        # Confirmation si déjà embeddings
        if already_embedded and not force:
            conn.close()
            return jsonify({
                'needs_confirmation': True,
                'already_embedded_count': len(already_embedded),
                'to_embed_count': len(to_embed),
                'message': f'{len(already_embedded)} décisions ont déjà des embeddings. Voulez-vous les régénérer ?'
            })
        
        # Générer embeddings
        results = {
            'success': [],
            'failed': [],
            'skipped': already_embedded
        }
        
        for dec in to_embed:
            try:
                print(f"🧬 Génération embedding {dec['number']}...")
                
                # Texte FR priorisant le résumé
                if dec['summary_fr']:
                    text_fr = dec['summary_fr'][:5000]
                else:
                    html_fr = load_html_content(dec.get('html_fr'), dec.get('file_path_fr'))
                    if not html_fr:
                        raise ValueError("Contenu FR introuvable pour générer l'embedding")
                    soup_fr = BeautifulSoup(html_fr, 'html.parser')
                    text_fr = soup_fr.get_text(separator=' ', strip=True)[:5000]

                # Texte AR
                if dec['summary_ar']:
                    text_ar = dec['summary_ar'][:5000]
                else:
                    html_ar = load_html_content(dec.get('html_ar'), dec.get('file_path_ar'))
                    if not html_ar:
                        raise ValueError("Contenu AR introuvable pour générer l'embedding")
                    soup_ar = BeautifulSoup(html_ar, 'html.parser')
                    text_ar = soup_ar.get_text(separator=' ', strip=True)[:5000]
                
                # Générer les embeddings
                embedding_vector_fr = embedding_model.encode(text_fr)
                embedding_vector_ar = embedding_model.encode(text_ar)
                embedding_bytes_fr = embedding_vector_fr.tobytes()
                embedding_bytes_ar = embedding_vector_ar.tobytes()
                
                # Sauvegarder
                cursor.execute("""
                    UPDATE supreme_court_decisions
                    SET embedding_fr = %s,
                        embedding_ar = %s,
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = %s
                """, (embedding_bytes_fr, embedding_bytes_ar, dec['id']))
                
                results['success'].append(dec['number'])
                print(f"   ✅ {dec['number']} embeddings générés (FR: {len(embedding_bytes_fr)} bytes, AR: {len(embedding_bytes_ar)} bytes)")
                
            except Exception as e:
                print(f"   ❌ Erreur {dec['number']}: {e}")
                results['failed'].append(dec['number'])
        
        conn.commit()
        conn.close()
        
        return jsonify({
            'success_count': len(results['success']),
            'failed_count': len(results['failed']),
            'skipped_count': len(results['skipped']),
            'results': results,
            'message': f"✅ {len(results['success'])} embeddings générés, ❌ {len(results['failed'])} échecs"
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ROUTES POUR SÉLECTION EN CASCADE - Récupération rapide des IDs
# ============================================================================

@coursupreme_bp.route('/chambers/<int:chamber_id>/all-decision-ids', methods=['GET'])
def get_chamber_all_decision_ids(chamber_id):
    """Récupérer tous les IDs des décisions d'une chambre (pour sélection en cascade)"""
    try:
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer tous les IDs des décisions de cette chambre
        cursor.execute("""
            SELECT DISTINCT d.id
            FROM supreme_court_decisions d
            JOIN supreme_court_decision_classifications dc ON d.id = dc.decision_id
            WHERE dc.chamber_id = %s
            ORDER BY d.id
        """, (chamber_id,))
        
        decision_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'chamber_id': chamber_id,
            'decision_ids': decision_ids,
            'count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/themes/<int:theme_id>/all-decision-ids', methods=['GET'])
def get_theme_all_decision_ids(theme_id):
    """Récupérer tous les IDs des décisions d'un thème (pour sélection en cascade)"""
    try:
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer tous les IDs des décisions de ce thème
        cursor.execute("""
            SELECT DISTINCT d.id
            FROM supreme_court_decisions d
            JOIN supreme_court_decision_classifications dc ON d.id = dc.decision_id
            WHERE dc.theme_id = %s
            ORDER BY d.id
        """, (theme_id,))
        
        decision_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'theme_id': theme_id,
            'decision_ids': decision_ids,
            'count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@coursupreme_bp.route('/all-decision-ids', methods=['GET'])
def get_all_decision_ids():
    """Récupérer tous les IDs de toutes les décisions (pour 'Tout sélectionner')"""
    try:
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM supreme_court_decisions ORDER BY id")
        decision_ids = [row[0] for row in cursor.fetchall()]
        conn.close()
        
        return jsonify({
            'decision_ids': decision_ids,
            'count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/chambers/<int:chamber_id>/all-ids', methods=['GET'])
def get_chamber_all_ids(chamber_id):
    """Récupérer tous les IDs (thèmes + décisions) d'une chambre"""
    try:
        conn = get_connection_simple()
        cursor = conn.cursor()
        
        # Récupérer les IDs des thèmes
        cursor.execute("""
            SELECT DISTINCT theme_id
            FROM supreme_court_decision_classifications
            WHERE chamber_id = %s
        """, (chamber_id,))
        theme_ids = [row[0] for row in cursor.fetchall()]
        
        # Récupérer les IDs des décisions
        cursor.execute("""
            SELECT DISTINCT decision_id
            FROM supreme_court_decision_classifications
            WHERE chamber_id = %s
        """, (chamber_id,))
        decision_ids = [row[0] for row in cursor.fetchall()]
        
        conn.close()
        
        return jsonify({
            'chamber_id': chamber_id,
            'theme_ids': theme_ids,
            'decision_ids': decision_ids,
            'theme_count': len(theme_ids),
            'decision_count': len(decision_ids)
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/themes/all', methods=['GET'])
def get_all_themes():
    """Liste complète des thèmes avec leur chambre (pour autocomplétion)."""
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT t.id,
                           t.name_ar,
                           t.name_fr,
                           t.chamber_id
                    FROM supreme_court_themes t
                    WHERE t.name_ar IS NOT NULL OR t.name_fr IS NOT NULL
                    ORDER BY t.chamber_id, t.id
                    """
                )
                themes = [dict(row) for row in cur.fetchall()]
        return jsonify({'themes': themes, 'count': len(themes)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/index/french/rebuild', methods=['POST'])
def rebuild_french_index():
    """Regénérer l’index inversé français."""
    try:
        conn = get_connection_simple()
        inserted = rebuild_french_index_entries(conn)
        conn.close()
        return jsonify({'inserted': inserted})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/search/advanced', methods=['GET'])
def advanced_search():
    """Recherche avancée (PostgreSQL) : mots-clés, dates, décision, chambres/thèmes."""
    keywords_inc = request.args.get('keywords_inc', '')
    keywords_or = request.args.get('keywords_or', '')
    keywords_exc = request.args.get('keywords_exc', '')
    decision_number = request.args.get('decision_number', '')
    date_from = request.args.get('date_from', '')
    date_to = request.args.get('date_to', '')
    from datetime import date as _date
    if isinstance(date_from, (datetime, _date)):
        date_from = date_from.strftime('%Y-%m-%d')
    if isinstance(date_to, (datetime, _date)):
        date_to = date_to.strftime('%Y-%m-%d')
    chambers_inc = [int(x) for x in _parse_id_list(request.args.get('chambers_inc', '')) if str(x).isdigit()]
    chambers_or = [int(x) for x in _parse_id_list(request.args.get('chambers_or', '')) if str(x).isdigit()]
    themes_inc = [int(x) for x in _parse_id_list(request.args.get('themes_inc', '')) if str(x).isdigit()]
    themes_or = [int(x) for x in _parse_id_list(request.args.get('themes_or', '')) if str(x).isdigit()]

    tokens_inc = tokenize_query_param(keywords_inc)
    tokens_or = tokenize_query_param(keywords_or)
    tokens_exc = tokenize_query_param(keywords_exc)

    where = []
    params = []

    if decision_number:
        where.append("decision_number ILIKE %s")
        params.append(f"%{decision_number}%")

    if date_from:
        where.append("decision_date >= %s")
        params.append(parse_fuzzy_date(date_from))
    if date_to:
        where.append("decision_date <= %s")
        params.append(parse_fuzzy_date(date_to, is_end=True))

    def add_token_clause(token):
        where.append(
            "(object_ar ILIKE %s OR object_fr ILIKE %s OR title_ar ILIKE %s OR title_fr ILIKE %s)"
        )
        params.extend([f"%{token}%"] * 4)

    for tok in tokens_inc:
        add_token_clause(tok)

    if tokens_or:
        ors = []
        for tok in tokens_or:
            ors.append(
                "(object_ar ILIKE %s OR object_fr ILIKE %s OR title_ar ILIKE %s OR title_fr ILIKE %s)"
            )
            params.extend([f"%{tok}%"] * 4)
        where.append("(" + " OR ".join(ors) + ")")

    if tokens_exc:
        for tok in tokens_exc:
            where.append(
                "NOT (object_ar ILIKE %s OR object_fr ILIKE %s OR title_ar ILIKE %s OR title_fr ILIKE %s)"
            )
            params.extend([f"%{tok}%"] * 4)

    if chambers_inc:
        placeholders = ",".join(["%s"] * len(chambers_inc))
        where.append(
            f"id IN (SELECT decision_id FROM supreme_court_decision_classifications WHERE chamber_id IN ({placeholders}))"
        )
        params.extend(chambers_inc)
    if themes_inc:
        placeholders = ",".join(["%s"] * len(themes_inc))
        where.append(
            f"id IN (SELECT decision_id FROM supreme_court_decision_classifications WHERE theme_id IN ({placeholders}))"
        )
        params.extend(themes_inc)
    if chambers_or:
        placeholders = ",".join(["%s"] * len(chambers_or))
        where.append(
            f"id IN (SELECT decision_id FROM supreme_court_decision_classifications WHERE chamber_id IN ({placeholders}))"
        )
        params.extend(chambers_or)
    if themes_or:
        placeholders = ",".join(["%s"] * len(themes_or))
        where.append(
            f"id IN (SELECT decision_id FROM supreme_court_decision_classifications WHERE theme_id IN ({placeholders}))"
        )
        params.extend(themes_or)

    where_sql = " AND ".join(where) if where else "1=1"

    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    f"""
                    SELECT id,
                           decision_number,
                           decision_date,
                           object_ar,
                           object_fr,
                           url
                    FROM supreme_court_decisions
                    WHERE {where_sql}
                    ORDER BY decision_date DESC NULLS LAST, id DESC
                    LIMIT 100
                    """,
                    params,
                )
                rows = cur.fetchall()
        candidates = []
        for row in rows:
            entry = dict(row)
            entry['decision_date'] = format_display_date(entry.get('decision_date'))
            candidates.append(entry)
        return jsonify({'results': candidates, 'count': len(candidates)})
    except Exception as e:
        print("⚠️ advanced_search error:", e)
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/search/semantic', methods=['GET'])
def semantic_search():
    """Recherche sémantique par embedding (PostgreSQL + R2, scores triés)."""
    query = (request.args.get('q') or '').strip()
    if not query:
        return jsonify({'error': 'Paramètre q requis'}), 400

    try:
        limit = int(request.args.get('limit', 0))
    except ValueError:
        limit = 0

    try:
        score_threshold = float(request.args.get('score_threshold', 0.0) or 0.0)
    except ValueError:
        score_threshold = 0.0

    try:
        cache = _load_cs_embeddings_cache()
        if not cache:
            return jsonify({'error': 'Aucun embedding disponible'}), 500

        model = get_embedding_model()
        query_vec = model.encode(query, convert_to_numpy=True)
        qnorm = np.linalg.norm(query_vec)
        if qnorm == 0:
            return jsonify({'error': 'Embedding requête invalide'}), 400
        query_vec = query_vec / qnorm

        scored = []
        for item in cache:
            score = float(np.dot(query_vec, item["vector"]))
            scored.append({
                "id": item["id"],
                "decision_number": item["decision_number"],
                "decision_date": item["decision_date"],
                "url": item["url"],
                "score": round(score, 6),
            })

        scored.sort(key=lambda x: x["score"], reverse=True)

        if limit <= 0 or limit > len(scored):
            limit = len(scored)

        score_at_limit = scored[limit - 1]["score"] if scored else None
        filtered = [s for s in scored if s["score"] >= score_threshold]
        results = filtered[:limit]

        def to_float(val):
            try:
                return float(val)
            except Exception:
                return None

        for item in results:
            item["score"] = to_float(item.get("score"))

        return jsonify({
            "results": results,
            "count": len(results),
            "total": len(scored),
            "max_score": to_float(scored[0]["score"]) if scored else None,
            "min_score": to_float(scored[-1]["score"]) if scored else None,
            "score_threshold": to_float(score_threshold),
            "score_at_limit": to_float(score_at_limit),
            "limit": limit,
        })
    except Exception as exc:
        return jsonify({'error': str(exc)}), 500


@coursupreme_bp.route('/stats', methods=['GET'])
def get_global_stats():
    """Récupérer les statistiques globales pour Cour Suprême (MizaneDb)."""
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        COUNT(*) AS total,
                        COUNT(*) FILTER (
                            WHERE download_status IN ('downloaded','completed','success')
                               OR file_path_ar_r2 IS NOT NULL
                               OR file_path_fr_r2 IS NOT NULL
                        ) AS downloaded,
                        COUNT(*) FILTER (
                            WHERE html_content_fr_r2 IS NOT NULL
                               OR analysis_fr_r2 IS NOT NULL
                               OR file_path_fr_r2 IS NOT NULL
                        ) AS translated,
                        COUNT(*) FILTER (
                            WHERE analysis_fr_r2 IS NOT NULL
                               OR analysis_ar_r2 IS NOT NULL
                        ) AS analyzed,
                        COUNT(*) FILTER (
                            WHERE embeddings_fr_r2 IS NOT NULL
                               OR embeddings_ar_r2 IS NOT NULL
                        ) AS embedded
                    FROM supreme_court_decisions
                    """
                )
                row = cur.fetchone()
                total = row['total']
                downloaded = row['downloaded']
                translated = row['translated']
                analyzed = row['analyzed']
                embedded = row['embedded']

        return jsonify({
            'success': True,
            'stats': {
                'total': total,
                'downloaded': downloaded,
                'translated': translated,
                'analyzed': analyzed,
                'embedded': embedded
            }
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@coursupreme_bp.route('/download/<int:decision_id>', methods=['POST'])
def download_single_decision(decision_id):
    """Télécharger une seule décision (wrapper vers batch/download)"""
    import requests
    from flask import request

    try:
        # Récupérer la décision
        conn = get_connection_simple()
        cursor = conn.cursor()
        cursor.execute('SELECT id, url, download_status FROM supreme_court_decisions WHERE id = %s', (decision_id,))
        decision = cursor.fetchone()
        conn.close()

        if not decision:
            return jsonify({'error': 'Décision non trouvée'}), 404

        # Si déjà téléchargée et pas de force
        if decision['download_status'] == 'completed' and not request.json.get('force', False):
            return jsonify({'success': True, 'message': 'Décision déjà téléchargée', 'already_downloaded': True})

        # Télécharger via batch (plus simple que de dupliquer la logique)
        from harvesters.download_decisions_content import download_decision_content

        try:
            result = download_decision_content(decision_id, decision['url'])
            if result:
                return jsonify({'success': True, 'message': 'Décision téléchargée avec succès'})
            else:
                return jsonify({'success': False, 'message': 'Échec du téléchargement'}), 500
        except Exception as e:
            return jsonify({'success': False, 'error': str(e)}), 500

    except Exception as e:
        return jsonify({'error': str(e)}), 500
def file_exists(path):
    url = _build_access_url(path)
    if not url:
        return False
    try:
        resp = requests.head(url, timeout=10)
        if resp.status_code == 403:
            # Certains buckets privés refusent HEAD : on tente un GET léger.
            resp = requests.get(url, stream=True, timeout=10)
            exists = resp.status_code == 200
            resp.close()
            return exists
        return resp.status_code == 200
    except Exception:
        return False


def load_html_content(in_memory_html, file_path):
    """Retourner le contenu HTML depuis la base ou depuis R2."""
    decoded = _decode_text(in_memory_html)
    if decoded:
        return decoded
    if not file_path:
        return None
    return _fetch_text_from_r2(file_path)

@coursupreme_bp.route('/decisions/export', methods=['POST', 'OPTIONS'])
def export_decisions():
    if request.method == 'OPTIONS':
        return jsonify({"success": True}), 200

    data = request.get_json() or {}
    ids = data.get('decision_ids') or data.get('document_ids') or []
    numeric_ids = []
    for value in ids:
        try:
            numeric_ids.append(int(value))
        except (TypeError, ValueError):
            continue
    if not numeric_ids:
        return jsonify({'error': 'decision_ids requis'}), 400

    conn = get_connection_simple()
    cursor = conn.cursor()
    placeholders = ','.join('?' * len(numeric_ids))
    cursor.execute(
        f"""
        SELECT id, decision_number, decision_date,
               html_content_ar, html_content_fr,
               file_path_ar, file_path_fr
        FROM supreme_court_decisions
        WHERE id IN ({placeholders})
        """,
        numeric_ids
    )
    decisions = [dict(row) for row in cursor.fetchall()]
    conn.close()

    if not decisions:
        return jsonify({'error': 'Aucun document trouvé'}), 404

    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
        added = 0
        for decision in decisions:
            # Charger le contenu depuis la base ou, si absent, depuis R2
            contents = {
                'ar': decision.get('html_content_ar') or _fetch_text_from_r2(decision.get('file_path_ar')),
                'fr': decision.get('html_content_fr') or _fetch_text_from_r2(decision.get('file_path_fr')),
            }
            for lang in ('ar', 'fr'):
                content = contents.get(lang) or ''
                if not content:
                    continue
                filename = _build_decision_filename(decision, lang)
                archive.writestr(filename, _strip_html(content))
                added += 1
    if added == 0:
        return jsonify({'error': 'Contenu indisponible'}), 400

    buffer.seek(0)
    download_name = f"coursupreme-decisions-{int(time.time())}.zip"
    try:
        return send_file(buffer, as_attachment=True, download_name=download_name, mimetype='application/zip')
    except TypeError:
        return send_file(buffer, as_attachment=True, attachment_filename=download_name, mimetype='application/zip')
