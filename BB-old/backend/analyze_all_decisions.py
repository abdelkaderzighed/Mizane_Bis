import sqlite3
import os
from openai_coursupreme_analyzer import analyzer
import time

DB_PATH = 'harvester.db'

def analyze_all():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    # Récupérer les décisions non analysées
    cursor.execute("""
        SELECT id, decision_number, file_path_ar, file_path_fr
        FROM supreme_court_decisions
        WHERE summary_ar IS NULL OR summary_fr IS NULL
        ORDER BY id
    """)
    
    decisions = cursor.fetchall()
    
    if not decisions:
        print("Aucune décision à analyser")
        return
    
    print(f"Analyse de {len(decisions)} décisions...")
    print(f"Coût estimé: ${len(decisions) * 0.002:.2f}")
    
    for i, (dec_id, num, path_ar, path_fr) in enumerate(decisions, 1):
        try:
            # Lire les fichiers
            text_ar = None
            text_fr = None
            
            if path_ar and os.path.exists(path_ar):
                with open(path_ar, 'r', encoding='utf-8') as f:
                    text_ar = f.read()
            
            if path_fr and os.path.exists(path_fr):
                with open(path_fr, 'r', encoding='utf-8') as f:
                    text_fr = f.read()
            
            if not text_ar and not text_fr:
                print(f"✗ {num} - Aucun fichier trouvé")
                continue
            
            # Analyser
            results = analyzer.analyze_decision(text_ar, text_fr)
            
            # Sauvegarder
            cursor.execute("""
                UPDATE supreme_court_decisions
                SET summary_ar = ?,
                    summary_fr = ?,
                    title_ar = ?,
                    title_fr = ?,
                    entities_ar = ?,
                    entities_fr = ?,
                    embedding = ?
                WHERE id = ?
            """, (
                results['summary_ar'],
                results['summary_fr'],
                results['title_ar'],
                results['title_fr'],
                results['entities_ar'],
                results['entities_fr'],
                results['embedding'],
                dec_id
            ))
            
            conn.commit()
            
            if i % 10 == 0:
                print(f"{i}/{len(decisions)} - Décision {num} analysée")
            
            time.sleep(0.3)  # Rate limiting
            
        except Exception as e:
            print(f"✗ Erreur {num}: {e}")
    
    conn.close()
    print("Analyse terminée")

if __name__ == '__main__':
    analyze_all()
