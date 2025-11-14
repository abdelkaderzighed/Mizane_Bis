import React, { useState, useEffect } from 'react';
import { Download, Eye, Globe, Database, Trash2, Search, ChevronDown, ChevronUp } from 'lucide-react';
import ConfirmationModal from './ConfirmationModal';

const COURSUPREME_API_URL = 'http://localhost:5001/api/coursupreme';

const DecisionStatusManager = () => {
  const [decisions, setDecisions] = useState([]);
  const [filteredDecisions, setFilteredDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDecisions, setSelectedDecisions] = useState(new Set());
  const [sortField, setSortField] = useState('decision_date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState({
    keywordsInclusive: '',
    keywordsExclusive: '',
    decisionNumber: '',
    dateFrom: '',
    dateTo: ''
  });

  // Modal states
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: 'warning',
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    showCancel: true,
    loading: false
  });
  const closeModal = () => setConfirmModal(prev => ({ ...prev, isOpen: false }));
  const [processing, setProcessing] = useState(false);

  // Decision detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [selectedLang, setSelectedLang] = useState('ar');

  // Metadata modal
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [metadataLang, setMetadataLang] = useState('ar');

  useEffect(() => {
    fetchDecisions();
  }, []);

  useEffect(() => {
    applyFiltersAndSort();
  }, [decisions, sortField, sortOrder, searchTerm, filters]);

  const fetchDecisions = async () => {
    try {
      const response = await fetch(`${COURSUPREME_API_URL}/decisions/status`);
      const data = await response.json();
      setDecisions(data.decisions);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = [...decisions];

    // Recherche simple
    if (searchTerm) {
      filtered = filtered.filter(d =>
        d.decision_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        d.decision_date.includes(searchTerm)
      );
    }

    // Filtres avancés
    if (filters.decisionNumber) {
      filtered = filtered.filter(d =>
        d.decision_number.toLowerCase().includes(filters.decisionNumber.toLowerCase())
      );
    }

    if (filters.dateFrom) {
      filtered = filtered.filter(d => d.decision_date >= filters.dateFrom);
    }

    if (filters.dateTo) {
      filtered = filtered.filter(d => d.decision_date <= filters.dateTo);
    }

    // Tri
    filtered.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'decision_date') {
        aVal = new Date(aVal || '1900-01-01');
        bVal = new Date(bVal || '1900-01-01');
      } else {
        aVal = aVal || '';
        bVal = bVal || '';
      }

      if (sortOrder === 'asc') {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredDecisions(filtered);
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  const toggleSelectAll = () => {
    if (selectedDecisions.size === filteredDecisions.length) {
      setSelectedDecisions(new Set());
    } else {
      setSelectedDecisions(new Set(filteredDecisions.map(d => d.id)));
    }
  };

  const toggleSelectDecision = (id) => {
    const newSelected = new Set(selectedDecisions);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedDecisions(newSelected);
  };

  // Indicateur de statut coloré
  const StatusIndicator = ({ status }) => {
    const colors = {
      complete: 'bg-green-500',
      partial: 'bg-orange-500',
      missing: 'bg-red-500'
    };

    return (
      <div className={`w-3 h-3 rounded-full ${colors[status]}`} title={status} />
    );
  };

  const formatBatchMessage = (data, successLabel, total) => {
    if (data?.message && data.message.trim()) return data.message;
    const success = data?.success_count ?? data?.results?.success?.length ?? 0;
    const failed = data?.failed_count ?? data?.results?.failed?.length ?? 0;
    const skipped = data?.skipped_count ?? data?.results?.skipped?.length ?? 0;
    const plural = (value, label) => `${value} ${label}${value > 1 ? 's' : ''}`;
    return [
      `Total demandé : ${total}`,
      `✅ ${plural(success, successLabel)}`,
      `⚠️ ${plural(skipped, 'décision ignorée')}`,
      `❌ ${plural(failed, 'échec')}`
    ].join('\n');
  };

  const buildErrorMessage = (data, fallback) => {
    if (!data) return fallback;
    const details = [data.message || data.error || fallback];
    if (data.missing_download?.length) {
      details.push(`Téléchargement requis : ${data.missing_download.slice(0, 5).join(', ')}${data.missing_download.length > 5 ? '…' : ''}`);
    }
    if (data.missing_translation?.length) {
      details.push(`Traduction requise : ${data.missing_translation.slice(0, 5).join(', ')}${data.missing_translation.length > 5 ? '…' : ''}`);
    }
    return details.filter(Boolean).join('\n');
  };

  const showSelectionRequired = () => {
    setConfirmModal({
      isOpen: true,
      type: 'info',
      title: 'Sélection requise',
      message: 'Sélectionnez au moins une décision pour lancer cette action.',
      confirmText: 'Fermer',
      cancelText: 'Fermer',
      showCancel: false,
      loading: false,
      onConfirm: closeModal
    });
  };

  const runBatchAction = async ({
    endpoint,
    successTitle,
    successLabel,
    totalCount,
    progressTitle,
    force = false
  }) => {
    const ids = Array.from(selectedDecisions);
    setProcessing(true);
    setConfirmModal({
      isOpen: true,
      type: 'info',
      title: progressTitle || successTitle,
      message: `Traitement en cours...\n0/${totalCount} décision(s)`,
      confirmText: 'En cours...',
      cancelText: 'Fermer',
      showCancel: false,
      loading: true,
      onConfirm: () => {}
    });

    try {
      const response = await fetch(`${COURSUPREME_API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ decision_ids: ids, force })
      });
      const data = await response.json();

      if (data.needs_confirmation && !force) {
        setProcessing(false);
        setConfirmModal({
          isOpen: true,
          type: 'warning',
          title: 'Confirmation requise',
          message: data.message || 'Certaines décisions ont déjà été traitées. Voulez-vous relancer le traitement ?',
          confirmText: 'Relancer',
          cancelText: 'Annuler',
          showCancel: true,
          loading: false,
          onConfirm: () => runBatchAction({
            endpoint,
            successTitle,
            successLabel,
            totalCount,
            progressTitle,
            force: true
          })
        });
        return;
      }

      if (!response.ok || data.error) {
        setProcessing(false);
        setConfirmModal({
          isOpen: true,
          type: 'danger',
          title: 'Erreur traitement',
          message: buildErrorMessage(data, 'Une erreur est survenue pendant le traitement.'),
          confirmText: 'Fermer',
          cancelText: 'Fermer',
          showCancel: false,
          loading: false,
          onConfirm: closeModal
        });
        return;
      }

      setProcessing(false);
      setConfirmModal({
        isOpen: true,
        type: 'success',
        title: successTitle,
        message: formatBatchMessage(data, successLabel, totalCount),
        confirmText: 'Fermer',
        cancelText: 'Fermer',
        showCancel: false,
        loading: false,
        onConfirm: () => {
          closeModal();
        }
      });
      fetchDecisions();
    } catch (error) {
      setProcessing(false);
      setConfirmModal({
        isOpen: true,
        type: 'danger',
        title: 'Erreur réseau',
        message: error.message || 'Impossible de contacter le serveur.',
        confirmText: 'Fermer',
        cancelText: 'Fermer',
        showCancel: false,
        loading: false,
        onConfirm: closeModal
      });
    }
  };

  // Actions sur les décisions sélectionnées
  const handleBatchDownload = () => {
    const count = selectedDecisions.size;
    if (count === 0) {
      showSelectionRequired();
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'info',
      title: 'Télécharger les décisions',
      message: `Voulez-vous télécharger ${count} décision(s) sélectionnée(s) ?`,
      confirmText: 'Lancer',
      cancelText: 'Annuler',
      showCancel: true,
      loading: false,
      onConfirm: () => runBatchAction({
        endpoint: '/batch/download',
        successTitle: 'Téléchargement terminé',
        successLabel: 'décision téléchargée',
        totalCount: count,
        progressTitle: `Téléchargement (${count})`
      })
    });
  };

  const handleBatchDelete = () => {
    const count = selectedDecisions.size;
    setConfirmModal({
      isOpen: true,
      type: 'danger',
      title: 'Supprimer les décisions',
      message: `⚠️ ATTENTION ⚠️\n\nVoulez-vous vraiment supprimer ${count} décision(s) ?\n\nCette action est irréversible et supprimera :\n- Les fichiers locaux AR et FR\n- Toutes les analyses IA\n- Les embeddings\n- Les entrées en base de données`,
      confirmText: 'Supprimer',
      cancelText: 'Annuler',
      showCancel: true,
      loading: false,
      onConfirm: async () => {
        setProcessing(true);
        try {
          for (const id of selectedDecisions) {
            await fetch(`${COURSUPREME_API_URL}/decisions/${id}`, {
              method: 'DELETE'
            });
          }
          alert(`${count} décision(s) supprimée(s)`);
          setSelectedDecisions(new Set());
          fetchDecisions();
        } catch (error) {
          alert('Erreur: ' + error.message);
        }
        setProcessing(false);
        closeModal();
      }
    });
  };

  const handleBatchTranslate = () => {
    const count = selectedDecisions.size;
    if (count === 0) {
      showSelectionRequired();
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'info',
      title: 'Traduire les décisions',
      message: `Voulez-vous traduire ${count} décision(s) sélectionnée(s) ?\n\nCette opération peut prendre plusieurs minutes.`,
      confirmText: 'Lancer',
      cancelText: 'Annuler',
      showCancel: true,
      loading: false,
      onConfirm: () => runBatchAction({
        endpoint: '/batch/translate',
        successTitle: 'Traduction terminée',
        successLabel: 'décision traduite',
        totalCount: count,
        progressTitle: `Traduction (${count})`
      })
    });
  };

  const handleBatchAnalyze = () => {
    const count = selectedDecisions.size;
    if (count === 0) {
      showSelectionRequired();
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'info',
      title: 'Analyser les décisions',
      message: `Voulez-vous analyser ${count} décision(s) sélectionnée(s) avec l'IA ?\n\nCette opération peut prendre plusieurs minutes.`,
      confirmText: 'Lancer',
      cancelText: 'Annuler',
      showCancel: true,
      loading: false,
      onConfirm: () => runBatchAction({
        endpoint: '/batch/analyze',
        successTitle: 'Analyse IA terminée',
        successLabel: 'décision analysée',
        totalCount: count,
        progressTitle: `Analyse IA (${count})`
      })
    });
  };

  const handleBatchEmbed = () => {
    const count = selectedDecisions.size;
    if (count === 0) {
      showSelectionRequired();
      return;
    }
    setConfirmModal({
      isOpen: true,
      type: 'info',
      title: 'Générer les embeddings',
      message: `Voulez-vous générer les embeddings pour ${count} décision(s) sélectionnée(s) ?\n\nCette opération peut prendre plusieurs minutes.`,
      confirmText: 'Lancer',
      cancelText: 'Annuler',
      showCancel: true,
      loading: false,
      onConfirm: () => runBatchAction({
        endpoint: '/batch/embed',
        successTitle: 'Embeddings terminés',
        successLabel: 'embedding généré',
        totalCount: count,
        progressTitle: `Embeddings (${count})`
      })
    });
  };

  const handleViewDecision = async (id) => {
    try {
      const response = await fetch(`${COURSUPREME_API_URL}/decisions/${id}`);
      const data = await response.json();
      setSelectedDecision(data);
      if (data?.content_ar) {
        setSelectedLang('ar');
      } else if (data?.content_fr) {
        setSelectedLang('fr');
      } else {
        setSelectedLang('ar');
      }
      setDetailModalOpen(true);
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleViewMetadata = async (id) => {
    try {
      const response = await fetch(`${COURSUPREME_API_URL}/metadata/${id}`);
      const data = await response.json();
      setSelectedMetadata(data);
      if (data?.title_ar || data?.summary_ar) {
        setMetadataLang('ar');
      } else if (data?.title_fr || data?.summary_fr) {
        setMetadataLang('fr');
      } else {
        setMetadataLang('ar');
      }
      setMetadataModalOpen(true);
    } catch (error) {
      alert('Erreur: ' + error.message);
    }
  };

  const handleViewRemote = (url) => {
    window.open(url, '_blank');
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64">Chargement...</div>;
  }

  return (
    <div className="p-6">
      {/* Header avec recherche */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Gestion des Décisions</h2>

        {/* Barre de recherche */}
        <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              placeholder="Recherche rapide..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="flex-1 border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={() => applyFiltersAndSort()}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Search className="w-5 h-5" />
              Rechercher
            </button>
            {(searchTerm || filters.keywordsInclusive || filters.keywordsExclusive || filters.decisionNumber || filters.dateFrom || filters.dateTo) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilters({ keywordsInclusive: '', keywordsExclusive: '', decisionNumber: '', dateFrom: '', dateTo: '' });
                }}
                className="px-4 py-2 bg-gray-200 rounded-lg"
              >
                Effacer
              </button>
            )}
          </div>

          <button
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            {showAdvancedSearch ? '▼ Masquer recherche avancée' : '▶ Recherche avancée'}
          </button>

          {/* Recherche avancée */}
          {showAdvancedSearch && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés inclusifs (ET)</label>
                  <input
                    type="text"
                    placeholder="ex: مرور حادث"
                    value={filters.keywordsInclusive}
                    onChange={(e) => setFilters({ ...filters, keywordsInclusive: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés exclusifs (NON)</label>
                  <input
                    type="text"
                    placeholder="ex: استئناف"
                    value={filters.keywordsExclusive}
                    onChange={(e) => setFilters({ ...filters, keywordsExclusive: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de décision</label>
                  <input
                    type="text"
                    placeholder="ex: 00001"
                    value={filters.decisionNumber}
                    onChange={(e) => setFilters({ ...filters, decisionNumber: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg text-sm"
                  />
                </div>
              </div>

              <button
                onClick={() => applyFiltersAndSort()}
                className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                Rechercher avec filtres
              </button>
            </div>
          )}
        </div>

        {/* Actions groupées */}
        {selectedDecisions.size > 0 && (
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <span className="text-gray-700 font-medium">
                {selectedDecisions.size} décision(s) sélectionnée(s)
              </span>
              <div className="flex gap-2">
                <button
                  onClick={handleBatchDownload}
                  disabled={processing}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-all hover:scale-105 flex items-center gap-2 font-medium text-sm"
                >
                  <span>📥</span>
                  <span>Télécharger</span>
                </button>
                <button
                  onClick={handleBatchTranslate}
                  disabled={processing}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all hover:scale-105 flex items-center gap-2 font-medium text-sm"
                >
                  <span>🌐</span>
                  <span>Traduire</span>
                </button>
                <button
                  onClick={handleBatchAnalyze}
                  disabled={processing}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-all hover:scale-105 flex items-center gap-2 font-medium text-sm"
                >
                  <span>🤖</span>
                  <span>Analyser</span>
                </button>
                <button
                  onClick={handleBatchEmbed}
                  disabled={processing}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-all hover:scale-105 flex items-center gap-2 font-medium text-sm"
                >
                  <span>🧬</span>
                  <span>Embeddings</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table des décisions */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="p-3 text-left">
                <input
                  type="checkbox"
                  checked={selectedDecisions.size === filteredDecisions.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4"
                />
              </th>
              <th className="p-3 text-left">
                <button
                  onClick={() => handleSort('decision_number')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900"
                >
                  Numéro
                  {sortField === 'decision_number' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="p-3 text-left">
                <button
                  onClick={() => handleSort('decision_date')}
                  className="flex items-center gap-1 font-semibold text-gray-700 hover:text-gray-900"
                >
                  Date
                  {sortField === 'decision_date' && (
                    sortOrder === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />
                  )}
                </button>
              </th>
              <th className="p-3 text-center font-semibold text-gray-700">Téléchargé</th>
              <th className="p-3 text-center font-semibold text-gray-700">Traduit</th>
              <th className="p-3 text-center font-semibold text-gray-700">Analysé</th>
              <th className="p-3 text-center font-semibold text-gray-700">Embeddings</th>
              <th className="p-3 text-center font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDecisions.map((decision) => (
              <React.Fragment key={decision.id}>
                <tr className="border-b hover:bg-gray-50">
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={selectedDecisions.has(decision.id)}
                      onChange={() => toggleSelectDecision(decision.id)}
                      className="w-4 h-4"
                    />
                  </td>
                  <td className="p-3 font-medium text-gray-800">{decision.decision_number}</td>
                  <td className="p-3 text-gray-600">{decision.decision_date}</td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusIndicator status={decision.status.downloaded} />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusIndicator status={decision.status.translated} />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusIndicator status={decision.status.analyzed} />
                    </div>
                  </td>
                  <td className="p-3 text-center">
                    <div className="flex justify-center">
                      <StatusIndicator status={decision.status.embeddings} />
                    </div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-1 justify-center">
                      <button
                        onClick={() => handleViewDecision(decision.id)}
                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                        title="Voir le contenu"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewRemote(decision.url)}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded"
                        title="Voir la version distante"
                      >
                        <Globe className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleViewMetadata(decision.id)}
                        className="p-1.5 text-amber-600 hover:bg-amber-50 rounded"
                        title="Voir les métadonnées IA"
                      >
                        <Database className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setSelectedDecisions(new Set([decision.id]));
                          handleBatchDelete();
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
                {/* Rattachements (chambres et thèmes) */}
                <tr className="bg-gray-50 border-b">
                  <td colSpan="8" className="px-3 py-2">
                    <div className="flex gap-4 text-xs text-gray-600">
                      {decision.chambers.length > 0 && (
                        <div className="flex gap-1 items-center">
                          <span className="font-semibold">Chambres:</span>
                          {decision.chambers.map((c, i) => (
                            <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded">
                              {c.name_fr}
                            </span>
                          ))}
                        </div>
                      )}
                      {decision.themes.length > 0 && (
                        <div className="flex gap-1 items-center">
                          <span className="font-semibold">Thèmes:</span>
                          {decision.themes.map((t, i) => (
                            <span key={i} className="px-2 py-1 bg-green-100 text-green-700 rounded">
                              {t.name_fr}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={closeModal}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        confirmText={confirmModal.confirmText}
        cancelText={confirmModal.cancelText}
        showCancel={confirmModal.showCancel}
        loading={confirmModal.loading}
      />
      
      {detailModalOpen && selectedDecision && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                  <p className="text-gray-600 text-sm">{selectedDecision.decision_date}</p>
                </div>
                <div className="flex gap-2 bg-white rounded-lg p-1">
                  <button
                    onClick={() => setSelectedLang('ar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${selectedLang === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                  >
                    العربية
                  </button>
                  <button
                    onClick={() => setSelectedLang('fr')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${selectedLang === 'fr' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}
                  >
                    Français
                  </button>
                </div>
                <button onClick={() => setDetailModalOpen(false)} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              {selectedLang === 'ar' && selectedDecision.content_ar && (
                <div className="bg-white rounded-lg p-6" dir="rtl">
                  <pre className="whitespace-pre-wrap leading-relaxed font-['Amiri','Scheherazade',serif] text-lg">
                    {selectedDecision.content_ar}
                  </pre>
                </div>
              )}
              {selectedLang === 'fr' && selectedDecision.content_fr && (
                <div className="bg-white rounded-lg p-6">
                  <pre className="whitespace-pre-wrap leading-relaxed">{selectedDecision.content_fr}</pre>
                </div>
              )}
              {!selectedDecision.content_ar && !selectedDecision.content_fr && (
                <div className="text-center py-16">
                  <p className="text-gray-500">Contenu indisponible pour cette décision.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {metadataModalOpen && selectedMetadata && (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="bg-gradient-to-r from-orange-50 to-amber-50 border-b p-6">
              <div className="flex justify-between items-start gap-4">
                <div>
                  <h2 className="text-2xl font-bold">🤖 Métadonnées IA</h2>
                  <p className="text-gray-600 text-sm">
                    Décision {selectedMetadata.decision_number} • {selectedMetadata.decision_date}
                  </p>
                </div>
                <div className="flex gap-2 bg-white rounded-lg p-1">
                  <button
                    onClick={() => setMetadataLang('ar')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${metadataLang === 'ar' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}
                  >
                    العربية
                  </button>
                  <button
                    onClick={() => setMetadataLang('fr')}
                    className={`px-4 py-2 rounded-md text-sm font-medium ${metadataLang === 'fr' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}
                  >
                    Français
                  </button>
                </div>
                <button onClick={() => setMetadataModalOpen(false)} className="text-2xl text-gray-500 hover:text-gray-700">×</button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
              {metadataLang === 'ar' ? (
                <MetadataContent
                  title={selectedMetadata.title_ar}
                  summary={selectedMetadata.summary_ar}
                  entities={selectedMetadata.entities_ar}
                  labels={{
                    title: 'العنوان',
                    summary: 'الملخص',
                    entities: 'الكيانات المسماة',
                    groups: {
                      person: '👤 أشخاص',
                      institution: '🏛️ مؤسسات',
                      location: '📍 أماكن',
                      legal: '⚖️ قانونية',
                      other: '📋 أخرى'
                    },
                    dir: 'rtl'
                  }}
                />
              ) : (
                <MetadataContent
                  title={selectedMetadata.title_fr}
                  summary={selectedMetadata.summary_fr}
                  entities={selectedMetadata.entities_fr}
                  labels={{
                    title: 'Titre',
                    summary: 'Résumé',
                    entities: 'Entités nommées',
                    groups: {
                      person: '👤 Personnes',
                      institution: '🏛️ Institutions',
                      location: '📍 Lieux',
                      legal: '⚖️ Juridique',
                      other: '📋 Autres'
                    },
                    dir: 'ltr'
                  }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MetadataContent = ({ title, summary, entities, labels }) => {
  if (!title && !summary && !entities) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🤖</div>
        <p className="text-gray-500">Pas encore analysée</p>
      </div>
    );
  }

  let parsedEntities = [];
  if (entities) {
    try {
      parsedEntities = Array.isArray(entities) ? entities : JSON.parse(entities);
    } catch (e) {
      parsedEntities = [];
    }
  }

  const grouped = parsedEntities.reduce((acc, entity) => {
    const type = entity?.type || 'other';
    if (!acc[type]) acc[type] = [];
    acc[type].push(entity?.name || entity);
    return acc;
  }, {});

  return (
    <div className={`space-y-6 ${labels.dir === 'rtl' ? 'text-right' : ''}`} dir={labels.dir}>
      {title && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500">
          <h3 className="font-bold text-orange-700 mb-2">{labels.title}</h3>
          <p className="text-gray-800">{title}</p>
        </div>
      )}
      {summary && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
          <h3 className="font-bold text-blue-700 mb-2">{labels.summary}</h3>
          <p className="text-gray-800 whitespace-pre-wrap">{summary}</p>
        </div>
      )}
      {parsedEntities.length > 0 && (
        <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
          <h3 className="font-bold text-purple-700 mb-3">{labels.entities}</h3>
          {Object.entries(grouped).map(([type, items]) => (
            <div key={type} className="mb-3 last:mb-0">
              <p className="text-sm font-semibold text-gray-600 mb-1">{labels.groups[type] || labels.groups.other}</p>
              <div className="flex flex-wrap gap-2">
                {items.map((name, idx) => (
                  <span key={`${type}-${idx}`} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DecisionStatusManager;
