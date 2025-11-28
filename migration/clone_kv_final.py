#!/usr/bin/env python3
import psycopg2
from psycopg2.extras import Json, RealDictCursor

source_db = "postgresql://postgres:Piano_2025_Sup@db.aycqqlxjuczgewyuzrqb.supabase.co:5432/postgres"
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion aux bases de données...")
src_conn = psycopg2.connect(source_db)
dst_conn = psycopg2.connect(dest_db)

src_cur = src_conn.cursor(cursor_factory=RealDictCursor)
dst_cur = dst_conn.cursor()

kv_tables = ['kv_store_810b4099', 'kv_store_823d863f']

print("\n🔄 Clonage des KV Stores (avec jsonb)...\n")

for table in kv_tables:
    print(f"📋 {table}...", end=" ", flush=True)
    
    # 1. Vérifier les colonnes existantes
    src_cur.execute(f"""
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = %s
        ORDER BY ordinal_position
    """, (table,))
    cols = [row['column_name'] for row in src_cur.fetchall()]
    
    # 2. Drop et recréer la table
    dst_cur.execute(f'DROP TABLE IF EXISTS "{table}" CASCADE')
    
    if 'created_at' in cols:
        dst_cur.execute(f"""
            CREATE TABLE "{table}" (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL,
                created_at TIMESTAMPTZ DEFAULT NOW(),
                updated_at TIMESTAMPTZ DEFAULT NOW()
            )
        """)
    else:
        dst_cur.execute(f"""
            CREATE TABLE "{table}" (
                key TEXT PRIMARY KEY,
                value JSONB NOT NULL
            )
        """)
    dst_conn.commit()
    
    # 3. Copier les données
    col_list = ', '.join(cols)
    src_cur.execute(f'SELECT {col_list} FROM "{table}"')
    rows = src_cur.fetchall()
    
    inserted = 0
    for row in rows:
        try:
            # Convertir le dict value en Json
            values = []
            for col in cols:
                val = row[col]
                if col == 'value' and isinstance(val, dict):
                    values.append(Json(val))
                else:
                    values.append(val)
            
            placeholders = ', '.join(['%s'] * len(cols))
            dst_cur.execute(f"""
                INSERT INTO "{table}" ({col_list})
                VALUES ({placeholders})
                ON CONFLICT (key) DO NOTHING
            """, values)
            
            if dst_cur.rowcount > 0:
                inserted += 1
        except Exception as e:
            print(f"\n  ✗ Erreur pour clé {row['key']}: {e}")
    
    dst_conn.commit()
    print(f"✅ {inserted}/{len(rows)} lignes")

src_cur.close()
dst_cur.close()
src_conn.close()
dst_conn.close()

print("\n✅ KV Stores clonés avec succès !")
