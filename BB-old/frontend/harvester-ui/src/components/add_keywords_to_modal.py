import re

with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

print("Ajout des mots-clés dans le modal métadonnées...")

# Ajouter keywords_ar après entities_ar
ar_pattern = r"(\)\}\)\(\)\}\s+</>)\s+(\) : \(\s+<div className=\"text-center py-16\">\s+<div className=\"text-6xl mb-4\">🤖</div>\s+<p className=\"text-gray-500\">لم يتم التحليل بعد</p>)"

ar_keywords = r'''\1
                        {selectedMetadata.keywords_ar && (() => {
                          try {
                            const keywords = JSON.parse(selectedMetadata.keywords_ar);
                            return (
                              <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 mt-4">
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
                      </>
                    \2'''

content = re.sub(ar_pattern, ar_keywords, content, flags=re.DOTALL)
print("✅ Mots-clés AR ajoutés")

# Ajouter keywords_fr après entities_fr
fr_pattern = r"(\)\}\)\(\)\}\s+</>)\s+(\) : \(\s+<div className=\"text-center py-16\">\s+<div className=\"text-6xl mb-4\">🤖</div>\s+<p className=\"text-gray-500\">Pas encore analysée</p>)"

fr_keywords = r'''\1
                        {selectedMetadata.keywords_fr && (() => {
                          try {
                            const keywords = JSON.parse(selectedMetadata.keywords_fr);
                            return (
                              <div className="bg-white rounded-lg p-6 border-l-4 border-green-500 mt-4">
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
                      </>
                    \2'''

content = re.sub(fr_pattern, fr_keywords, content, flags=re.DOTALL)
print("✅ Mots-clés FR ajoutés")

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("✅ Mots-clés dans le modal terminés")
