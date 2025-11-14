import React from 'react';

const DocumentViewerButtons = ({ document }) => {
  const {
    id,
    file_path,
    source_url,
    download_status
  } = document;

  const JORADP_API_URL = 'http://localhost:5001/api/joradp';
  const localFileUrl = (id && file_path) ? `${JORADP_API_URL}/documents/${id}/view` : null;

  const handleViewLocal = () => {
    console.log('=== handleViewLocal ===');
    console.log('id:', id);
    console.log('file_path:', file_path);
    console.log('download_status:', download_status);
    console.log('localFileUrl:', localFileUrl);
    console.log('======================');

    if (!file_path || download_status !== 'completed') {
      alert('❌ Le document n\'a pas encore été téléchargé');
      return;
    }
    window.open(localFileUrl, '_blank');
  };

  const handleViewOnline = () => {
    if (!source_url) {
      alert('❌ URL source non disponible');
      return;
    }
    window.open(source_url, '_blank');
  };

  return (
    <>
      <button
        onClick={handleViewLocal}
        disabled={!file_path || download_status !== 'completed'}
        style={{
          background: 'none',
          border: 'none',
          cursor: (file_path && download_status === 'completed') ? 'pointer' : 'not-allowed',
          fontSize: '20px',
          padding: '4px',
          opacity: (file_path && download_status === 'completed') ? 1 : 0.3
        }}
        title={file_path ? "Voir fichier local" : "Document non téléchargé"}
      >
        👁️
      </button>

      <button
        onClick={handleViewOnline}
        disabled={!source_url}
        style={{
          background: 'none',
          border: 'none',
          cursor: source_url ? 'pointer' : 'not-allowed',
          fontSize: '20px',
          padding: '4px',
          opacity: source_url ? 1 : 0.3
        }}
        title="Voir en ligne"
      >
        🌐
      </button>
    </>
  );
};

export default DocumentViewerButtons;