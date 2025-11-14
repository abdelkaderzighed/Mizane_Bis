"""Analyse IA des documents avec OpenAI API"""

import os
import json
from openai import OpenAI
from models import get_db_connection

# Récupérer la clé API depuis .env
from dotenv import load_dotenv
load_dotenv()

def analyze_document(text_path):
    """Analyser un document avec OpenAI"""

    # Lire le texte
    with open(text_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Limiter à 10000 caractères pour le test
    text_sample = text[:10000] if len(text) > 10000 else text

    # Appeler OpenAI
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    
    prompt = f"""Analyse ce document officiel algérien et fournis :

1. Un résumé en 2-3 phrases
2. 5 mots-clés principaux
3. Les entités nommées (personnes, organisations, lieux)

Document :
{text_sample}

Réponds en JSON avec cette structure :
{{
  "summary": "...",
  "keywords": ["mot1", "mot2", ...],
  "entities": {{
    "persons": [],
    "organizations": [],
    "locations": []
  }}
}}"""
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            max_tokens=1000,
            messages=[{"role": "user", "content": prompt}],
            response_format={"type": "json_object"}
        )

        # Parser la réponse JSON
        response_text = response.choices[0].message.content
        
        # Nettoyer les balises markdown si présentes
        if response_text.startswith("```json"):
            response_text = response_text.replace("```json", "").replace("```", "").strip()
        
        analysis = json.loads(response_text)
        return analysis
        
    except Exception as e:
        print(f"❌ Erreur analyse: {e}")
        return None

def analyze_session_documents(session_id, limit=None):
    """Analyser les documents d'une session"""
    print(f"\n🤖 Analyse IA - Session {session_id}")
    print("="*50)
    
    with get_db_connection() as conn:
        cursor = conn.cursor()
        
        query = """
            SELECT id, text_path FROM documents 
            WHERE session_id = ? 
            AND text_path IS NOT NULL 
            AND ai_analysis_status = 'pending'
        """
        
        if limit:
            query += f" LIMIT {limit}"
        
        cursor.execute(query, (session_id,))
        documents = cursor.fetchall()
        
        success_count = 0
        failed_count = 0
        
        for doc in documents:
            doc_id = doc['id']
            text_path = doc['text_path']
            
            print(f"\n🤖 [{doc_id}] {os.path.basename(text_path)}")
            
            if not os.path.exists(text_path):
                print("   ⚠️  Fichier texte introuvable")
                failed_count += 1
                continue
            
            # Analyser
            analysis = analyze_document(text_path)
            
            if analysis:
                # Sauvegarder dans document_ai_analysis
                cursor.execute("""
                    INSERT INTO document_ai_analysis (
                        document_id, extracted_text_length, summary, 
                        keywords, named_entities
                    ) VALUES (?, ?, ?, ?, ?)
                """, (
                    doc_id,
                    len(open(text_path, 'r', encoding='utf-8').read()),
                    analysis.get('summary', ''),
                    json.dumps(analysis.get('keywords', []), ensure_ascii=False),
                    json.dumps(analysis.get('entities', {}), ensure_ascii=False)
                ))
                
                # Mettre à jour le statut
                cursor.execute("""
                    UPDATE documents 
                    SET ai_analysis_status = 'success',
                        analyzed_at = CURRENT_TIMESTAMP
                    WHERE id = ?
                """, (doc_id,))
                
                print(f"   ✅ Résumé: {analysis['summary'][:80]}...")
                print(f"   🔑 Mots-clés: {', '.join(analysis['keywords'][:3])}")
                
                success_count += 1
            else:
                # Marquer comme échec
                cursor.execute("""
                    UPDATE documents 
                    SET ai_analysis_status = 'failed'
                    WHERE id = ?
                """, (doc_id,))
                failed_count += 1
        
        conn.commit()
    
    print(f"\n📊 Résumé:")
    print(f"   ✅ Réussis: {success_count}")
    print(f"   ❌ Échecs: {failed_count}\n")
    
    return success_count, failed_count

if __name__ == '__main__':
    # Analyser 2 documents de la session 2 pour tester
    analyze_session_documents(session_id=2, limit=2)
