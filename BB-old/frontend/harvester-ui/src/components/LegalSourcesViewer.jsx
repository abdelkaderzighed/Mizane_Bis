import React, { useState } from 'react';
import { ChevronDown, ChevronRight, Scale, BookOpen } from 'lucide-react';
import CoursSupremeViewer from './CoursSupremeViewer';

const LegalSourcesViewer = () => {
  const [expandedSource, setExpandedSource] = useState(null);

  const legalSources = [
    {
      id: 'joradp',
      name: 'Journal Officiel (JORADP)',
      icon: BookOpen,
      color: 'bg-green-600',
      available: false
    },
    {
      id: 'coursupreme',
      name: 'Cour Suprême d\'Algérie',
      icon: Scale,
      color: 'bg-blue-600',
      available: true
    }
  ];

  const toggleSource = (sourceId) => {
    setExpandedSource(expandedSource === sourceId ? null : sourceId);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold text-center mb-8 text-gray-800">
          Sources Juridiques Algériennes
        </h1>

        <div className="space-y-4">
          {legalSources.map((source) => {
            const Icon = source.icon;
            return (
              <div key={source.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <button
                  onClick={() => source.available && toggleSource(source.id)}
                  className={`w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors ${!source.available && 'opacity-50 cursor-not-allowed'}`}
                  disabled={!source.available}
                >
                  <div className="flex items-center gap-4">
                    {expandedSource === source.id ? (
                      <ChevronDown className="w-6 h-6 text-gray-600" />
                    ) : (
                      <ChevronRight className="w-6 h-6 text-gray-600" />
                    )}
                    <div className={`p-3 rounded-lg ${source.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-xl font-bold text-gray-800">{source.name}</h2>
                      {!source.available && (
                        <p className="text-sm text-gray-500">Bientôt disponible</p>
                      )}
                    </div>
                  </div>
                  {source.available && expandedSource === source.id && (
                    <span className="text-sm text-blue-600 font-medium">Ouverte</span>
                  )}
                </button>

                {expandedSource === source.id && source.id === 'coursupreme' && (
                  <div className="border-t">
                    <CoursSupremeViewer />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default LegalSourcesViewer;
