content = """import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Tag, Eye, ExternalLink, Search } from 'lucide-react';

const CoursSupremeViewer = () => {
  const [chambers, setChambers] = useState([]);
  const [expandedChamber, setExpandedChamber] = useState(null);
  const [expandedTheme, setExpandedTheme] = useState(null);
  const [themes, setThemes] = useState({});
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ar');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);

  useEffect(() => {
    fetchChambers();
  }, []);

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/search?q=${encodeURIComponent(searchTerm)}`);
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const fetchChambers = async () => {
    try {
      const response = await fetch('http://localhost:5001/api/coursupreme/chambers');
      const data = await response.json();
      setChambers(data.chambers);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const toggleChamber = async (chamberId) => {
    if (expandedChamber === chamberId) {
      setExpandedChamber(null);
    } else {
      setExpandedChamber(chamberId);
      if (!themes[chamberId]) {
        await fetchThemes(chamberId);
      }
    }
  };

  const fetchThemes = async (chamberId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/chambers/${chamberId}/themes`);
      const data = await response.json();
      setThemes(prev => ({ ...prev, [chamberId]: data.themes }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const toggleTheme = async (themeId) => {
    if (expandedTheme === themeId) {
      setExpandedTheme(null);
    } else {
      setExpandedTheme(themeId);
      if (!decisions[themeId]) {
        await fetchDecisions(themeId);
      }
    }
  };

  const fetchDecisions = async (themeId) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/themes/${themeId}/decisions`);
      const data = await response.json();
      setDecisions(prev => ({ ...prev, [themeId]: data.decisions }));
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const fetchDecisionDetail = async (id) => {
    try {
      const response = await fetch(`http://localhost:5001/api/coursupreme/decisions/${id}`);
      const data = await response.json();
      setSelectedDecision(data);
      setModalOpen(true);
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
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
        </div>

        {searchResults ? (
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
            {chambers.map((chamber) => (
              <div key={chamber.id} className="bg-white rounded-lg shadow-sm">
                <button onClick={() => toggleChamber(chamber.id)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {expandedChamber === chamber.id ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                    <FolderOpen className="w-6 h-6 text-purple-600" />
                    <h2 className="text-lg font-bold" dir="rtl">{chamber.name_ar}</h2>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    <span>{chamber.theme_count} thèmes</span>
                    <span>{chamber.decision_count} décisions</span>
                  </div>
                </button>

                {expandedChamber === chamber.id && themes[chamber.id] && (
                  <div className="border-t bg-gray-50">
                    {themes[chamber.id].map((theme) => (
                      <div key={theme.id} className="border-b last:border-b-0">
                        <button onClick={() => toggleTheme(theme.id)} className="w-full px-8 py-3 flex items-center justify-between hover:bg-white">
                          <div className="flex items-center gap-3">
                            {expandedTheme === theme.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                            <Tag className="w-5 h-5 text-blue-600" />
                            <span className="font-medium" dir="rtl">{theme.name_ar}</span>
                          </div>
                          <span className="text-sm text-gray-500">{theme.decision_count} décisions</span>
                        </button>

                        {expandedTheme === theme.id && decisions[theme.id] && (
                          <div className="bg-white px-10 py-2">
                            {decisions[theme.id].map((decision) => (
                              <div key={decision.id} className="py-3 border-b last:border-b-0 flex items-start justify-between gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-blue-600">{decision.decision_number}</span>
                                    <span className="text-sm text-gray-500">{decision.decision_date}</span>
                                  </div>
                                  {decision.object_ar && <p className="text-sm text-gray-700" dir="rtl">{decision.object_ar}</p>}
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => fetchDecisionDetail(decision.id)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Détails">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <a href={decision.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-gray-600 hover:bg-gray-50 rounded" title="Site">
                                    <ExternalLink className="w-4 h-4" />
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {modalOpen && selectedDecision && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-white border-b p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                    <p className="text-gray-600">{selectedDecision.decision_date}</p>
                  </div>
                  <button onClick={() => setModalOpen(false)} className="text-2xl">×</button>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedLang('ar')}
                    className={`px-4 py-2 rounded ${selectedLang === 'ar' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    العربية (AR)
                  </button>
                  <button
                    onClick={() => setSelectedLang('fr')}
                    className={`px-4 py-2 rounded ${selectedLang === 'fr' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Français (FR)
                  </button>
                </div>
              </div>
              <div className="p-6">
                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <pre className="whitespace-pre-wrap font-sans text-right" dir="rtl">
                    {selectedDecision.content_ar}
                  </pre>
                )}
                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <pre className="whitespace-pre-wrap font-sans text-left">
                    {selectedDecision.content_fr}
                  </pre>
                )}
                {!selectedDecision.content_ar && !selectedDecision.content_fr && (
                  <p className="text-gray-500 text-center py-8">Contenu non disponible</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoursSupremeViewer;
"""

with open('CoursSupremeViewer.jsx', 'w') as f:
    f.write(content)

print("Fichier reconstruit")
