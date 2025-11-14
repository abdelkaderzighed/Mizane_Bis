import sqlite3
import os
from datetime import datetime

DB_PATH = 'harvester.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

print("🔄 Création de la table 'settings'...")

cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='settings'")
if not cursor.fetchone():
    cursor.execute("""
        CREATE TABLE settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            key VARCHAR(100) NOT NULL UNIQUE,
            value TEXT,
            description TEXT,
            updated_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL
        )
    """)
    
    now = datetime.now().isoformat()
    cursor.execute("""
        INSERT INTO settings (key, value, description, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?)
    """, ('anthropic_api_key', '', 'Clé API Anthropic pour l\'analyse IA', now, now))
    
    print("✅ Table 'settings' créée")
    print("✅ Clé 'anthropic_api_key' initialisée (vide)")
else:
    print("✓ Table 'settings' existe déjà")

conn.commit()
conn.close()
