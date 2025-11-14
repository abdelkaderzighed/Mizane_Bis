with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# Remplacer le bloc de recherche avancée actuel
old_form = """              {showAdvancedSearch && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={filters.keywordsInclusive} onChange={(e) => setFilters({...filters, keywordsInclusive: e.target.value})} placeholder="Mots-clés inclusifs" className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" value={filters.keywordsExclusive} onChange={(e) => setFilters({...filters, keywordsExclusive: e.target.value})} placeholder="Mots-clés exclusifs" className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <button onClick={handleAdvancedSearch} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Rechercher avec filtres
                  </button>
                </div>
              )}"""

new_form = """              {showAdvancedSearch && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés inclusifs (ET)</label>
                      <input type="text" value={filters.keywordsInclusive} onChange={(e) => setFilters({...filters, keywordsInclusive: e.target.value})} placeholder="ex: مرور حادث" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés exclusifs (NON)</label>
                      <input type="text" value={filters.keywordsExclusive} onChange={(e) => setFilters({...filters, keywordsExclusive: e.target.value})} placeholder="ex: استئناف" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de décision</label>
                      <input type="text" value={filters.decisionNumber} onChange={(e) => setFilters({...filters, decisionNumber: e.target.value})} placeholder="ex: 00001" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                      <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                      <input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  
                  <button onClick={handleAdvancedSearch} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Rechercher avec filtres
                  </button>
                </div>
              )}"""

content = content.replace(old_form, new_form)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Filtres complets ajoutes")
