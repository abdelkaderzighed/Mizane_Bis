#!/usr/bin/env python3
import psycopg2

pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

conn = psycopg2.connect(pg_db)
cur = conn.cursor()

print("\n📊 Vérification des données migrées dans MizaneDb :\n")

tables = [
    ('sites', 'Sites'),
    ('harvesting_sessions', 'Sessions'),
    ('session_statistics', 'Statistiques'),
]

for table, desc in tables:
    cur.execute(f"SELECT COUNT(*) FROM {table}")
    count = cur.fetchone()[0]
    print(f"   {desc:20s} : {count} lignes")

cur.close()
conn.close()
