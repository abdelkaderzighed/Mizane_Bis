from __future__ import annotations

from flask import jsonify, request
from psycopg2 import errors
from psycopg2.extras import Json

from shared.postgres import get_connection as get_pg_connection


def _normalize_status(value: str | None) -> str:
    if not value:
        return 'pending'
    normalized = value.strip().lower()
    if normalized in {'pending', 'in_progress', 'success', 'failed', 'skipped'}:
        return normalized
    return 'pending'


def register_sites_routes(app):

    @app.route('/api/sites', methods=['GET'])
    def get_sites():
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
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sites/<int:site_id>/sessions', methods=['GET'])
    def get_site_sessions(site_id: int):
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
                        hs.schedule_config,
                        COUNT(d.id) AS nb_documents,
                        SUM(CASE WHEN d.metadata_collection_status = 'success' THEN 1 ELSE 0 END) AS nb_collected,
                        SUM(CASE WHEN d.download_status = 'success' THEN 1 ELSE 0 END) AS nb_downloaded,
                        SUM(CASE WHEN d.text_extraction_status = 'success' THEN 1 ELSE 0 END) AS nb_text,
                        SUM(CASE WHEN d.ai_analysis_status = 'success' THEN 1 ELSE 0 END) AS nb_analyzed,
                        SUM(CASE WHEN d.embedding_status = 'success' THEN 1 ELSE 0 END) AS nb_embedded
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
                    total = row['nb_documents'] or 0
                    sessions.append(
                        {
                            'id': row['id'],
                            'session_name': row['session_name'],
                            'status': row['status'],
                            'current_phase': row['current_phase'],
                            'created_at': row['created_at'],
                            'schedule_config': row['schedule_config'],
                            'nb_documents': total,
                            'phases': {
                                'collect': {'done': row['nb_collected'] or 0, 'total': total},
                                'download': {'done': row['nb_downloaded'] or 0, 'total': total},
                                'text_extraction': {'done': row['nb_text'] or 0, 'total': total},
                                'analyze': {'done': row['nb_analyzed'] or 0, 'total': total},
                                'embeddings': {'done': row['nb_embedded'] or 0, 'total': total},
                            },
                        }
                    )
            return jsonify({'success': True, 'sessions': sessions})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sites/<int:site_id>/sessions', methods=['POST'])
    def create_site_session(site_id: int):
        data = request.json or {}
        session_name = data.get('session_name')
        if not session_name:
            return jsonify({'error': 'session_name requis'}), 400

        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO harvesting_sessions (
                        site_id,
                        session_name,
                        status,
                        max_documents,
                        start_number,
                        end_number,
                        schedule_config,
                        filter_date_start,
                        filter_date_end,
                        filter_keywords,
                        filter_languages
                    )
                    VALUES (%s, %s, 'pending', %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        site_id,
                        session_name,
                        data.get('max_documents'),
                        data.get('start_number'),
                        data.get('end_number'),
                        Json(data.get('schedule_config')) if data.get('schedule_config') else None,
                        data.get('filter_date_start'),
                        data.get('filter_date_end'),
                        data.get('filter_keywords'),
                        data.get('filter_languages'),
                    ),
                )
                session_id = cur.fetchone()['id']
                conn.commit()
            return jsonify({'success': True, 'session_id': session_id})
        except errors.UniqueViolation:
            return jsonify({'error': 'Une session avec ce nom existe déjà pour ce site'}), 409
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sites/delete', methods=['POST'])
    def delete_sites():
        data = request.json or {}
        site_ids = data.get('site_ids') or []
        if not site_ids:
            return jsonify({'error': 'site_ids requis'}), 400

        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute("DELETE FROM sites WHERE id = ANY(%s)", (site_ids,))
                deleted = cur.rowcount
                conn.commit()
            return jsonify({'success': True, 'deleted': deleted})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sessions/delete', methods=['POST'])
    def delete_sessions():
        data = request.json or {}
        session_ids = data.get('session_ids') or []
        if not session_ids:
            return jsonify({'error': 'session_ids requis'}), 400

        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute("DELETE FROM harvesting_sessions WHERE id = ANY(%s)", (session_ids,))
                deleted = cur.rowcount
                conn.commit()
            return jsonify({'success': True, 'deleted': deleted})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sites/<int:site_id>', methods=['GET'])
    def get_site(site_id: int):
        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute("SELECT * FROM sites WHERE id = %s", (site_id,))
                site = cur.fetchone()
            if not site:
                return jsonify({'error': 'Site non trouvé'}), 404
            return jsonify({'success': True, 'site': site})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sites/<int:site_id>', methods=['PUT'])
    def update_site(site_id: int):
        data = request.json or {}
        columns = []
        params = []
        allowed = [
            'name',
            'url',
            'site_type',
            'workers_parallel',
            'timeout_seconds',
            'delay_between_requests',
            'delay_before_retry',
            'type_specific_params',
        ]
        for key in allowed:
            if key in data:
                columns.append(f"{key} = %s")
                value = data[key]
                if key == 'type_specific_params' and value is not None:
                    value = Json(value)
                params.append(value)

        if not columns:
            return jsonify({'error': 'Aucun champ à mettre à jour'}), 400

        params.append(site_id)

        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute(f"UPDATE sites SET {', '.join(columns)} WHERE id = %s", params)
                conn.commit()
            return jsonify({'success': True})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sessions/<int:session_id>/documents')
    def get_session_documents(session_id: int):
        try:
            page = max(1, int(request.args.get('page', 1)))
            per_page = min(200, int(request.args.get('per_page', 50)))
            offset = (page - 1) * per_page

            where_clauses = ['d.session_id = %s']
            params = [session_id]
            joins = []

            year = request.args.get('year')
            if year:
                where_clauses.append("d.url ILIKE %s")
                params.append(f'%F{year}%')

            date_debut = request.args.get('date_debut')
            if date_debut:
                where_clauses.append("d.publication_date >= %s")
                params.append(date_debut)

            date_fin = request.args.get('date_fin')
            if date_fin:
                where_clauses.append("d.publication_date <= %s")
                params.append(date_fin)

            status = request.args.get('status', 'all')
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

            search_num = request.args.get('search_num')
            if search_num:
                where_clauses.append("d.url ILIKE %s")
                params.append(f'%{search_num}%')

            keywords_tous = request.args.get('keywords_tous')
            keywords_un_de = request.args.get('keywords_un_de')
            keywords_exclut = request.args.get('keywords_exclut')

            if keywords_tous or keywords_un_de or keywords_exclut:
                joins.append("LEFT JOIN document_ai_metadata ai ON ai.document_id = d.id AND ai.corpus = 'joradp'")

            def _keyword_clause(tokens: list[str], negate: bool = False, require_all: bool = False) -> None:
                if not tokens:
                    return
                clauses = []
                for token in tokens:
                    clauses.append("(COALESCE(ai.summary, '') ILIKE %s OR array_to_string(ai.keywords, ',') ILIKE %s)")
                    params.extend([f'%{token.lower()}%'] * 2)
                if clauses:
                    expression = ' AND '.join(clauses) if require_all else ' OR '.join(clauses)
                    if negate:
                        where_clauses.append(f"NOT ({expression})")
                    else:
                        where_clauses.append(f"({expression})")

            if keywords_tous:
                tokens = [token.strip().lower() for token in keywords_tous.split(',') if token.strip()]
                _keyword_clause(tokens, require_all=True)
            if keywords_un_de:
                tokens = [token.strip().lower() for token in keywords_un_de.split(',') if token.strip()]
                _keyword_clause(tokens, require_all=False)
            if keywords_exclut:
                tokens = [token.strip().lower() for token in keywords_exclut.split(',') if token.strip()]
                _keyword_clause(tokens, negate=True)

            where_sql = ' AND '.join(where_clauses)
            join_sql = ' '.join(joins)

            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute(
                    f"SELECT COUNT(*) AS total FROM joradp_documents d {join_sql} WHERE {where_sql}",
                    params,
                )
                total = cur.fetchone()['total']

                cur.execute(
                    f"""
                    SELECT
                        d.id,
                        d.url,
                        d.publication_date,
                        d.file_path_r2,
                        d.text_path_r2,
                        d.file_size_bytes,
                        d.metadata_collection_status,
                        d.download_status,
                        d.text_extraction_status,
                        d.ai_analysis_status,
                        d.embedding_status,
                        d.metadata_collected_at,
                        d.downloaded_at,
                        d.text_extracted_at,
                        d.analyzed_at,
                        d.embedded_at
                    FROM joradp_documents d
                    {join_sql}
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
                filename = url.split('/')[-1] if url else ''
                numero = filename[5:8] if len(filename) >= 8 else ''
                year_str = filename[1:5] if len(filename) >= 8 and filename.startswith('F') else None
                file_exists = bool(row['file_path_r2'])
                text_exists = bool(row['text_path_r2'])
                documents.append(
                    {
                        'id': row['id'],
                        'url': row['url'],
                         'numero': numero,
                         'date': year_str,
                        'publication_date': row['publication_date'],
                        'file_path': row['file_path_r2'],
                        'text_path': row['text_path_r2'],
                        'size_kb': round((row['file_size_bytes'] or 0) / 1024, 1) if row['file_size_bytes'] else 0,
                        'statuts': {
                            'collected': _normalize_status(row['metadata_collection_status']),
                            'downloaded': _normalize_status(row['download_status']),
                            'text_extracted': _normalize_status(row['text_extraction_status']),
                            'analyzed': _normalize_status(row['ai_analysis_status']),
                            'embedded': _normalize_status(row['embedding_status']),
                        },
                        'metadata_collected_at': row['metadata_collected_at'],
                        'downloaded_at': row['downloaded_at'],
                        'text_extracted_at': row['text_extracted_at'],
                        'analyzed_at': row['analyzed_at'],
                        'embedded_at': row['embedded_at'],
                    }
                )

            return jsonify(
                {
                    'success': True,
                    'documents': documents,
                    'pagination': {
                        'page': page,
                        'per_page': per_page,
                        'total': total,
                        'total_pages': (total + per_page - 1) // per_page,
                    },
                }
            )
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sessions/<int:session_id>/settings', methods=['GET'])
    def get_session_settings(session_id: int):
        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute("SELECT * FROM harvesting_sessions WHERE id = %s", (session_id,))
                session = cur.fetchone()
            if not session:
                return jsonify({'error': 'Session non trouvée'}), 404
            return jsonify({'success': True, 'session': session})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500

    @app.route('/api/sessions/<int:session_id>/settings', methods=['PUT'])
    def update_session_settings(session_id: int):
        data = request.json or {}
        columns = []
        params = []
        allowed = [
            'session_name',
            'status',
            'current_phase',
            'max_documents',
            'start_number',
            'end_number',
            'schedule_config',
            'filter_date_start',
            'filter_date_end',
            'filter_keywords',
            'filter_languages',
        ]
        for key in allowed:
            if key in data:
                value = data[key]
                if key == 'schedule_config' and value is not None:
                    value = Json(value)
                columns.append(f"{key} = %s")
                params.append(value)

        if not columns:
            return jsonify({'error': 'Aucun champ à mettre à jour'}), 400

        params.append(session_id)
        try:
            with get_pg_connection() as conn, conn.cursor() as cur:
                cur.execute(f"UPDATE harvesting_sessions SET {', '.join(columns)} WHERE id = %s", params)
                conn.commit()
            return jsonify({'success': True})
        except Exception as exc:
            return jsonify({'error': str(exc)}), 500
