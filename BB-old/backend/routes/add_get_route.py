with open('routes_coursupreme_viewer.py', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if 'def get_decision_detail(decision_id):' in line:
        lines.insert(i, "@api_bp.route('/coursupreme/decisions/<int:decision_id>', methods=['GET'])\n")
        break

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.writelines(lines)

print("Route GET ajoutee")
