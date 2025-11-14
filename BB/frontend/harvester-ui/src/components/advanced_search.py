with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_state = '''const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);'''

new_state = '''const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState({
    keywordsInclusive: '',
    keywordsExclusive: '',
    decisionNumber: '',
    dateFrom: '',
    dateTo: '',
    selectedChambers: [],
    selectedThemes: []
  });'''

content = content.replace(old_state, new_state)

old_search_bar = '''          <div className="max-w-2xl mx-auto">
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Rechercher par numéro, date, mot-clé..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <button
                onClick={handleSearch}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
              >
                <Search className="w-5 h-5" />
                Rechercher
              </button>
              {searchResults && (
                <button
                  onClick={() => {setSearchResults(null); setSearchTerm('');}}
                  className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                >
                  Effacer
                </button>
              )}
            </div>
          </div>'''

new_search_bar = '''          <div className="max-w-4xl mx-auto">
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="Recherche rapide : numéro, date, mot-clé..."
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <button onClick={handleSearch} className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2">
                <Search className="w-5 h-5" />
                Rechercher
              </button>
              {searchResults && (
                <button onClick={() => {setSearchResults(null); setSearchTerm(''); setFilters({keywordsInclusive: '', keywordsExclusive: '', decisionNumber: '', dateFrom: '', dateTo: '', selectedChambers: [], selectedThemes: []});}} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                  Effacer
                </button>
              )}
            </div>
            
            <button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2">
              {showAdvancedSearch ? '▼ Masquer recherche avancée' : '▶ Recherche avancée'}
            </button>
            
            {showAdvancedSearch && (
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés inclusifs (ET)</label>
                    <input
                      type="text"
                      value={filters.keywordsInclusive}
                      onChange={(e) => setFilters({...filters, keywordsInclusive: e.target.value})}
                      placeholder="ex: حادث مرور"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés exclusifs (NON)</label>
                    <input
                      type="text"
                      value={filters.keywordsExclusive}
                      onChange={(e) => setFilters({...filters, keywordsExclusive: e.target.value})}
                      placeholder="ex: استئناف"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de décision</label>
                    <input
                      type="text"
                      value={filters.decisionNumber}
                      onChange={(e) => setFilters({...filters, decisionNumber: e.target.value})}
                      placeholder="ex: 00001"
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                    <input
                      type="date"
                      value={filters.dateFrom}
                      onChange={(e) => setFilters({...filters, dateFrom: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                    <input
                      type="date"
                      value={filters.dateTo}
                      onChange={(e) => setFilters({...filters, dateTo: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sections</label>
                    <select
                      multiple
                      value={filters.selectedChambers}
                      onChange={(e) => setFilters({...filters, selectedChambers: Array.from(e.target.selectedOptions, option => option.value)})}
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      size="3"
                    >
                      {chambers.map(ch => (
                        <option key={ch.id} value={ch.id} dir="rtl">{ch.name_ar}</option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Maintenez Ctrl/Cmd pour sélection multiple</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Thèmes</label>
                    <input
                      type="text"
                      placeholder="Tapez un thème..."
                      className="w-full px-3 py-2 border rounded-lg text-sm"
                      disabled
                    />
                    <p className="text-xs text-gray-500 mt-1">Sélection de thèmes - À venir</p>
                  </div>
                </div>
                
                <button onClick={handleAdvancedSearch} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                  Rechercher avec filtres
                </button>
              </div>
            )}
          </div>'''

content = content.replace(old_search_bar, new_search_bar)

old_handle_search = '''  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };'''

new_handle_search = '''  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const handleAdvancedSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.keywordsInclusive) params.append('keywords_inc', filters.keywordsInclusive);
      if (filters.keywordsExclusive) params.append('keywords_exc', filters.keywordsExclusive);
      if (filters.decisionNumber) params.append('decision_number', filters.decisionNumber);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      if (filters.selectedChambers.length > 0) params.append('chambers', filters.selectedChambers.join(','));
      
      const response = await fetch(`http://localhost:5001/api/coursupreme/search/advanced?${params}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
    }
  };'''

content = content.replace(old_handle_search, new_handle_search)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Recherche avancee ajoutee")
