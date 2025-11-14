with open('HierarchicalView.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
coursupreme_imported = False

for line in lines:
    if 'import CoursSupremeViewer' in line:
        if not coursupreme_imported:
            new_lines.append(line)
            coursupreme_imported = True
    else:
        new_lines.append(line)

with open('HierarchicalView.jsx', 'w') as f:
    f.writelines(new_lines)

print("Doublon supprime")
