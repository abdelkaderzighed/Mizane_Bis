import React, { useState, useEffect } from 'react';
import { FileText, Download, Languages, Brain, Grid3x3 } from 'lucide-react';

const GlobalStats = () => {
  const [joradpStats, setJoradpStats] = useState(null);
  const [coursupremeStats, setCoursupremeStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
    // Rafraîchir toutes les 30 secondes
    const interval = setInterval(loadStats, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      // Charger stats JORADP
      const joradpRes = await fetch('http://localhost:5001/api/joradp/stats');
      const joradpData = await joradpRes.json();
      if (joradpData.success) {
        setJoradpStats(joradpData.stats);
      }

      // Charger stats Cour Suprême
      const csRes = await fetch('http://localhost:5001/api/coursupreme/stats');
      const csData = await csRes.json();
      if (csData.success) {
        setCoursupremeStats(csData.stats);
      }

      setLoading(false);
    } catch (err) {
      console.error('Erreur chargement statistiques:', err);
      setLoading(false);
    }
  };

  const formatNumber = (num) => {
    return num?.toLocaleString('fr-FR') || '0';
  };

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className="flex items-center gap-2 bg-white px-3 py-2 rounded border border-gray-200">
      <Icon className={`w-4 h-4 ${color}`} />
      <div className="flex flex-col">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-sm font-semibold">{formatNumber(value)}</span>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-gray-600">Chargement des statistiques...</p>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-bold text-gray-700 mb-3">📊 Statistiques Globales</h3>

      <div className="grid grid-cols-2 gap-4">
        {/* JORADP Stats */}
        <div className="bg-white/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
            📰 JORADP (Journal Officiel)
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={FileText} label="Total" value={joradpStats?.total} color="text-gray-600" />
            <StatCard icon={Download} label="Téléchargés" value={joradpStats?.downloaded} color="text-green-600" />
            <StatCard icon={FileText} label="Texte extrait" value={joradpStats?.extracted} color="text-blue-600" />
            <StatCard icon={Brain} label="Analysés IA" value={joradpStats?.analyzed} color="text-purple-600" />
            <StatCard icon={Grid3x3} label="Embeddings" value={joradpStats?.embedded} color="text-indigo-600" />
          </div>
        </div>

        {/* Cour Suprême Stats */}
        <div className="bg-white/50 rounded-lg p-3">
          <h4 className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
            ⚖️ Cour Suprême
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <StatCard icon={FileText} label="Total" value={coursupremeStats?.total} color="text-gray-600" />
            <StatCard icon={Download} label="Téléchargées" value={coursupremeStats?.downloaded} color="text-green-600" />
            <StatCard icon={Languages} label="Traduites FR" value={coursupremeStats?.translated} color="text-blue-600" />
            <StatCard icon={Brain} label="Analysées IA" value={coursupremeStats?.analyzed} color="text-purple-600" />
            <StatCard icon={Grid3x3} label="Embeddings" value={coursupremeStats?.embedded} color="text-indigo-600" />
          </div>
        </div>
      </div>

      <div className="mt-2 text-xs text-gray-500 text-right">
        Actualisé toutes les 30s
      </div>
    </div>
  );
};

export default GlobalStats;
