import sqlite3
import requests
from bs4 import BeautifulSoup
import os
import sys
sys.path.insert(0, '.')
from auto_translator import translator
import time

DB_PATH = 'harvester.db'

def process_new_decisions():
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, decision_number, decision_date, url
        FROM supreme_court_decisions
        WHERE (file_path_ar IS NULL OR file_path_ar = '')
        AND url IS NOT NULL
        ORDER BY id DESC
    """)
    
    new_decisions = cursor.fetchall()
    
    if not new_decisions:
        print("Aucune nouvelle decision a traiter")
        return
    
    print(f"Traitement de {len(new_decisions)} nouvelles decisions...")
    
    for i, (dec_id, num, date, url) in enumerate(new_decisions, 1):
        try:
            print(f"{i}/{len(new_decisions)} - Telechargement {num}...")
            
            response = requests.get(url, timeout=30)
            response.raise_for_status()
            
            cursor.execute("""
                UPDATE supreme_court_decisions
                SET html_content_ar = ?
                WHERE id = ?
            """, (response.text, dec_id))
            conn.commit()
            
            translator.translate_and_save_decision(
                dec_id, num, date, response.text, conn
            )
            
            time.sleep(0.5)
            
        except Exception as e:
            print(f"Erreur {num}: {e}")
    
    conn.close()
    print("Post-processing termine")

if __name__ == '__main__':
    process_new_decisions()
