import os
from openai import OpenAI
from dotenv import load_dotenv
from bs4 import BeautifulSoup
import sqlite3

load_dotenv()

class AutoTranslator:
    def __init__(self):
        self.client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        self.base_dir = '/Users/djamel/Documents/Textes_juridiques_DZ/Cour_supreme'
    
    def translate_theme(self, theme_ar):
        """Traduit un thème juridique AR -> FR"""
        try:
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Traducteur juridique arabe-français. Traduis uniquement le terme."},
                    {"role": "user", "content": f"Traduis ce terme juridique : {theme_ar}"}
                ],
                max_tokens=50,
                temperature=0.3
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Erreur traduction theme: {e}")
            return theme_ar
    
    def translate_and_save_decision(self, decision_id, decision_number, decision_date, html_content_ar, db_conn):
        """Extrait HTML, traduit et sauvegarde les fichiers"""
        try:
            soup = BeautifulSoup(html_content_ar, 'html.parser')
            text_ar = soup.get_text(separator='\n', strip=True)
            
            date_clean = decision_date.replace('/', '-') if decision_date else 'SANS_DATE'
            filename_ar = f"{decision_number}_{date_clean}-AR.txt"
            filename_fr = f"{decision_number}_{date_clean}-FR.txt"
            path_ar = os.path.join(self.base_dir, filename_ar)
            path_fr = os.path.join(self.base_dir, filename_fr)
            
            with open(path_ar, 'w', encoding='utf-8') as f:
                f.write(f"Décision N° {decision_number}\nDate: {decision_date}\n\n{text_ar}")
            
            response = self.client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Traducteur juridique arabe-français. Traduis le texte complet."},
                    {"role": "user", "content": f"Traduis cette décision:\n\n{text_ar[:3000]}"}
                ],
                max_tokens=2000,
                temperature=0.3
            )
            
            text_fr = response.choices[0].message.content.strip()
            
            with open(path_fr, 'w', encoding='utf-8') as f:
                f.write(f"Décision N° {decision_number}\nDate: {decision_date}\n\n{text_fr}")
            
            cursor = db_conn.cursor()
            cursor.execute("""
                UPDATE supreme_court_decisions 
                SET file_path_ar = ?, file_path_fr = ?
                WHERE id = ?
            """, (path_ar, path_fr, decision_id))
            db_conn.commit()
            
            print(f"✓ Decision {decision_number} traduite et sauvegardee")
            return True
            
        except Exception as e:
            print(f"✗ Erreur decision {decision_number}: {e}")
            return False

translator = AutoTranslator()
