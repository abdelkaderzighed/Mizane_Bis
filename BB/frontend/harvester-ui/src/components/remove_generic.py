with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old = '''<div className="text-left">
                            <span className="font-medium text-gray-800" dir="rtl">{theme.name_ar}</span>
                            <p className="text-xs text-gray-500">Thème juridique</p>
                          </div>'''

new = '''<span className="font-medium text-gray-800" dir="rtl">{theme.name_ar}</span>'''

content = content.replace(old, new)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Texte generique retire")
