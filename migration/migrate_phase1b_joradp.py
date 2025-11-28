#!/usr/bin/env python3
import sqlite3
import psycopg2
import json
from psycopg2.extras import Json

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("📡 Connexion aux bases de données...\n")
sqlite_conn = sqlite3.connect(sqlite_db)
sqlite_conn.row_factory = sqlite3.Row
pg_conn = psycopg2.connect(pg_db)
pg_cur = pg_conn.cursor()

print("=" * 60)
print("PHASE 1B : MIGRATION JORADP (métadonnées légères)")
print("=" * 60 + "\n")

# =====================================================
# 1. Documents JORADP
# =====================================================
print("1️⃣ Migration joradp_documents...", end=" ", flush=True)
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT * FROM documents")
rows = sqlite_cur.fetchall()

inserted = 0
batch_size = 500
total = len(rows)

for i, row in enumerate(rows):
    try:
        pg_cur.execute("""
            INSERT INTO joradp_documents (
                id, session_id, url, file_extension,
                file_path_r2, text_path_r2,
                metadata_collection_status, download_status,
                text_extraction_status, ai_analysis_status, embedding_status,
                error_log,
                metadata_collected_at, downloaded_at, text_extracted_at,
                analyzed_at, embedded_at,
                created_at, updated_at,
                publication_date, file_size_bytes
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (session_id, url) DO NOTHING
        """, (
            row['id'], row['session_id'], row['url'], row['file_extension'],
            row['file_path'], row['text_path'],  # URLs R2 existantes
            row['metadata_collection_status'], row['download_status'],
            row['text_extraction_status'], row['ai_analysis_status'], row['embedding_status'],
            row['error_log'],
            row['metadata_collected_at'], row['downloaded_at'], row['text_extracted_at'],
            row['analyzed_at'], row['embedded_at'],
            row['created_at'], row['updated_at'],
            row['publication_date'], row['file_size_bytes']
        ))
        
        if pg_cur.rowcount > 0:
            inserted += 1
            
        # Commit par batch
        if (i + 1) % batch_size == 0:
            pg_conn.commit()
            print(f"\r1️⃣ Migration joradp_documents... {i+1}/{total} ({inserted} insérées)", end="", flush=True)
            
    except Exception as e:
        print(f"\n   ✗ Erreur doc {row['id']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"\r1️⃣ Migration joradp_documents... ✅ {inserted}/{total} lignes" + " "*20)

# =====================================================
# 2. Métadonnées JORADP
# =====================================================
print("2️⃣ Migration joradp_metadata...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM document_metadata")
rows = sqlite_cur.fetchall()

inserted = 0
total = len(rows)

for i, row in enumerate(rows):
    try:
        source_meta = json.loads(row['source_metadata']) if row['source_metadata'] else None
        
        pg_cur.execute("""
            INSERT INTO joradp_metadata (
                id, document_id, title, author, publication_date,
                language, file_size, page_count, description,
                source_metadata, created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (document_id) DO NOTHING
        """, (
            row['id'], row['document_id'], row['title'], row['author'],
            row['publication_date'], row['language'], row['file_size'],
            row['page_count'], row['description'],
            Json(source_meta) if source_meta else None,
            row['created_at'], row['updated_at']
        ))
        
        if pg_cur.rowcount > 0:
            inserted += 1
            
        if (i + 1) % batch_size == 0:
            pg_conn.commit()
            print(f"\r2️⃣ Migration joradp_metadata... {i+1}/{total} ({inserted} insérées)", end="", flush=True)
            
    except Exception as e:
        print(f"\n   ✗ Erreur metadata {row['document_id']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"\r2️⃣ Migration joradp_metadata... ✅ {inserted}/{total} lignes" + " "*20)

print("\n" + "=" * 60)
print("✅ PHASE 1B TERMINÉE : Documents JORADP migrés")
print(f"   (Index mots-clés : 382k lignes, sera migré ensuite)")
print("=" * 60)

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
