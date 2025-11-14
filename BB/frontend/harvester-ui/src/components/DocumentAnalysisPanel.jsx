import React, { useMemo } from 'react';
import './DocumentAnalysisPanel.css';

export default function DocumentAnalysisPanel({ document, onClose, onViewJson, onOpenLocal }) {
  const analysisData = useMemo(() => {
    if (!document) return null;
    const rawAnalysis = document.analysis;
    if (!rawAnalysis) return null;
    if (typeof rawAnalysis === 'string') {
      try {
        return JSON.parse(rawAnalysis);
      } catch (error) {
        return { raw: rawAnalysis };
      }
    }
    if (rawAnalysis.result) {
      return rawAnalysis.result;
    }
    return rawAnalysis;
  }, [document]);

  const embeddingInfo = document?.metadata?.embedding || null;

  const metadataEntries = useMemo(() => {
    if (!document?.metadata) return [];
    return Object.entries(document.metadata).filter(([key, value]) => {
      if (key === 'embedding') return false;
      return value !== null && value !== '' && value !== undefined;
    });
  }, [document]);

  const analyzedAt = analysisData?.analyzed_at || document?.analysis?.analyzed_at || null;
  const modelUsed = analysisData?.model_used || document?.analysis?.model_used || null;

  if (!document) return null;

  const infoRows = [
    ['Titre', document.title || document.filename || '—'],
    ['Collection', document.collection || document.metadata?.collection || '—'],
    ['Numéro', document.metadata?.number || '—'],
    ['Année', document.metadata?.year || '—'],
    ['Type de fichier', document.file_type?.toUpperCase() || '—'],
    ['Taille', document.file_size || '—'],
    ['Date document', document.document_date ? new Date(document.document_date).toLocaleDateString('fr-FR') : '—'],
    ['Ajouté le', document.added_at ? new Date(document.added_at).toLocaleString('fr-FR') : '—'],
    ['Dernière modification', document.last_modified ? new Date(document.last_modified).toLocaleString('fr-FR') : '—'],
  ];

  const summaryText = analysisData?.summary || analysisData?.raw || null;
  const entities = analysisData?.entities || {};

  return (
    <div className="analysis-panel-overlay" onClick={onClose}>
      <div className="analysis-panel" onClick={(e) => e.stopPropagation()}>
        <div className="analysis-header">
          <h2>📄 Détails du document</h2>
          <button className="close-btn" onClick={onClose} title="Fermer">✕</button>
        </div>

        <div className="document-title">
          <h3>{document.title || document.filename}</h3>
          <div className="doc-tags">
            {document.collection && <span className="doc-type">{document.collection}</span>}
            {analysisData?.document_type && <span className="doc-type alt">{analysisData.document_type}</span>}
          </div>
          <div className="action-buttons">
            {document.url && (
              <button className="outline-btn" onClick={() => window.open(document.url, '_blank', 'noopener')}>Ouvrir en ligne</button>
            )}
            {onOpenLocal && document.local_path && (
              <button className="outline-btn" onClick={() => onOpenLocal(document)}>Ouvrir le fichier</button>
            )}
            {onViewJson && (
              <button className="outline-btn" onClick={() => onViewJson(document)}>Voir JSON brut</button>
            )}
          </div>
        </div>

        <div className="analysis-content">
          <section className="analysis-section">
            <h4>📚 Informations générales</h4>
            <dl className="info-grid">
              {infoRows.map(([label, value]) => (
                <div key={label} className="info-row">
                  <dt>{label}</dt>
                  <dd>{value || '—'}</dd>
                </div>
              ))}
              {document.url && (
                <div className="info-row">
                  <dt>URL</dt>
                  <dd>
                    <a href={document.url} target="_blank" rel="noreferrer" className="link">
                      {document.url}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </section>

          {metadataEntries.length > 0 && (
            <section className="analysis-section">
              <h4>🗂️ Métadonnées</h4>
              <dl className="info-grid">
                {metadataEntries.map(([key, value]) => {
                  let displayValue = value;
                  if (Array.isArray(value)) {
                    displayValue = value.join(', ');
                  } else if (typeof value === 'object') {
                    displayValue = JSON.stringify(value, null, 2);
                  }
                  return (
                    <div key={key} className="info-row">
                      <dt>{key}</dt>
                      <dd>{displayValue || '—'}</dd>
                    </div>
                  );
                })}
              </dl>
            </section>
          )}

          {embeddingInfo && (
            <section className="analysis-section">
              <h4>🧠 Embedding</h4>
              <div className="info-grid">
                <div className="info-row">
                  <dt>Modèle</dt>
                  <dd>{embeddingInfo.model || '—'}</dd>
                </div>
                <div className="info-row">
                  <dt>Dimension</dt>
                  <dd>{embeddingInfo.dimension || (embeddingInfo.vector ? embeddingInfo.vector.length : '—')}</dd>
                </div>
                {embeddingInfo.generated_at && (
                  <div className="info-row">
                    <dt>Généré le</dt>
                    <dd>{new Date(embeddingInfo.generated_at).toLocaleString('fr-FR')}</dd>
                  </div>
                )}
              </div>
              <p className="small-text">Le vecteur complet est stocké dans la base pour les recherches sémantiques.</p>
            </section>
          )}

          {summaryText && (
            <section className="analysis-section">
              <h4>📝 Résumé</h4>
              <div className="scroll-block">
                <p className="summary-text">{summaryText}</p>
              </div>
            </section>
          )}
          {!analysisData && (
            <section className="analysis-section">
              <div className="info-empty">Aucune analyse IA enregistrée pour ce document.</div>
            </section>
          )}

          {analysisData?.main_topics && analysisData.main_topics.length > 0 && (
            <section className="analysis-section">
              <h4>🎯 Thèmes principaux</h4>
              <div className="tags">
                {analysisData.main_topics.map((topic, idx) => (
                  <span key={idx} className="tag topic-tag">{topic}</span>
                ))}
              </div>
            </section>
          )}

          {analysisData?.keywords && analysisData.keywords.length > 0 && (
            <section className="analysis-section">
              <h4>🔑 Mots-clés</h4>
              <div className="tags">
                {analysisData.keywords.map((keyword, idx) => (
                  <span key={idx} className="tag keyword-tag">{keyword}</span>
                ))}
              </div>
            </section>
          )}

          {(entities.locations?.length || entities.organizations?.length || entities.persons?.length || entities.dates?.length) && (
            <section className="analysis-section">
              <h4>📍 Entités identifiées</h4>
              <div className="entity-columns">
                {entities.persons && entities.persons.length > 0 && (
                  <div className="entity-block">
                    <strong>Personnes</strong>
                    <div className="tags">
                      {entities.persons.map((value, idx) => (
                        <span key={idx} className="tag person-tag">{value}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.organizations && entities.organizations.length > 0 && (
                  <div className="entity-block">
                    <strong>Organisations</strong>
                    <div className="tags">
                      {entities.organizations.map((value, idx) => (
                        <span key={idx} className="tag org-tag">{value}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.locations && entities.locations.length > 0 && (
                  <div className="entity-block">
                    <strong>Lieux</strong>
                    <div className="tags">
                      {entities.locations.map((value, idx) => (
                        <span key={idx} className="tag location-tag">{value}</span>
                      ))}
                    </div>
                  </div>
                )}
                {entities.dates && entities.dates.length > 0 && (
                  <div className="entity-block">
                    <strong>Dates</strong>
                    <div className="tags">
                      {entities.dates.map((value, idx) => (
                        <span key={idx} className="tag date-tag">{value}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {analysisData?.legal_references && analysisData.legal_references.length > 0 && (
            <section className="analysis-section">
              <h4>⚖️ Références légales</h4>
              <div className="scroll-block">
                <ul className="legal-refs">
                  {analysisData.legal_references.map((ref, idx) => (
                    <li key={idx}>{ref}</li>
                  ))}
                </ul>
              </div>
            </section>
          )}

          {analysisData?.effective_date && (
            <section className="analysis-section">
              <h4>📅 Date d'entrée en vigueur</h4>
              <p className="effective-date">{new Date(analysisData.effective_date).toLocaleDateString('fr-FR')}</p>
            </section>
          )}

          <section className="analysis-section metadata">
            <p className="small-text">
              Métadonnées calculées le {analyzedAt ? new Date(analyzedAt).toLocaleString('fr-FR') : '—'}
              {modelUsed && ` – Modèle : ${modelUsed}`}
            </p>
            {document.full_text_path && (
              <p className="small-text">
                Texte extrait : <code>{document.full_text_path}</code>
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
