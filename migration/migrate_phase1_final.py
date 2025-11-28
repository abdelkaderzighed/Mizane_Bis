#!/usr/bin/env python3
import sqlite3
import psycopg2
from psycopg2.extras import Json
import json

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("📡 Connexion aux bases de données...\n")
sqlite_conn = sqlite3.connect(sqlite_db)
sqlite_conn.row_factory = sqlite3.Row
pg_conn = psycopg2.connect(pg_db)
pg_cur = pg_conn.cursor()

print("=" * 60)
print("PHASE 1A : MIGRATION TABLES GÉNÉRIQUES")
print("=" * 60 + "\n")

# Récupérer les IDs de sessions valides
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT id FROM harvesting_sessions")
valid_session_ids = {row['id'] for row in sqlite_cur.fetchall()}
print(f"ℹ️  Sessions valides : {valid_session_ids}\n")

# =====================================================
# 1. Sites
# =====================================================
print("1️⃣ Migration table 'sites'...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM sites")
rows = sqlite_cur.fetchall()

inserted = 0
for row in rows:
    try:
        params = json.loads(row['type_specific_params']) if row['type_specific_params'] else None
        pg_cur.execute("""
            INSERT INTO sites (
                id, name, url, site_type, workers_parallel, timeout_seconds,
                delay_between_requests, delay_before_retry, type_specific_params,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (name) DO NOTHING
        """, (
            row['id'], row['name'], row['url'], row['site_type'],
            row['workers_parallel'], row['timeout_seconds'],
            row['delay_between_requests'], row['delay_before_retry'],
            Json(params) if params else None,
            row['created_at'], row['updated_at']
        ))
        if pg_cur.rowcount > 0:
            inserted += 1
    except Exception as e:
        print(f"\n   ✗ Erreur site {row['name']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"✅ {inserted}/{len(rows)} lignes")

# =====================================================
# 2. Harvesting Sessions
# =====================================================
print("2️⃣ Migration table 'harvesting_sessions'...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM harvesting_sessions")
rows = sqlite_cur.fetchall()

inserted = 0
for row in rows:
    try:
        schedule = json.loads(row['schedule_config']) if row['schedule_config'] else None
        is_test = bool(row['is_test'])
        
        pg_cur.execute("""
            INSERT INTO harvesting_sessions (
                id, site_id, session_name, is_test, status, current_phase,
                max_documents, start_number, end_number, schedule_config,
                filter_date_start, filter_date_end, filter_keywords,
                filter_languages, filter_file_types,
                created_at, updated_at, started_at, paused_at, completed_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (site_id, session_name) DO NOTHING
        """, (
            row['id'], row['site_id'], row['session_name'], is_test,
            row['status'], row['current_phase'], row['max_documents'],
            row['start_number'], row['end_number'], Json(schedule) if schedule else None,
            row['filter_date_start'], row['filter_date_end'], row['filter_keywords'],
            row['filter_languages'], row['filter_file_types'],
            row['created_at'], row['updated_at'], row['started_at'],
            row['paused_at'], row['completed_at']
        ))
        if pg_cur.rowcount > 0:
            inserted += 1
    except Exception as e:
        print(f"\n   ✗ Erreur session {row['session_name']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"✅ {inserted}/{len(rows)} lignes")

# =====================================================
# 3. Session Statistics (seulement celles avec sessions valides)
# =====================================================
print("3️⃣ Migration table 'session_statistics'...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM session_statistics")
rows = sqlite_cur.fetchall()

inserted = 0
skipped = 0
for row in rows:
    # Ignorer les statistiques orphelines
    if row['session_id'] not in valid_session_ids:
        skipped += 1
        continue
        
    try:
        pg_cur.execute("""
            INSERT INTO session_statistics (
                id, session_id, total_documents_found, metadata_collected_count,
                metadata_failed_count, files_downloaded_count, files_failed_count,
                ai_analyzed_count, ai_failed_count, current_document_index,
                last_error_message, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (session_id) DO UPDATE SET
                total_documents_found = EXCLUDED.total_documents_found,
                metadata_collected_count = EXCLUDED.metadata_collected_count,
                updated_at = EXCLUDED.updated_at
        """, (
            row['id'], row['session_id'], row['total_documents_found'],
            row['metadata_collected_count'], row['metadata_failed_count'],
            row['files_downloaded_count'], row['files_failed_count'],
            row['ai_analyzed_count'], row['ai_failed_count'],
            row['current_document_index'], row['last_error_message'],
            row['updated_at']
        ))
        if pg_cur.rowcount > 0:
            inserted += 1
    except Exception as e:
        print(f"\n   ✗ Erreur stats session {row['session_id']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"✅ {inserted}/{len(rows)} lignes ({skipped} orphelines ignorées)")

print("\n" + "=" * 60)
print("✅ PHASE 1A TERMINÉE : Tables génériques migrées")
print("=" * 60)

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
