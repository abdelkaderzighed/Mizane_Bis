with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# 1. Ajouter state pour modal métadonnées
old_state = 'const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);'
new_state = '''const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [metadataLang, setMetadataLang] = useState('ar');'''

content = content.replace(old_state, new_state)

# 2. Modifier handleShowMetadata
old_function = '''  const handleShowMetadata = async (id) => {
    alert('Métadonnées IA - À venir');
  };'''

new_function = '''  const handleShowMetadata = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/metadata/${id}`);
      const data = await response.json();
      setSelectedMetadata(data);
      setMetadataModalOpen(true);
    } catch (error) {
      alert('Erreur chargement métadonnées');
    }
  };'''

content = content.replace(old_function, new_function)

# 3. Ajouter le modal avant la fermeture du composant
modal_jsx = '''
      {/* Modal Métadonnées IA */}
      {metadataModalOpen && selectedMetadata && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-200 p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold">🤖 Métadonnées IA - Décision {selectedMetadata.decision_number}</h2>
                  <p className="text-gray-600 text-sm mt-1">Analyse automatique par intelligence artificielle</p>
                </div>
                <button onClick={() => setMetadataModalOpen(false)} className="text-2xl hover:bg-orange-100 rounded px-2">×</button>
              </div>
              
              <div className="flex gap-2 bg-white rounded-lg p-1 shadow-sm">
                <button
                  onClick={() => setMetadataLang('ar')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${metadataLang === 'ar' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  العربية
                </button>
                <button
                  onClick={() => setMetadataLang('fr')}
                  className={`px-6 py-2 rounded-md font-medium transition-all ${metadataLang === 'fr' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Français
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              {metadataLang === 'ar' ? (
                <div className="space-y-6" dir="rtl">
                  {selectedMetadata.title_ar && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
                      <h3 className="text-lg font-bold text-orange-700 mb-2">العنوان</h3>
                      <p className="text-gray-800 text-lg">{selectedMetadata.title_ar}</p>
                    </div>
                  )}
                  
                  {selectedMetadata.summary_ar && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                      <h3 className="text-lg font-bold text-blue-700 mb-3">الملخص</h3>
                      <p className="text-gray-800 leading-relaxed">{selectedMetadata.summary_ar}</p>
                    </div>
                  )}
                  
                  {selectedMetadata.entities_ar && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                      <h3 className="text-lg font-bold text-purple-700 mb-3">الكيانات المسماة</h3>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(selectedMetadata.entities_ar).map((entity, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!selectedMetadata.title_ar && !selectedMetadata.summary_ar && (
                    <div className="text-center py-16">
                      <div className="text-gray-400 text-6xl mb-4">🤖</div>
                      <p className="text-gray-500 text-lg">لم يتم تحليلها بعد</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {selectedMetadata.title_fr && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-orange-500">
                      <h3 className="text-lg font-bold text-orange-700 mb-2">Titre</h3>
                      <p className="text-gray-800 text-lg">{selectedMetadata.title_fr}</p>
                    </div>
                  )}
                  
                  {selectedMetadata.summary_fr && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-blue-500">
                      <h3 className="text-lg font-bold text-blue-700 mb-3">Résumé</h3>
                      <p className="text-gray-800 leading-relaxed">{selectedMetadata.summary_fr}</p>
                    </div>
                  )}
                  
                  {selectedMetadata.entities_fr && (
                    <div className="bg-white rounded-lg shadow-sm p-6 border-l-4 border-purple-500">
                      <h3 className="text-lg font-bold text-purple-700 mb-3">Entités nommées</h3>
                      <div className="flex flex-wrap gap-2">
                        {JSON.parse(selectedMetadata.entities_fr).map((entity, i) => (
                          <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                            {entity}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {!selectedMetadata.title_fr && !selectedMetadata.summary_fr && (
                    <div className="text-center py-16">
                      <div className="text-gray-400 text-6xl mb-4">🤖</div>
                      <p className="text-gray-500 text-lg">Pas encore analysée</p>
                      <p className="text-gray-400 text-sm mt-2">Utilisez le bouton 🤖 pour lancer l'analyse</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoursSupremeViewer;'''

# Trouver où insérer (avant les dernières accolades)
insert_pos = content.rfind('export default CoursSupremeViewer;')
content = content[:insert_pos] + modal_jsx

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Modal metadonnees ajoute")
