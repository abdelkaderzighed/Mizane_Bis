with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

# Trouver la ligne avec juste '  );'
for i, line in enumerate(lines):
    if line.strip() == ');' and i > 600:
        # Insérer </div> juste avant
        lines.insert(i, '    </div>\n')
        break

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("Structure corrigee")
