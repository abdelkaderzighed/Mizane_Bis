with open('routes_coursupreme_viewer.py', 'r') as f:
    lines = f.readlines()

new_lines = []
in_function = False
skip_until_return = False

for i, line in enumerate(lines):
    if 'def get_decision_detail(decision_id):' in line:
        in_function = True
        new_lines.append(line)
        new_lines.append('    """Détail complet d\'une décision"""\n')
        new_lines.append('    conn = get_db()\n')
        new_lines.append('    conn.row_factory = sqlite3.Row\n')
        new_lines.append('    cursor = conn.cursor()\n')
        new_lines.append('    \n')
        new_lines.append('    cursor.execute("""\n')
        new_lines.append('        SELECT id, decision_number, decision_date, url, file_path_ar, file_path_fr\n')
        new_lines.append('        FROM supreme_court_decisions\n')
        new_lines.append('        WHERE id = ?\n')
        new_lines.append('    """, (decision_id,))\n')
        new_lines.append('    \n')
        new_lines.append('    row = cursor.fetchone()\n')
        new_lines.append('    \n')
        new_lines.append('    if not row:\n')
        new_lines.append('        conn.close()\n')
        new_lines.append('        return jsonify({\'error\': \'Décision non trouvée\'}), 404\n')
        new_lines.append('    \n')
        new_lines.append('    decision = dict(row)\n')
        new_lines.append('    \n')
        new_lines.append('    if decision.get(\'file_path_ar\'):\n')
        new_lines.append('        try:\n')
        new_lines.append('            with open(decision[\'file_path_ar\'], \'r\', encoding=\'utf-8\') as f:\n')
        new_lines.append('                decision[\'content_ar\'] = f.read()\n')
        new_lines.append('        except:\n')
        new_lines.append('            decision[\'content_ar\'] = None\n')
        new_lines.append('    \n')
        new_lines.append('    if decision.get(\'file_path_fr\'):\n')
        new_lines.append('        try:\n')
        new_lines.append('            with open(decision[\'file_path_fr\'], \'r\', encoding=\'utf-8\') as f:\n')
        new_lines.append('                decision[\'content_fr\'] = f.read()\n')
        new_lines.append('        except:\n')
        new_lines.append('            decision[\'content_fr\'] = None\n')
        new_lines.append('    \n')
        new_lines.append('    conn.close()\n')
        new_lines.append('    \n')
        new_lines.append('    return jsonify(decision)\n')
        skip_until_return = True
        continue
    
    if skip_until_return:
        if line.strip().startswith('return jsonify(decision)'):
            skip_until_return = False
            in_function = False
        continue
    
    new_lines.append(line)

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.writelines(new_lines)

print("Route mise a jour")
