from __future__ import annotations
from flask import Blueprint, jsonify, request, redirect, send_file
import json
import io
import os
import requests
import time
import zipfile
from datetime import datetime, date
from functools import lru_cache
from requests.adapters import HTTPAdapter
from concurrent.futures import ThreadPoolExecutor, as_completed
from shared.r2_storage import (
    generate_presigned_url,
    build_public_url,
    upload_bytes,
    delete_object as delete_r2_object,
    normalize_key,
)
from psycopg2.extras import Json
from shared.postgres import get_connection as get_pg_connection
import numpy as np
from sentence_transformers import SentenceTransformer

joradp_bp = Blueprint('joradp', __name__)


JORADP_R2_PREFIX = "Textes_juridiques_DZ/joradp.dz"


def _build_r2_session():
    session = requests.Session()
    adapter = HTTPAdapter(pool_connections=16, pool_maxsize=32, pool_block=True)
    session.mount("http://", adapter)
    session.mount("https://", adapter)
    session.headers.setdefault("User-Agent", "DocHarvester/1.0")
    return session


_R2_SESSION = _build_r2_session()
_EMBEDDING_MODEL = None
_EMBED_CACHE = None


def _serialize_date(value):
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return value


def get_embedding_model():
    global _EMBEDDING_MODEL
    if _EMBEDDING_MODEL is None:
        _EMBEDDING_MODEL = SentenceTransformer('all-MiniLM-L6-v2')
    return _EMBEDDING_MODEL


def decode_embedding(blob: bytes | memoryview | None) -> np.ndarray | None:
    if not blob:
        return None
    if isinstance(blob, memoryview):
        blob = blob.tobytes()
    arr = np.frombuffer(blob, dtype=np.float32)
    return arr if arr.size else None


def _download_embedding(url: str) -> bytes | None:
    try:
        resp = _R2_SESSION.get(url, timeout=20)
        if resp.ok:
            return resp.content
    except Exception:
        return None
    return None


def _build_embedding_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    presigned = generate_presigned_url(raw_path)
    if presigned:
        return presigned
    return build_public_url(raw_path)


def _load_embeddings_cache():
    global _EMBED_CACHE
    if _EMBED_CACHE is not None:
        return _EMBED_CACHE

    cache = []
    with get_pg_connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, url, publication_date, file_path_r2, text_path_r2, embeddings_r2
                FROM joradp_documents
                WHERE embeddings_r2 IS NOT NULL
                """
            )
            rows = cur.fetchall()

    def worker(row):
        emb_url = _build_embedding_url(row["embeddings_r2"])
        if not emb_url:
            return None
        blob = _download_embedding(emb_url)
        vec = decode_embedding(blob)
        if vec is None or vec.size == 0:
            return None
        norm = np.linalg.norm(vec)
        if norm == 0:
            return None
        vec = vec / norm  # pré-normalisation pour accélérer le scoring
        return {
            "id": row["id"],
            "url": row["url"],
            "publication_date": _serialize_date(row["publication_date"]),
            "file_path_r2": row["file_path_r2"],
            "text_path_r2": row["text_path_r2"],
            "vector": vec,
        }

    # Téléchargement parallèle pour éviter une attente interminable sur la première requête.
    with ThreadPoolExecutor(max_workers=12) as executor:
        futures = [executor.submit(worker, row) for row in rows]
        for fut in as_completed(futures):
            item = fut.result()
            if item:
                cache.append(item)

    _EMBED_CACHE = cache
    return _EMBED_CACHE


def _extract_year_from_filename(filename: str) -> str:
    if len(filename) >= 5 and filename[1:5].isdigit():
        return filename[1:5]
    return "unknown"


def _build_pdf_key(filename: str) -> str:
    year = _extract_year_from_filename(filename)
    return f"{JORADP_R2_PREFIX}/{year}/{filename}"


def _build_text_key(pdf_key: str) -> str:
    if pdf_key.endswith(".pdf"):
        return pdf_key[:-4] + ".txt"
    return f"{pdf_key}.txt"


def _parse_date_string(value: str | None) -> date | None:
    if not value:
        return None
    raw = str(value).strip()
    if not raw:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _normalize_keywords(value) -> list[str] | None:
    if not value:
        return None
    if isinstance(value, list):
        keywords = [str(item).strip() for item in value if str(item).strip()]
        return keywords or None
    if isinstance(value, str):
        keywords = [token.strip() for token in value.replace(';', ',').split(',') if token.strip()]
        return keywords or None
    return None


def _extract_date_from_entities(entities, url: str | None) -> date | None:
    """
    Extrait la première date depuis les entités nommées et valide la cohérence avec l'URL.
    Format attendu des entités: ["DATE - 21 Août 1962", "PERSON - Nom", ...]
    """
    import re
    from dateutil import parser as date_parser

    if not entities or not isinstance(entities, list):
        return None

    # Extraire l'année depuis l'URL pour validation
    url_year = None
    if url:
        match = re.search(r'/F(\d{4})\d{3}\.pdf$', url)
        if match:
            url_year = int(match.group(1))

    # Chercher la première DATE dans les entités
    for entity in entities:
        if not isinstance(entity, str):
            continue

        # Format: "DATE - 21 Août 1962" ou "DATE - YYYY-MM-DD"
        if entity.upper().startswith('DATE'):
            # Extraire la partie après "DATE -"
            parts = entity.split('-', 1)
            if len(parts) < 2:
                continue

            date_str = parts[1].strip()

            try:
                # Essayer de parser la date (gère "21 Août 1962", "1962-08-21", etc.)
                parsed_date = date_parser.parse(date_str, dayfirst=True)

                # Valider la cohérence avec l'année de l'URL
                if url_year and abs(parsed_date.year - url_year) > 1:
                    # Tolérance de 1 an pour tenir compte des décalages possibles
                    print(f"⚠️  Date extraite {parsed_date.date()} incohérente avec URL année {url_year}, ignorée")
                    continue

                return parsed_date.date()

            except (ValueError, OverflowError) as e:
                print(f"⚠️  Impossible de parser la date '{date_str}': {e}")
                continue

    return None


def _upsert_ai_metadata(cur, document_id: int, payload: dict) -> None:
    keywords = payload.get('keywords')
    entities = payload.get('entities')
    dates_extracted = payload.get('dates_extracted')
    extra_metadata = payload.get('extra_metadata')

    cur.execute(
        """
        INSERT INTO document_ai_metadata (
            document_id,
            corpus,
            language,
            title,
            publication_date,
            summary,
            keywords,
            entities,
            dates_extracted,
            extra_metadata
        )
        VALUES (%s, 'joradp', %s, %s, %s, %s, %s, %s, %s, %s)
        ON CONFLICT (document_id, corpus, language)
        DO UPDATE SET
            title = EXCLUDED.title,
            publication_date = EXCLUDED.publication_date,
            summary = EXCLUDED.summary,
            keywords = EXCLUDED.keywords,
            entities = EXCLUDED.entities,
            dates_extracted = EXCLUDED.dates_extracted,
            extra_metadata = EXCLUDED.extra_metadata,
            updated_at = timezone('utc', now())
        """,
        (
            document_id,
            payload.get('language') or 'fr',
            payload.get('title'),
            payload.get('publication_date'),
            payload.get('summary'),
            keywords,
            Json(entities) if entities is not None else None,
            Json(dates_extracted) if dates_extracted is not None else None,
            Json(extra_metadata) if extra_metadata is not None else None,
        ),
    )

def _ensure_public_url(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    return build_public_url(raw_path)


def _fetch_r2_text(raw_path: str | None) -> str | None:
    if not raw_path:
        return None
    url = generate_presigned_url(raw_path) or build_public_url(raw_path)
    if not url:
        return None
    try:
        with _R2_SESSION.get(url, timeout=60) as resp:
            if resp.ok:
                resp.encoding = 'utf-8'
                return resp.text
    except Exception:
        return None
    return None


def _fetch_r2_bytes(raw_path: str | None) -> bytes | None:
    if not raw_path:
        return None
    url = generate_presigned_url(raw_path) or build_public_url(raw_path)
    if not url:
        return None
    try:
        with _R2_SESSION.get(url, timeout=60) as resp:
            if resp.ok:
                return resp.content
    except Exception:
        return None
    return None


@lru_cache(maxsize=2048)
def _r2_exists(raw_path: str | None) -> bool:
    if not raw_path:
        return False
    url = generate_presigned_url(raw_path) or build_public_url(raw_path)
    if not url:
        return False
    try:
        resp = _R2_SESSION.head(url, timeout=10)
        if resp.status_code == 403:
            probe = _R2_SESSION.get(url, stream=True, timeout=10)
            exists = probe.status_code == 200
            probe.close()
            resp.close()
            return exists
        exists = resp.status_code == 200
        resp.close()
        return exists
    except Exception:
        return False


@joradp_bp.before_app_request
def _clear_r2_exists_cache():
    _r2_exists.cache_clear()


def build_r2_url(raw_path: str | None) -> str | None:
    """
    Retourne une URL R2 pré-signée pour l'accès au fichier.
    """
    if not raw_path:
        return None
    # Toujours utiliser une URL presignée pour l'accès direct aux fichiers
    return generate_presigned_url(raw_path, expires_in=3600)


def _derive_pdf_key(file_path: str | None, url: str) -> str:
    key = normalize_key(file_path) if file_path else None
    if key:
        return key
    filename = url.split('/')[-1]
    return _build_pdf_key(filename)


def _ensure_text_content(doc_id: int, file_path: str | None, text_path: str | None, url: str):
    """
    Retourne le texte associé à un document, en le générant si nécessaire.
    """
    existing_text = _fetch_r2_text(text_path)
    if existing_text:
        return existing_text, text_path

    pdf_bytes = _fetch_r2_bytes(file_path)
    if not pdf_bytes:
        with _R2_SESSION.get(url, timeout=60) as response:
            response.raise_for_status()
            pdf_bytes = response.content

    import PyPDF2

    reader = PyPDF2.PdfReader(io.BytesIO(pdf_bytes))
    extracted_text = ""
    for page in reader.pages:
        extracted_text += (page.extract_text() or "") + "\n"

    pdf_key = _derive_pdf_key(file_path, url)
    text_key = _build_text_key(pdf_key)
    uploaded_text_url = upload_bytes(text_key, extracted_text.encode('utf-8'), content_type='text/plain')

    with get_pg_connection() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE joradp_documents
            SET text_path_r2 = %s,
                text_extraction_status = 'success',
                text_extracted_at = timezone('utc', now()),
                error_log = NULL
            WHERE id = %s
            """,
            (uploaded_text_url, doc_id),
        )
        conn.commit()

    return extracted_text, uploaded_text_url

