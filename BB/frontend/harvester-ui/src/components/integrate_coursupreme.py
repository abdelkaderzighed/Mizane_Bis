with open('HierarchicalView.jsx', 'r') as f:
    content = f.read()

# Ajouter l'import
if "import CoursSupremeViewer" not in content:
    content = content.replace(
        "import { ChevronRight",
        "import CoursSupremeViewer from './CoursSupremeViewer';\nimport { ChevronRight"
    )

# Retirer le filtre qui cache la Cour Suprême
content = content.replace(
    '{sites.filter(s => s.id !== 2).map(site => (',
    '{sites.map(site => ('
)

# Trouver où ajouter le rendu conditionnel pour Cour Suprême
# Chercher après le onClick du site
old_site_content = '''              </div>
              
              {/* Contenu déplié */}
              {expandedSite === site.id && ('''

new_site_content = '''              </div>
              
              {/* Contenu déplié */}
              {expandedSite === site.id && site.id === 2 && (
                <div className="border-t">
                  <CoursSupremeViewer />
                </div>
              )}
              
              {expandedSite === site.id && site.id !== 2 && ('''

content = content.replace(old_site_content, new_site_content)

with open('HierarchicalView.jsx', 'w') as f:
    f.write(content)

print("Cour Supreme integree dans HierarchicalView")
