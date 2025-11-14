import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("1. Suppression du panneau de recherche avancée du modal Métadonnées...")

# Trouver le modal metadataModalOpen et supprimer le panneau de recherche avancée
# Le panneau commence par "<button onClick={() => setShowAdvancedSearch"
# et se termine avant la fermeture du modal

# Pattern pour trouver et supprimer le bouton + panneau de recherche avancée dans le modal métadonnées
pattern = r'(<button onClick=\{\(\) => setShowAdvancedSearch.*?</button>\s*\{showAdvancedSearch && \(.*?</div>\s*\)\})\s*</div>\s*</div>\s*</div>\s*\)\}\s*</div>\s*\);'

# Chercher le contexte pour être sûr qu'on est dans le bon modal
metadata_modal_section = re.search(r'{metadataModalOpen && selectedMetadata && \(.*?\)\}', content, re.DOTALL)

if metadata_modal_section:
    modal_content = metadata_modal_section.group(0)
    
    # Supprimer le panneau de recherche avancée (le bouton + le contenu conditionnel)
    # Pattern plus précis dans le contexte du modal métadonnées
    cleaned = re.sub(
        r'<button onClick=\{\(\) => setShowAdvancedSearch\(!showAdvancedSearch\)\}.*?Rechercher avec filtres\s*</button>\s*</div>\s*\)',
        '',
        modal_content,
        flags=re.DOTALL
    )
    
    content = content.replace(modal_content, cleaned)
    print("   ✅ Panneau de recherche avancée supprimé")
else:
    print("   ❌ Modal métadonnées non trouvé")

print("2. Ajout de l'affichage des mots-clés...")

# Ajouter l'affichage des keywords après les entités
# Chercher la section entities_fr et ajouter keywords après

# Pour l'arabe
ar_keywords_display = '''
                        {selectedMetadata.keywords_ar && (() => {
                          try {
                            const keywords = JSON.parse(selectedMetadata.keywords_ar);
                            return (
                              <div className="bg-white rounded-lg p-6 border-l-4 border-green-500">
                                <h3 className="font-bold text-green-700 mb-3">الكلمات المفتاحية</h3>
                                <div className="flex flex-wrap gap-2">
                                  {keywords.map((keyword, i) => (
                                    <span key={i} className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch(e) {
                            return null;
                          }
                        })()}'''

# Pour le français
fr_keywords_display = '''
                        {selectedMetadata.keywords_fr && (() => {
                          try {
                            const keywords = JSON.parse(selectedMetadata.keywords_fr);
                            return (
                              <div className="bg-white rounded-lg p-6 border-l-4 border-green-500">
                                <h3 className="font-bold text-green-700 mb-3">Mots-clés</h3>
                                <div className="flex flex-wrap gap-2">
                                  {keywords.map((keyword, i) => (
                                    <span key={i} className="px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                                      {keyword}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            );
                          } catch(e) {
                            return null;
                          }
                        })()}'''

# Insérer après la section entities_ar (version arabe)
content = re.sub(
    r"(\)\)\(\)\}\s*</>)",
    r"\1" + ar_keywords_display + "\n                      </>",
    content,
    count=1
)

# Insérer après la section entities_fr (version française) 
content = re.sub(
    r"(\)\)\(\)\}\s*</>)",
    r"\1" + fr_keywords_display + "\n                      </>",
    content,
    count=1
)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("   ✅ Affichage des mots-clés ajouté")
print("\n✅ Corrections appliquées au modal Métadonnées")
