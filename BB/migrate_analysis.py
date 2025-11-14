"""
Migration de la base de données pour l'analyse IA des documents
Ajoute les colonnes et tables nécessaires
"""

import sqlite3
import os

DB_PATH = 'harvester.db'

def migrate_database():
    """Ajoute les colonnes et tables pour l'analyse IA"""
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Erreur : Le fichier {DB_PATH} n'existe pas")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("🔄 Migration de la base de données pour l'analyse IA...")
        print(f"📊 Fichier : {DB_PATH}\n")
        
        cursor.execute("PRAGMA table_info(documents)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'analyzed' not in columns:
            print("   • Ajout de la colonne 'analyzed'...")
            cursor.execute("ALTER TABLE documents ADD COLUMN analyzed INTEGER DEFAULT 0")
            print("   ✓ Colonne 'analyzed' ajoutée")
        else:
            print("   ✓ Colonne 'analyzed' existe déjà")
        
        if 'analysis_status' not in columns:
            print("   • Ajout de la colonne 'analysis_status'...")
            cursor.execute("ALTER TABLE documents ADD COLUMN analysis_status VARCHAR(20) DEFAULT 'pending'")
            print("   ✓ Colonne 'analysis_status' ajoutée")
        else:
            print("   ✓ Colonne 'analysis_status' existe déjà")
        
        if 'full_text_path' not in columns:
            print("   • Ajout de la colonne 'full_text_path'...")
            cursor.execute("ALTER TABLE documents ADD COLUMN full_text_path TEXT")
            print("   ✓ Colonne 'full_text_path' ajoutée")
        else:
            print("   ✓ Colonne 'full_text_path' existe déjà")
        
        if 'ai_analysis' not in columns:
            print("   • Ajout de la colonne 'ai_analysis'...")
            cursor.execute("ALTER TABLE documents ADD COLUMN ai_analysis TEXT")
            print("   ✓ Colonne 'ai_analysis' ajoutée")
        else:
            print("   ✓ Colonne 'ai_analysis' existe déjà")
        
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='analysis_jobs'")
        table_exists = cursor.fetchone()
        
        if not table_exists:
            print("\n   • Création de la table 'analysis_jobs'...")
            cursor.execute("""
                CREATE TABLE analysis_jobs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    job_uuid VARCHAR(36) NOT NULL UNIQUE,
                    started_at DATETIME NOT NULL,
                    completed_at DATETIME,
                    status VARCHAR(20) NOT NULL,
                    total_documents INTEGER NOT NULL,
                    processed_documents INTEGER DEFAULT 0,
                    successful_documents INTEGER DEFAULT 0,
                    failed_documents INTEGER DEFAULT 0,
                    stopped_by_user INTEGER DEFAULT 0,
                    estimated_cost_usd REAL,
                    actual_cost_usd REAL,
                    error_message TEXT
                )
            """)
            print("   ✓ Table 'analysis_jobs' créée")
        else:
            print("\n   ✓ Table 'analysis_jobs' existe déjà")
        
        conn.commit()
        
        print("\n📋 Structure finale de la table 'documents' :")
        cursor.execute("PRAGMA table_info(documents)")
        columns_after = cursor.fetchall()
        
        for col in columns_after:
            col_name = col[1]
            col_type = col[2]
            is_new = "🆕" if col_name in ['analyzed', 'analysis_status', 'full_text_path', 'ai_analysis'] else "  "
            print(f"   {is_new} {col_name} ({col_type})")
        
        cursor.execute("SELECT COUNT(*) FROM documents")
        total_docs = cursor.fetchone()[0]
        
        cursor.execute("SELECT COUNT(*) FROM documents WHERE downloaded = 1")
        downloaded_docs = cursor.fetchone()[0]
        
        print(f"\n📊 Statistiques :")
        print(f"   • Total documents : {total_docs}")
        print(f"   • Documents téléchargés : {downloaded_docs}")
        print(f"   • Prêts pour l'analyse : {downloaded_docs}")
        
        conn.close()
        
        print("\n✅ Migration réussie !")
        return True
        
    except sqlite3.Error as e:
        print(f"\n❌ Erreur SQL : {e}")
        return False
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        return False


if __name__ == '__main__':
    print("=" * 70)
    print("🔧 Migration BD - Analyse IA des Documents")
    print("=" * 70)
    print()
    
    success = migrate_database()
    
    print("\n" + "=" * 70)
    if success:
        print("✅ Migration complète réussie !")
        print("\n📌 Prochaines étapes :")
        print("   1. Vérifiez que la structure est correcte")
        print("   2. Passez à la Phase 2 : Backend - Fonctions d'analyse")
    else:
        print("⚠️  Migration incomplète - Vérifiez les erreurs ci-dessus")
    print("=" * 70)
