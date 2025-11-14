import os
import json
from openai import OpenAI
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv

load_dotenv()

class CourSupremeAnalyzer:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.embedding_model = SentenceTransformer('all-MiniLM-L6-v2')
    
    def analyze_decision(self, text_ar, text_fr):
        """Analyse complète d'une décision AR + FR"""
        
        results = {
            'summary_ar': None,
            'summary_fr': None,
            'title_ar': None,
            'title_fr': None,
            'entities_ar': None,
            'entities_fr': None,
            'embedding': None
        }
        
        # 1. Résumé + Titre AR
        if text_ar:
            ar_analysis = self._analyze_text(text_ar, 'ar')
            results['summary_ar'] = ar_analysis['summary']
            results['title_ar'] = ar_analysis['title']
            results['entities_ar'] = json.dumps(ar_analysis['entities'], ensure_ascii=False)
        
        # 2. Résumé + Titre FR
        if text_fr:
            fr_analysis = self._analyze_text(text_fr, 'fr')
            results['summary_fr'] = fr_analysis['summary']
            results['title_fr'] = fr_analysis['title']
            results['entities_fr'] = json.dumps(fr_analysis['entities'], ensure_ascii=False)
        
        # 3. Embedding (sur texte FR ou AR)
        embedding_text = text_fr if text_fr else text_ar
        if embedding_text:
            results['embedding'] = self.embedding_model.encode(embedding_text[:5000]).tobytes()
        
        return results
    
    def _analyze_text(self, text, lang):
        """Analyse un texte dans une langue donnée"""
        
        lang_instruction = "Réponds en ARABE" if lang == 'ar' else "Réponds en FRANÇAIS"
        
        prompt = f"""{lang_instruction}. Analyse cette décision juridique et retourne un JSON avec:
1. "summary": résumé de 3-4 lignes
2. "title": titre court et descriptif
3. "entities": liste des entités nommées (personnes, institutions, lieux)

Décision:
{text[:3000]}

IMPORTANT: Toutes tes réponses (summary, title, entities) doivent être dans la langue du texte ({"arabe" if lang == "ar" else "français"}).
Réponds UNIQUEMENT avec un JSON valide, sans markdown."""

        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Tu es un assistant juridique expert. Réponds uniquement en JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.3,
                max_tokens=800
            )
            
            content = response.choices[0].message.content.strip()
            content = content.replace('```json', '').replace('```', '').strip()
            
            return json.loads(content)
            
        except Exception as e:
            print(f"Erreur analyse {lang}: {e}")
            return {
                'summary': None,
                'title': None,
                'entities': []
            }

analyzer = CourSupremeAnalyzer()
