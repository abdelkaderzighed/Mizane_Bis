#!/usr/bin/env python3
"""Test rapide de la chaîne complète sur 3 documents"""

import os
os.environ['PYTHONUNBUFFERED'] = '1'  # Force unbuffered output

print("Starting imports...")
import sys
import time
from reextract_all_documents import DocumentProcessor
import sqlite3

def main():
    print("\n🧪 TEST DE LA CHAÎNE COMPLÈTE SUR 3 DOCUMENTS\n")
    print("="*70)

    # Vérifier OPENAI_API_KEY
    if not os.getenv('OPENAI_API_KEY'):
        print("❌ OPENAI_API_KEY non définie")
        sys.exit(1)

    print("✅ OPENAI_API_KEY trouvée")

    # Initialiser le processeur
    print("\n🔁 Initialisation du processeur...")
    try:
        processor = DocumentProcessor()
        print("✅ Processeur initialisé")
    except Exception as e:
        print(f"❌ Erreur: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

    # Récupérer 3 documents
    print("\n📋 Récupération de 3 documents de test...")
    conn = sqlite3.connect('harvester.db')
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    cursor.execute("""
        SELECT DISTINCT d.id, d.file_path
        FROM documents d
        LEFT JOIN document_ai_analysis daa ON d.id = daa.document_id
        WHERE d.file_path IS NOT NULL
        AND d.file_path LIKE '%.pdf'
        AND d.file_path LIKE '%2024%'
        ORDER BY d.id DESC
        LIMIT 3
    """)

    documents = cursor.fetchall()
    conn.close()

    print(f"✅ {len(documents)} documents récupérés\n")

    # Traiter chaque document
    processor.stats['total'] = len(documents)

    for idx, doc in enumerate(documents, 1):
        print(f"\n{'='*70}")
        print(f"📄 TEST {idx}/{len(documents)}")
        print(f"{'='*70}\n")

        success = processor.process_document(doc['id'], doc['file_path'])

        if success:
            print(f"\n✅ Document {doc['id']} traité avec succès")
        else:
            print(f"\n❌ Échec du traitement du document {doc['id']}")

        # Petite pause entre les documents
        if idx < len(documents):
            print("\n⏸️  Pause de 2 secondes...")
            time.sleep(2)

    # Afficher les stats
    processor.print_final_stats()

if __name__ == '__main__':
    main()
