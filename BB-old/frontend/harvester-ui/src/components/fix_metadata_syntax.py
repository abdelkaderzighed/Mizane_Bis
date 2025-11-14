with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

# Corriger la syntaxe du fetch
old_fetch = "const res = await fetch`${API_URL}/documents/${doc.id}/metadata`);"
new_fetch = "const res = await fetch(`${API_URL}/documents/${doc.id}/metadata`);"

content = content.replace(old_fetch, new_fetch)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Syntaxe fetch corrigee")
