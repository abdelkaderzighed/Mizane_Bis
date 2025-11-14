"""
Script de migration pour ajouter les colonnes de stockage local
À exécuter UNE SEULE FOIS
"""

import sqlite3
import os

DB_PATH = 'harvester.db'

def migrate_database():
    """Ajoute les colonnes nécessaires pour le stockage local"""
    
    if not os.path.exists(DB_PATH):
        print(f"❌ Erreur : Le fichier {DB_PATH} n'existe pas")
        print(f"   Assurez-vous d'être dans le répertoire ~/doc_harvester")
        return False
    
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        
        print("🔄 Migration de la base de données...")
        print(f"📊 Fichier : {DB_PATH}")
        
        # Vérifier si les colonnes existent déjà
        cursor.execute("PRAGMA table_info(documents)")
        columns = [col[1] for col in cursor.fetchall()]
        
        if 'local_path' in columns and 'downloaded' in columns:
            print("✅ Les colonnes existent déjà. Rien à faire.")
            conn.close()
            return True
        
        # Ajouter la colonne local_path
        if 'local_path' not in columns:
            print("   • Ajout de la colonne 'local_path'...")
            cursor.execute("ALTER TABLE documents ADD COLUMN local_path TEXT")
            print("   ✓ Colonne 'local_path' ajoutée")
        else:
            print("   ✓ Colonne 'local_path' déjà présente")
        
        # Ajouter la colonne downloaded
        if 'downloaded' not in columns:
            print("   • Ajout de la colonne 'downloaded'...")
            cursor.execute("ALTER TABLE documents ADD COLUMN downloaded INTEGER DEFAULT 0")
            print("   ✓ Colonne 'downloaded' ajoutée")
        else:
            print("   ✓ Colonne 'downloaded' déjà présente")
        
        conn.commit()
        
        # Vérifier la nouvelle structure
        cursor.execute("PRAGMA table_info(documents)")
        columns_after = cursor.fetchall()
        
        print("\n📋 Structure de la table 'documents' après migration :")
        for col in columns_after:
            col_name = col[1]
            col_type = col[2]
            is_new = "🆕" if col_name in ['local_path', 'downloaded'] else "  "
            print(f"   {is_new} {col_name} ({col_type})")
        
        conn.close()
        
        print("\n✅ Migration réussie !")
        return True
        
    except sqlite3.Error as e:
        print(f"\n❌ Erreur SQL : {e}")
        return False
    except Exception as e:
        print(f"\n❌ Erreur : {e}")
        return False


def create_storage_directory():
    """Crée le répertoire de stockage des documents"""
    storage_path = "/Users/djamel/Documents/textes_juridiques_DZ"
    
    try:
        if os.path.exists(storage_path):
            print(f"\n✅ Répertoire de stockage existe déjà : {storage_path}")
        else:
            os.makedirs(storage_path, exist_ok=True)
            print(f"\n✅ Répertoire de stockage créé : {storage_path}")
        
        # Vérifier les permissions
        if os.access(storage_path, os.W_OK):
            print(f"✅ Permissions d'écriture : OK")
        else:
            print(f"⚠️  Permissions d'écriture : MANQUANTES")
            print(f"   Exécutez : chmod 755 {storage_path}")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors de la création du répertoire : {e}")
        return False


if __name__ == '__main__':
    print("=" * 70)
    print("🔧 Migration de la base de données - Stockage Local")
    print("=" * 70)
    print()
    
    # Étape 1 : Migration BD
    success_db = migrate_database()
    
    # Étape 2 : Création répertoire
    success_dir = create_storage_directory()
    
    # Résumé
    print("\n" + "=" * 70)
    if success_db and success_dir:
        print("✅ Migration complète réussie !")
        print("\n📌 Prochaines étapes :")
        print("   1. Modifiez le frontend (App.js) pour ajouter les champs")
        print("   2. Relancez le backend avec les nouvelles fonctionnalités")
        print("   3. Testez un moissonnage complet")
    else:
        print("⚠️  Migration incomplète - Vérifiez les erreurs ci-dessus")
    print("=" * 70)


