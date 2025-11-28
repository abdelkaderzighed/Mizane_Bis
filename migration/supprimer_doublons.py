#!/usr/bin/env python3
import psycopg2

# Connexion à MizaneDb
dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Connexion à MizaneDb...")
conn = psycopg2.connect(dest_db)
cur = conn.cursor()

tables = [
    'user_profiles', 'user_alerts', 'ai_usage_logs', 'alert_rules',
    'client_conversations', 'clients', 'document_templates', 'email_templates',
    'invoices', 'subscriptions', 'support_messages', 'system_settings', 'transactions'
]

print("\n🧹 Suppression des doublons...\n")

for table in tables:
    print(f"📋 {table}...", end=" ", flush=True)
    
    # Compter avant
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    count_before = cur.fetchone()[0]
    
    # Supprimer les doublons en gardant le premier
    cur.execute(f"""
        DELETE FROM "{table}" a USING "{table}" b
        WHERE a.ctid < b.ctid
        AND a.* = b.*;
    """)
    
    deleted = cur.rowcount
    conn.commit()
    
    # Compter après
    cur.execute(f'SELECT COUNT(*) FROM "{table}"')
    count_after = cur.fetchone()[0]
    
    print(f"✅ {count_before} → {count_after} ({deleted} doublons supprimés)")

cur.close()
conn.close()

print("\n✅ Nettoyage terminé !")
