"""
Extracteur de texte intelligent avec évaluation de qualité
Supporte : PDFPlumber, Tesseract OCR, et Vision API (OpenAI)
"""

import os
import re
import sqlite3
from pathlib import Path
from io import BytesIO
import base64

class IntelligentTextExtractor:

    def __init__(self, db_path='harvester.db'):
        self.db_path = db_path
        self.enable_vision_api = os.getenv('ENABLE_VISION_API', 'false').lower() == 'true'

    def extract_and_evaluate(self, pdf_path, document_id):
        """
        Extraction progressive avec évaluation de qualité

        Args:
            pdf_path: Chemin vers le fichier PDF
            document_id: ID du document dans la base de données

        Returns:
            dict avec keys: text, method, quality, confidence, char_count
        """

        # Étape 1: Essayer PDFPlumber
        print(f"📄 Extraction document {document_id} avec PDFPlumber...")
        text, method = self._try_pdfplumber(pdf_path)
        quality, confidence = self._evaluate_quality(text, pdf_path)

        if quality in ['excellent', 'good']:
            print(f"✅ PDFPlumber: {quality} (confiance: {confidence:.2f})")
            return self._save_result(document_id, text, method, quality, confidence, pdf_path)

        # Étape 2: Si échec, essayer OCR Tesseract
        print(f"⚠️ PDFPlumber insuffisant ({quality}), essai OCR Tesseract...")
        text, method = self._try_tesseract(pdf_path)
        quality, confidence = self._evaluate_quality(text, pdf_path)

        if quality in ['excellent', 'good']:
            print(f"✅ Tesseract OCR: {quality} (confiance: {confidence:.2f})")
            return self._save_result(document_id, text, method, quality, confidence, pdf_path)

        # Étape 3: Dernier recours, Vision API (si activé)
        if self.enable_vision_api:
            print(f"⚠️ Tesseract insuffisant ({quality}), essai Vision API...")
            text, method = self._try_vision_api(pdf_path)
            quality, confidence = self._evaluate_quality(text, pdf_path)
            print(f"✅ Vision API: {quality} (confiance: {confidence:.2f})")
            return self._save_result(document_id, text, method, quality, confidence, pdf_path)

        # Si tout échoue
        print(f"❌ Échec extraction pour document {document_id}")
        return self._save_result(document_id, text or "", 'failed', 'failed', 0.0, pdf_path)

    def _evaluate_quality(self, text, pdf_path):
        """
        Évaluer la qualité de l'extraction

        Returns:
            tuple (quality_label, confidence_score)
            quality_label: 'excellent', 'good', 'poor', 'failed'
            confidence_score: 0.0 - 1.0
        """

        if not text or len(text.strip()) < 100:
            return 'failed', 0.0

        # Heuristiques de qualité
        char_count = len(text)
        word_count = len(text.split())
        avg_word_length = char_count / max(word_count, 1)

        # Ratio caractères valides / totaux
        # Arabe: 0600-06FF, Français: a-zA-Z
        valid_chars = sum(1 for c in text if (
            c.isalnum() or c.isspace() or c in '.,;:!?()-«»""' or
            '\u0600' <= c <= '\u06FF'  # Arabe
        ))
        valid_ratio = valid_chars / max(len(text), 1)

        # Détecter extraction corrompue (trop de symboles bizarres)
        weird_chars = sum(1 for c in text if c in '�□■●◆')
        weird_ratio = weird_chars / max(len(text), 1)

        # Détecter texte cohérent (présence de mots complets)
        has_arabic = bool(re.search(r'[\u0600-\u06FF]{3,}', text))
        has_french = bool(re.search(r'[a-zA-Z]{3,}', text))
        has_coherent_text = has_arabic or has_french

        # Vérifier longueur minimale attendue (JORADP généralement > 1000 chars)
        length_factor = min(char_count / 1000, 1.0)

        # Calculer score de confiance
        confidence = (
            length_factor * 0.25 +              # Longueur suffisante
            valid_ratio * 0.35 +                # Caractères valides
            (1 - weird_ratio) * 0.25 +          # Pas de corruption
            (1 if has_coherent_text else 0) * 0.15  # Texte cohérent
        )

        # Déterminer qualité
        if confidence >= 0.8:
            return 'excellent', confidence
        elif confidence >= 0.6:
            return 'good', confidence
        elif confidence >= 0.3:
            return 'poor', confidence
        else:
            return 'failed', confidence

    def _try_pdfplumber(self, pdf_path):
        """Extraction avec PDFPlumber"""
        try:
            import pdfplumber

            text = ""
            with pdfplumber.open(pdf_path) as pdf:
                for page in pdf.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n\n"

            return text.strip(), 'pdfplumber'

        except ImportError:
            print("⚠️ PDFPlumber non installé")
            return "", 'pdfplumber_not_installed'
        except Exception as e:
            print(f"❌ Erreur PDFPlumber: {e}")
            return "", 'pdfplumber_failed'

    def _try_tesseract(self, pdf_path):
        """Extraction avec OCR Tesseract"""
        try:
            from pdf2image import convert_from_path
            import pytesseract

            # Convertir PDF en images (300 DPI pour bonne qualité)
            images = convert_from_path(pdf_path, dpi=300)

            text = ""
            for i, image in enumerate(images):
                # OCR avec support arabe + français
                page_text = pytesseract.image_to_string(image, lang='ara+fra')
                text += page_text + "\n\n"

            return text.strip(), 'ocr_tesseract'

        except ImportError as e:
            print(f"⚠️ Dépendances OCR non installées: {e}")
            return "", 'tesseract_not_installed'
        except Exception as e:
            print(f"❌ Erreur Tesseract: {e}")
            return "", 'tesseract_failed'

    def _try_vision_api(self, pdf_path):
        """Extraction avec OpenAI Vision API (GPT-4o)"""
        try:
            from pdf2image import convert_from_path
            from openai import OpenAI

            client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

            # Convertir PDF en images (200 DPI suffit pour Vision API)
            images = convert_from_path(pdf_path, dpi=200)

            full_text = ""

            for i, image in enumerate(images):
                print(f"  📸 Page {i+1}/{len(images)}...")

                # Convertir image en base64
                buffered = BytesIO()
                image.save(buffered, format="JPEG", quality=85)
                img_base64 = base64.b64encode(buffered.getvalue()).decode()

                # Appel Vision API
                response = client.chat.completions.create(
                    model="gpt-4o",
                    messages=[{
                        "role": "user",
                        "content": [
                            {
                                "type": "text",
                                "text": """Extrait TOUT le texte de ce document officiel algérien (Journal Officiel - JORADP).

Instructions:
- Respecte EXACTEMENT la mise en page originale
- Conserve les titres, numéros d'article, dates
- Préserve la structure (paragraphes, sections)
- Inclus TOUT le texte visible (arabe et français)
- Format: texte brut, paragraphes séparés par double saut de ligne
- Ne résume PAS, extrais TOUT le texte mot pour mot"""
                            },
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/jpeg;base64,{img_base64}",
                                    "detail": "high"
                                }
                            }
                        ]
                    }],
                    max_tokens=4000
                )

                full_text += response.choices[0].message.content + "\n\n"

            return full_text.strip(), 'vision_api'

        except ImportError as e:
            print(f"⚠️ OpenAI SDK non installé: {e}")
            return "", 'vision_not_installed'
        except Exception as e:
            print(f"❌ Erreur Vision API: {e}")
            return "", 'vision_failed'

    def _save_result(self, document_id, text, method, quality, confidence, pdf_path):
        """Sauvegarder texte et mettre à jour DB"""

        # Sauvegarder fichier TXT
        txt_path = str(pdf_path).replace('.pdf', '.txt')
        try:
            with open(txt_path, 'w', encoding='utf-8') as f:
                f.write(text)
            print(f"💾 Texte sauvegardé: {txt_path}")
        except Exception as e:
            print(f"❌ Erreur sauvegarde TXT: {e}")

        # Déterminer le statut
        has_text = bool(text and text.strip())
        status_value = 'success' if has_text and quality != 'failed' else 'failed'
        error_message = None if status_value == 'success' else f"Extraction de texte échouée ({method})"

        # Mettre à jour la base de données
        try:
            conn = sqlite3.connect(self.db_path)
            cursor = conn.cursor()

            # Mettre à jour document_ai_analysis
            cursor.execute("""
                UPDATE document_ai_analysis
                SET extraction_method = ?,
                    extraction_quality = ?,
                    extraction_confidence = ?,
                    char_count = ?,
                    extracted_text_length = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE document_id = ?
            """, (method, quality, confidence, len(text), len(text), document_id))

            # Si aucune ligne n'a été mise à jour, insérer
            if cursor.rowcount == 0:
                cursor.execute("""
                    INSERT INTO document_ai_analysis
                    (document_id, extraction_method, extraction_quality,
                     extraction_confidence, char_count, extracted_text_length)
                    VALUES (?, ?, ?, ?, ?, ?)
                """, (document_id, method, quality, confidence, len(text), len(text)))

            # Mettre à jour text_path dans documents
            cursor.execute("""
                UPDATE documents
                SET text_path = ?,
                    text_extraction_status = ?,
                    text_extracted_at = CASE WHEN ? = 'success' THEN CURRENT_TIMESTAMP ELSE NULL END,
                    error_log = ?,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = ?
            """, (txt_path, status_value, status_value, error_message, document_id))

            conn.commit()
            conn.close()

            print(f"💾 DB mise à jour pour document {document_id}")

        except Exception as e:
            print(f"❌ Erreur mise à jour DB: {e}")

        return {
            'text': text,
            'method': method,
            'quality': quality,
            'confidence': confidence,
            'char_count': len(text)
        }

    def get_poor_quality_documents(self):
        """Récupérer les documents avec qualité poor/failed/unknown"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()

        cursor.execute("""
            SELECT d.id, d.file_path, da.extraction_quality, da.extraction_method
            FROM documents d
            LEFT JOIN document_ai_analysis da ON d.id = da.document_id
            WHERE d.file_path IS NOT NULL
            AND d.file_path LIKE '%.pdf'
            AND (da.extraction_quality IS NULL
                 OR da.extraction_quality IN ('poor', 'failed', 'unknown'))
            ORDER BY d.id
        """)

        docs = cursor.fetchall()
        conn.close()

        return [{
            'id': row[0],
            'file_path': row[1],
            'quality': row[2] or 'unknown',
            'method': row[3] or 'none'
        } for row in docs]
