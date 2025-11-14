"""Extraction de texte depuis les PDFs avec évaluation de qualité"""

import os
from shared.intelligent_text_extractor import IntelligentTextExtractor
from models import get_db_connection

def extract_text_from_pdf(pdf_path, document_id=None, use_intelligent=True):
    """
    Extraire le texte d'un PDF

    Args:
        pdf_path: Chemin vers le PDF
        document_id: ID du document (optionnel, pour qualité)
        use_intelligent: Utiliser extracteur intelligent (défaut: True)

    Returns:
        str: Texte extrait ou None en cas d'erreur
    """
    if not use_intelligent:
        # Fallback: PyPDF2 simple
        try:
            from PyPDF2 import PdfReader
            reader = PdfReader(pdf_path)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
            return text.strip()
        except Exception as e:
            print(f"❌ Erreur extraction PyPDF2: {e}")
            return None

    # Mode intelligent
    try:
        extractor = IntelligentTextExtractor()

        if document_id:
            result = extractor.extract_and_evaluate(pdf_path, document_id)
            return result['text']
        else:
            # Sans document_id, essayer seulement PDFPlumber
            text, method = extractor._try_pdfplumber(pdf_path)
            if not text:
                # Fallback sur Tesseract si PDFPlumber échoue
                text, method = extractor._try_tesseract(pdf_path)
            return text if text else None

    except Exception as e:
        print(f"❌ Erreur extraction intelligente: {e}")
        return None

def process_session_documents(session_id, use_intelligent=True):
    """
    Traiter tous les documents d'une session avec extraction intelligente

    Args:
        session_id: ID de la session
        use_intelligent: Utiliser extracteur intelligent (défaut: True)

    Returns:
        tuple: (success_count, failed_count)
    """
    print(f"\n📄 Extraction texte intelligente - Session {session_id}")
    print("="*50)

    extractor = IntelligentTextExtractor() if use_intelligent else None

    with get_db_connection() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, file_path FROM documents
            WHERE session_id = ? AND file_path IS NOT NULL
            AND file_path LIKE '%.pdf'
        """, (session_id,))

        documents = cursor.fetchall()

        success_count = 0
        failed_count = 0

        for doc in documents:
            doc_id = doc['id']
            pdf_path = doc['file_path']

            print(f"📄 [{doc_id}] {os.path.basename(pdf_path)}")

            if not os.path.exists(pdf_path):
                print("   ⚠️  Fichier introuvable")
                failed_count += 1
                continue

            # Extraire le texte avec évaluation de qualité
            if use_intelligent and extractor:
                try:
                    result = extractor.extract_and_evaluate(pdf_path, doc_id)

                    if result['quality'] in ['excellent', 'good']:
                        print(f"   ✅ {result['method']}: {result['quality']} ({result['char_count']} chars)")
                        success_count += 1
                    else:
                        print(f"   ⚠️  {result['method']}: {result['quality']} ({result['char_count']} chars)")
                        failed_count += 1

                except Exception as e:
                    print(f"   ❌ Erreur: {e}")
                    failed_count += 1
            else:
                # Mode simple (sans qualité)
                text = extract_text_from_pdf(pdf_path, document_id=None, use_intelligent=False)

                if text:
                    txt_path = pdf_path.replace('.pdf', '.txt')
                    with open(txt_path, 'w', encoding='utf-8') as f:
                        f.write(text)

                    cursor.execute("""
                        UPDATE documents
                        SET text_path = ?,
                            download_status = 'success',
                            downloaded_at = CURRENT_TIMESTAMP
                        WHERE id = ?
                    """, (txt_path, doc_id))

                    print(f"   ✅ {len(text)} caractères")
                    success_count += 1
                else:
                    print("   ❌ Échec extraction")
                    failed_count += 1

        conn.commit()

    print(f"\n📊 Résumé:")
    print(f"   ✅ Réussis: {success_count}")
    print(f"   ❌ Échecs: {failed_count}\n")

    return success_count, failed_count

if __name__ == '__main__':
    # Traiter la session 1
    process_session_documents(session_id=1)
