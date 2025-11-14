import React, { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader, Download } from 'lucide-react';
import { API_URL } from '../config';

export default function JobHistoryCard({ 
  job, 
  isSelected,
  onToggleSelect,
  onDownload, 
  onViewJson, 
  onDeleteDoc,
  selectedDocs = [],
  onToggleDoc,
  onToggleAllDocs,
  setSelectedDocForAnalysis,
  setAnalysisJobId 
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [jobDetails, setJobDetails] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isExpanded && !jobDetails) {
      fetchJobDetails();
    }
  }, [isExpanded]);

  const fetchJobDetails = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/harvest/${job.id}/export?include_analysis=true`);
      const data = await response.json();
      setJobDetails(data);
    } catch (error) {
      console.error('Erreur chargement détails:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSiteName = () => {
    if (job.base_url?.includes('joradp.dz')) return 'JORADP - Journal Officiel Algérie';
    return job.base_url || 'Site inconnu';
  };

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      {/* En-tête du job */}
      <div 
        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100"
      >
        <div className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={(e) => {
              e.stopPropagation();
              onToggleSelect(job.id);
            }}
            className="w-4 h-4"
          />
          <div 
            className="flex items-center gap-3 cursor-pointer flex-1"
            onClick={() => setIsExpanded(!isExpanded)}
          >
          {job.status === 'completed' && <CheckCircle className="w-5 h-5 text-green-500" />}
          {job.status === 'running' && <Loader className="w-5 h-5 text-blue-500 animate-spin" />}
          {job.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
          
            <div>
              <p className="font-medium text-gray-800">{getSiteName()}</p>
            <p className="text-sm text-gray-600">
                {job.document_count} documents - {new Date(job.started_at).toLocaleString('fr-FR')}
              </p>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {job.status === 'completed' && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDownload(job.id);
              }}
              className="px-3 py-1 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
              title="Télécharger JSON"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
          <button
            className="text-gray-500 text-sm"
            title={isExpanded ? "Masquer les documents" : "Voir les documents"}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Liste des documents */}
      {isExpanded && (
        <div className="p-4 bg-white border-t">
          {loading ? (
            <div className="text-center py-4">
              <Loader className="w-6 h-6 animate-spin mx-auto text-gray-400" />
              <p className="text-sm text-gray-500 mt-2">Chargement...</p>
            </div>
          ) : jobDetails?.documents ? (
            <>
              <div className="mb-3 pb-2 border-b flex items-center justify-between">
                <button
                  onClick={() => onToggleAllDocs(job.id, jobDetails.documents.length)}
                  className="text-sm text-indigo-600 hover:text-indigo-800"
                >
                  {selectedDocs?.length === jobDetails.documents.length ? '☐ Tout désélectionner' : '☑ Tout sélectionner'}
                </button>
                <span className="text-sm text-gray-500">
                  {selectedDocs?.length || 0} / {jobDetails.documents.length} sélectionné(s)
                </span>
              </div>
              <div className="space-y-2">
                {jobDetails.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-3 bg-gray-50 rounded border">
                    <input
                      type="checkbox"
                      checked={selectedDocs?.includes(idx)}
                      onChange={() => onToggleDoc(job.id, idx)}
                      className="w-4 h-4 mt-1"
                    />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{doc.title || doc.filename}</p>
                    <p className="text-xs text-gray-500">
                      {doc.file_type} • {doc.file_size}
                      {doc.number && ` • N°${doc.number}`}
                      {doc.year && ` • ${doc.year}`}
                    </p>
                  </div>
                  
                  <div className="flex gap-2 ml-3">
                    
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                      title="Ouvrir le document"
                    >
                      🔗 Voir
                    </a>
                    
                    <button
                      onClick={() => onViewJson(doc)}
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
                      title="Voir les métadonnées JSON"
                    >
                      📄 JSON
                    </button>
                    
                    {doc.analysis?.analyzed && (
                      <button
                        onClick={() => {
                          setSelectedDocForAnalysis(doc);
                          setAnalysisJobId(job.id);
                        }}
                        className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                        title="Voir l'analyse IA"
                      >
                        🤖 Analyse
                      </button>
                    )}
                    
                    <button
                      onClick={() => onDeleteDoc(job.id, idx)}
                      className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                      title="Supprimer le document"
                    >
                      🗑️ Suppr.
                    </button>
                  </div>
                </div>
                ))}
              </div>
            </>
          ) : (
            <p className="text-center text-gray-500 py-4">Aucun document</p>
          )}
        </div>
      )}
    </div>
  );
}
