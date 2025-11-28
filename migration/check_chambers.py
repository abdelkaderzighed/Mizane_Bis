#!/usr/bin/env python3
import sqlite3
import psycopg2

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
pg_db = "postgresql://postgres:Piano_2025_Sup@db.pxcwsfnuvmowlvtycslc.supabase.co:5432/postgres"

print("Chambres dans SQLite :")
sqlite_conn = sqlite3.connect(sqlite_db)
sqlite_conn.row_factory = sqlite3.Row
cur = sqlite_conn.cursor()
cur.execute("SELECT id, name_fr FROM supreme_court_chambers ORDER BY id")
for row in cur.fetchall():
    print(f"  ID={row['id']}: {row['name_fr']}")
sqlite_conn.close()

print("\nChambres dans PostgreSQL :")
pg_conn = psycopg2.connect(pg_db)
pg_cur = pg_conn.cursor()
pg_cur.execute("SELECT id, name_fr FROM supreme_court_chambers ORDER BY id")
for row in pg_cur.fetchall():
    print(f"  ID={row[0]}: {row[1]}")
pg_cur.close()
pg_conn.close()

print("\nThèmes référençant des chambers inexistantes :")
sqlite_conn = sqlite3.connect(sqlite_db)
cur = sqlite_conn.cursor()
cur.execute("""
    SELECT DISTINCT chamber_id 
    FROM supreme_court_themes 
    WHERE chamber_id NOT IN (SELECT id FROM supreme_court_chambers)
    ORDER BY chamber_id
""")
orphans = cur.fetchall()
if orphans:
    print(f"  Chamber IDs orphelins : {[r[0] for r in orphans]}")
else:
    print("  Aucun thème orphelin")
sqlite_conn.close()
