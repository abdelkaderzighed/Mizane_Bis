with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_declaration = 'const CoursSupremeViewer = () => {'
new_declaration = 'const CoursSupremeViewer = ({ embedded = false }) => {'
content = content.replace(old_declaration, new_declaration)

old_header = '<h1 className="text-2xl font-bold text-center mb-4">Cour Suprême d\'Algérie</h1>'
new_header = '{!embedded && <h1 className="text-2xl font-bold text-center mb-4">Cour Suprême d\'Algérie</h1>}'
content = content.replace(old_header, new_header)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("CoursSupremeViewer modifie")
