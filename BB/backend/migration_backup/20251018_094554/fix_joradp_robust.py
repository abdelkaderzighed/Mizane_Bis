#!/usr/bin/env python3

import sys

API_FILE = "/Users/djamel/doc_harvester/backend/api.py"

print("🔄 Modification robuste de l'instanciation JORADPHarvester")

# Lire le fichier
with open(API_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Modifications
modified = False

# 1. Ajouter job_id=job_uuid après config=config (ligne 860)
for i in range(len(lines)):
    # Chercher la ligne avec "config=config" dans l'instanciation JORADPHarvester
    if 'config=config' in lines[i] and 'JORADPHarvester' in ''.join(lines[max(0, i-5):i+1]):
        # Remplacer la ligne
        indent = lines[i][:lines[i].index('config')]
        lines[i] = f"{indent}config=config,\n{indent}job_id=job_uuid\n"
        print(f"✅ Ajout de job_id à la ligne {i+1}")
        modified = True
        break

# 2. Supprimer la ligne dupliquée "documents = harvester.harvest(...)"
# Chercher les lignes consécutives identiques
i = 0
while i < len(lines) - 1:
    if 'documents = harvester.harvest(' in lines[i] and lines[i] == lines[i+1]:
        print(f"✅ Suppression du doublon à la ligne {i+2}")
        del lines[i+1]
        modified = True
        break
    i += 1

if not modified:
    print("⚠️ Aucune modification nécessaire (déjà fait ou structure différente)")
    sys.exit(0)

# Écrire le fichier modifié
with open(API_FILE, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("✅ Modifications appliquées avec succès")
print("")
print("📋 Vérification (lignes 857-865) :")

# Afficher les lignes modifiées
with open(API_FILE, 'r', encoding='utf-8') as f:
    all_lines = f.readlines()
    for i in range(856, min(865, len(all_lines))):
        print(f"{i+1}: {all_lines[i]}", end='')

