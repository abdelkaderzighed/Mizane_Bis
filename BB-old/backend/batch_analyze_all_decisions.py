#!/usr/bin/env python3
import sqlite3
import sys
from openai_coursupreme_analyzer import CourSupremeAnalyzer
from tqdm import tqdm

DB_PATH = 'harvester.db'

def analyze_all_decisions():
    """Analyse IA complète des 1245 décisions depuis fichiers"""
    
    print("\n" + "="*70)
    print("🤖 ANALYSE IA COMPLÈTE - COUR SUPRÊME")
    print("="*70)
    
    analyzer = CourSupremeAnalyzer()
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Récupérer toutes les décisions sans analyse
    cursor.execute("""
        SELECT id, decision_number, file_path_ar, file_path_fr
        FROM supreme_court_decisions
        WHERE title_ar IS NULL OR title_fr IS NULL
        ORDER BY id
    """)
    
    decisions = cursor.fetchall()
    total = len(decisions)
    
    print(f"\n📊 Décisions à analyser : {total}")
    
    if total == 0:
        print("✅ Toutes les décisions sont déjà analysées !")
        conn.close()
        return
    
    success = 0
    errors = 0
    
    for dec in tqdm(decisions, desc="Analyse en cours"):
        try:
            # Lire fichiers
            text_ar = None
            text_fr = None
            
            if dec['file_path_ar']:
                with open(dec['file_path_ar'], 'r', encoding='utf-8') as f:
                    text_ar = f.read()
            
            if dec['file_path_fr']:
                with open(dec['file_path_fr'], 'r', encoding='utf-8') as f:
                    text_fr = f.read()
            
            # Analyser
            results = analyzer.analyze_decision(text_ar, text_fr)
            
            # Mettre à jour BD
            cursor.execute("""
                UPDATE supreme_court_decisions
                SET title_ar = ?,
                    title_fr = ?,
                    summary_ar = ?,
                    summary_fr = ?,
                    entities_ar = ?,
                    entities_fr = ?,
                    embedding = ?
                WHERE id = ?
            """, (
                results['title_ar'],
                results['title_fr'],
                results['summary_ar'],
                results['summary_fr'],
                results['entities_ar'],
                results['entities_fr'],
                results['embedding'],
                dec['id']
            ))
            
            conn.commit()
            success += 1
            
        except Exception as e:
            errors += 1
            print(f"\n❌ Erreur décision {dec['decision_number']}: {e}")
            continue
    
    conn.close()
    
    print("\n" + "="*70)
    print(f"✅ Analyse terminée !")
    print(f"   Succès : {success}/{total}")
    print(f"   Erreurs: {errors}")
    print("="*70 + "\n")

if __name__ == '__main__':
    analyze_all_decisions()
