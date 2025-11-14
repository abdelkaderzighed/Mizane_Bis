import React, { useState, useEffect } from 'react';
import { Building2, FileText, ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';

const CoursSupremeView = ({ siteId }) => {
  const [chambers, setChambers] = useState([]);
  const [expandedChamber, setExpandedChamber] = useState(null);
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const API_BASE = 'http://localhost:5001/api';

  useEffect(() => {
    fetchChambers();
  }, [siteId]);

  const fetchChambers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/sites/${siteId}/chambers`);
      const data = await response.json();
      
      if (data.success) {
        setChambers(data.chambers);
      } else {
        setError('Erreur lors du chargement des chambres');
      }
    } catch (err) {
      setError('Impossible de se connecter au serveur');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDecisions = async (chamberId) => {
    try {
      const response = await fetch(`${API_BASE}/chambers/${chamberId}/decisions`);
      const data = await response.json();
      
      if (data.success) {
        setDecisions(prev => ({
          ...prev,
          [chamberId]: data.decisions
        }));
      }
    } catch (err) {
      console.error('Erreur chargement décisions:', err);
    }
  };

  const toggleChamber = (chamberId) => {
    if (expandedChamber === chamberId) {
      setExpandedChamber(null);
    } else {
      setExpandedChamber(chamberId);
      if (!decisions[chamberId]) {
        fetchDecisions(chamberId);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-500">Chargement des chambres...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="text-xl font-semibold text-blue-900 mb-2">
          🏛️ Cour Suprême d'Algérie
        </h2>
        <p className="text-blue-700">
          {chambers.length} chambres - Décisions de jurisprudence
        </p>
      </div>

      {chambers.map(chamber => (
        <div key={chamber.id} className="border rounded-lg overflow-hidden">
          <div
            className="bg-gray-50 p-4 cursor-pointer hover:bg-gray-100 transition-colors"
            onClick={() => toggleChamber(chamber.id)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expandedChamber === chamber.id ? (
                  <ChevronDown size={20} className="text-gray-600" />
                ) : (
                  <ChevronRight size={20} className="text-gray-600" />
                )}
                <Building2 size={24} className="text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">{chamber.name_fr}</h3>
                  <p className="text-sm text-gray-600">{chamber.name_ar}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {decisions[chamber.id]?.length || 0} décisions
                </span>
              </div>
            </div>
          </div>

          {expandedChamber === chamber.id && (
            <div className="bg-white p-4">
              {decisions[chamber.id] ? (
                decisions[chamber.id].length > 0 ? (
                  <div className="space-y-2">
                    {decisions[chamber.id].map(decision => (
                      <div
                        key={decision.id}
                        className="border border-gray-200 rounded-lg p-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            <FileText size={20} className="text-gray-400 mt-1" />
                            <div className="flex-1">
                              <div className="font-medium text-gray-900">
                                Décision n° {decision.decision_number}
                              </div>
                              {decision.decision_date && (
                                <div className="text-sm text-gray-600">
                                  Date : {decision.decision_date}
                                </div>
                              )}
                              {decision.object_fr && (
                                <div className="text-sm text-gray-700 mt-1">
                                  {decision.object_fr}
                                </div>
                              )}
                            </div>
                          </div>
                          <a href={decision.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-blue-600 hover:text-blue-800 text-sm"
                          >
                            <ExternalLink size={16} />
                            Voir
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    Aucune décision disponible pour cette chambre
                  </div>
                )
              ) : (
                <div className="text-center py-8 text-gray-500">
                  Chargement des décisions...
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CoursSupremeView;
