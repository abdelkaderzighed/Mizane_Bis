#!/usr/bin/env python3
"""
Générer les métadonnées AI pour les 4 documents JORADP récents sans métadonnées.
IDs: 1, 2, 3, 4
"""
import sys
import os
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / '.env')

from shared.postgres import get_connection_simple
from shared.r2_storage import get_r2_session, generate_presigned_url
from openai import OpenAI
import requests

def download_text_from_r2(text_path_r2):
    """Télécharger le texte depuis R2."""
    url = generate_presigned_url(text_path_r2)
    if not url:
        # Try direct URL
        url = text_path_r2

    session = get_r2_session()
    response = session.get(url, timeout=30)
    response.raise_for_status()
    return response.text

def generate_metadata_with_ai(text_content, document_url):
    """Générer les métadonnées avec OpenAI."""
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

    # Limiter le texte à 15000 caractères pour ne pas dépasser les limites de tokens
    text_sample = text_content[:15000] if len(text_content) > 15000 else text_content

    prompt = f"""Analyse ce document du Journal Officiel de la République Algérienne (JORADP) et extrait les métadonnées suivantes au format JSON:

Document:
{text_sample}

Fournis un JSON avec:
- title: Un titre descriptif en français (max 200 caractères)
- summary: Un résumé en français (max 500 caractères)
- keywords: Une liste de 5-10 mots-clés pertinents en français
- publication_date: La date de publication si trouvée (format YYYY-MM-DD)
- language: "fr" (tous les documents JORADP sont en français)

Réponds uniquement avec le JSON, sans texte additionnel."""

    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {
                "role": "system",
                "content": "Tu es un expert en analyse de documents juridiques algériens. Tu extrais des métadonnées précises et pertinentes."
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        max_tokens=1000,
        temperature=0.3,
        response_format={"type": "json_object"}
    )

    import json
    metadata = json.loads(response.choices[0].message.content)
    return metadata

def process_document(doc_id):
    """Traiter un document pour générer ses métadonnées AI."""
    conn = get_connection_simple()
    cur = conn.cursor()

    # Récupérer les infos du document
    cur.execute("""
        SELECT id, url, text_path_r2, publication_date
        FROM joradp_documents
        WHERE id = %s
    """, (doc_id,))

    doc = cur.fetchone()
    if not doc:
        print(f"❌ Document {doc_id} non trouvé")
        cur.close()
        conn.close()
        return False

    print(f"\n{'='*80}")
    print(f"📄 Traitement du document ID {doc_id}")
    print(f"   URL: {doc['url']}")
    print(f"   Date: {doc['publication_date']}")
    print(f"{'='*80}")

    try:
        # 1. Télécharger le texte depuis R2
        print("📥 Téléchargement du texte depuis R2...")
        text_content = download_text_from_r2(doc['text_path_r2'])
        print(f"   ✅ Texte téléchargé ({len(text_content)} caractères)")

        # 2. Générer les métadonnées avec OpenAI
        print("🤖 Génération des métadonnées avec OpenAI...")
        metadata = generate_metadata_with_ai(text_content, doc['url'])
        print(f"   ✅ Métadonnées générées:")
        print(f"      - Titre: {metadata.get('title', 'N/A')[:80]}...")
        print(f"      - Résumé: {metadata.get('summary', 'N/A')[:80]}...")
        print(f"      - Mots-clés: {len(metadata.get('keywords', []))} mots-clés")

        # 3. Insérer les métadonnées dans la base de données
        print("💾 Enregistrement des métadonnées...")
        cur.execute("""
            INSERT INTO document_ai_metadata
            (document_id, corpus, language, title, summary, keywords, entities, dates_extracted, created_at, updated_at)
            VALUES (%s, 'joradp', %s, %s, %s, %s, %s, %s, NOW(), NOW())
            ON CONFLICT (document_id, corpus, language)
            DO UPDATE SET
                title = EXCLUDED.title,
                summary = EXCLUDED.summary,
                keywords = EXCLUDED.keywords,
                entities = EXCLUDED.entities,
                dates_extracted = EXCLUDED.dates_extracted,
                updated_at = NOW()
        """, (
            doc_id,
            metadata.get('language', 'fr'),
            metadata.get('title'),
            metadata.get('summary'),
            metadata.get('keywords', []),
            metadata.get('entities', []),
            metadata.get('dates', [])
        ))

        # 4. Mettre à jour le timestamp de metadata_collected_at
        cur.execute("""
            UPDATE joradp_documents
            SET metadata_collected_at = NOW()
            WHERE id = %s
        """, (doc_id,))

        conn.commit()
        print("   ✅ Métadonnées enregistrées dans la base de données")

        cur.close()
        conn.close()

        print(f"✨ Document {doc_id} traité avec succès !\n")
        return True

    except Exception as e:
        print(f"❌ Erreur lors du traitement du document {doc_id}: {e}")
        import traceback
        traceback.print_exc()
        cur.close()
        conn.close()
        return False

if __name__ == '__main__':
    document_ids = [1, 2, 3, 4]

    print("\n" + "="*80)
    print("🚀 GÉNÉRATION DES MÉTADONNÉES AI - DOCUMENTS JORADP MANQUANTS")
    print("="*80)
    print(f"\nDocuments à traiter: {document_ids}\n")

    success_count = 0
    for doc_id in document_ids:
        if process_document(doc_id):
            success_count += 1

    print("\n" + "="*80)
    print("📊 RÉSUMÉ")
    print("="*80)
    print(f"Succès: {success_count}/{len(document_ids)}")
    print(f"Échecs: {len(document_ids) - success_count}/{len(document_ids)}")
    print("="*80 + "\n")
