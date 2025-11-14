with open('harvest_routes.py', 'r') as f:
    content = f.read()

# Chercher et modifier max_workers
if 'max_workers=5' in content:
    content = content.replace('max_workers=5', 'max_workers=1')
    print("✅ max_workers: 5 → 1")
elif 'max_workers=' in content:
    print("⚠️ max_workers existe déjà, vérifiez manuellement")

# Chercher et modifier timeout
if 'timeout=10' in content:
    content = content.replace('timeout=10', 'timeout=30')
    print("✅ timeout: 10 → 30")

# Chercher et modifier max_retries
if 'max_retries = 3' in content:
    content = content.replace('max_retries = 3', 'max_retries = 5')
    print("✅ max_retries: 3 → 5")

with open('harvest_routes.py', 'w') as f:
    f.write(content)

print("✅ Paramètres ajustés")