VALID_STATUS_VALUES = {'pending', 'in_progress', 'success', 'failed'}

def normalize_status(status):
    """Ramène n'importe quelle valeur à un statut normalisé."""
    if status is None:
        return 'pending'

    normalized = str(status).strip().lower()
    if normalized in VALID_STATUS_VALUES:
        return normalized

    if normalized == 'skipped':
        return 'pending'

    return 'pending'


def reconcile_status_with_existence(status, exists):
    """
    Ajuste un statut en fonction de l'existence d'une ressource (fichier PDF/TXT).
    """
    normalized = normalize_status(status)

    if exists is True and normalized in {'pending', 'failed'}:
        return 'success'

    if exists is False and normalized == 'success':
        return 'failed'

    return normalized


def is_success(status):
    return normalize_status(status) == 'success'


def extract_num_from_url(url: str) -> str | None:
    """Parse the document number from a JORADP URL."""
    if not url:
        return None

    filename = url.split('/')[-1]
    if len(filename) >= 8 and filename[0].upper() == 'F' and filename[5:8].isdigit():
        return filename[5:8]
    if '.' in filename:
        return filename.rsplit('.', 1)[0]
    return filename

# ============================================================================
# ROUTES DOCUMENTS
# ============================================================================

@joradp_bp.route('/documents/<int:doc_id>/metadata', methods=['GET'])
def get_document_metadata(doc_id):
    """Récupérer les métadonnées d'un document depuis MizaneDb."""
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    SELECT
                        d.id,
                        d.url,
                        d.publication_date,
                        d.file_size_bytes,
                        d.file_path_r2,
                        d.text_path_r2,
                        d.metadata_collection_status,
                        d.download_status,
                        d.text_extraction_status,
                        d.ai_analysis_status,
                        d.embedding_status,
                        d.metadata_collected_at,
                        d.downloaded_at,
                        d.text_extracted_at,
                        d.analyzed_at,
                        d.embedded_at,
                        d.error_log,
                        jm.title AS metadata_title,
                        jm.publication_date AS metadata_publication_date,
                        jm.language AS metadata_language,
                        jm.description AS metadata_description,
                        jm.page_count AS metadata_page_count,
                        ai.summary AS ai_summary,
                        ai.keywords AS ai_keywords,
                        ai.entities AS ai_entities,
                        ai.dates_extracted AS ai_dates,
                        ai.extra_metadata AS ai_extra,
                        ai.language AS ai_language,
                        ai.updated_at AS ai_updated_at
                    FROM joradp_documents d
                    LEFT JOIN joradp_metadata jm ON jm.document_id = d.id
                    LEFT JOIN LATERAL (
                        SELECT *
                        FROM document_ai_metadata dam
                        WHERE dam.document_id = d.id
                          AND dam.corpus = 'joradp'
                        ORDER BY CASE WHEN dam.language = 'fr' THEN 0 ELSE 1 END
                        LIMIT 1
                    ) ai ON TRUE
                    WHERE d.id = %s
                    """,
                    (doc_id,),
                )
                row = cur.fetchone()
        if not row:
            return jsonify({'error': 'Document non trouvé'}), 404

        analysis_metadata = row.get('ai_extra') or {}
        if isinstance(analysis_metadata, str):
            try:
                analysis_metadata = json.loads(analysis_metadata)
            except json.JSONDecodeError:
                analysis_metadata = {}

        file_exists = bool(row.get('file_path_r2'))
        text_exists = bool(row.get('text_path_r2'))

        statuts = {
            'collected': normalize_status(row.get('metadata_collection_status')),
            'downloaded': reconcile_status_with_existence(row.get('download_status'), file_exists),
            'text_extracted': reconcile_status_with_existence(row.get('text_extraction_status'), text_exists),
            'analyzed': normalize_status(row.get('ai_analysis_status')),
            'embedded': normalize_status(row.get('embedding_status')),
        }

        metadata_title = row.get('metadata_title')
        ai_title = analysis_metadata.get('title') or analysis_metadata.get('document_title')
        ai_title_origin = analysis_metadata.get('title_origin')
        if metadata_title:
            title_value = metadata_title
            title_origin = 'extracted'
        elif ai_title:
            title_value = ai_title
            if isinstance(ai_title_origin, str) and ai_title_origin.lower() in ('extracted', 'generated'):
                title_origin = ai_title_origin.lower()
            else:
                title_origin = 'generated'
        else:
            title_value = None
            title_origin = None

        summary = row.get('ai_summary') or analysis_metadata.get('summary')
        if isinstance(summary, dict):
            summary = summary.get('fr') or summary.get('en')

        keywords_raw = row.get('ai_keywords') or analysis_metadata.get('keywords')
        keywords_list: list[str] = []
        if isinstance(keywords_raw, list):
            keywords_list = [str(kw).strip() for kw in keywords_raw if str(kw).strip()]
        elif isinstance(keywords_raw, dict):
            base = keywords_raw.get('fr') or keywords_raw.get('en') or []
            if isinstance(base, list):
                keywords_list = [str(kw).strip() for kw in base if str(kw).strip()]
        elif isinstance(keywords_raw, str):
            keywords_list = [kw.strip() for kw in keywords_raw.replace(';', ',').split(',') if kw.strip()]

        named_entities = row.get('ai_entities') or analysis_metadata.get('entities')
        named_entities_list: list[str] | None = None
        named_entities_str: str | None = None
        if isinstance(named_entities, list):
            named_entities_list = []
            for entity in named_entities:
                if isinstance(entity, str):
                    named_entities_list.append(entity)
                elif isinstance(entity, dict):
                    etype = entity.get('type') or entity.get('label') or ''
                    value = entity.get('value') or entity.get('name') or ''
                    if etype or value:
                        named_entities_list.append(f"{etype.upper() if etype else 'ENTITÉ'} - {value}".strip(' -'))
                else:
                    named_entities_list.append(str(entity))
            named_entities_str = '\n'.join(named_entities_list)
        elif isinstance(named_entities, dict):
            named_entities_list = []
            for label, values in named_entities.items():
                if isinstance(values, list):
                    named_entities_list.extend(f"{label}: {value}" for value in values)
            named_entities_str = '\n'.join(named_entities_list)
        elif named_entities:
            named_entities_str = str(named_entities)

        publication_date = _serialize_date(row.get('publication_date') or row.get('metadata_publication_date'))
        doc = {
            'id': row['id'],
            'url': row['url'],
            'publication_date': publication_date,
            'file_size_bytes': row.get('file_size_bytes'),
            'file_path': row.get('file_path_r2'),
            'text_path': row.get('text_path_r2'),
            'metadata_collected_at': row.get('metadata_collected_at'),
            'downloaded_at': row.get('downloaded_at'),
            'text_extracted_at': row.get('text_extracted_at'),
            'analyzed_at': row.get('analyzed_at'),
            'embedded_at': row.get('embedded_at'),
            'statuts': statuts,
            'title': title_value,
            'title_origin': title_origin,
            'document_language': row.get('metadata_language') or analysis_metadata.get('language') or row.get('ai_language'),
            'language': row.get('metadata_language') or analysis_metadata.get('language') or row.get('ai_language'),
            'document_page_count': row.get('metadata_page_count'),
            'metadata_description': row.get('metadata_description'),
            'summary': summary,
            'keywords': ', '.join(keywords_list),
            'keywords_list': keywords_list,
            'named_entities': named_entities_str,
            'named_entities_list': named_entities_list,
            'dates_extracted': row.get('ai_dates'),
            'analysis_updated_at': row.get('ai_updated_at'),
            'draft_date': analysis_metadata.get('draft_date') or analysis_metadata.get('document_date'),
            'numero': extract_num_from_url(row.get('url')),
            'error_log': row.get('error_log'),
        }

        text_content = _fetch_r2_text(doc.get('text_path'))
        if text_content:
            preview = text_content[:1500]
            doc['text_preview'] = preview
            doc['text_preview_length'] = len(preview)

        doc['extra_metadata'] = {
            'source': 'mizane_db',
            'metadata_page_count': row.get('metadata_page_count'),
            'metadata_description': row.get('metadata_description'),
            'analysis_extra': analysis_metadata or None,
        }

        return jsonify({'success': True, 'metadata': doc})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/documents/<int:doc_id>/download', methods=['POST'])
def download_single_document(doc_id):
    """Télécharger un seul document PDF"""
    try:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, url, file_path_r2, download_status
                FROM joradp_documents
                WHERE id = %s
                """,
                (doc_id,),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Document non trouvé"}), 404

            already_exists = bool(row.get('file_path_r2'))
            cur.execute(
                """
                UPDATE joradp_documents
                SET download_status = 'in_progress',
                    error_log = NULL
                WHERE id = %s
                """,
                (doc_id,),
            )
            conn.commit()

        url = row["url"]
        response = requests.get(url, timeout=30)
        response.raise_for_status()
        filename = url.split('/')[-1]
        pdf_key = _build_pdf_key(filename)
        uploaded_url = upload_bytes(pdf_key, response.content, content_type='application/pdf')

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE joradp_documents
                SET file_path_r2 = %s,
                    download_status = 'success',
                    downloaded_at = timezone('utc', now()),
                    file_size_bytes = %s
                WHERE id = %s
                """,
                (uploaded_url, len(response.content), doc_id),
            )
            conn.commit()

        return jsonify(
            {
                "success": True,
                "message": "Document téléchargé avec succès",
                "file_path": uploaded_url,
                "file_exists_before": already_exists,
                "overwritten": already_exists,
            }
        )

    except requests.RequestException as e:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE joradp_documents
                SET download_status = 'failed',
                    error_log = %s
                WHERE id = %s
                """,
                (str(e), doc_id),
            )
            conn.commit()
        return jsonify({"error": "Erreur de téléchargement", "message": str(e)}), 500
    except Exception as e:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                UPDATE joradp_documents
                SET download_status = 'failed',
                    error_log = %s
                WHERE id = %s
                """,
                (str(e), doc_id),
            )
            conn.commit()
        return jsonify({"error": "Erreur serveur", "message": str(e)}), 500

@joradp_bp.route('/documents/<int:doc_id>/view', methods=['GET'])
def view_document(doc_id):
    """Servir le fichier PDF pour visualisation"""
    try:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute("SELECT file_path_r2 FROM joradp_documents WHERE id = %s", (doc_id,))
            doc = cur.fetchone()
        if not doc or not doc['file_path_r2']:
            return jsonify({"error": "Document non trouvé ou pas encore téléchargé"}), 404

        url = build_r2_url(doc['file_path_r2'])

        if not url:
            return jsonify({
                "error": "URL R2 introuvable pour ce document",
                "path": doc['file_path_r2']
            }), 404

        # Redirige vers l’URL R2 (le navigateur chargera le PDF directement).
        return redirect(url, code=302)

    except Exception as e:
        return jsonify({
            "error": "Erreur serveur",
            "message": str(e)
        }), 500


@joradp_bp.route('/documents/<int:doc_id>', methods=['DELETE'])
def delete_document(doc_id):
    """Supprimer un document de la base de données"""
    try:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                "SELECT file_path_r2, text_path_r2 FROM joradp_documents WHERE id = %s",
                (doc_id,),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({'error': 'Document non trouvé'}), 404

            cur.execute("DELETE FROM document_ai_metadata WHERE document_id = %s AND corpus = 'joradp'", (doc_id,))
            cur.execute("DELETE FROM joradp_documents WHERE id = %s", (doc_id,))
            conn.commit()

        delete_r2_object(row['file_path_r2'])
        delete_r2_object(row['text_path_r2'])

        return jsonify({'success': True, 'message': 'Document supprimé'})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# ROUTES SITES
# ============================================================================

@joradp_bp.route('/sites', methods=['GET'])
def get_sites():
    """Liste tous les sites JORADP avec statistiques (MizaneDb)."""
    try:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    s.id,
                    s.name,
                    s.url,
                    s.created_at,
                    COUNT(DISTINCT hs.id) AS nb_sessions,
                    COUNT(d.id) AS nb_documents,
                    SUM(CASE WHEN hs.status = 'running' THEN 1 ELSE 0 END) AS nb_running
                FROM sites s
                LEFT JOIN harvesting_sessions hs ON s.id = hs.site_id
                LEFT JOIN joradp_documents d ON hs.id = d.session_id
                GROUP BY s.id
                ORDER BY s.created_at DESC NULLS LAST
                """
            )
            sites = []
            for row in cur.fetchall():
                sites.append(
                    {
                        'id': row['id'],
                        'name': row['name'],
                        'url': row['url'],
                        'created_at': row['created_at'],
                        'nb_sessions': row['nb_sessions'] or 0,
                        'nb_documents': row['nb_documents'] or 0,
                        'status': 'running' if (row['nb_running'] or 0) > 0 else 'idle',
                    }
                )
        return jsonify({'success': True, 'sites': sites})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/sites/<int:site_id>/sessions', methods=['GET'])
