with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Trouver et remplacer le bloc AR
old_ar_block = """                        {selectedMetadata.summary_ar && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">الملخص</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_ar}</p>
                          </div>
                        )}"""

new_ar_block = """                        {selectedMetadata.summary_ar && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">الملخص</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_ar}</p>
                          </div>
                        )}
                        {selectedMetadata.entities_ar && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
                            <h3 className="font-bold text-purple-700 mb-2">الكيانات المسماة</h3>
                            <div className="flex flex-wrap gap-2">
                              {JSON.parse(selectedMetadata.entities_ar).map((entity, i) => (
                                <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                  {entity.name || entity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}"""

content = content.replace(old_ar_block, new_ar_block)

# Trouver et remplacer le bloc FR
old_fr_block = """                        {selectedMetadata.summary_fr && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">Résumé</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_fr}</p>
                          </div>
                        )}"""

new_fr_block = """                        {selectedMetadata.summary_fr && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">Résumé</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_fr}</p>
                          </div>
                        )}
                        {selectedMetadata.entities_fr && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
                            <h3 className="font-bold text-purple-700 mb-2">Entités nommées</h3>
                            <div className="flex flex-wrap gap-2">
                              {JSON.parse(selectedMetadata.entities_fr).map((entity, i) => (
                                <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                  {entity.name || entity}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}"""

content = content.replace(old_fr_block, new_fr_block)

# Ajouter la date dans l'en-tête du modal
old_header = """<h2 className="text-2xl font-bold">🤖 Métadonnées IA</h2>
                    <p className="text-gray-600 text-sm">Décision {selectedMetadata.decision_number}</p>"""

new_header = """<h2 className="text-2xl font-bold">🤖 Métadonnées IA</h2>
                    <p className="text-gray-600 text-sm">Décision {selectedMetadata.decision_number} - {selectedMetadata.decision_date}</p>"""

content = content.replace(old_header, new_header)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Entites et date ajoutees au modal")
