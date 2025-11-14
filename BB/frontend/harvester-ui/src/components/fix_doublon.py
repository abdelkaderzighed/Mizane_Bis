with open('HierarchicalView.jsx', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines, 1):
    if i == 7 and 'import CoursSupremeView' in line:
        continue
    if i == 1057 and 'CoursSupremeView' in line:
        continue
    new_lines.append(line)

with open('HierarchicalView.jsx', 'w') as f:
    f.writelines(new_lines)

print("Doublon supprime")
