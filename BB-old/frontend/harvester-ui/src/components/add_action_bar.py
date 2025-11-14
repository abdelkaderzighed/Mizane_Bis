import re

with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

print("Ajout de la barre d'actions...")

# Trouver où insérer (après le panneau de recherche, avant searchResults)
insert_marker = "        {searchResults ? ("

if insert_marker in content:
    action_bar = '''
        {/* BARRE D'ACTIONS - TOUJOURS VISIBLE */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox"
                  checked={selectedDecisions.size > 0}
                  disabled={loadingSelection}
                  onChange={(e) => {
                    if (e.target.checked) {
                      selectAllVisible();
                    } else {
                      deselectAll();
                    }
                  }}
                  className="w-5 h-5 text-blue-600 rounded disabled:opacity-50"
                />
                <span className="font-semibold text-blue-800">
                  {loadingSelection ? '⏳ Chargement...' : 'Tout sélectionner'}
                </span>
              </label>
              <span className="text-blue-700">
                {selectedDecisions.size > 0 ? (
                  <>✓ {selectedDecisions.size} sélectionnée{selectedDecisions.size > 1 ? 's' : ''}</>
                ) : (
                  <>Aucune sélection</>
                )}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => handleBatchAction('download')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                📥 Télécharger
              </button>
              <button 
                onClick={() => handleBatchAction('translate')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🌐 Traduire
              </button>
              <button 
                onClick={() => handleBatchAction('analyze')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🤖 Analyser
              </button>
              <button 
                onClick={() => handleBatchAction('embed')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                🧬 Embeddings
              </button>
            </div>
          </div>
        </div>

'''
    content = content.replace(insert_marker, action_bar + insert_marker)
    print("✅ Barre d'actions ajoutée")
else:
    print("❌ Marqueur non trouvé")

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("✅ Barre d'actions insérée")
