#!/usr/bin/env python3
import sqlite3
import psycopg2
from datetime import datetime

def convert_date(date_str):
    """Convertir DD-MM-YYYY en YYYY-MM-DD"""
    if not date_str:
        return None
    try:
        # Essayer format DD-MM-YYYY
        dt = datetime.strptime(date_str, '%d-%m-%Y')
        return dt.strftime('%Y-%m-%d')
    except:
        try:
            # Essayer format YYYY-MM-DD (déjà bon)
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

print("=" * 60)
print("PHASE 1C : MIGRATION COUR SUPRÊME (métadonnées légères)")
print("=" * 60 + "\n")

# =====================================================
# 1. Chambres
# =====================================================
print("1️⃣ Migration supreme_court_chambers...", end=" ", flush=True)
sqlite_cur = sqlite_conn.cursor()
sqlite_cur.execute("SELECT * FROM supreme_court_chambers")
rows = sqlite_cur.fetchall()

inserted = 0
for row in rows:
    try:
        active = bool(row['active']) if row['active'] is not None else True
        pg_cur.execute("""
            INSERT INTO supreme_court_chambers (
                id, name_ar, name_fr, url, active, last_harvested_at, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (url) DO NOTHING
        """, (
            row['id'], row['name_ar'], row['name_fr'], row['url'],
            active, row['last_harvested_at'], row['created_at']
        ))
        if pg_cur.rowcount > 0:
            inserted += 1
    except Exception as e:
        print(f"\n   ✗ Erreur chamber {row['name_fr']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"✅ {inserted}/{len(rows)} lignes")

# =====================================================
# 2. Thèmes
# =====================================================
print("2️⃣ Migration supreme_court_themes...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM supreme_court_themes")
rows = sqlite_cur.fetchall()

inserted = 0
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
        print(f"\n   ✗ Erreur theme {row['name_ar']}: {e}")
        pg_conn.rollback()

pg_conn.commit()
print(f"✅ {inserted}/{total} lignes")

# =====================================================
# 3. Décisions (métadonnées légères seulement)
# =====================================================
print("3️⃣ Migration supreme_court_decisions...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM supreme_court_decisions")
rows = sqlite_cur.fetchall()

inserted = 0
skipped = 0
batch_size = 200
total = len(rows)

for i, row in enumerate(rows):
    try:
        # Convertir la date
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
            print(f"\r3️⃣ Migration supreme_court_decisions... {i+1}/{total} ({inserted} insérées)", end="", flush=True)
            
    except Exception as e:
        skipped += 1
        pg_conn.rollback()

pg_conn.commit()
print(f"\r3️⃣ Migration supreme_court_decisions... ✅ {inserted}/{total} lignes ({skipped} ignorées)" + " "*20)

# =====================================================
# 4. Classifications
# =====================================================
print("4️⃣ Migration supreme_court_decision_classifications...", end=" ", flush=True)
sqlite_cur.execute("SELECT * FROM supreme_court_decision_classifications")
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
            print(f"\r4️⃣ Migration classifications... {i+1}/{total} ({inserted} insérées)", end="", flush=True)
            
    except Exception as e:
        pg_conn.rollback()

pg_conn.commit()
print(f"\r4️⃣ Migration supreme_court_decision_classifications... ✅ {inserted}/{total} lignes" + " "*20)

print("\n" + "=" * 60)
print("✅ PHASE 1C TERMINÉE : Cour Suprême migrée")
print(f"   (Index mots-clés français : 64k lignes, sera migré ensuite)")
print(f"   (Données volumineuses : HTML, embeddings → R2)")
print("=" * 60)

sqlite_conn.close()
pg_cur.close()
pg_conn.close()
