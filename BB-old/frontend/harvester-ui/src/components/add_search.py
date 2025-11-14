with open('CoursSupremeViewer.jsx', 'r') as f:
    content = f.read()

old_state = 'const [selectedLang, setSelectedLang] = useState(\'ar\');'

new_state = '''const [selectedLang, setSelectedLang] = useState('ar');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);'''

content = content.replace(old_state, new_state)

search_bar = '''        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-center">Cour Suprême d'Algérie</h1>
        </div>'''

new_search_bar = '''        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-center mb-4">Cour Suprême d'Algérie</h1>
          
          <div className="max-w-2xl mx-auto">
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
          </div>
        </div>'''

content = content.replace(search_bar, new_search_bar)

search_function = '''  const fetchChambers = async () => {'''

new_search_function = '''  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const fetchChambers = async () => {'''

content = content.replace(search_function, new_search_function)

old_main_display = '''        <div className="space-y-3">
          {chambers.map((chamber) => ('''

new_main_display = '''        {searchResults ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Résultats de recherche ({searchResults.length})</h2>
            <div className="space-y-3">
              {searchResults.map((decision) => (
                <div key={decision.id} className="border-b pb-3 last:border-b-0">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-blue-600">{decision.decision_number}</span>
                        <span className="text-sm text-gray-500">{decision.decision_date}</span>
                      </div>
                      {decision.object_ar && (
                        <p className="text-gray-700 text-sm" dir="rtl">{decision.object_ar}</p>
                      )}
                    </div>
                    <button
                      onClick={() => fetchDecisionDetail(decision.id)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {chambers.map((chamber) => ('''

content = content.replace(old_main_display, new_main_display)

closing_bracket = '''        </div>
      </div>
    </div>
  );
};

export default CoursSupremeViewer;'''

new_closing = '''        </div>
          )}
      </div>
    </div>
  );
};

export default CoursSupremeViewer;'''

content = content.replace(closing_bracket, new_closing)

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Barre de recherche ajoutee")
