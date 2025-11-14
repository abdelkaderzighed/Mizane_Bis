import re

with open('CoursSupremeViewer.jsx', 'r', encoding='utf-8') as f:
    content = f.read()

print("Correction de la barre d'actions...")

# Trouver et remplacer la barre d'actions conditionnelle
old_bar_pattern = r'\{selectedDecisions\.size > 0 && \(\s*<div className="bg-gradient-to-r from-blue-50.*?</div>\s*\)\}'

new_bar = '''<div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6 shadow-sm">
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
                title="Télécharger les décisions sélectionnées"
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                📥 Télécharger
              </button>
              <button 
                onClick={() => handleBatchAction('translate')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                title="Traduire les décisions sélectionnées"
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🌐 Traduire
              </button>
              <button 
                onClick={() => handleBatchAction('analyze')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                title="Analyser avec IA les décisions sélectionnées"
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🤖 Analyser
              </button>
              <button 
                onClick={() => handleBatchAction('embed')} 
                disabled={batchProcessing || selectedDecisions.size === 0 || loadingSelection}
                title="Créer les embeddings des décisions sélectionnées"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-105 flex items-center gap-2"
              >
                🧬 Embeddings
              </button>
            </div>
          </div>
        </div>'''

content = re.sub(old_bar_pattern, new_bar, content, flags=re.DOTALL)

with open('CoursSupremeViewer.jsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✅ Barre d'actions maintenant toujours visible")
