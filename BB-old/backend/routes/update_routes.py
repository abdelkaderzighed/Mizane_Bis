with open('routes_coursupreme_viewer.py', 'r') as f:
    content = f.read()

content = content.replace(
    'SELECT id, name_ar FROM supreme_court_themes',
    'SELECT id, name_ar, name_fr FROM supreme_court_themes'
)

with open('routes_coursupreme_viewer.py', 'w') as f:
    f.write(content)

print("Routes mises a jour")
