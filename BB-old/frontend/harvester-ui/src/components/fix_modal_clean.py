with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

print("Suppression du panneau de recherche avancée (lignes 1006-1043)...")

# Supprimer les lignes 1006 à 1043 (indexation 0-based donc 1005 à 1042)
del lines[1005:1043]

print("✅ Panneau supprimé")

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("\nAjout de l'affichage des mots-clés...")

# Relire le fichier
with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Ajouter les mots-clés AR après entities_ar
ar_keywords = '''                        {selectedMetadata.keywords_ar && (() => {
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

# Trouver où insérer (après le bloc entities_ar, avant le "Pas encore analysée" en arabe)
import re
ar_insert_pattern = r"(\)\}\)\(\)\}\s*</>)\s*(\) : \(\s*<div className=\"text-center py-16\">\s*<div className=\"text-6xl mb-4\">🤖</div>\s*<p className=\"text-gray-500\">لم يتم التحليل بعد</p>)"

content = re.sub(ar_insert_pattern, r'\1' + ar_keywords + r'\2', content, count=1)

# Ajouter les mots-clés FR après entities_fr
fr_keywords = '''                        {selectedMetadata.keywords_fr && (() => {
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

# Trouver où insérer (après le bloc entities_fr, avant le "Pas encore analysée" en français)
fr_insert_pattern = r"(\)\}\)\(\)\}\s*</>)\s*(\) : \(\s*<div className=\"text-center py-16\">\s*<div className=\"text-6xl mb-4\">🤖</div>\s*<p className=\"text-gray-500\">Pas encore analysée</p>)"

content = re.sub(fr_insert_pattern, r'\1' + fr_keywords + r'\2', content, count=1)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Mots-clés ajoutés")
