with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

# 1. Icône pour JORADP (vert)
old_joradp_icon = '''                  <div className="w-10 h-10 bg-blue-500 rounded flex items-center justify-center text-white font-bold">
                    {site.name.substring(0, 2)}
                  </div>'''

new_joradp_icon = '''                  <div className="w-10 h-10 bg-green-600 rounded flex items-center justify-center text-white text-xl">
                    📰
                  </div>'''

content = content.replace(old_joradp_icon, new_joradp_icon)

# 2. Icône pour les sections (chambres) - violet
# Chercher dans CoursSupremeViewer
with open('CoursSupremeViewer.jsx', 'r') as f:
    cs_content = f.read()

old_chamber_icon = '<FolderOpen className="w-6 h-6 text-purple-600" />'
new_chamber_icon = '''<div className="w-8 h-8 bg-purple-600 rounded flex items-center justify-center text-white text-base">
                    🏛️
                  </div>'''

cs_content = cs_content.replace(old_chamber_icon, new_chamber_icon)

# 3. Icône pour les thèmes - bleu
old_theme_icon = '<Tag className="w-5 h-5 text-blue-600" />'
new_theme_icon = '''<div className="w-7 h-7 bg-blue-500 rounded flex items-center justify-center text-white text-sm">
                            🏷️
                          </div>'''

cs_content = cs_content.replace(old_theme_icon, new_theme_icon)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(cs_content)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Icones colorees ajoutees")
