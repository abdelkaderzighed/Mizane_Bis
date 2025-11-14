import sqlite3
import os
from openai import OpenAI
from dotenv import load_dotenv
import time

load_dotenv()

client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))

conn = sqlite3.connect('harvester.db')
cursor = conn.cursor()

cursor.execute("""
    SELECT id, decision_number, object_ar, parties_ar, legal_reference_ar, arguments_ar 
    FROM supreme_court_decisions 
    WHERE (object_fr IS NULL OR object_fr = '') 
    AND object_ar IS NOT NULL
    LIMIT 1245
""")

decisions = cursor.fetchall()

print(f"Traduction de {len(decisions)} decisions...")
print(f"Cout estime: ${len(decisions) * 0.001:.2f}")

for i, (dec_id, num, obj, parties, legal, args) in enumerate(decisions, 1):
    try:
        texts_to_translate = []
        if obj: texts_to_translate.append(f"OBJET: {obj}")
        if parties: texts_to_translate.append(f"PARTIES: {parties}")
        if legal: texts_to_translate.append(f"REFERENCE: {legal}")
        if args: texts_to_translate.append(f"ARGUMENTS: {args[:500]}")
        
        combined = "\n\n".join(texts_to_translate)
        
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "Tu es traducteur juridique arabe-français spécialisé en droit algérien. Traduis en conservant les sections OBJET:, PARTIES:, REFERENCE:, ARGUMENTS:"},
                {"role": "user", "content": combined}
            ],
            max_tokens=1000,
            temperature=0.3
        )
        
        translated = response.choices[0].message.content.strip()
        
        obj_fr = parties_fr = legal_fr = args_fr = None
        
        for line in translated.split('\n\n'):
            if line.startswith('OBJET:'): obj_fr = line.replace('OBJET:', '').strip()
            elif line.startswith('PARTIES:'): parties_fr = line.replace('PARTIES:', '').strip()
            elif line.startswith('REFERENCE:'): legal_fr = line.replace('REFERENCE:', '').strip()
            elif line.startswith('ARGUMENTS:'): args_fr = line.replace('ARGUMENTS:', '').strip()
        
        cursor.execute("""
            UPDATE supreme_court_decisions 
            SET object_fr = ?, parties_fr = ?, legal_reference_fr = ?, arguments_fr = ?
            WHERE id = ?
        """, (obj_fr, parties_fr, legal_fr, args_fr, dec_id))
        
        conn.commit()
        
        if i % 10 == 0:
            print(f"{i}/{len(decisions)} - Decision {num} traduite")
        
        time.sleep(0.1)
        
    except Exception as e:
        print(f"Erreur {num}: {e}")

conn.close()
print("Traduction terminee")
