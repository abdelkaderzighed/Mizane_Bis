import sqlite3
import os
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

conn = sqlite3.connect('harvester.db')
cursor = conn.cursor()

cursor.execute("SELECT id, name_ar FROM supreme_court_themes WHERE name_fr IS NULL OR name_fr = name_ar")
themes = cursor.fetchall()

print(f"Traduction de {len(themes)} themes...")

for i, (theme_id, name_ar) in enumerate(themes, 1):
    try:
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Tu es un traducteur juridique arabe-français. Traduis uniquement le terme juridique, sans explication."},
                {"role": "user", "content": f"Traduis ce terme juridique algérien en français : {name_ar}"}
            ],
            max_tokens=50,
            temperature=0.3
        )
        
        name_fr = response.choices[0].message.content.strip()
        
        cursor.execute("UPDATE supreme_court_themes SET name_fr = ? WHERE id = ?", (name_fr, theme_id))
        conn.commit()
        
        print(f"{i}/{len(themes)} - {name_ar} → {name_fr}")
        
    except Exception as e:
        print(f"Erreur {theme_id}: {e}")

conn.close()
print("Traduction terminee")
