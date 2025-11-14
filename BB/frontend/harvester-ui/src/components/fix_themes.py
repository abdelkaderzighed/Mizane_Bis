with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_theme_display = '''<span className="font-medium" dir="rtl">{theme.name_ar}</span>'''

new_theme_display = '''<div className="text-left">
                            <span className="font-medium text-gray-800" dir="rtl">{theme.name_ar}</span>
                            <p className="text-xs text-gray-500">Thème juridique</p>
                          </div>'''

content = content.replace(old_theme_display, new_theme_display)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Structure themes mise a jour")
