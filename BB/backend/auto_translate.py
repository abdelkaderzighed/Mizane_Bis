import sqlite3
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

def translate_new_themes():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    conn = sqlite3.connect('harvester.db')
    cursor = conn.cursor()
    
    cursor.execute("SELECT id, name_ar FROM supreme_court_themes WHERE name_fr IS NULL OR name_fr = ''")
    themes = cursor.fetchall()
    
    if not themes:
        print("Aucun nouveau theme a traduire")
        return
    
    print(f"Traduction de {len(themes)} nouveaux themes...")
    
    for theme_id, name_ar in themes:
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Traducteur juridique arabe-français. Traduis uniquement le terme."},
                    {"role": "user", "content": f"Traduis : {name_ar}"}
                ],
                max_tokens=50,
                temperature=0.3
            )
            
            name_fr = response.choices[0].message.content.strip()
            cursor.execute("UPDATE supreme_court_themes SET name_fr = ? WHERE id = ?", (name_fr, theme_id))
            conn.commit()
            print(f"✓ {name_ar} → {name_fr}")
            
        except Exception as e:
            print(f"✗ Erreur {theme_id}: {e}")
    
    conn.close()

def translate_new_decisions():
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
    conn = sqlite3.connect('harvester.db')
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, decision_number, object_ar, parties_ar 
        FROM supreme_court_decisions 
        WHERE (object_fr IS NULL OR object_fr = '') AND object_ar IS NOT NULL
    """)
    
    decisions = cursor.fetchall()
    
    if not decisions:
        print("Aucune nouvelle decision a traduire")
        return
    
    print(f"Traduction de {len(decisions)} nouvelles decisions...")
    
    for dec_id, num, obj, parties in decisions:
        try:
            combined = f"OBJET: {obj or ''}\nPARTIES: {parties or ''}"
            
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "Traducteur juridique arabe-français. Conserve les sections OBJET: et PARTIES:"},
                    {"role": "user", "content": combined}
                ],
                max_tokens=500,
                temperature=0.3
            )
            
            translated = response.choices[0].message.content.strip()
            
            obj_fr = parties_fr = None
            for line in translated.split('\n'):
                if 'OBJET:' in line: obj_fr = line.split('OBJET:')[1].strip()
                elif 'PARTIES:' in line: parties_fr = line.split('PARTIES:')[1].strip()
            
            cursor.execute("UPDATE supreme_court_decisions SET object_fr = ?, parties_fr = ? WHERE id = ?", 
                          (obj_fr, parties_fr, dec_id))
            conn.commit()
            print(f"✓ Decision {num} traduite")
            
        except Exception as e:
            print(f"✗ Erreur {num}: {e}")
    
    conn.close()

if __name__ == '__main__':
    print("=== TRADUCTION AUTO DES NOUVEAUX CONTENUS ===")
    translate_new_themes()
    translate_new_decisions()
    print("Termine")
