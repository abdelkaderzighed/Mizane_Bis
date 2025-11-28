#!/usr/bin/env python3
import sqlite3

sqlite_db = '/Users/djamel/Sites/Mizane_Bis/C=A+B/BB/harvester.db'
conn = sqlite3.connect(sqlite_db)
conn.row_factory = sqlite3.Row
cur = conn.cursor()

print("Sessions dans SQLite :")
cur.execute("SELECT id, session_name FROM harvesting_sessions")
for row in cur.fetchall():
    print(f"  ID={row['id']}, Name={row['session_name']}")

print("\nStatistiques dans SQLite :")
cur.execute("SELECT id, session_id FROM session_statistics")
for row in cur.fetchall():
    print(f"  Stats ID={row['id']}, Session ID={row['session_id']}")

conn.close()
