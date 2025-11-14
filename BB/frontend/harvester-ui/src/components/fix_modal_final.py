with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

print("1. Suppression du panneau de recherche avancée (lignes 715-751)...")
# Supprimer lignes 714-750 (index 714-750)
del lines[714:751]
print("   ✅ Supprimé")

print("2. Ajout des mots-clés AR (après ligne 646)...")
# Après ligne 646 (maintenant ligne 646 car on n'a pas encore modifié avant)
keywords_ar = '''                        {selectedMetadata.keywords_ar && (() => {
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
                          } catch(e) { return null; }
                        })()}
'''
lines.insert(646, keywords_ar)
print("   ✅ Keywords AR ajoutés")

print("3. Ajout des mots-clés FR (après ligne 703+offset)...")
# Après ligne 703 + l'offset du code qu'on vient d'ajouter
keywords_fr = '''                        {selectedMetadata.keywords_fr && (() => {
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
                          } catch(e) { return null; }
                        })()}
'''
# 703 + 17 lignes ajoutées pour keywords_ar = 720
lines.insert(720, keywords_fr)
print("   ✅ Keywords FR ajoutés")

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("\n✅ TOUTES LES CORRECTIONS APPLIQUÉES")
print("   - Panneau de recherche avancée supprimé du modal")
print("   - Mots-clés AR affichés")
print("   - Mots-clés FR affichés")
