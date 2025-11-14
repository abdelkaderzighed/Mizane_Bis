import sqlite3
import os
from bs4 import BeautifulSoup
from openai import OpenAI
from dotenv import load_dotenv
import time

load_dotenv()

BASE_DIR = '/Users/djamel/Documents/Textes_juridiques_DZ/Cour_supreme'
DB_PATH = 'harvester.db'

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, decision_number, decision_date, html_content_ar
    FROM supreme_court_decisions
""")

decisions = cursor.fetchall()

print(f"Extraction et traduction de {len(decisions)} decisions completes...")
print(f"Cout estime: ${len(decisions) * 0.002:.2f}")

for i, (dec_id, num, date, html_ar) in enumerate(decisions, 1):
    if not html_ar:
        print(f"Skip {num} - pas de HTML")
        continue
    
    try:
        soup = BeautifulSoup(html_ar, 'html.parser')
        text_ar = soup.get_text(separator='\n', strip=True)
        
        date_clean = date.replace('/', '-') if date else 'SANS_DATE'
        filename_ar = f"{num}_{date_clean}-AR.txt"
        filename_fr = f"{num}_{date_clean}-FR.txt"
        path_ar = os.path.join(BASE_DIR, filename_ar)
        path_fr = os.path.join(BASE_DIR, filename_fr)
        
        with open(path_ar, 'w', encoding='utf-8') as f:
            f.write(f"Décision N° {num}\nDate: {date}\n\n{text_ar}")
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Tu es traducteur juridique arabe-français. Traduis le texte juridique complet en conservant la structure."},
                {"role": "user", "content": f"Traduis cette décision:\n\n{text_ar[:3000]}"}
            ],
            max_tokens=2000,
            temperature=0.3
        )
        
        text_fr = response.choices[0].message.content.strip()
        
        with open(path_fr, 'w', encoding='utf-8') as f:
            f.write(f"Décision N° {num}\nDate: {date}\n\n{text_fr}")
        
        cursor.execute("""
            UPDATE supreme_court_decisions 
            SET file_path_ar = ?, file_path_fr = ?
            WHERE id = ?
        """, (path_ar, path_fr, dec_id))
        
        if i % 10 == 0:
            conn.commit()
            print(f"{i}/{len(decisions)} - Decision {num} exportee et traduite")
        
        time.sleep(0.2)
        
    except Exception as e:
        print(f"Erreur {num}: {e}")

conn.commit()
conn.close()
print("Export et traduction termines")
