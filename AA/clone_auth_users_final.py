#!/usr/bin/env python3
import psycopg2
from psycopg2.extras import Json, RealDictCursor

# Connexion aux bases de données
source_db = "postgresql://postgres:Piano_2025_Sup@db.aycqqlxjuczgewyuzrqb.supabase.co:5432/postgres"
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion aux bases de données...")
src_conn = psycopg2.connect(source_db)
dst_conn = psycopg2.connect(dest_db)

src_cur = src_conn.cursor(cursor_factory=RealDictCursor)
dst_cur = dst_conn.cursor()

print("\n🔄 Clonage de auth.users...\n")

# Trouver les colonnes générées à exclure
dst_cur.execute("""
    SELECT column_name 
    FROM information_schema.columns 
    WHERE table_schema = 'auth' 
    AND table_name = 'users' 
    AND is_generated = 'ALWAYS'
""")
generated_cols = {row[0] for row in dst_cur.fetchall()}
print(f"Colonnes générées à exclure : {generated_cols}")

# Récupérer les utilisateurs
src_cur.execute('SELECT * FROM auth.users')
rows = src_cur.fetchall()

print(f"\nTrouvé {len(rows)} utilisateurs dans Missan-V3\n")

inserted = 0
for row in rows:
    # Exclure les colonnes générées
    cols = [k for k in row.keys() if k not in generated_cols]
    values = []
    
    # Convertir les dict en Json
    for key in cols:
        val = row[key]
        if isinstance(val, dict):
            values.append(Json(val))
        else:
            values.append(val)
    
    placeholders = ','.join(['%s'] * len(cols))
    insert_sql = f'INSERT INTO auth.users ({",".join(cols)}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING'
    
    try:
        dst_cur.execute(insert_sql, values)
        dst_conn.commit()
        if dst_cur.rowcount > 0:
            inserted += 1
            print(f"  ✓ {row['email']}")
        else:
            print(f"  ⊘ {row['email']} (déjà existe)")
    except Exception as e:
        print(f"  ✗ {row['email']}: {e}")
        dst_conn.rollback()

src_cur.close()
dst_cur.close()
src_conn.close()
dst_conn.close()

print(f"\n✅ {inserted} utilisateurs clonés !")
