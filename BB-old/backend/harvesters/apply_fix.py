with open('harvester_coursupreme_v3.py', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Trouver et remplacer la section de détection
output = []
in_detection_block = False

for i, line in enumerate(lines):
    if 'Détecter pages vides' in line or 'page_themes == 0 and page_decisions == 0' in line:
        # Remplacer tout le bloc
        output.append("                # Détecter pages vides (0 décisions = vide)\n")
        output.append("                if page_decisions == 0:\n")
        output.append("                    empty_pages += 1\n")
        output.append("                    print(f'   ⚠️  Aucune nouvelle décision ({empty_pages}/2)')\n")
        output.append("                    if empty_pages >= 2:\n")
        output.append("                        print(f'   ✓ 2 pages consécutives vides - Arrêt')\n")
        output.append("                        break\n")
        output.append("                else:\n")
        output.append("                    empty_pages = 0\n")
        
        # Sauter les anciennes lignes
        j = i
        while j < len(lines) and 'empty_pages = 0' not in lines[j]:
            j += 1
        # Sauter jusqu'à la ligne avec empty_pages = 0 incluse
        for k in range(i+1, min(j+1, len(lines))):
            lines[k] = ''
        in_detection_block = True
    elif line.strip() and not in_detection_block:
        output.append(line)
    elif in_detection_block and line.strip():
        in_detection_block = False

with open('harvester_coursupreme_v3.py', 'w', encoding='utf-8') as f:
    f.writelines(output)

print("✅ Correctif appliqué")
