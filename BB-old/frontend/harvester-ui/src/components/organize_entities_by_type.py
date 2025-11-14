with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Remplacer l'affichage des entités AR par un affichage groupé
old_ar_entities = """                        {selectedMetadata.entities_ar && (
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

new_ar_entities = """                        {selectedMetadata.entities_ar && (() => {
                          const entities = JSON.parse(selectedMetadata.entities_ar);
                          const grouped = entities.reduce((acc, e) => {
                            const type = e.type || 'other';
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(e.name || e);
                            return acc;
                          }, {});
                          
                          const typeLabels = {
                            person: '👤 أشخاص',
                            institution: '🏛️ مؤسسات',
                            location: '📍 أماكن',
                            legal: '⚖️ قانونية',
                            other: '📋 أخرى'
                          };
                          
                          return (
                            <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
                              <h3 className="font-bold text-purple-700 mb-3">الكيانات المسماة</h3>
                              {Object.entries(grouped).map(([type, items]) => (
                                <div key={type} className="mb-3 last:mb-0">
                                  <p className="text-sm font-semibold text-gray-600 mb-1" dir="rtl">{typeLabels[type] || '📋 أخرى'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {items.map((name, i) => (
                                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}"""

content = content.replace(old_ar_entities, new_ar_entities)

# Remplacer l'affichage des entités FR
old_fr_entities = """                        {selectedMetadata.entities_fr && (
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

new_fr_entities = """                        {selectedMetadata.entities_fr && (() => {
                          const entities = JSON.parse(selectedMetadata.entities_fr);
                          const grouped = entities.reduce((acc, e) => {
                            const type = e.type || 'other';
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(e.name || e);
                            return acc;
                          }, {});
                          
                          const typeLabels = {
                            person: '👤 Personnes',
                            institution: '🏛️ Institutions',
                            location: '📍 Lieux',
                            legal: '⚖️ Juridique',
                            other: '📋 Autres'
                          };
                          
                          return (
                            <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
                              <h3 className="font-bold text-purple-700 mb-3">Entités nommées</h3>
                              {Object.entries(grouped).map(([type, items]) => (
                                <div key={type} className="mb-3 last:mb-0">
                                  <p className="text-sm font-semibold text-gray-600 mb-1">{typeLabels[type] || '📋 Autres'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {items.map((name, i) => (
                                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}"""

content = content.replace(old_fr_entities, new_fr_entities)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Entites organisees par categorie")
