#!/usr/bin/env python3
import psycopg2

source_db = "postgresql://postgres:Piano_2025_Sup@db.aycqqlxjuczgewyuzrqb.supabase.co:5432/postgres"
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion aux bases de données...")
src_conn = psycopg2.connect(source_db)
dst_conn = psycopg2.connect(dest_db)

src_cur = src_conn.cursor()
dst_cur = dst_conn.cursor()

kv_tables = ['kv_store_810b4099', 'kv_store_823d863f']

print("\n🔄 Clonage des KV Stores...\n")

for table in kv_tables:
    print(f"📋 {table}...", end=" ", flush=True)
    
    # 1. Créer la table
    src_cur.execute(f"""
        SELECT 
            'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
            string_agg(
                column_name || ' ' || 
                CASE 
                    WHEN data_type = 'USER-DEFINED' THEN udt_name
                    ELSE data_type 
                END ||
                CASE 
                    WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
                    ELSE ''
                END ||
                CASE WHEN is_nullable = 'NO' THEN ' NOT NULL' ELSE '' END ||
                CASE WHEN column_default IS NOT NULL THEN ' DEFAULT ' || column_default ELSE '' END,
                ', ' ORDER BY ordinal_position
            ) || ');'
        FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = %s
        GROUP BY table_name;
    """, (table,))
    
    create_stmt = src_cur.fetchone()
    if create_stmt:
        dst_cur.execute(create_stmt[0])
        
        # 2. Copier les données
        src_cur.execute(f'SELECT * FROM "{table}"')
        rows = src_cur.fetchall()
        
        if rows:
            cols = [desc[0] for desc in src_cur.description]
            placeholders = ','.join(['%s'] * len(cols))
            insert_sql = f'INSERT INTO "{table}" ({",".join(cols)}) VALUES ({placeholders}) ON CONFLICT DO NOTHING'
            
            for row in rows:
                try:
                    dst_cur.execute(insert_sql, row)
                except Exception as e:
                    pass
        
        dst_conn.commit()
        print(f"✅ {len(rows)} lignes")
    else:
        print("❌ introuvable")

src_cur.close()
dst_cur.close()
src_conn.close()
dst_conn.close()

print("\n✅ KV Stores clonés !")
