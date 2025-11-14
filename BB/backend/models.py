"""Modèles de données pour la nouvelle structure BD"""
import sqlite3
from contextlib import contextmanager
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
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO harvesting_sessions (
                    site_id, session_name, is_test, status,
                    max_documents, start_number, end_number
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                site_id, session_name, is_test, 
                kwargs.get('status', 'pending'),
                kwargs.get('max_documents'),
                kwargs.get('start_number'),
                kwargs.get('end_number')
            ))
            session_id = cursor.lastrowid
            cursor.execute("INSERT INTO session_statistics (session_id) VALUES (?)", (session_id,))
            return session_id
    
    @staticmethod
    def get_all(include_test=False):
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
    
    @staticmethod
    def get_by_id(session_id):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT hs.*, s.name as site_name, s.url as site_url
                FROM harvesting_sessions hs
                JOIN sites s ON hs.site_id = s.id
                WHERE hs.id = ?
            """, (session_id,))
            row = cursor.fetchone()
            return dict(row) if row else None

class Document:
    """Modèle pour la table documents"""
    
    @staticmethod
    def create(session_id, url, file_extension, file_path=None):
        with get_db_connection() as conn:
            cursor = conn.cursor()
            text_path = f"{file_path}.txt" if file_path else None
            cursor.execute("""
                INSERT INTO documents (
                    session_id, url, file_extension, file_path, text_path
                ) VALUES (?, ?, ?, ?, ?)
            """, (session_id, url, file_extension, file_path, text_path))
            return cursor.lastrowid
