with open('api.py', 'r') as f:
    content = f.read()

content = content.replace(
    'from sites_routes import register_sites_routes',
    'from sites_routes import register_sites_routes\nfrom routes_coursupreme import register_coursupreme_routes'
)

with open('api.py', 'w') as f:
    f.write(content)

print("Import ajoute")
