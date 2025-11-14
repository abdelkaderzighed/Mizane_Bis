#!/usr/bin/env python3
"""
Script complet de ré-extraction intelligente pour JORADP
Effectue : Extraction PDF → Analyse IA → Embeddings → Métadonnées
"""

import os
import sys
import json
import time
from datetime import datetime
from pathlib import Path
import sqlite3

# Import des modules d'extraction et d'analyse
from shared.intelligent_text_extractor import IntelligentTextExtractor
from openai import OpenAI
from sentence_transformers import SentenceTransformer
import numpy as np
import pdfplumber

# Configuration
DB_PATH = 'harvester.db'
EMBEDDING_MODEL_NAME = 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
BATCH_SIZE = 10  # Nombre de documents à traiter avant de commit

class DocumentProcessor:
    """Processeur complet pour l'extraction et l'analyse de documents"""

    def __init__(self):
        self.db_path = DB_PATH
        self.extractor = IntelligentTextExtractor(db_path=self.db_path)

        # Charger le modèle d'embedding
        print(f"🔁 Chargement du modèle d'embedding {EMBEDDING_MODEL_NAME}...")
        self.embedding_model = SentenceTransformer(EMBEDDING_MODEL_NAME)

        # Initialiser OpenAI API
        api_key = os.getenv('OPENAI_API_KEY')
        if not api_key:
            raise ValueError("❌ OPENAI_API_KEY non définie dans l'environnement")
        self.openai_client = OpenAI(api_key=api_key)

        # Statistiques
        self.stats = {
            'total': 0,
            'success': 0,
            'failed': 0,
            'quality': {'excellent': 0, 'good': 0, 'poor': 0, 'failed': 0},
            'method': {'pdfplumber': 0, 'ocr_tesseract': 0, 'vision_api': 0, 'failed': 0}
        }

        self.start_time = time.time()

    def get_page_count(self, pdf_path):
        """Obtenir le nombre de pages d'un PDF"""
        try:
            with pdfplumber.open(pdf_path) as pdf:
                return len(pdf.pages)
        except Exception as e:
            print(f"   ⚠️  Impossible de compter les pages: {e}")
            return 0

    def analyze_with_claude(self, text, document_id):
        """Analyser le texte avec OpenAI"""
        try:
            # Limiter le texte pour l'analyse (10000 caractères max)
            text_sample = text[:10000] if len(text) > 10000 else text

            prompt = f"""Analyse ce document officiel algérien (JORADP) et fournis :

1. Un titre descriptif court (max 100 caractères)
2. Un résumé en 2-3 phrases
3. 5-8 mots-clés principaux
4. Les entités nommées (personnes, organisations, lieux, dates)

Document :
{text_sample}

Réponds en JSON avec cette structure :
{{
  "title": "...",
  "summary": "...",
  "keywords": ["mot1", "mot2", ...],
  "entities": {{
    "persons": [],
    "organizations": [],
    "locations": [],
    "dates": []
  }}
}}"""

            response = self.openai_client.chat.completions.create(
                model="gpt-4o",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )

            response_text = response.choices[0].message.content

            # Nettoyer les balises markdown si présentes
            if response_text.startswith("```json"):
                response_text = response_text.replace("```json", "").replace("```", "").strip()

            analysis = json.loads(response_text)
            return analysis

        except Exception as e:
            print(f"   ⚠️  Erreur analyse Claude: {e}")
            return None

    def compute_embedding(self, text):
        """Calculer l'embedding d'un texte"""
        try:
            # Limiter le texte pour l'embedding (500 mots)
            words = text.split()[:500]
            text_sample = " ".join(words)

            embedding = self.embedding_model.encode(text_sample)
            return embedding
        except Exception as e:
            print(f"   ⚠️  Erreur embedding: {e}")
            return None

    def save_analysis_to_db(self, conn, document_id, analysis, char_count):
        """Sauvegarder l'analyse IA dans la base"""
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT OR REPLACE INTO document_ai_analysis (
                    document_id, extracted_text_length, summary,
                    keywords, named_entities
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                document_id,
                char_count,
                analysis.get('summary', ''),
                json.dumps(analysis.get('keywords', []), ensure_ascii=False),
                json.dumps(analysis.get('entities', {}), ensure_ascii=False)
            ))
            return True
        except Exception as e:
            print(f"   ⚠️  Erreur sauvegarde analyse: {e}")
            return False

    def save_embedding_to_db(self, conn, document_id, embedding):
        """Sauvegarder l'embedding dans la base"""
        cursor = conn.cursor()

        try:
            # Convertir l'embedding en bytes
            embedding_bytes = embedding.tobytes()

            cursor.execute("""
                INSERT OR REPLACE INTO document_embeddings (
                    document_id, embedding, model_name, dimension
                ) VALUES (?, ?, ?, ?)
            """, (
                document_id,
                embedding_bytes,
                EMBEDDING_MODEL_NAME,
                len(embedding)
            ))
            return True
        except Exception as e:
            print(f"   ⚠️  Erreur sauvegarde embedding: {e}")
            return False

    def save_metadata_to_db(self, conn, document_id, analysis, page_count, file_size, char_count):
        """Sauvegarder les métadonnées dans la base"""
        cursor = conn.cursor()

        try:
            cursor.execute("""
                INSERT OR REPLACE INTO document_metadata (
                    document_id, title, page_count, file_size,
                    source_metadata
                ) VALUES (?, ?, ?, ?, ?)
            """, (
                document_id,
                analysis.get('title', 'Sans titre') if analysis else 'Sans titre',
                page_count,
                file_size,
                json.dumps({
                    'char_count': char_count,
                    'processed_at': datetime.now().isoformat()
                }, ensure_ascii=False)
            ))
            return True
        except Exception as e:
            print(f"   ⚠️  Erreur sauvegarde métadonnées: {e}")
            return False

    def process_document(self, doc_id, file_path):
        """Traiter complètement un document"""

        print(f"\n{'='*70}")
        print(f"📄 Document {doc_id}: {Path(file_path).name}")
        print(f"{'='*70}")

        if not os.path.exists(file_path):
            print("   ❌ Fichier introuvable")
            self.stats['failed'] += 1
            return False

        # Obtenir la taille du fichier et le nombre de pages
        file_size = os.path.getsize(file_path)
        page_count = self.get_page_count(file_path)
        print(f"   📊 Taille: {file_size:,} octets | Pages: {page_count}")

        # Étape 1: Extraction intelligente du texte
        print(f"\n   🔍 ÉTAPE 1/4: Extraction intelligente du texte...")
        try:
            result = self.extractor.extract_and_evaluate(file_path, doc_id)
        except Exception as e:
            print(f"   ❌ Erreur extraction: {e}")
            self.stats['failed'] += 1
            return False

        # Afficher la qualité d'extraction
        quality = result['quality']
        confidence = result['confidence']
        method = result['method']
        char_count = result['char_count']
        text = result['text']

        print(f"   ✅ Extraction terminée:")
        print(f"      - Méthode:    {method}")
        print(f"      - Qualité:    {quality.upper()} ({confidence:.1%} confiance)")
        print(f"      - Caractères: {char_count:,}")

        # Mettre à jour les stats
        self.stats['quality'][quality] += 1
        self.stats['method'][method] += 1

        if quality == 'failed' or not text or len(text) < 100:
            print(f"   ⚠️  Texte insuffisant, document ignoré")
            self.stats['failed'] += 1
            return False

        # Connexion à la base pour les étapes suivantes
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row

        try:
            # Étape 2: Analyse IA avec Claude
            print(f"\n   🤖 ÉTAPE 2/4: Analyse IA avec Claude...")
            analysis = self.analyze_with_claude(text, doc_id)

            if analysis:
                print(f"   ✅ Analyse terminée:")
                print(f"      - Titre:   {analysis.get('title', 'N/A')[:60]}...")
                print(f"      - Résumé:  {analysis.get('summary', 'N/A')[:80]}...")
                print(f"      - Mots-clés: {', '.join(analysis.get('keywords', [])[:5])}")

                self.save_analysis_to_db(conn, doc_id, analysis, char_count)
            else:
                print(f"   ⚠️  Analyse échouée")
                analysis = None

            # Étape 3: Calcul des embeddings
            print(f"\n   🧮 ÉTAPE 3/4: Calcul des embeddings...")
            embedding = self.compute_embedding(text)

            if embedding is not None:
                print(f"   ✅ Embedding calculé (dimension: {len(embedding)})")
                self.save_embedding_to_db(conn, doc_id, embedding)
            else:
                print(f"   ⚠️  Embedding échoué")

            # Étape 4: Sauvegarde des métadonnées
            print(f"\n   💾 ÉTAPE 4/4: Sauvegarde des métadonnées...")
            self.save_metadata_to_db(conn, doc_id, analysis, page_count, file_size, char_count)
            print(f"   ✅ Métadonnées sauvegardées")

            conn.commit()
            self.stats['success'] += 1

            return True

        except Exception as e:
            print(f"   ❌ Erreur traitement: {e}")
            conn.rollback()
            self.stats['failed'] += 1
            return False
        finally:
            conn.close()

    def print_progress(self, current, total):
        """Afficher la progression"""
        elapsed = time.time() - self.start_time
        docs_per_sec = current / elapsed if elapsed > 0 else 0
        remaining = (total - current) / docs_per_sec if docs_per_sec > 0 else 0

        print(f"\n{'='*70}")
        print(f"📊 PROGRESSION: {current}/{total} documents ({current/total*100:.1f}%)")
        print(f"   ⏱️  Temps écoulé:  {elapsed/60:.1f} minutes")
        print(f"   ⚡ Vitesse:       {docs_per_sec:.2f} docs/seconde")
        print(f"   ⏳ Temps restant: {remaining/60:.1f} minutes (estimation)")
        print(f"   ✅ Réussis:      {self.stats['success']}")
        print(f"   ❌ Échecs:       {self.stats['failed']}")
        print(f"{'='*70}")

    def print_final_stats(self):
        """Afficher les statistiques finales"""
        elapsed = time.time() - self.start_time

        print(f"\n\n{'='*70}")
        print(f"🎉 TRAITEMENT TERMINÉ")
        print(f"{'='*70}")
        print(f"📊 Statistiques globales:")
        print(f"   Total documents: {self.stats['total']}")
        print(f"   ✅ Réussis:      {self.stats['success']}")
        print(f"   ❌ Échecs:       {self.stats['failed']}")
        print(f"   ⏱️  Durée totale:  {elapsed/60:.1f} minutes")
        print(f"   ⚡ Vitesse moy.:  {self.stats['total']/elapsed*60:.1f} docs/heure")

        print(f"\n📈 Qualité d'extraction:")
        for quality, count in self.stats['quality'].items():
            pct = count / self.stats['total'] * 100 if self.stats['total'] > 0 else 0
            print(f"   {quality.upper():10s}: {count:5d} ({pct:5.1f}%)")

        print(f"\n🔧 Méthodes utilisées:")
        for method, count in self.stats['method'].items():
            pct = count / self.stats['total'] * 100 if self.stats['total'] > 0 else 0
            print(f"   {method:15s}: {count:5d} ({pct:5.1f}%)")

        print(f"{'='*70}\n")


