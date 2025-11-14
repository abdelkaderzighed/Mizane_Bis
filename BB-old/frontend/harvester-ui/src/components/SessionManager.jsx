import React, { useState, useEffect } from 'react';
import { Play, Download, Brain, Trash2, Loader } from 'lucide-react';
import { API_URL } from '../config';

const SessionManager = () => {
  const [sessions, setSessions] = useState([]);
  const [sites, setSites] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [formData, setFormData] = useState({
    site_name: 'JORADP',
    subdirectory_name: '',
    is_test: false,
    start_number: 1,
    end_number: 10
  });

  // Charger les sites et sessions
  useEffect(() => {
    loadSites();
    loadSessions();
  }, []);

  const loadSites = async () => {
    try {
      const res = await fetch(`${API_URL}/sites`);
      const data = await res.json();
      if (data.success) setSites(data.sites);
    } catch (err) {
      console.error('Erreur chargement sites:', err);
    }
  };

  const loadSessions = async () => {
    try {
      const res = await fetch(`${API_URL}/sessions?include_test=true`);
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } catch (err) {
      console.error('Erreur chargement sessions:', err);
    }
  };

  const createSession = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      
      const data = await res.json();
      if (data.success) {
        alert(`Session ${data.session_id} créée !`);
        loadSessions();
        setShowCreateForm(false);
      }
    } catch (err) {
      alert('Erreur création session');
    } finally {
      setLoading(false);
    }
  };

  const runHarvest = async (sessionId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/harvest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: 2025, start_num: 1, end_num: 10 })
      });
      
      const data = await res.json();
      alert(`Moissonnage: ${data.harvested} documents téléchargés`);
      loadSessions();
    } catch (err) {
      alert('Erreur moissonnage');
    } finally {
      setLoading(false);
    }
  };

  const runExtract = async (sessionId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/extract`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await res.json();
      alert(`Extraction: ${data.extracted} textes extraits`);
    } catch (err) {
      alert('Erreur extraction');
    } finally {
      setLoading(false);
    }
  };

  const runAnalyze = async (sessionId) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/sessions/${sessionId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      
      const data = await res.json();
      alert(`Analyse IA: ${data.analyzed} documents analysés`);
    } catch (err) {
      alert('Erreur analyse');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Gestion des Sessions</h1>

        {/* Bouton créer */}
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="mb-6 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {showCreateForm ? 'Annuler' : '+ Nouvelle Session'}
        </button>

        {/* Formulaire création */}
        {showCreateForm && (
          <form onSubmit={createSession} className="bg-white p-6 rounded shadow mb-6">
            <h2 className="text-xl font-bold mb-4">Créer une session</h2>
            
            <div className="mb-4">
              <label className="block mb-2">Site</label>
              <select
                value={formData.site_name}
                onChange={(e) => setFormData({...formData, site_name: e.target.value})}
                className="w-full p-2 border rounded"
              >
                {sites.map(site => (
                  <key={site.id} value={site.name}>{site.name}</key>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block mb-2">Nom du répertoire</label>
              <input
                type="text"
                value={formData.subdirectory_name}
                onChange={(e) => setFormData({...formData, subdirectory_name: e.target.value})}
                className="w-full p-2 border rounded"
                required
              />
            </div>

            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_test}
                  onChange={(e) => setFormData({...formData, is_test: e.target.checked})}
                  className="mr-2"
                />
                Session de test
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
            >
              {loading ? 'Création...' : 'Créer'}
            </button>
          </form>
        )}

        {/* Liste des sessions */}
        <div className="space-y-4">
          {sessions.map(session => (
            <div key={session.id} className="bg-white p-6 rounded shadow">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-bold">{session.site_name} - {session.subdirectory_name}</h3>
                  <p className="text-gray-600">
                    Session #{session.id} | Status: {session.status}
                    {session.is_test ? ' | TEST' : ''}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => runHarvest(session.id)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
                >
                  {loading ? <Loader className="animate-spin" size={16} /> : <Play size={16} />}
                  Moissonner
                </button>

                <button
                  onClick={() => runExtract(session.id)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
                >
                  <Download size={16} />
                  Extraire
                </button>

                <button
                  onClick={() => runAnalyze(session.id)}
                  disabled={loading}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 disabled:opacity-50"
                >
                  <Brain size={16} />
                  Analyser IA
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default SessionManager;
