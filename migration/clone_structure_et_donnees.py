#!/usr/bin/env python3
import sys
try:
    import psycopg2
except:
    print("Installation de psycopg2...")
    import subprocess
    subprocess.run([sys.executable, "-m", "pip", "install", "psycopg2-binary"], check=True)
    import psycopg2

# Credentials
source_db = "postgresql://postgres:Piano_2025_Sup@db.aycqqlxjuczgewyuzrqb.supabase.co:5432/postgres"
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion aux bases de données...")
src_conn = psycopg2.connect(source_db)
dst_conn = psycopg2.connect(dest_db)

src_cur = src_conn.cursor()
dst_cur = dst_conn.cursor()

# Liste des tables à cloner
tables = [
    'user_profiles', 'user_alerts', 'ai_usage_logs', 'alert_rules',
    'client_conversations', 'clients', 'document_templates', 'email_templates',
    'invoices', 'subscriptions', 'support_messages', 'system_settings', 'transactions'
]

print("\n🔄 Clonage structure + données...\n")

for table in tables:
    print(f"📋 {table}...", end=" ", flush=True)
    
    # 1. Récupérer la définition complète de la table
    src_cur.execute(f"""
        SELECT 
            'CREATE TABLE IF NOT EXISTS ' || table_name || ' (' ||
            string_agg(
                column_name || ' ' || 
                CASE 
                    WHEN data_type = 'USER-DEFINED' THEN udt_name
                    WHEN data_type = 'ARRAY' THEN udt_name
                    ELSE data_type 
                END ||
                CASE 
                    WHEN character_maximum_length IS NOT NULL THEN '(' || character_maximum_length || ')'
                    WHEN numeric_precision IS NOT NULL AND data_type IN ('numeric', 'decimal') 
                        THEN '(' || numeric_precision || ',' || COALESCE(numeric_scale, 0) || ')'
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
        # 2. Créer la table dans la destination
        dst_cur.execute(create_stmt[0])
        
        # 3. Copier les données
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
                    pass  # Ignorer les doublons
        
        dst_conn.commit()
        print(f"✅ {len(rows)} lignes")
    else:
        print("❌ table introuvable")

src_cur.close()
dst_cur.close()
src_conn.close()
dst_conn.close()

print("\n✅ Clonage terminé !")
