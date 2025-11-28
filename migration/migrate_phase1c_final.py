#!/usr/bin/env python3
import sqlite3
import psycopg2
from datetime import datetime

def convert_date(date_str):
    """Convertir DD-MM-YYYY en YYYY-MM-DD"""
    if not date_str:
        return None
    try:
        dt = datetime.strptime(date_str, '%d-%m-%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        try:
            dt = datetime.strptime(date_str, '%Y-%m-%d')
            return date_str
        except:
            return None

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("📡 Connexion aux bases de données...\n")
sqlite_conn = sqlite3.connect(sqlite_db)
sqlite_conn.row_factory = sqlite3.Row
pg_conn = psycopg2.connect(pg_db)
pg_cur = pg_conn.cursor()

# Récupérer les IDs valides
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT id FROM supreme_court_chambers")
valid_chambers = {row['id'] for row in sqlite_cur.fetchall()}

print("=" * 60)
print("PHASE 1C : MIGRATION COUR SUPRÊME (métadonnées légères)")
print("=" * 60)
print(f"ℹ️  Chambres valides : {valid_chambers}\n")

# =====================================================
# 1. Thèmes (seulement ceux avec chamber_id valide)
# =====================================================
print("1️⃣ Migration supreme_court_themes...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM supreme_court_themes WHERE chamber_id IN (1,2,3,4,5,6)")
rows = sqlite_cur.fetchall()

inserted = 0
skipped_orphans = 0
batch_size = 100
total = len(rows)

for i, row in enumerate(rows):
    try:
        pg_cur.execute("""
            INSERT INTO supreme_court_themes (
                id, chamber_id, name_ar, name_fr, url, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s)
            ON CONFLICT (chamber_id, name_ar) DO NOTHING
        """, (
            row['id'], row['chamber_id'], row['name_ar'], row['name_fr'],
            row['url'], row['created_at']
        ))
        if pg_cur.rowcount > 0:
            inserted += 1
            
        if (i + 1) % batch_size == 0:
            pg_conn.commit()
            
    except Exception as e:
        print(f"\n   ✗ Erreur theme: {e}")
        pg_conn.rollback()

# Compter les orphelins
sqlite_cur.execute("SELECT COUNT(*) FROM supreme_court_themes WHERE chamber_id NOT IN (1,2,3,4,5,6)")
skipped_orphans = sqlite_cur.fetchone()[0]

pg_conn.commit()
print(f"✅ {inserted}/{total} lignes ({skipped_orphans} orphelines ignorées)")

# Récupérer les IDs de thèmes valides pour les classifications
sqlite_cur.execute("SELECT id FROM supreme_court_themes WHERE chamber_id IN (1,2,3,4,5,6)")
valid_themes = {row['id'] for row in sqlite_cur.fetchall()}

# =====================================================
# 2. Décisions (métadonnées légères seulement)
# =====================================================
print("2️⃣ Migration supreme_court_decisions...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM supreme_court_decisions")
rows = sqlite_cur.fetchall()

inserted = 0
skipped = 0
batch_size = 200
total = len(rows)

for i, row in enumerate(rows):
    try:
        decision_date = convert_date(row['decision_date'])
        
        pg_cur.execute("""
            INSERT INTO supreme_court_decisions (
                id, decision_number, decision_date,
                title_ar, title_fr,
                object_ar, object_fr,
                parties_ar, parties_fr,
                legal_reference_ar, legal_reference_fr,
                president, rapporteur,
                file_path_ar_r2, file_path_fr_r2,
                url, download_status,
                created_at, updated_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (decision_number) DO NOTHING
        """, (
            row['id'], row['decision_number'], decision_date,
            row['title_ar'], row['title_fr'],
            row['object_ar'], row['object_fr'],
            row['parties_ar'], row['parties_fr'],
            row['legal_reference_ar'], row['legal_reference_fr'],
            row['president'], row['rapporteur'],
            row['file_path_ar'], row['file_path_fr'],
            row['url'], row['download_status'],
            row['created_at'], row['updated_at']
        ))
        
        if pg_cur.rowcount > 0:
            inserted += 1
        else:
            skipped += 1
            
        if (i + 1) % batch_size == 0:
            pg_conn.commit()
            print(f"\r2️⃣ Migration supreme_court_decisions... {i+1}/{total} ({inserted} insérées)", end="", flush=True)
            
    except Exception as e:
        skipped += 1
        pg_conn.rollback()

pg_conn.commit()
print(f"\r2️⃣ Migration supreme_court_decisions... ✅ {inserted}/{total} lignes ({skipped} ignorées)" + " "*20)

# =====================================================
# 3. Classifications (seulement celles avec theme_id valide)
# =====================================================
print("3️⃣ Migration supreme_court_decision_classifications...", end=" ", flush=True)
sqlite_cur.execute(f"""
    SELECT * FROM supreme_court_decision_classifications 
    WHERE theme_id IN ({','.join(map(str, valid_themes))})
""")
rows = sqlite_cur.fetchall()

inserted = 0
batch_size = 500
total = len(rows)

for i, row in enumerate(rows):
    try:
        pg_cur.execute("""
            INSERT INTO supreme_court_decision_classifications (
                id, decision_id, chamber_id, theme_id, created_at
            ) VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (decision_id, chamber_id, theme_id) DO NOTHING
        """, (
            row['id'], row['decision_id'], row['chamber_id'],
            row['theme_id'], row['created_at']
        ))
        
        if pg_cur.rowcount > 0:
            inserted += 1
            
        if (i + 1) % batch_size == 0:
            pg_conn.commit()
            print(f"\r3️⃣ Migration classifications... {i+1}/{total} ({inserted} insérées)", end="", flush=True)
            
    except Exception as e:
        pg_conn.rollback()

# Compter les orphelins
sqlite_cur.execute(f"""
    SELECT COUNT(*) FROM supreme_court_decision_classifications 
    WHERE theme_id NOT IN ({','.join(map(str, valid_themes))})
""")
skipped_classif = sqlite_cur.fetchone()[0]

pg_conn.commit()
print(f"\r3️⃣ Migration supreme_court_decision_classifications... ✅ {inserted}/{total} lignes ({skipped_classif} orphelines ignorées)" + " "*20)

print("\n" + "=" * 60)
print("✅ PHASE 1C TERMINÉE : Cour Suprême migrée")
print("=" * 60)

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