def main():
    """Point d'entrée principal"""

    print("""
╔════════════════════════════════════════════════════════════════════╗
║                                                                    ║
║        RÉ-EXTRACTION INTELLIGENTE DES DOCUMENTS JORADP             ║
║                                                                    ║
║  Ce script effectue pour chaque document:                         ║
║    1. Extraction intelligente (PDFPlumber → Tesseract → Vision)   ║
║    2. Analyse IA avec Claude (résumé, mots-clés, entités)         ║
║    3. Calcul des embeddings (recherche sémantique)                ║
║    4. Sauvegarde des métadonnées (pages, taille, etc.)            ║
║                                                                    ║
╚════════════════════════════════════════════════════════════════════╝
    """)

    # Vérifier que les variables d'environnement sont définies
    if not os.getenv('ANTHROPIC_API_KEY'):
        print("❌ Erreur: ANTHROPIC_API_KEY non définie")
        print("   Définissez-la avec: export ANTHROPIC_API_KEY='votre-clé'")
        sys.exit(1)

    # Initialiser le processeur
    try:
        processor = DocumentProcessor()
    except Exception as e:
        print(f"❌ Erreur initialisation: {e}")
        sys.exit(1)

    # Récupérer les documents à traiter
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    # Documents de mauvaise qualité ou jamais traités
    cursor.execute("""
        SELECT DISTINCT d.id, d.file_path
        FROM documents d
        LEFT JOIN document_ai_analysis daa ON d.id = daa.document_id
        WHERE d.file_path IS NOT NULL
        AND d.file_path LIKE '%.pdf'
        AND (
            daa.extraction_quality IN ('poor', 'failed', 'unknown')
            OR daa.extraction_quality IS NULL
        )
        ORDER BY d.id
    """)

    documents = cursor.fetchall()
    conn.close()

    total = len(documents)
    print(f"\n📋 {total} documents à traiter\n")

    if total == 0:
        print("✅ Aucun document à traiter !")
        return

    print(f"🚀 Démarrage du traitement de {total} documents...\n")

    # Traiter les documents
    processor.stats['total'] = total

    for idx, doc in enumerate(documents, 1):
        processor.process_document(doc['id'], doc['file_path'])

        # Afficher la progression tous les 10 documents
        if idx % 10 == 0 or idx == total:
            processor.print_progress(idx, total)

    # Afficher les statistiques finales
    processor.print_final_stats()


if __name__ == '__main__':
    main()
