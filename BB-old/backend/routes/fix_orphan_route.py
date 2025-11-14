with open('routes_coursupreme_viewer.py', 'r') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # Supprimer la ligne 89 orpheline
    if i == 88 and "@api_bp.route('/coursupreme/decisions/<int:decision_id>" in line:
        continue
    new_lines.append(line)

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.writelines(new_lines)

print("Route orpheline supprimee")
