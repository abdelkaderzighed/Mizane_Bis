#!/usr/bin/env python3
import psycopg2

dest_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("📡 Connexion à MizaneDb...")
conn = psycopg2.connect(dest_db)
cur = conn.cursor()

print("📄 Lecture du fichier SQL...")
with open('/Users/djamel/Sites/Mizane_Bis/C=A+B/migration/03_schema_bb_juridique.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

print("🔨 Création des tables BB (JORADP + Cour Suprême)...")
print("   - Tables génériques (sites, sessions, archives)")
print("   - Tables JORADP (documents, metadata, keywords)")
print("   - Tables Cour Suprême (decisions, chambers, themes)")
print("   - Policies RLS (BB read/write, AA read-only)")
print()

try:
    cur.execute(sql)
    conn.commit()
    print("✅ Schéma BB créé avec succès !")
    
    # Compter les tables créées
    cur.execute("""
        SELECT COUNT(*) 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
            'sites', 'harvesting_sessions', 'session_statistics',
            'site_archive', 'site_archive_scans',
            'joradp_documents', 'joradp_metadata', 'joradp_keyword_index',
            'supreme_court_chambers', 'supreme_court_themes', 
            'supreme_court_decisions', 'supreme_court_decision_classifications',
            'french_keyword_index'
        )
    """)
    count = cur.fetchone()[0]
    print(f"📊 {count}/13 tables BB créées dans MizaneDb")
    
except Exception as e:
    print(f"❌ Erreur : {e}")
    conn.rollback()
finally:
    cur.close()
    conn.close()

