import sqlite3
from openai_coursupreme_analyzer import analyzer

DB_PATH = 'harvester.db'

conn = sqlite3.connect(DB_PATH)
cursor = conn.cursor()

# Prendre 3 décisions au hasard
cursor.execute("""
    SELECT id, decision_number, file_path_ar, file_path_fr
    FROM supreme_court_decisions
    WHERE file_path_ar IS NOT NULL
    LIMIT 3
""")

decisions = cursor.fetchall()

for dec_id, num, path_ar, path_fr in decisions:
    print(f"\n{'='*60}")
    print(f"Analyse décision {num}...")
    
    # Lire fichiers
    with open(path_ar, 'r', encoding='utf-8') as f:
        text_ar = f.read()
    with open(path_fr, 'r', encoding='utf-8') as f:
        text_fr = f.read()
    
    # Analyser
    results = analyzer.analyze_decision(text_ar, text_fr)
    
    # Afficher
    print(f"\n📋 TITRE AR: {results['title_ar'][:100] if results['title_ar'] else 'None'}...")
    print(f"📋 TITRE FR: {results['title_fr'][:100] if results['title_fr'] else 'None'}...")
    print(f"📝 RÉSUMÉ FR: {results['summary_fr'][:200] if results['summary_fr'] else 'None'}...")
    print(f"🔢 Embedding: {len(results['embedding']) if results['embedding'] else 0} bytes")
    
    # Sauvegarder
    cursor.execute("""
        UPDATE supreme_court_decisions
        SET summary_ar = ?, summary_fr = ?, title_ar = ?, title_fr = ?,
            entities_ar = ?, entities_fr = ?, embedding = ?
        WHERE id = ?
    """, (
        results['summary_ar'], results['summary_fr'],
        results['title_ar'], results['title_fr'],
        results['entities_ar'], results['entities_fr'],
        results['embedding'], dec_id
    ))
    conn.commit()
    print("✅ Sauvegardé")

conn.close()
print(f"\n{'='*60}")
print("Test terminé ! Vérifiez le modal dans le navigateur.")