def get_site_sessions(site_id):
    """Liste toutes les sessions d'un site (Postgres)."""
    try:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    hs.id,
                    hs.session_name,
                    hs.status,
                    hs.current_phase,
                    hs.created_at,
                    COUNT(d.id) AS nb_documents,
                    SUM(CASE WHEN d.metadata_collection_status = 'success' THEN 1 ELSE 0 END) AS nb_collected,
                    SUM(CASE WHEN d.download_status = 'success' THEN 1 ELSE 0 END) AS nb_downloaded,
                    SUM(CASE WHEN d.ai_analysis_status = 'success' THEN 1 ELSE 0 END) AS nb_analyzed
                FROM harvesting_sessions hs
                LEFT JOIN joradp_documents d ON hs.id = d.session_id
                WHERE hs.site_id = %s
                GROUP BY hs.id
                ORDER BY hs.created_at DESC NULLS LAST
                """,
                (site_id,),
            )
            sessions = []
            for row in cur.fetchall():
                total_docs = row['nb_documents'] or 0
                sessions.append(
                    {
                        'id': row['id'],
                        'session_name': row['session_name'],
                        'status': row['status'],
                        'current_phase': row['current_phase'],
                        'created_at': row['created_at'],
                        'nb_documents': total_docs,
                        'phases': {
                            'collect': {'done': row['nb_collected'] or 0, 'total': total_docs},
                            'download': {'done': row['nb_downloaded'] or 0, 'total': total_docs},
                            'analyze': {'done': row['nb_analyzed'] or 0, 'total': total_docs},
                        },
                    }
                )
        return jsonify({'success': True, 'sessions': sessions})
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# ROUTES SESSIONS
# ============================================================================

@joradp_bp.route('/sessions/<int:session_id>/documents', methods=['GET'])
def get_session_documents(session_id):
    """Récupérer les documents d'une session avec pagination et filtres (MizaneDb)."""
    try:
        page = max(1, int(request.args.get('page', 1)))
        per_page = min(200, int(request.args.get('per_page', 50)))
        offset = (page - 1) * per_page

        year = request.args.get('year')
        date_debut = request.args.get('date_debut')
        date_fin = request.args.get('date_fin')
        status = request.args.get('status', 'all')
        search_num = request.args.get('search_num')

        where_clauses = ['d.session_id = %s']
        params = [session_id]

        if year:
            # Pattern strict: /FYYYY suivi de 3 chiffres (numéro) puis .pdf
            where_clauses.append("d.url ~ %s")
            params.append(f'/F{year}[0-9]{{3}}\\.pdf$')
        if date_debut:
            where_clauses.append('d.publication_date >= %s')
            params.append(date_debut)
        if date_fin:
            where_clauses.append('d.publication_date <= %s')
            params.append(date_fin)
        if status != 'all':
            mapping = {
                'collected': 'd.metadata_collection_status',
                'downloaded': 'd.download_status',
                'text': 'd.text_extraction_status',
                'analyzed': 'd.ai_analysis_status',
                'embedded': 'd.embedding_status',
            }
            column = mapping.get(status)
            if column:
                where_clauses.append(f"{column} = 'success'")
        if search_num:
            where_clauses.append('d.url ILIKE %s')
            params.append(f'%{search_num}%')

        where_sql = ' AND '.join(where_clauses)

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(f"SELECT COUNT(*) AS total FROM joradp_documents d WHERE {where_sql}", params)
            total = cur.fetchone()['total']

            cur.execute(
                f"""
                SELECT
                    d.id,
                    d.url,
                    d.publication_date,
                    d.file_size_bytes,
                    d.metadata_collection_status,
                    d.download_status,
                    d.text_extraction_status,
                    d.ai_analysis_status,
                    d.embedding_status,
                    d.file_path_r2,
                    d.text_path_r2,
                    d.metadata_collected_at,
                    d.downloaded_at,
                    d.text_extracted_at,
                    d.analyzed_at,
                    d.embedded_at
                FROM joradp_documents d
                WHERE {where_sql}
                ORDER BY COALESCE(d.publication_date, d.created_at) DESC, d.id DESC
                LIMIT %s OFFSET %s
                """,
                params + [per_page, offset],
            )
            rows = cur.fetchall()

        documents = []
        for row in rows:
            url = row['url'] or ''
            filename = url.split('/')[-1]
            numero = filename[5:8] if len(filename) >= 8 else ''

            # Extraire l'année depuis publication_date (prioritaire) ou depuis l'URL en fallback
            year_str = None
            if row['publication_date']:
                try:
                    year_str = str(row['publication_date'].year)
                except (AttributeError, ValueError):
                    pass
            # Fallback sur l'année dans l'URL si pas de publication_date
            if not year_str and len(filename) >= 8 and filename.startswith('F') and filename[1:5].isdigit():
                year_str = filename[1:5]

            file_exists = bool(row['file_path_r2'])
            text_exists = bool(row['text_path_r2'])
            documents.append(
                {
                    'id': row['id'],
                    'url': row['url'],
                    'numero': numero,
                    'date': year_str,
                    'publication_date': _serialize_date(row['publication_date']),
                    'size_kb': round((row['file_size_bytes'] or 0) / 1024, 1) if row['file_size_bytes'] else 0,
                    'file_path': row['file_path_r2'],
                    'text_path': row['text_path_r2'],
                    'file_exists': file_exists,
                    'text_exists': text_exists,
                    'metadata_collected_at': row.get('metadata_collected_at'),
                    'downloaded_at': row.get('downloaded_at'),
                    'text_extracted_at': row.get('text_extracted_at'),
                    'analyzed_at': row.get('analyzed_at'),
                    'embedded_at': row.get('embedded_at'),
                    'statuts': {
                        'collected': normalize_status(row['metadata_collection_status']),
                        'downloaded': reconcile_status_with_existence(row['download_status'], file_exists),
                        'text_extracted': reconcile_status_with_existence(row['text_extraction_status'], text_exists),
                        'analyzed': normalize_status(row['ai_analysis_status']),
                        'embedded': normalize_status(row['embedding_status']),
                    },
                }
            )

        return jsonify(
            success=True,
            documents=documents,
            pagination={
                'page': page,
                'per_page': per_page,
                'total': total,
                'total_pages': (total + per_page - 1) // per_page,
            },
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/sessions/delete', methods=['POST'])
def delete_sessions():
    """Supprimer plusieurs sessions (bulk)"""
    data = request.json or {}
    session_ids = data.get('session_ids', [])

    if not session_ids:
        return jsonify({'error': 'session_ids requis'}), 400

    try:
        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute("DELETE FROM harvesting_sessions WHERE id = ANY(%s)", (session_ids,))
            deleted = cur.rowcount
            conn.commit()
        return jsonify({'success': True, 'deleted': deleted})

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/sessions/<int:session_id>/download', methods=['POST'])
def download_documents_batch(session_id):
    """Télécharger les PDFs en batch"""
    try:
        data = request.json or {}
        mode = data.get('mode', 'all')

        where_clauses = ["d.session_id = %s", "(d.download_status = 'pending' OR d.download_status = 'failed')"]
        params = [session_id]

        if mode == 'selected':
            doc_ids = data.get('document_ids', [])
            if not doc_ids:
                return jsonify({'error': 'Aucun document sélectionné'}), 400
            where_clauses.append("d.id = ANY(%s)")
            params.append(doc_ids)

        where_sql = " AND ".join(where_clauses)

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT d.id, d.url
                FROM joradp_documents d
                WHERE {where_sql}
                """,
                tuple(params),
            )
            documents = cur.fetchall()

        if not documents:
            return jsonify({
                'success': True,
                'message': 'Aucun document à télécharger',
                'downloaded': 0
            })

        success_count = 0
        failed_count = 0

        for doc in documents:
            doc_id = doc['id']
            url = doc['url']

            try:
                response = requests.get(url, timeout=30)
                response.raise_for_status()
                filename = url.split('/')[-1]
                pdf_key = _build_pdf_key(filename)
                uploaded_url = upload_bytes(pdf_key, response.content, content_type='application/pdf')

                with get_pg_connection() as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE joradp_documents
                        SET download_status = 'success',
                            downloaded_at = timezone('utc', now()),
                            file_path_r2 = %s,
                            file_size_bytes = %s
                        WHERE id = %s
                        """,
                        (uploaded_url, len(response.content), doc_id),
                    )
                    conn.commit()
                success_count += 1

            except Exception as e:
                with get_pg_connection() as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE joradp_documents
                        SET download_status = 'failed',
                            error_log = %s
                        WHERE id = %s
                        """,
                        (str(e), doc_id),
                    )
                    conn.commit()
                failed_count += 1

        return jsonify({
            'success': True,
            'downloaded': success_count,
            'failed': failed_count,
            'total': len(documents)
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/documents/export', methods=['POST'])
def export_selected_documents():
    """
    Exporter plusieurs PDF téléchargés en un seul ZIP (via leurs URL R2).
    """
    try:
        data = request.json or {}
        document_ids = data.get('document_ids') or []
        if not document_ids or not isinstance(document_ids, list):
            return jsonify({'error': 'document_ids requis (liste)'}), 400

        numeric_ids = []
        for doc_id in document_ids:
            try:
                numeric_ids.append(int(doc_id))
            except (TypeError, ValueError):
                continue

        if not numeric_ids:
            return jsonify({'error': 'document_ids invalides'}), 400

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, url, file_path_r2
                FROM joradp_documents
                WHERE id = ANY(%s)
                  AND file_path_r2 IS NOT NULL
                  AND download_status = 'success'
                """,
                (numeric_ids,),
            )
            docs = cur.fetchall()

        if not docs:
            return jsonify({'error': 'Aucun PDF disponible pour les IDs fournis'}), 404

        buffer = io.BytesIO()
        added = 0
        with zipfile.ZipFile(buffer, 'w', zipfile.ZIP_DEFLATED) as archive:
            for row in docs:
                raw_url = row['file_path_r2']
                if not raw_url:
                    continue
                signed = generate_presigned_url(raw_url, expires_in=600) or build_public_url(raw_url)
                if not signed:
                    continue
                try:
                    resp = _R2_SESSION.get(signed, timeout=30)
                    resp.raise_for_status()
                    filename = raw_url.split('/')[-1] or f'doc-{row["id"]}.pdf'
                    archive.writestr(filename, resp.content)
                    added += 1
                except Exception as exc:
                    print(f"⚠️  Export ZIP: échec doc {row['id']} - {exc}")
                    continue

        if added == 0:
            return jsonify({'error': 'Aucun fichier exporté (accès R2 ou URLs invalides)'}), 400

        buffer.seek(0)
        download_name = f"joradp-documents-{int(time.time())}.zip"
        try:
            return send_file(buffer, as_attachment=True, download_name=download_name, mimetype='application/zip')
        except TypeError:
            return send_file(buffer, as_attachment=True, attachment_filename=download_name, mimetype='application/zip')

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/sessions/<int:session_id>/analyze', methods=['POST'])
def analyze_documents_batch(session_id):
    """Analyser les documents d'une session avec OpenAI IA (MizaneDb)."""
    try:
        try:
            from openai import OpenAI
        except ImportError:
            return jsonify({'error': "Le module 'openai' est manquant. Installez-le dans le venv backend (pip install openai>=1.0.0)."}), 500
        from analysis import get_embedding_model

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY non trouvée'}), 500

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    url,
                    publication_date,
                    file_path_r2,
                    text_path_r2,
                    ai_analysis_status,
                    embedding_status
                FROM joradp_documents
                WHERE session_id = %s
                  AND download_status = 'success'
                  AND ai_analysis_status IN ('pending', 'failed')
                ORDER BY id ASC
                """,
                (session_id,),
            )
            documents = cur.fetchall()

        if not documents:
            return jsonify({'success': True, 'message': 'Aucun document à analyser', 'analyzed': 0})

        result = _run_ai_analysis(
            documents,
            client=OpenAI(api_key=api_key),
            embedding_model=get_embedding_model(),
            force=True,
            generate_embeddings=True,
        )
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# ROUTES HARVEST
# ============================================================================

@joradp_bp.route('/harvest/incremental', methods=['POST'])
def incremental_harvest():
    """Moissonnage incrémental JORADP"""
    try:
        data = request.json or {}
        session_id = data.get('session_id')
        mode = data.get('mode', 'depuis_dernier')

        if not session_id:
            return jsonify({'error': 'session_id requis'}), 400

        from harvester_joradp_incremental import JORADPIncrementalHarvester
        harvester = JORADPIncrementalHarvester(session_id)

        if mode == 'depuis_dernier':
            harvester.harvest_depuis_dernier()

        elif mode == 'entre_dates':
            date_debut = data.get('date_debut')
            date_fin = data.get('date_fin')
            if not date_debut or not date_fin:
                return jsonify({'error': 'date_debut et date_fin requis'}), 400
            harvester.harvest_entre_dates(date_debut, date_fin)

        elif mode == 'depuis_numero':
            year = data.get('year')
            start_num = data.get('start_num')
            max_docs = data.get('max_docs', 100)
            if not year or not start_num:
                return jsonify({'error': 'year et start_num requis'}), 400
            harvester.harvest_depuis_numero(year, start_num, max_docs)

        else:
            return jsonify({'error': 'Mode inconnu'}), 400

        result = {
            'success': True,
            'mode': mode,
            'found': harvester.stats['total_found']
        }

        # Ajouter infos du dernier document si disponible
        if hasattr(harvester, 'last_doc_info') and harvester.last_doc_info:
            result['last_document'] = harvester.last_doc_info

        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# ROUTES EXTRACTION DE TEXTE INTELLIGENTE
# ============================================================================

@joradp_bp.route('/documents/extraction-quality', methods=['GET'])
def get_extraction_quality_stats():
    """Route conservée pour compatibilité mais non implémentée après migration."""
    return jsonify({
        'error': 'Statistiques de qualité non disponibles depuis la migration MizaneDb'
    }), 410


@joradp_bp.route('/documents/poor-quality', methods=['GET'])
def get_poor_quality_documents():
    """Route conservée pour compatibilité mais non implémentée après migration."""
    return jsonify({
        'error': 'Inspection détaillée non disponible. Utilisez les statuts MizaneDb.'
    }), 410


@joradp_bp.route('/documents/reextract', methods=['POST'])
def reextract_documents():
    """Route conservée pour compatibilité mais non implémentée après migration."""
    return jsonify({
        'error': 'La ré-extraction passe désormais par /batch/extract (MizaneDb).'
    }), 410


@joradp_bp.route('/documents/<int:doc_id>/reextract', methods=['POST'])
def reextract_single_document(doc_id):
    """Route conservée pour compatibilité mais non implémentée après migration."""
    return jsonify({
        'error': 'Utilisez les nouvelles routes de batch extraction.'
    }), 410


# ============================================================================
# ROUTE STATISTIQUES GLOBALES
# ============================================================================

@joradp_bp.route('/stats', methods=['GET'])
def get_global_stats():
    """Récupérer les statistiques globales pour JORADP depuis MizaneDb."""
    try:
        with get_pg_connection() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT COUNT(*) AS total FROM joradp_documents")
                total = cur.fetchone()['total']

                def count_with_status(column: str) -> int:
                    cur.execute(
                        f"SELECT COUNT(*) AS count FROM joradp_documents WHERE {column} = 'success'"
                    )
                    return cur.fetchone()['count']

                collected = count_with_status("metadata_collection_status")
                downloaded = count_with_status("download_status")
                extracted = count_with_status("text_extraction_status")
                analyzed = count_with_status("ai_analysis_status")
                embedded = count_with_status("embedding_status")

        return jsonify(
            success=True,
            stats=dict(
                total=total,
                collected=collected,
                downloaded=downloaded,
                extracted=extracted,
                analyzed=analyzed,
                embedded=embedded,
            ),
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500


# ============================================================================
# RECHERCHE SÉMANTIQUE (embeddings R2 → scoring en mémoire)
# ============================================================================

@joradp_bp.route('/search/semantic', methods=['GET'])
def semantic_search():
    query = (request.args.get('q') or '').strip()
    if not query:
        return jsonify({'error': 'Paramètre q requis'}), 400

    try:
        limit = int(request.args.get('limit', 0))
    except ValueError:
        limit = 0
    score_threshold = float(request.args.get('score_threshold', 0) or 0)

    cache = _load_embeddings_cache()
    if not cache:
        return jsonify({'error': 'Aucun embedding disponible'}), 500

    model = get_embedding_model()
    query_vec = model.encode(query, convert_to_numpy=True)

    scored = []
    for item in cache:
        score = float(np.dot(query_vec, item["vector"])) / (
            np.linalg.norm(query_vec) * np.linalg.norm(item["vector"])
        )

        # Extraire l'année depuis publication_date (prioritaire) ou depuis l'URL en fallback
        year_str = None
        pub_date = item.get("publication_date")
        if pub_date:
            try:
                # Si c'est une date, extraire l'année
                if hasattr(pub_date, 'year'):
                    year_str = str(pub_date.year)
                # Si c'est une string YYYY-MM-DD
                elif isinstance(pub_date, str) and len(pub_date) >= 4:
                    year_str = pub_date[:4]
            except (AttributeError, ValueError):
                pass

        # Fallback sur l'année dans l'URL si pas de publication_date
        if not year_str:
            url = item["url"] or ""
            filename = url.split('/')[-1]
            if len(filename) >= 8 and filename.startswith('F') and filename[1:5].isdigit():
                year_str = filename[1:5]

        scored.append(
            {
                "id": item["id"],
                "url": item["url"],
                "date": year_str,
                "publication_date": _serialize_date(item["publication_date"]),
                "file_path_r2": item["file_path_r2"],
                "text_path_r2": item["text_path_r2"],
                "score": round(score, 6),
            }
        )

    scored.sort(key=lambda x: x["score"], reverse=True)

    def to_float(val):
        try:
            return float(val)
        except Exception:
            return None

    for item in scored:
        item["score"] = to_float(item.get("score"))

    if limit <= 0 or limit > len(scored):
        limit = len(scored)

    score_at_limit = scored[limit - 1]["score"] if scored else None

    filtered = [s for s in scored if s["score"] >= score_threshold]
    results = filtered[:limit]

    return jsonify(
        {
            "results": results,
            "count": len(results),
            "total": len(scored),
            "max_score": to_float(scored[0]["score"]) if scored else None,
            "min_score": to_float(scored[-1]["score"]) if scored else None,
            "score_threshold": to_float(score_threshold),
            "score_at_limit": to_float(score_at_limit),
            "limit": limit,
        }
    )


# ============================================================================
# ROUTES BATCH POUR SÉLECTION MULTIPLE DE DOCUMENTS
# ============================================================================

@joradp_bp.route('/batch/extract', methods=['POST'])
def batch_extract_documents():
    """Extraire le texte (R2 → MizaneDb) pour plusieurs documents."""
    try:
        data = request.json or {}
        document_ids = data.get('document_ids') or []
        if not document_ids:
            return jsonify({'error': 'Aucun document spécifié'}), 400

        numeric_ids = []
        for doc_id in document_ids:
            try:
                numeric_ids.append(int(doc_id))
            except (TypeError, ValueError):
                continue

        if not numeric_ids:
            return jsonify({'error': 'Identifiants invalides'}), 400

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, url, file_path_r2, text_path_r2
                FROM joradp_documents
                WHERE id = ANY(%s)
                  AND download_status = 'success'
                """,
                (numeric_ids,),
            )
            documents = cur.fetchall()

        if not documents:
            return jsonify({'success': True, 'message': 'Aucun document éligible', 'extracted': 0})

        success_count = 0
        failed_count = 0
        for doc in documents:
            try:
                text_content, new_text_path = _ensure_text_content(
                    doc['id'],
                    doc['file_path_r2'],
                    doc['text_path_r2'],
                    doc['url'],
                )
                if text_content:
                    success_count += 1
                else:
                    failed_count += 1
            except Exception as exc:
                failed_count += 1
                with get_pg_connection() as conn, conn.cursor() as cur:
                    cur.execute(
                        """
                        UPDATE joradp_documents
                        SET text_extraction_status = 'failed',
                            error_log = %s
                        WHERE id = %s
                        """,
                        (str(exc), doc['id']),
                    )
                    conn.commit()

        return jsonify({
            'success': True,
            'message': f'Extraction terminée: {success_count} succès, {failed_count} échecs',
            'extracted': success_count,
            'failed': failed_count,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/batch/analyze', methods=['POST'])
def batch_analyze_documents():
    """Analyser plusieurs documents sélectionnés avec IA + embeddings (MizaneDb)."""
    try:
        try:
            from openai import OpenAI
        except ImportError:
            return jsonify({'error': "Le module 'openai' est manquant. Installez-le dans le venv backend (pip install openai>=1.0.0)."}), 500
        from analysis import get_embedding_model

        data = request.json or {}
        document_ids = data.get('document_ids') or []
        force = bool(data.get('force', False))
        generate_embeddings = bool(data.get('generate_embeddings', False))

        if not document_ids:
            return jsonify({'error': 'Aucun document spécifié'}), 400

        numeric_ids = []
        for doc_id in document_ids:
            try:
                numeric_ids.append(int(doc_id))
            except (TypeError, ValueError):
                continue

        if not numeric_ids:
            return jsonify({'error': 'Identifiants invalides'}), 400

        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            return jsonify({'error': 'OPENAI_API_KEY non trouvée'}), 500

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    url,
                    publication_date,
                    file_path_r2,
                    text_path_r2,
                    ai_analysis_status,
                    embedding_status
                FROM joradp_documents
                WHERE id = ANY(%s)
                  AND download_status = 'success'
                """,
                (numeric_ids,),
            )
            documents = cur.fetchall()

        if not documents:
            return jsonify({'error': 'Aucun document éligible'}), 400

        # Si force=False, filtrer les documents déjà analysés
        docs_to_process = []
        already_analyzed = 0
        for doc in documents:
            if not force and normalize_status(doc['ai_analysis_status']) == 'success':
                already_analyzed += 1
                continue
            docs_to_process.append(doc)

        if not docs_to_process:
            return jsonify({
                'success': True,
                'message': 'Documents déjà analysés',
                'analyzed': 0,
                'failed': 0,
                'already_analyzed': already_analyzed,
            })

        result = _run_ai_analysis(
            docs_to_process,
            client=OpenAI(api_key=api_key),
            embedding_model=get_embedding_model() if generate_embeddings else None,
            force=True,
            generate_embeddings=generate_embeddings,
            already_analyzed=already_analyzed,
        )
        return jsonify(result)

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@joradp_bp.route('/batch/embeddings', methods=['POST'])
def batch_generate_embeddings():
    """Générer uniquement les embeddings pour plusieurs documents sélectionnés."""
    try:
        from analysis import get_embedding_model

        data = request.json or {}
        document_ids = data.get('document_ids') or []
        force = bool(data.get('force', False))

        if not document_ids:
            return jsonify({'error': 'Aucun document spécifié'}), 400

        embedding_model = get_embedding_model()
        if not embedding_model:
            return jsonify({'error': 'Aucun modèle d\'embedding disponible'}), 500

        numeric_ids = []
        for doc_id in document_ids:
            try:
                numeric_ids.append(int(doc_id))
            except (TypeError, ValueError):
                continue

        if not numeric_ids:
            return jsonify({'error': 'Identifiants invalides'}), 400

        with get_pg_connection() as conn, conn.cursor() as cur:
            cur.execute(
                """
                SELECT
                    id,
                    url,
                    publication_date,
                    file_path_r2,
                    text_path_r2,
                    embedding_status
                FROM joradp_documents
                WHERE id = ANY(%s)
                  AND download_status = 'success'
                """,
                (numeric_ids,),
            )
            documents = cur.fetchall()

        to_embed = []
        already_done = 0
        missing_text = 0

        for doc in documents:
            status = normalize_status(doc.get('embedding_status'))
            if not force and status == 'success':
                already_done += 1
                continue

            text_content = _fetch_r2_text(doc['text_path_r2'])
            if not text_content:
                try:
                    text_content, new_text_path = _ensure_text_content(
                        doc['id'],
                        doc['file_path_r2'],
                        doc['text_path_r2'],
                        doc['url'],
                    )
                    doc['text_path_r2'] = new_text_path
                except Exception:
                    missing_text += 1
                    continue
            doc['_text_content'] = text_content
            to_embed.append(doc)

        if not to_embed:
            return jsonify({
                'success': True,
                'embedded': 0,
                'failed': 0,
                'already_embedded': already_done,
                'missing_text': missing_text,
            })

        success_count = 0
        failed_count = 0

        with get_pg_connection() as conn, conn.cursor() as cur:
            for doc in to_embed:
                doc_id = doc['id']
                try:
                    text = doc.get('_text_content')
                    if not text:
                        text, _ = _ensure_text_content(doc_id, doc['file_path_r2'], doc['text_path_r2'], doc['url'])

                    vector = embedding_model.encode(
                        text[:5000],
                        convert_to_numpy=True,
                        normalize_embeddings=True,
                    )
                    if hasattr(vector, 'tolist'):
                        vector = vector.tolist()

                    embedding_data = {
                        'model': 'all-MiniLM-L6-v2',
                        'dimension': len(vector),
                        'vector': [float(v) for v in vector],
                    }

                    _upsert_ai_metadata(
                        cur,
                        doc_id,
                        {
                            'language': 'fr',
                            'title': None,
                            'publication_date': doc.get('publication_date'),
                            'summary': None,
                            'keywords': None,
                            'entities': None,
                            'dates_extracted': None,
                            'extra_metadata': {'embedding': embedding_data},
                        },
                    )

                    cur.execute(
                        """
                        UPDATE joradp_documents
                        SET embedding_status = 'success',
                            embedded_at = timezone('utc', now()),
                            error_log = NULL
                        WHERE id = %s
                        """,
                        (doc_id,),
                    )
                    success_count += 1
                except Exception as exc:
                    cur.execute(
                        """
                        UPDATE joradp_documents
                        SET embedding_status = 'failed',
                            embedded_at = NULL,
                            error_log = %s
                        WHERE id = %s
                        """,
                        (str(exc), doc_id),
                    )
                    failed_count += 1
            conn.commit()

        return jsonify({
            'success': True,
            'message': f'Embeddings générés: {success_count} succès, {failed_count} échecs',
            'embedded': success_count,
            'failed': failed_count,
            'already_embedded': already_done,
            'missing_text': missing_text,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


def _run_ai_analysis(
    documents,
    *,
    client,
    embedding_model=None,
    force=False,
    generate_embeddings=True,
    already_analyzed: int = 0,
):
    """Routine partagée pour analyser et stocker les métadonnées IA."""
    success_count = 0
    failed_count = 0
    missing_text = 0

    with get_pg_connection() as conn, conn.cursor() as cur:
        for doc in documents:
            doc_id = doc['id']
            try:
                text_content = _fetch_r2_text(doc.get('text_path_r2'))
                new_text_path = None
                if not text_content:
                    text_content, new_text_path = _ensure_text_content(
                        doc_id,
                        doc.get('file_path_r2'),
                        doc.get('text_path_r2'),
                        doc.get('url'),
                    )
                if not text_content:
                    missing_text += 1
                    continue

                embedding_data = None
                embedding_status_value = None
                if embedding_model and generate_embeddings:
                    embedding_status_value = 'failed'
                    try:
                        vector = embedding_model.encode(
                            text_content[:5000],
                            convert_to_numpy=True,
                            normalize_embeddings=True,
                        )
                        if hasattr(vector, 'tolist'):
                            vector = vector.tolist()
                        embedding_data = {
                            'model': 'all-MiniLM-L6-v2',
                            'dimension': len(vector),
                            'vector': [float(v) for v in vector],
                        }
                        embedding_status_value = 'success'
                    except Exception as exc:
                        print(f"⚠️  Embedding non généré pour doc {doc_id}: {exc}")

                text_sample = text_content[:10000]
                response = client.chat.completions.create(
                    model="gpt-4o",
                    max_tokens=1024,
                    messages=[{
                        "role": "user",
                        "content": f"""Analyse ce document officiel algérien et renvoie un JSON avec :
{{
  "title": "...",
  "summary": "...",
  "keywords": ["mot1","mot2"],
  "entities": ["TYPE - Valeur"],
  "draft_date": "YYYY-MM-DD ou null",
  "language": "fr|ar|..."
}}
Document :
{text_sample}"""
                    }],
                    response_format={"type": "json_object"},
                )

                analysis_raw = response.choices[0].message.content
                analysis_json = {}
                if isinstance(analysis_raw, str):
                    try:
                        analysis_json = json.loads(analysis_raw)
                    except json.JSONDecodeError:
                        analysis_json = {}

                language = (analysis_json.get('language') or 'fr').split('-')[0]
                keywords = _normalize_keywords(analysis_json.get('keywords'))
                entities = analysis_json.get('entities')

                # Extraire la date depuis les entités nommées (prioritaire)
                extracted_date = _extract_date_from_entities(entities, doc.get('url'))
                if extracted_date:
                    publication_date = extracted_date
                else:
                    # Fallback sur draft_date ou date existante
                    publication_date = doc.get('publication_date') or _parse_date_string(
                        analysis_json.get('draft_date'),
                    )
                extra_metadata = {'analysis': analysis_json}
                if embedding_data:
                    extra_metadata['embedding'] = embedding_data

                _upsert_ai_metadata(
                    cur,
                    doc_id,
                    {
                        'language': language,
                        'title': analysis_json.get('title'),
                        'publication_date': publication_date,
                        'summary': analysis_json.get('summary'),
                        'keywords': keywords,
                        'entities': entities,
                        'dates_extracted': analysis_json.get('dates_extracted') or analysis_json.get('dates'),
                        'extra_metadata': extra_metadata,
                    },
                )

                cur.execute(
                    """
                    UPDATE joradp_documents
                    SET ai_analysis_status = 'success',
                        analyzed_at = timezone('utc', now()),
                        publication_date = COALESCE(%s, publication_date),
                        embedding_status = CASE
                            WHEN %s IS NOT NULL THEN %s
                            ELSE embedding_status
                        END,
                        embedded_at = CASE
                            WHEN %s = 'success' THEN timezone('utc', now())
                            WHEN %s = 'failed' THEN NULL
                            ELSE embedded_at
                        END,
                        text_path_r2 = COALESCE(%s, text_path_r2),
                        error_log = NULL
                    WHERE id = %s
                    """,
                    (
                        publication_date,
                        embedding_status_value,
                        embedding_status_value,
                        embedding_status_value,
                        embedding_status_value,
                        new_text_path,
                        doc_id,
                    ),
                )
                success_count += 1
            except Exception as exc:
                failed_count += 1
                cur.execute(
                    """
                    UPDATE joradp_documents
                    SET ai_analysis_status = 'failed',
                        analyzed_at = NULL,
                        error_log = %s
                    WHERE id = %s
                    """,
                    (str(exc), doc_id),
                )
        conn.commit()

    return {
        'success': True,
        'message': f'Analyse terminée: {success_count} succès, {failed_count} échecs',
        'analyzed': success_count,
        'failed': failed_count,
        'already_analyzed': already_analyzed,
        'missing_text': missing_text,
    }
