#!/usr/bin/env python3
import sqlite3
import psycopg2
import time

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("📡 Connexion aux bases de données...\n")
sqlite_conn = sqlite3.connect(sqlite_db)
sqlite_conn.row_factory = sqlite3.Row
pg_conn = psycopg2.connect(pg_db)
pg_cur = pg_conn.cursor()

print("=" * 60)
print("MIGRATION INDEX MOTS-CLÉS")
print("=" * 60 + "\n")

# =====================================================
# 1. Index JORADP (382k lignes)
# =====================================================
print("1️⃣ Migration joradp_keyword_index...", flush=True)
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT COUNT(*) FROM joradp_keyword_index")
total_joradp = sqlite_cur.fetchone()[0]
print(f"   Total à migrer : {total_joradp:,} lignes")

start_time = time.time()
batch_size = 5000
inserted = 0

sqlite_cur.execute("SELECT id, token, document_id FROM joradp_keyword_index")

batch = []
for row in sqlite_cur:
    batch.append((row['id'], row['token'], row['document_id']))
    
    if len(batch) >= batch_size:
        pg_cur.executemany("""
            INSERT INTO joradp_keyword_index (id, token, document_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, batch)
        pg_conn.commit()
        inserted += len(batch)
        
        elapsed = time.time() - start_time
        rate = inserted / elapsed if elapsed > 0 else 0
        eta = (total_joradp - inserted) / rate if rate > 0 else 0
        
        print(f"\r   Progression : {inserted:,}/{total_joradp:,} ({inserted*100//total_joradp}%) - "
              f"{rate:.0f} lignes/s - ETA: {eta:.0f}s", end="", flush=True)
        batch = []

# Dernier batch
if batch:
    pg_cur.executemany("""
        INSERT INTO joradp_keyword_index (id, token, document_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, batch)
    pg_conn.commit()
    inserted += len(batch)

elapsed = time.time() - start_time
print(f"\r   ✅ {inserted:,}/{total_joradp:,} lignes migrées en {elapsed:.1f}s" + " "*30)

# =====================================================
# 2. Index Cour Suprême (64k lignes)
# =====================================================
print("\n2️⃣ Migration french_keyword_index...", flush=True)
sqlite_cur.execute("SELECT COUNT(*) FROM french_keyword_index")
total_french = sqlite_cur.fetchone()[0]
print(f"   Total à migrer : {total_french:,} lignes")

start_time = time.time()
inserted = 0

sqlite_cur.execute("SELECT id, token, decision_id FROM french_keyword_index")

batch = []
for row in sqlite_cur:
    batch.append((row['id'], row['token'], row['decision_id']))
    
    if len(batch) >= batch_size:
        pg_cur.executemany("""
            INSERT INTO french_keyword_index (id, token, decision_id)
            VALUES (%s, %s, %s)
            ON CONFLICT (id) DO NOTHING
        """, batch)
        pg_conn.commit()
        inserted += len(batch)
        
        elapsed = time.time() - start_time
        rate = inserted / elapsed if elapsed > 0 else 0
        eta = (total_french - inserted) / rate if rate > 0 else 0
        
        print(f"\r   Progression : {inserted:,}/{total_french:,} ({inserted*100//total_french if total_french > 0 else 0}%) - "
              f"{rate:.0f} lignes/s - ETA: {eta:.0f}s", end="", flush=True)
        batch = []

# Dernier batch
if batch:
    pg_cur.executemany("""
        INSERT INTO french_keyword_index (id, token, decision_id)
        VALUES (%s, %s, %s)
        ON CONFLICT (id) DO NOTHING
    """, batch)
    pg_conn.commit()
    inserted += len(batch)

elapsed = time.time() - start_time
print(f"\r   ✅ {inserted:,}/{total_french:,} lignes migrées en {elapsed:.1f}s" + " "*30)

# =====================================================
# 3. Créer les index GIN pour recherche rapide
# =====================================================
print("\n3️⃣ Création des index GIN...", flush=True)

# Activer l'extension pg_trgm d'abord
print("   Activation extension pg_trgm...", end=" ", flush=True)
try:
    pg_cur.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    pg_conn.commit()
    print("✅")
except Exception as e:
    print(f"⚠️ {e}")

print("   Création index GIN sur joradp_keyword_index.token...", end=" ", flush=True)
start = time.time()
pg_cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_joradp_keyword_token_gin 
    ON joradp_keyword_index USING GIN (token gin_trgm_ops)
""")
pg_conn.commit()
print(f"✅ ({time.time()-start:.1f}s)")

print("   Création index GIN sur french_keyword_index.token...", end=" ", flush=True)
start = time.time()
pg_cur.execute("""
    CREATE INDEX IF NOT EXISTS idx_french_keyword_token_gin 
    ON french_keyword_index USING GIN (token gin_trgm_ops)
""")
pg_conn.commit()
print(f"✅ ({time.time()-start:.1f}s)")

print("\n" + "=" * 60)
print(f"✅ MIGRATION TERMINÉE : {total_joradp + total_french:,} lignes")
print("   Index GIN créés pour recherche plein texte rapide")
print("=" * 60)

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
