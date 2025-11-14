with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# 1. Ajouter les states après searchResults
old_states = "const [searchResults, setSearchResults] = useState(null);"
new_states = """const [searchResults, setSearchResults] = useState(null);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [metadataLang, setMetadataLang] = useState('ar');"""

content = content.replace(old_states, new_states)

# 2. Ajouter la fonction handleShowMetadata après handleDeleteDecision
old_delete = """  const handleDeleteDecision = async (id) => {
    if (!window.confirm('Supprimer?')) return;
    try {
      await fetch(`http://localhost:5001/api/coursupreme/decisions/${id}`, {method: 'DELETE'});
      alert('Supprimée');
      fetchChambers();
    } catch (error) {
      alert('Erreur');
    }
  };"""

new_delete = """  const handleDeleteDecision = async (id) => {
    if (!window.confirm('Supprimer?')) return;
    try {
      await fetch(`http://localhost:5001/api/coursupreme/decisions/${id}`, {method: 'DELETE'});
      alert('Supprimée');
      fetchChambers();
    } catch (error) {
      alert('Erreur');
    }
  };

  const handleShowMetadata = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/metadata/${id}`);
      const data = await response.json();
      setSelectedMetadata(data);
      setMetadataModalOpen(true);
    } catch (error) {
      alert('Erreur chargement métadonnées');
    }
  };"""

content = content.replace(old_delete, new_delete)

# 3. Ajouter le bouton Database dans la ligne de décision
old_buttons = """<button onClick={() => handleDeleteDecision(decision.id)} className="p-1.5 text-red-600" title="Supprimer">
                                    <Trash2 className="w-4 h-4" />
                                  </button>"""

new_buttons = """<button onClick={() => handleShowMetadata(decision.id)} className="p-1.5 text-orange-600" title="Métadonnées IA">
                                    <Database className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteDecision(decision.id)} className="p-1.5 text-red-600" title="Supprimer">
                                    <Trash2 className="w-4 h-4" />
                                  </button>"""

content = content.replace(old_buttons, new_buttons)

# 4. Ajouter le modal juste avant la fermeture finale (avant les 2 derniers </div>)
modal_jsx = """
        {metadataModalOpen && selectedMetadata && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">🤖 Métadonnées IA</h2>
                    <p className="text-gray-600 text-sm">Décision {selectedMetadata.decision_number}</p>
                  </div>
                  <button onClick={() => setMetadataModalOpen(false)} className="text-2xl">×</button>
                </div>
                
                <div className="flex gap-2 bg-white rounded-lg p-1">
                  <button onClick={() => setMetadataLang('ar')} className={`px-6 py-2 rounded-md ${metadataLang === 'ar' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
                    العربية
                  </button>
                  <button onClick={() => setMetadataLang('fr')} className={`px-6 py-2 rounded-md ${metadataLang === 'fr' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
                    Français
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                {metadataLang === 'ar' ? (
                  <div className="space-y-6" dir="rtl">
                    {selectedMetadata.title_ar ? (
                      <>
                        <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500">
                          <h3 className="font-bold text-orange-700 mb-2">العنوان</h3>
                          <p className="text-gray-800">{selectedMetadata.title_ar}</p>
                        </div>
                        {selectedMetadata.summary_ar && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">الملخص</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_ar}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">🤖</div>
                        <p className="text-gray-500">لم يتم التحليل بعد</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {selectedMetadata.title_fr ? (
                      <>
                        <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500">
                          <h3 className="font-bold text-orange-700 mb-2">Titre</h3>
                          <p className="text-gray-800">{selectedMetadata.title_fr}</p>
                        </div>
                        {selectedMetadata.summary_fr && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">Résumé</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_fr}</p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">🤖</div>
                        <p className="text-gray-500">Pas encore analysée</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
"""

# Trouver où insérer (juste avant les 2 derniers </div>)
insert_point = content.rfind('      </div>\n    </div>\n  );\n};')
if insert_point > 0:
    content = content[:insert_point] + modal_jsx + content[insert_point:]

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Modal metadata ajoute completement")
