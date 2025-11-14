import sqlite3
import os

BASE_DIR = '/Users/djamel/Documents/Textes_juridiques_DZ/Cour_supreme'
DB_PATH = 'harvester.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

cursor.execute("""
    SELECT id, decision_number, decision_date, 
           object_ar, parties_ar, legal_reference_ar, arguments_ar,
           object_fr, parties_fr, legal_reference_fr, arguments_fr
    FROM supreme_court_decisions
""")

decisions = cursor.fetchall()

print(f"Export de {len(decisions)} decisions...")

for dec in decisions:
    (dec_id, num, date, obj_ar, parties_ar, legal_ar, args_ar,
     obj_fr, parties_fr, legal_fr, args_fr) = dec
    
    date_clean = date.replace('/', '-') if date else 'SANS_DATE'
    
    filename_ar = f"{num}_{date_clean}-AR.txt"
    filename_fr = f"{num}_{date_clean}-FR.txt"
    
    path_ar = os.path.join(BASE_DIR, filename_ar)
    path_fr = os.path.join(BASE_DIR, filename_fr)
    
    content_ar = f"""Décision N° {num}
Date: {date}

OBJET:
{obj_ar or 'Non disponible'}

PARTIES:
{parties_ar or 'Non disponible'}

RÉFÉRENCE LÉGALE:
{legal_ar or 'Non disponible'}

ARGUMENTS:
{args_ar or 'Non disponible'}
"""
    
    content_fr = f"""Décision N° {num}
Date: {date}

OBJET:
{obj_fr or 'Non traduit'}

PARTIES:
{parties_fr or 'Non traduit'}

RÉFÉRENCE LÉGALE:
{legal_fr or 'Non traduit'}

ARGUMENTS:
{args_fr or 'Non traduit'}
"""
    
    with open(path_ar, 'w', encoding='utf-8') as f:
        f.write(content_ar)
    
    with open(path_fr, 'w', encoding='utf-8') as f:
        f.write(content_fr)
    
    cursor.execute("""
        UPDATE supreme_court_decisions 
        SET file_path_ar = ?, file_path_fr = ?
        WHERE id = ?
    """, (path_ar, path_fr, dec_id))
    
    if dec_id % 100 == 0:
        print(f"{dec_id}/{len(decisions)} decisions exportees")

conn.commit()
conn.close()

print(f"Export termine : {len(decisions)} decisions dans {BASE_DIR}")
