#!/usr/bin/env python3
"""
Script de test pour l'extraction intelligente avec qualité
"""

import os
import sys
from shared.intelligent_text_extractor import IntelligentTextExtractor

def test_extraction():
    """Tester l'extraction sur quelques documents"""

    print("🧪 Test de l'extracteur intelligent de texte")
    print("="*60)

    # Récupérer quelques documents de la base
    import sqlite3
    conn = sqlite3.connect('harvester.db')
    cursor = conn.cursor()

    cursor.execute("""
        SELECT d.id, d.file_path
        FROM documents d
        WHERE d.file_path IS NOT NULL
        AND d.file_path LIKE '%.pdf'
        LIMIT 5
    """)

    docs = cursor.fetchall()
    conn.close()

    if not docs:
        print("❌ Aucun document PDF trouvé dans la base")
        return

    print(f"\n📄 Test sur {len(docs)} documents...\n")

    extractor = IntelligentTextExtractor()

    results = []

    for doc_id, file_path in docs:
        print(f"\n{'='*60}")
        print(f"Document {doc_id}: {os.path.basename(file_path)}")
        print(f"{'='*60}")

        if not os.path.exists(file_path):
            print(f"⚠️  Fichier introuvable: {file_path}")
            continue

        try:
            result = extractor.extract_and_evaluate(file_path, doc_id)

            results.append(result)

            print(f"\n📊 Résultat:")
            print(f"   Méthode:    {result['method']}")
            print(f"   Qualité:    {result['quality']}")
            print(f"   Confiance:  {result['confidence']:.2%}")
            print(f"   Caractères: {result['char_count']:,}")

            # Afficher extrait du texte
            if result['text']:
                preview = result['text'][:200].replace('\n', ' ')
                print(f"\n   Extrait: {preview}...")

        except Exception as e:
            print(f"❌ Erreur: {e}")
            import traceback
            traceback.print_exc()

    # Statistiques finales
    if results:
        print(f"\n\n{'='*60}")
        print("📈 STATISTIQUES")
        print(f"{'='*60}")

        excellent = sum(1 for r in results if r['quality'] == 'excellent')
        good = sum(1 for r in results if r['quality'] == 'good')
        poor = sum(1 for r in results if r['quality'] == 'poor')
        failed = sum(1 for r in results if r['quality'] == 'failed')

        print(f"   Excellent: {excellent}")
        print(f"   Good:      {good}")
        print(f"   Poor:      {poor}")
        print(f"   Failed:    {failed}")

        methods = {}
        for r in results:
            methods[r['method']] = methods.get(r['method'], 0) + 1

        print(f"\n   Méthodes utilisées:")
        for method, count in methods.items():
            print(f"      {method}: {count}")

        avg_confidence = sum(r['confidence'] for r in results) / len(results)
        print(f"\n   Confiance moyenne: {avg_confidence:.2%}")

def check_dependencies():
    """Vérifier que toutes les dépendances sont installées"""
    print("\n🔍 Vérification des dépendances...")
    print("="*60)

    checks = []

    # PDFPlumber
    try:
        import pdfplumber
        print("✅ pdfplumber installé")
        checks.append(True)
    except ImportError:
        print("❌ pdfplumber manquant (pip install pdfplumber)")
        checks.append(False)

    # PyTesseract
    try:
        import pytesseract
        print("✅ pytesseract installé")
        checks.append(True)
    except ImportError:
        print("❌ pytesseract manquant (pip install pytesseract)")
        checks.append(False)

    # pdf2image
    try:
        import pdf2image
        print("✅ pdf2image installé")
        checks.append(True)
    except ImportError:
        print("❌ pdf2image manquant (pip install pdf2image)")
        checks.append(False)

    # Tesseract OCR (binaire système)
    import subprocess
    try:
        result = subprocess.run(['tesseract', '--version'], capture_output=True, text=True)
        version = result.stdout.split('\n')[0]
        print(f"✅ Tesseract OCR: {version}")
        checks.append(True)
    except FileNotFoundError:
        print("❌ Tesseract OCR non installé (brew install tesseract tesseract-lang)")
        checks.append(False)

    # Poppler (pour pdf2image)
    try:
        result = subprocess.run(['pdftoppm', '-v'], capture_output=True, text=True)
        version_line = (result.stdout or result.stderr or "").split('\n')[0]
        print(f"✅ Poppler: {version_line}")
        checks.append(True)
    except FileNotFoundError:
        print("❌ Poppler non installé (brew install poppler)")
        checks.append(False)

    # OpenAI (optionnel)
    try:
        import openai
        print("✅ OpenAI SDK installé (optionnel)")
    except ImportError:
        print("⚠️  OpenAI SDK non installé (optionnel - pip install openai)")

    print()
    if all(checks):
        print("✨ Toutes les dépendances sont installées !")
        return True
    else:
        print("⚠️  Certaines dépendances manquent")
        return False

if __name__ == '__main__':
    # Vérifier dépendances d'abord
    if not check_dependencies():
        print("\n⚠️  Installez les dépendances manquantes avant de continuer")
        sys.exit(1)

    # Lancer les tests
    test_extraction()
