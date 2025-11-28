#!/usr/bin/env python3
import psycopg2
from psycopg2.extras import Json

source_db = "postgresql://postgres:Piano_2025_Sup@db.aycqqlxjuczgewyuzrqb.supabase.co:5432/postgres"
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion aux bases de données...")
src_conn = psycopg2.connect(source_db)
dst_conn = psycopg2.connect(dest_db)

src_cur = src_conn.cursor()
dst_cur = dst_conn.cursor()

kv_tables = ['kv_store_810b4099', 'kv_store_823d863f']

print("\n🔄 Clonage des KV Stores (avec jsonb)...\n")

for table in kv_tables:
    print(f"📋 {table}...", end=" ", flush=True)
    
    # 1. Drop et recréer la table avec PRIMARY KEY
    dst_cur.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
    dst_cur.execute(f"""
        CREATE TABLE "{table}" (
            key TEXT PRIMARY KEY,
            value JSONB NOT NULL,
            created_at TIMESTAMPTZ DEFAULT NOW(),
            updated_at TIMESTAMPTZ DEFAULT NOW()
        )
    """)
    dst_conn.commit()
    
    # 2. Copier les données
    src_cur.execute(f'SELECT key, value, created_at, updated_at FROM "{table}"')
    rows = src_cur.fetchall()
    
    inserted = 0
    for row in rows:
        try:
            dst_cur.execute(f"""
                INSERT INTO "{table}" (key, value, created_at, updated_at)
                VALUES (%s, %s, %s, %s)
                ON CONFLICT (key) DO NOTHING
            """, row)
            if dst_cur.rowcount > 0:
                inserted += 1
        except Exception as e:
            print(f"\n  ✗ Erreur pour clé {row[0]}: {e}")
    
    dst_conn.commit()
    print(f"✅ {inserted}/{len(rows)} lignes")

src_cur.close()
dst_cur.close()
src_conn.close()
dst_conn.close()

print("\n✅ KV Stores clonés avec succès !")
