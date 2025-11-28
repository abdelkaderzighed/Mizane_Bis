#!/usr/bin/env python3
import psycopg2

# Connexion aux bases de données
source_db = "postgresql://postgres:Piano_2025_Sup@db.aycqqlxjuczgewyuzrqb.supabase.co:5432/postgres"
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion aux bases de données...")
src_conn = psycopg2.connect(source_db)
dst_conn = psycopg2.connect(dest_db)

src_cur = src_conn.cursor()
dst_cur = dst_conn.cursor()

print("\n🔄 Clonage de auth.users...\n")

# Récupérer les utilisateurs de Missan-V3
src_cur.execute('SELECT * FROM auth.users')
rows = src_cur.fetchall()
cols = [desc[0] for desc in src_cur.description]

print(f"Trouvé {len(rows)} utilisateurs dans Missan-V3")

# Insérer dans MizaneDb
placeholders = ','.join(['%s'] * len(cols))
insert_sql = f'INSERT INTO auth.users ({",".join(cols)}) VALUES ({placeholders}) ON CONFLICT (id) DO NOTHING'

inserted = 0
for row in rows:
    try:
        dst_cur.execute(insert_sql, row)
        if dst_cur.rowcount > 0:
            inserted += 1
    except Exception as e:
        print(f"⚠️ Erreur pour un utilisateur : {e}")

dst_conn.commit()

src_cur.close()
dst_cur.close()
src_conn.close()
dst_conn.close()

print(f"\n✅ {inserted} utilisateurs clonés !")
