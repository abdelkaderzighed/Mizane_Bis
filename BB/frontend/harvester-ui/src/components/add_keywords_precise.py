with open('CoursSupremeViewer.jsx', 'r') as f:
    lines = f.readlines()

print("Insertion des mots-clés aux lignes exactes...\n")

# Mots-clés AR - insérer après ligne 800 (index 799)
keywords_ar = '''                        {selectedMetadata.keywords_ar && (() => {
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
'''

lines.insert(800, keywords_ar)
print("✅ Keywords AR insérés ligne 801")

# Mots-clés FR - insérer après ligne 857+17 (car on a ajouté 17 lignes avant) = 874
keywords_fr = '''                        {selectedMetadata.keywords_fr && (() => {
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
'''

lines.insert(874, keywords_fr)
print("✅ Keywords FR insérés ligne 875")

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.writelines(lines)

print("\n✅✅ MOTS-CLÉS AJOUTÉS AU MODAL")
