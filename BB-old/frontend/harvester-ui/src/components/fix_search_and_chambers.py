with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

# 1. Ajouter le state showAdvancedSearch
old_state = "const [searchResults, setSearchResults] = useState(null);"
new_state = """const [searchResults, setSearchResults] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState({
    keywordsInclusive: '',
    keywordsExclusive: '',
    decisionNumber: '',
    dateFrom: '',
    dateTo: ''
  });"""

if 'showAdvancedSearch' not in content:
    content = content.replace(old_state, new_state)

# 2. Ajouter le bouton recherche avancée après le bouton Effacer
old_buttons = """              </div>
            </div>
          </div>
        )}"""

new_buttons = """              </div>
              
              <button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2">
                {showAdvancedSearch ? '▼ Masquer recherche avancée' : '▶ Recherche avancée'}
              </button>
              
              {showAdvancedSearch && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <input type="text" value={filters.keywordsInclusive} onChange={(e) => setFilters({...filters, keywordsInclusive: e.target.value})} placeholder="Mots-clés inclusifs" className="px-3 py-2 border rounded-lg text-sm" />
                    <input type="text" value={filters.keywordsExclusive} onChange={(e) => setFilters({...filters, keywordsExclusive: e.target.value})} placeholder="Mots-clés exclusifs" className="px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <button onClick={handleAdvancedSearch} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Rechercher avec filtres
                  </button>
                </div>
              )}
            </div>
          </div>
        )}"""

content = content.replace(old_buttons, new_buttons)

# 3. Ajouter la fonction handleAdvancedSearch après handleSearch
old_func = """  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };"""

new_func = """  const handleSearch = async () => {
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
      
      const response = await fetch(`http://localhost:5001/api/coursupreme/search/advanced?${params}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
    }
  };"""

if 'handleAdvancedSearch' not in content:
    content = content.replace(old_func, new_func)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Recherche avancee ajoutee")
