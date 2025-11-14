import React, { useState } from 'react';

/**
 * Composant pour visualiser les documents téléchargés
 * Offre 2 options : fichier local ou source en ligne
 */
const DocumentViewerButtons = ({ document }) => {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewType, setPreviewType] = useState(null); // 'local' ou 'online'

  const {
    id,
    title,
    local_file_path,   // Ex: "collection_2025/session_123/doc_67.pdf"
    source_url,        // URL d'origine (OAI-PMH)
    download_status,   // 'pending', 'in_progress', 'completed', 'failed'
    file_format        // 'pdf', 'doc', etc.
  } = document;

  // Construire l'URL du backend Flask
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
  const localFileUrl = local_file_path 
    ? `${API_BASE_URL}/api/documents/${local_file_path}`
    : null;

  const handleViewLocal = () => {
    if (!local_file_path) {
      alert('❌ Le document n\'a pas encore été téléchargé');
      return;
    }
    
    if (download_status !== 'completed') {
      alert(`⏳ Téléchargement en cours... Statut: ${download_status}`);
      return;
    }
    
    // Ouvrir dans un nouvel onglet
    window.open(localFileUrl, '_blank');
  };

  const handleViewOnline = () => {
    if (!source_url) {
      alert('❌ URL source non disponible pour ce document');
      return;
    }
    
    // Ouvrir la source en ligne
    window.open(source_url, '_blank');
  };

  const handlePreviewLocal = () => {
    if (download_status === 'completed' && local_file_path) {
      setPreviewType('local');
      setIsPreviewOpen(true);
    }
  };

  const handlePreviewOnline = () => {
    if (source_url) {
      setPreviewType('online');
      setIsPreviewOpen(true);
    }
  };

  // Icône selon le statut
  const getStatusIcon = () => {
    switch(download_status) {
      case 'completed': return '✅';
      case 'in_progress': return '⏳';
      case 'failed': return '❌';
      case 'pending': return '⏸️';
      default: return '❓';
    }
  };

  return (
    <>
      <div style={{ 
        display: 'flex', 
        gap: '8px', 
        alignItems: 'center',
        flexWrap: 'wrap'
      }}>
        {/* Indicateur de statut */}
        <span 
          style={{ fontSize: '16px' }} 
          title={`Statut: ${download_status}`}
        >
          {getStatusIcon()}
        </span>

        {/* Bouton : Voir fichier local */}
        <button
          onClick={handleViewLocal}
          disabled={download_status !== 'completed' || !local_file_path}
          style={{
            padding: '6px 12px',
            backgroundColor: (download_status === 'completed' && local_file_path) 
              ? '#2196F3' 
              : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: (download_status === 'completed' && local_file_path) 
              ? 'pointer' 
              : 'not-allowed',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (download_status === 'completed') {
              e.target.style.backgroundColor = '#1976D2';
            }
          }}
          onMouseLeave={(e) => {
            if (download_status === 'completed') {
              e.target.style.backgroundColor = '#2196F3';
            }
          }}
          title={local_file_path 
            ? "Ouvrir le document téléchargé" 
            : "Document non téléchargé"}
        >
          👁️ Local
        </button>

        {/* Bouton : Voir source en ligne */}
        <button
          onClick={handleViewOnline}
          disabled={!source_url}
          style={{
            padding: '6px 12px',
            backgroundColor: source_url ? '#4CAF50' : '#ccc',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: source_url ? 'pointer' : 'not-allowed',
            fontSize: '12px',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (source_url) {
              e.target.style.backgroundColor = '#388E3C';
            }
          }}
          onMouseLeave={(e) => {
            if (source_url) {
              e.target.style.backgroundColor = '#4CAF50';
            }
          }}
          title={source_url 
            ? "Ouvrir la source en ligne" 
            : "URL source non disponible"}
        >
          🌐 Source
        </button>

        {/* Bouton optionnel : Aperçu rapide */}
        {file_format === 'pdf' && (
          <button
            onClick={handlePreviewLocal}
            disabled={download_status !== 'completed'}
            style={{
              padding: '6px 10px',
              backgroundColor: download_status === 'completed' ? '#FF9800' : '#ccc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: download_status === 'completed' ? 'pointer' : 'not-allowed',
              fontSize: '12px',
              transition: 'all 0.2s'
            }}
            title="Aperçu rapide"
          >
            🔍
          </button>
        )}
      </div>

      {/* Modal d'aperçu */}
      {isPreviewOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px'
          }}
          onClick={() => setIsPreviewOpen(false)}
        >
          {/* Barre de titre */}
          <div style={{
            width: '95%',
            maxWidth: '1200px',
            backgroundColor: '#333',
            color: 'white',
            padding: '10px 20px',
            borderRadius: '8px 8px 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span style={{ fontWeight: 'bold' }}>
              {previewType === 'local' ? '📄 Document local' : '🌐 Source en ligne'} - {title}
            </span>
            <button
              onClick={() => setIsPreviewOpen(false)}
              style={{
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                padding: '8px 16px',
                cursor: 'pointer',
                fontWeight: 'bold'
              }}
            >
              ✕ Fermer
            </button>
          </div>

          {/* Contenu iframe */}
          <iframe
            src={previewType === 'local' ? localFileUrl : source_url}
            style={{
              width: '95%',
              maxWidth: '1200px',
              height: '85vh',
              border: 'none',
              borderRadius: '0 0 8px 8px',
              backgroundColor: 'white'
            }}
            title={`Aperçu - ${title}`}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
};

export default DocumentViewerButtons;
