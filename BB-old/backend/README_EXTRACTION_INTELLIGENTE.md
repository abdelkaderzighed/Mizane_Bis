# 📄 Système d'Extraction Intelligente de Texte

Extraction progressive de texte depuis PDFs avec évaluation de qualité automatique.

## 🎯 Objectif

Améliorer la qualité d'extraction de texte des documents JORADP en utilisant :
1. **PDFPlumber** (gratuit) - Meilleur que PyPDF2
2. **Tesseract OCR** (gratuit) - Pour PDFs scannés (1962-1970s)
3. **GPT-4o Vision API** (payant) - Dernier recours pour PDFs très difficiles

## 🏗️ Architecture

### Colonnes de qualité ajoutées

```sql
ALTER TABLE document_ai_analysis ADD COLUMN extraction_quality TEXT DEFAULT 'unknown';
-- Valeurs: 'excellent', 'good', 'poor', 'failed', 'unknown'

ALTER TABLE document_ai_analysis ADD COLUMN extraction_method TEXT DEFAULT 'pypdf2';
-- Valeurs: 'pypdf2', 'pdfplumber', 'ocr_tesseract', 'vision_api'

ALTER TABLE document_ai_analysis ADD COLUMN char_count INTEGER DEFAULT 0;
ALTER TABLE document_ai_analysis ADD COLUMN extraction_confidence REAL DEFAULT 0.0;
```

### Flux d'extraction

```
┌─────────────────┐
│   PDF Document  │
└────────┬────────┘
         │
         v
┌─────────────────┐      Qualité ≥ good ?
│   PDFPlumber    │────────────YES───────► [Sauvegarde]
└────────┬────────┘
         │ NO
         v
┌─────────────────┐      Qualité ≥ good ?
│ Tesseract OCR   │────────────YES───────► [Sauvegarde]
└────────┬────────┘
         │ NO
         v
┌─────────────────┐      Vision API activée ?
│  Vision API     │────────────YES───────► [Sauvegarde]
│   (optionnel)   │
└─────────────────┘         NO
         │                   │
         └───────────────────┴──────► [Sauvegarde avec quality='failed']
```

## 🚀 Installation

### 1. Dépendances Python

```bash
cd backend
source ../venv/bin/activate
pip install -r requirements_extraction.txt
```

### 2. Dépendances système

**macOS:**
```bash
brew install tesseract tesseract-lang poppler
```

**Ubuntu/Debian:**
```bash
sudo apt-get install tesseract-ocr tesseract-ocr-ara tesseract-ocr-fra poppler-utils
```

**Windows:**
- Tesseract: https://github.com/UB-Mannheim/tesseract/wiki
- Poppler: http://blog.alivate.com.au/poppler-windows/

### 3. Migration base de données

```bash
sqlite3 harvester.db < migrations/add_extraction_quality.sql
```

## 📖 Utilisation

### API Endpoints

#### 1. Statistiques de qualité

```bash
GET /api/joradp/documents/extraction-quality
```

Response:
```json
{
  "quality_stats": {
    "excellent": 1200,
    "good": 3500,
    "poor": 400,
    "failed": 110
  },
  "method_stats": {
    "pdfplumber": 4100,
    "ocr_tesseract": 500,
    "vision_api": 10,
    "pypdf2": 600
  },
  "needs_reextraction": 510
}
```

#### 2. Lister documents de qualité insuffisante

```bash
GET /api/joradp/documents/poor-quality
```

Response:
```json
{
  "count": 510,
  "documents": [
    {
      "id": 42,
      "file_path": "downloads/JORADP/F1962001.pdf",
      "quality": "poor",
      "method": "pypdf2"
    }
  ]
}
```

#### 3. Ré-extraire documents

**Tous les documents de mauvaise qualité:**
```bash
POST /api/joradp/documents/reextract
Content-Type: application/json

{}
```

**Avec Vision API activé (pour les cas difficiles):**
```bash
POST /api/joradp/documents/reextract
Content-Type: application/json

{
  "use_vision_api": true
}
```

**Documents spécifiques:**
```bash
POST /api/joradp/documents/reextract
Content-Type: application/json

{
  "document_ids": [42, 43, 44]
}
```

