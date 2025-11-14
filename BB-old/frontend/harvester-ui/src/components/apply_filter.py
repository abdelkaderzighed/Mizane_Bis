with open('HierarchicalView.jsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if i == 645 and 'sites.map' in line:
        lines[i] = line.replace('sites.map', 'sites.filter(s => s.id !== 2).map')

with open('HierarchicalView.jsx', 'w') as f:
    f.writelines(lines)

print("Filtre applique ligne 646")
