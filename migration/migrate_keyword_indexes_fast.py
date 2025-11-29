#!/usr/bin/env python3
import sqlite3
import psycopg2
import time
import io

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("📡 Connexion aux bases de données...\n")
sqlite_conn = sqlite3.connect(sqlite_db)
sqlite_conn.row_factory = sqlite3.Row
pg_conn = psycopg2.connect(pg_db)
pg_cur = pg_conn.cursor()

print("=" * 60)
print("MIGRATION INDEX MOTS-CLÉS (MODE RAPIDE)")
print("=" * 60 + "\n")

# =====================================================
# 1. Index JORADP (382k lignes) avec COPY
# =====================================================
print("1️⃣ Migration joradp_keyword_index...", flush=True)
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT COUNT(*) FROM joradp_keyword_index")
total_joradp = sqlite_cur.fetchone()[0]
print(f"   Total à migrer : {total_joradp:,} lignes")

start_time = time.time()

# Désactiver les index temporairement pour accélérer
print("   Désactivation temporaire des index...", end=" ", flush=True)
pg_cur.execute("DROP INDEX IF EXISTS idx_joradp_keyword_token")
pg_cur.execute("DROP INDEX IF EXISTS idx_joradp_keyword_doc")
pg_conn.commit()
print("✅")

# Récupérer toutes les données
print("   Extraction depuis SQLite...", end=" ", flush=True)
sqlite_cur.execute("SELECT id, token, document_id FROM joradp_keyword_index")
rows = sqlite_cur.fetchall()
print(f"✅ ({len(rows):,} lignes)")

# Préparer le buffer COPY
print("   Import vers PostgreSQL avec COPY...", end=" ", flush=True)
copy_start = time.time()

buffer = io.StringIO()
for row in rows:
    buffer.write(f"{row['id']}\t{row['token']}\t{row['document_id']}\n")

buffer.seek(0)

# COPY ultra-rapide
pg_cur.copy_from(buffer, 'joradp_keyword_index', columns=('id', 'token', 'document_id'))
pg_conn.commit()

elapsed = time.time() - copy_start
rate = len(rows) / elapsed if elapsed > 0 else 0
print(f"✅ {len(rows):,} lignes en {elapsed:.1f}s ({rate:,.0f} lignes/s)")

# =====================================================
# 2. Index Cour Suprême (64k lignes) avec COPY
# =====================================================
print("\n2️⃣ Migration french_keyword_index...", flush=True)
sqlite_cur.execute("SELECT COUNT(*) FROM french_keyword_index")
total_french = sqlite_cur.fetchone()[0]
print(f"   Total à migrer : {total_french:,} lignes")

# Désactiver les index
print("   Désactivation temporaire des index...", end=" ", flush=True)
pg_cur.execute("DROP INDEX IF EXISTS idx_french_keyword_token")
pg_cur.execute("DROP INDEX IF EXISTS idx_french_keyword_decision")
pg_conn.commit()
print("✅")

# Récupérer toutes les données
print("   Extraction depuis SQLite...", end=" ", flush=True)
sqlite_cur.execute("SELECT id, token, decision_id FROM french_keyword_index")
rows = sqlite_cur.fetchall()
print(f"✅ ({len(rows):,} lignes)")

# Préparer le buffer COPY
print("   Import vers PostgreSQL avec COPY...", end=" ", flush=True)
copy_start = time.time()

buffer = io.StringIO()
for row in rows:
    buffer.write(f"{row['id']}\t{row['token']}\t{row['decision_id']}\n")

buffer.seek(0)

# COPY ultra-rapide
pg_cur.copy_from(buffer, 'french_keyword_index', columns=('id', 'token', 'decision_id'))
pg_conn.commit()

elapsed = time.time() - copy_start
rate = len(rows) / elapsed if elapsed > 0 else 0
print(f"✅ {len(rows):,} lignes en {elapsed:.1f}s ({rate:,.0f} lignes/s)")

# =====================================================
# 3. Créer les index GIN pour recherche rapide
# =====================================================
print("\n3️⃣ Création des index GIN optimisés...", flush=True)

# Activer l'extension pg_trgm
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
    CREATE INDEX idx_joradp_keyword_token_gin 
    ON joradp_keyword_index USING GIN (token gin_trgm_ops)
""")
pg_conn.commit()
print(f"✅ ({time.time()-start:.1f}s)")

print("   Création index B-tree sur joradp_keyword_index.document_id...", end=" ", flush=True)
start = time.time()
pg_cur.execute("""
    CREATE INDEX idx_joradp_keyword_doc 
    ON joradp_keyword_index(document_id)
""")
pg_conn.commit()
print(f"✅ ({time.time()-start:.1f}s)")

print("   Création index GIN sur french_keyword_index.token...", end=" ", flush=True)
start = time.time()
pg_cur.execute("""
    CREATE INDEX idx_french_keyword_token_gin 
    ON french_keyword_index USING GIN (token gin_trgm_ops)
""")
pg_conn.commit()
print(f"✅ ({time.time()-start:.1f}s)")

print("   Création index B-tree sur french_keyword_index.decision_id...", end=" ", flush=True)
start = time.time()
pg_cur.execute("""
    CREATE INDEX idx_french_keyword_decision 
    ON french_keyword_index(decision_id)
""")
pg_conn.commit()
print(f"✅ ({time.time()-start:.1f}s)")

total_time = time.time() - start_time
print("\n" + "=" * 60)
print(f"✅ MIGRATION TERMINÉE : {total_joradp + total_french:,} lignes en {total_time:.1f}s")
print(f"   Vitesse moyenne : {(total_joradp + total_french)/total_time:,.0f} lignes/s")
print("   Index GIN créés pour recherche plein texte rapide")
print("=" * 60)

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