**Un seul document:**
```bash
POST /api/joradp/documents/5784/reextract
Content-Type: application/json

{
  "use_vision_api": false
}
```

### Script de test

```bash
cd backend
source ../venv/bin/activate
python test_extraction_quality.py
```

### Intégration dans le flux d'analyse

```python
from extract_text import extract_text_from_pdf

# Mode intelligent (avec qualité)
text = extract_text_from_pdf('chemin/doc.pdf', document_id=42, use_intelligent=True)

# Mode simple (sans qualité)
text = extract_text_from_pdf('chemin/doc.pdf', use_intelligent=False)
```

## 💰 Coûts estimés

### Option 1 : Sans Vision API (gratuit)
- PDFPlumber : Gratuit ✅
- Tesseract OCR : Gratuit ✅
- **Coût total : 0€**

### Option 2 : Avec Vision API (recommandé pour ~2% des docs)
- PDFPlumber : 90% des docs → Gratuit
- Tesseract : 8% des docs → Gratuit
- Vision API (GPT-4o) : 2% des docs → ~$0.50/doc × 100 docs = **~$50-100**

**Pour 5000 documents JORADP:**
- 4500 docs → PDFPlumber (gratuit)
- 400 docs → Tesseract (gratuit)
- 100 docs → Vision API (~$50-100)
- **Coût total estimé : $50-100** (une seule fois)

## 📊 Métriques de qualité

### Calcul du score de confiance

```python
confidence = (
    longueur_suffisante * 0.25 +       # ≥1000 chars
    ratio_caractères_valides * 0.35 +  # Arabe/français valides
    (1 - ratio_corruption) * 0.25 +    # Pas de �□■●
    texte_cohérent * 0.15              # Mots de 3+ lettres
)
```

### Classification qualité

- **excellent** : confidence ≥ 0.8
- **good** : 0.6 ≤ confidence < 0.8
- **poor** : 0.3 ≤ confidence < 0.6
- **failed** : confidence < 0.3

## 🔧 Configuration Vision API (optionnel)

```bash
export OPENAI_API_KEY="sk-..."
export ENABLE_VISION_API="true"
```

## 📝 Exemples de résultats

### Document moderne (2025)
```
Méthode:    pdfplumber
Qualité:    excellent
Confiance:  95%
Caractères: 45,230
```

### Document scanné (1970)
```
Méthode:    ocr_tesseract
Qualité:    good
Confiance:  72%
Caractères: 12,890
```

### Document très dégradé (1962)
```
Méthode:    vision_api
Qualité:    good
Confiance:  81%
Caractères: 8,540
```

## 🐛 Dépannage

### Tesseract ne fonctionne pas
```bash
# Vérifier installation
tesseract --version

# Vérifier langues disponibles
tesseract --list-langs
# Doit montrer: ara, fra

# Si manquant, réinstaller avec langues
brew reinstall tesseract tesseract-lang
```

### pdf2image ne trouve pas poppler
```bash
# Vérifier installation
pdftoppm -v

# Si manquant
brew install poppler

# Vérifier PATH
which pdftoppm
```

### Vision API rate limit
```python
# Dans intelligent_text_extractor.py
import time
time.sleep(1)  # Entre chaque page
```

## 📈 Monitoring

Afficher statistiques après ré-extraction:
```python
from shared.intelligent_text_extractor import IntelligentTextExtractor

extractor = IntelligentTextExtractor()
docs = extractor.get_poor_quality_documents()

print(f"Documents à ré-extraire : {len(docs)}")
for doc in docs[:10]:
    print(f"  {doc['id']}: {doc['quality']} ({doc['method']})")
```

## 🎓 Bonnes pratiques

1. **Toujours tester sur un échantillon d'abord**
   ```bash
   POST /api/joradp/documents/reextract
   {"document_ids": [5784, 5785, 5786]}
   ```

2. **Utiliser Vision API uniquement si nécessaire**
   - Coûts : $0.01/page
   - Réserver pour documents failed après Tesseract

3. **Monitor la qualité**
   ```bash
   GET /api/joradp/documents/extraction-quality
   ```

4. **Backup avant ré-extraction massive**
   ```bash
   sqlite3 harvester.db ".backup harvester_backup.db"
   ```
