with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Le composant doit garder son en-tête de recherche même quand imbriqué
# Vérifier si l'en-tête existe
if 'Cour Suprême d\'Algérie' in content and 'max-w-7xl mx-auto' in content:
    # Supprimer les marges externes pour éviter double espacement
    content = content.replace(
        'return (\n    <div className="min-h-screen bg-gray-50 p-6">',
        'return (\n    <div className="bg-transparent">'
    )
    content = content.replace(
        '      <div className="max-w-7xl mx-auto">',
        '      <div className="w-full">'
    )

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("CoursSupremeViewer adapte pour mode embedded")
