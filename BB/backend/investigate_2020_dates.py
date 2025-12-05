#!/usr/bin/env python3
"""
Investiguer pourquoi l'IA extrait la date 2020 pour des documents des années 1960.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv()

from shared.postgres import get_connection_simple
from shared.r2_storage import get_r2_client, normalize_key, get_bucket_name
import re
import json

def download_from_r2(raw_path):
    """Télécharger le contenu d'un fichier depuis R2."""
    try:
        key = normalize_key(raw_path)
        if not key:
            return None
        client = get_r2_client()
        bucket = get_bucket_name()
        response = client.get_object(Bucket=bucket, Key=key)
        return response['Body'].read()
    except Exception as e:
        print(f"   Erreur téléchargement R2: {e}")
        return None

def investigate_documents():
    """Analyser quelques documents pour comprendre le problème."""
    conn = get_connection_simple()
    cur = conn.cursor()

    # Récupérer des documents des années 1960 qui avaient la date 2020
    cur.execute("""
        SELECT
            d.id,
            d.url,
            d.publication_date,
            d.text_path_r2,
            ai.entities,
            ai.dates_extracted,
            ai.extra_metadata
        FROM joradp_documents d
        LEFT JOIN LATERAL (
            SELECT *
            FROM document_ai_metadata dam
            WHERE dam.document_id = d.id
              AND dam.corpus = 'joradp'
            LIMIT 1
        ) ai ON TRUE
        WHERE d.url LIKE '%/F196%'
          AND d.publication_date IS NOT NULL
        ORDER BY d.id
        LIMIT 5
    """)

    docs = cur.fetchall()
    cur.close()
    conn.close()

    if not docs:
        print("❌ Aucun document trouvé")
        return

    print("=" * 100)
    print("🔍 Investigation: Documents des années 1960")
    print("=" * 100)
    print()

    for doc in docs:
        url_match = re.search(r'/F(\d{4})\d{3}\.pdf$', doc['url'])
        url_year = url_match.group(1) if url_match else "???"

        print(f"\n📄 Document ID {doc['id']}")
        print(f"   URL: {doc['url'].split('/')[-1]} (année {url_year})")
        print(f"   Date actuelle: {doc['publication_date']}")
        print()

        # Analyser les entités extraites
        entities = doc['entities']
        if entities:
            print(f"   🏷️  Entités extraites ({len(entities)} total):")
            # Chercher les entités DATE
            date_entities = [e for e in entities if isinstance(e, str) and e.upper().startswith('DATE')]
            if date_entities:
                for entity in date_entities[:5]:
                    print(f"      - {entity}")
                if len(date_entities) > 5:
                    print(f"      ... et {len(date_entities) - 5} autres")
            else:
                print("      ❌ Aucune entité DATE trouvée")
        else:
            print("   ❌ Pas d'entités extraites")

        # Analyser dates_extracted
        dates_extracted = doc['dates_extracted']
        if dates_extracted:
            print(f"\n   📅 Dates extraites: {dates_extracted}")

        # Analyser extra_metadata
        extra_metadata = doc['extra_metadata']
        if extra_metadata and isinstance(extra_metadata, dict):
            analysis = extra_metadata.get('analysis', {})
            if isinstance(analysis, dict):
                draft_date = analysis.get('draft_date')
                if draft_date:
                    print(f"\n   📝 Draft date: {draft_date}")

        # Lire un extrait du texte
        if doc['text_path_r2']:
            try:
                text_bytes = download_from_r2(doc['text_path_r2'])
                if text_bytes:
                    text = text_bytes.decode('utf-8') if isinstance(text_bytes, bytes) else text_bytes
                    # Chercher des mentions de dates ou années
                    print(f"\n   📝 Extrait du texte ({len(text)} caractères total):")
                    print(f"      Premiers 500 caractères:")
                    print("      " + "-" * 80)
                    print("      " + text[:500].replace('\n', '\n      '))
                    print("      " + "-" * 80)

                    # Chercher mentions de 2020
                    if '2020' in text:
                        print(f"\n      ⚠️  '2020' trouvé dans le texte!")
                        # Trouver le contexte
                        idx = text.find('2020')
                        start = max(0, idx - 50)
                        end = min(len(text), idx + 50)
                        context = text[start:end]
                        print(f"      Contexte: ...{context}...")

                    # Chercher l'année URL
                    if url_year in text:
                        count = text.count(url_year)
                        print(f"\n      ✅ '{url_year}' trouvé {count} fois dans le texte")
                        # Afficher premier contexte
                        idx = text.find(url_year)
                        start = max(0, idx - 50)
                        end = min(len(text), idx + 50)
                        context = text[start:end]
                        print(f"      Premier contexte: ...{context}...")
                else:
                    print(f"\n   ❌ Texte vide ou non récupérable")
            except Exception as e:
                print(f"\n   ❌ Erreur lecture texte: {e}")
        else:
            print(f"\n   ❌ Pas de texte extrait")

        print("\n" + "=" * 100)


if __name__ == '__main__':
    investigate_documents()
