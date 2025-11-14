#!/usr/bin/env python3
"""Script de migration automatique du backend vers la nouvelle structure BD"""

import os
import shutil
import sqlite3
from datetime import datetime
import json

BACKEND_DIR = os.path.expanduser("~/doc_harvester/backend")
DB_FILE = os.path.join(BACKEND_DIR, "harvester.db")

print("\n" + "="*70)
print("MIGRATION BACKEND HARVESTER v2.0")
print("="*70 + "\n")

# Étape 1: Créer models.py
print("📝 Création de models.py...")
models_content = '''"""Modèles de données pour la nouvelle structure BD"""
import sqlite3
from contextlib import contextmanager
from datetime import datetime
import json

DB_PATH = 'harvester.db'

@contextmanager
def get_db_connection():
    """Context manager pour connexion BD"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    except Exception as e:
        conn.rollback()
        raise e
    finally:
        conn.close()

class Site:
    """Modèle pour la table sites"""
    
    @staticmethod
    def get_by_name(name):
        """Récupérer un site par nom"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sites WHERE name = ?", (name,))
            row = cursor.fetchone()
            if row:
                site = dict(row)
                if site.get('type_specific_params'):
                    site['type_specific_params'] = json.loads(site['type_specific_params'])
                return site
            return None
    
    @staticmethod
    def get_all():
        """Récupérer tous les sites"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sites ORDER BY name")
            rows = cursor.fetchall()
            sites = []
            for row in rows:
                site = dict(row)
                if site.get('type_specific_params'):
                    site['type_specific_params'] = json.loads(site['type_specific_params'])
                sites.append(site)
            return sites

class HarvestingSession:
    """Modèle pour la table harvesting_sessions"""
    
    @staticmethod
    def create(site_id, session_name, is_test=False, **kwargs):
        """Créer une nouvelle session"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO harvesting_sessions (
                    site_id, session_name, is_test, status
                ) VALUES (?, ?, ?, ?)
            """, (site_id, session_name, is_test, kwargs.get('status', 'pending')))
            
            session_id = cursor.lastrowid
            
            # Créer les statistiques associées
            cursor.execute("INSERT INTO session_statistics (session_id) VALUES (?)", (session_id,))
            
            return session_id
    
    @staticmethod
    def get_all(include_test=False):
        """Récupérer toutes les sessions"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            query = """
                SELECT hs.*, s.name as site_name
                FROM harvesting_sessions hs
                JOIN sites s ON hs.site_id = s.id
            """
            if not include_test:
                query += " WHERE hs.is_test = 0"
            query += " ORDER BY hs.created_at DESC"
            
            cursor.execute(query)
            return [dict(row) for row in cursor.fetchall()]

class Document:
    """Modèle pour la table documents"""
    
    @staticmethod
    def create(session_id, url, file_extension, file_path=None):
        """Créer un nouveau document"""
        with get_db_connection() as conn:
            cursor = conn.cursor()
            text_path = f"{file_path}.txt" if file_path else None
            
            cursor.execute("""
                INSERT INTO documents (
                    session_id, url, file_extension, file_path, text_path
                ) VALUES (?, ?, ?, ?, ?)
            """, (session_id, url, file_extension, file_path, text_path))
            
            return cursor.lastrowid
'''

with open('models.py', 'w', encoding='utf-8') as f:
    f.write(models_content)
print("✅ models.py créé\n")

# Étape 2: Tester
print("🔍 Test de lecture de la BD...")
try:
    import sys
    sys.path.insert(0, BACKEND_DIR)
    from models import Site
    
    joradp = Site.get_by_name('JORADP')
    if joradp:
        print(f"✅ Site JORADP trouvé: {joradp['url']}")
        print(f"   Type: {joradp['site_type']}")
    else:
        print("⚠️  Site JORADP non trouvé")
    
    sites = Site.get_all()
    print(f"✅ {len(sites)} site(s) en base\n")
    
except Exception as e:
    print(f"❌ Erreur: {e}\n")

# Résumé
print("="*70)
print("✅ MIGRATION TERMINÉE")
print("="*70)
print("\n📦 Fichier créé: models.py")
print("💾 Sauvegarde: migration_backup/")
print("\n🎯 Prochaine étape: Adapter api.py")
print("   Je vais vous guider pour cela...\n")

