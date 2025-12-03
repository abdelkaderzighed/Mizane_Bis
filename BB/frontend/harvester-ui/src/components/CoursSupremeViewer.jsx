import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, FolderOpen, Tag, Eye, Globe, Download, Database, Trash2, Search, RefreshCw } from 'lucide-react';
import { COURSUPREME_API_URL } from '../config';
import DecisionStatusManager from './DecisionStatusManager';
import ConfirmationModal from './ConfirmationModal';

const CoursSupremeViewer = ({ embedded = false }) => {
  const [activeTab, setActiveTab] = useState('hierarchy');
  const [chambers, setChambers] = useState([]);
  const [expandedChamber, setExpandedChamber] = useState(null);
  const [expandedTheme, setExpandedTheme] = useState(null);
  const [themes, setThemes] = useState({});
  const [decisions, setDecisions] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedDecision, setSelectedDecision] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedLang, setSelectedLang] = useState('ar');
  const [currentDecisionList, setCurrentDecisionList] = useState([]);
  const [currentDecisionIndex, setCurrentDecisionIndex] = useState(0);
  const [selectedDecisions, setSelectedDecisions] = useState(new Set());
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  const [filters, setFilters] = useState({
    keywordsInclusive: '',
    keywordsExclusive: '',
    decisionNumber: '',
    dateFrom: '',
    dateTo: ''
  });
  const [metadataModalOpen, setMetadataModalOpen] = useState(false);
  const [selectedMetadata, setSelectedMetadata] = useState(null);
  const [metadataLang, setMetadataLang] = useState('ar');
  const [selectAllLoading, setSelectAllLoading] = useState(false);
  const [allDecisionIds, setAllDecisionIds] = useState(null);
  const [incrementalHarvestLoading, setIncrementalHarvestLoading] = useState(false);
  const [incrementalHarvestMessage, setIncrementalHarvestMessage] = useState('');
  const [batchModal, setBatchModal] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'Confirmer',
    cancelText: 'Annuler',
    showCancel: true,
    loading: false,
    onConfirm: () => {}
  });
  const closeBatchModal = () => setBatchModal(prev => ({ ...prev, isOpen: false }));
  const safeChambers = Array.isArray(chambers) ? chambers : [];

  const api = (path) => `${COURSUPREME_API_URL}${path}`;
  const parseEntities = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw;
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    if (typeof raw === 'object') {
      if (Array.isArray(raw.entities)) return raw.entities;
      return [raw];
    }
    return [];
  };

  useEffect(() => {
    fetchChambers();
  }, []);

  const toggleDecisionSelection = (decisionId, event) => {
    event.stopPropagation();
    const newSelected = new Set(selectedDecisions);
    if (newSelected.has(decisionId)) {
      newSelected.delete(decisionId);
    } else {
      newSelected.add(decisionId);
    }
    setSelectedDecisions(newSelected);
    setSelectAllLoading(false);
  };

  const ensureThemesLoaded = async (chamberId) => {
    if (themes[chamberId]) {
      return themes[chamberId];
    }
    const loaded = await fetchThemes(chamberId);
    return loaded || [];
  };

  const ensureDecisionsLoaded = async (themeId) => {
    if (decisions[themeId]) {
      return decisions[themeId];
    }
    const loaded = await fetchDecisions(themeId);
    return loaded || [];
  };

  const toggleThemeSelection = async (themeId, event) => {
    event.stopPropagation();
    const themeDecisions = await ensureDecisionsLoaded(themeId);
    const newSelected = new Set(selectedDecisions);

    // Vérifier si AU MOINS UNE décision du thème est sélectionnée
    const someSelected = themeDecisions.some(d => newSelected.has(d.id));

    if (someSelected) {
      // Si au moins une est sélectionnée, tout désélectionner
      themeDecisions.forEach(d => newSelected.delete(d.id));
    } else {
      // Sinon, tout sélectionner
      themeDecisions.forEach(d => newSelected.add(d.id));
    }
    setSelectedDecisions(newSelected);
    setSelectAllLoading(false);
  };

  const toggleChamberSelection = async (chamberId, event) => {
    event.stopPropagation();
    const chamberThemes = await ensureThemesLoaded(chamberId);
    // Charger les décisions manquantes avant la sélection en cascade
    for (const theme of chamberThemes) {
      await ensureDecisionsLoaded(theme.id);
    }
    const newSelected = new Set(selectedDecisions);
    const allDecisions = chamberThemes.flatMap(theme => decisions[theme.id] || []);

    // Vérifier si AU MOINS UNE décision de la chambre est sélectionnée
    const someSelected = allDecisions.some(d => newSelected.has(d.id));

    if (someSelected) {
      // Si au moins une est sélectionnée, tout désélectionner
      allDecisions.forEach(d => newSelected.delete(d.id));
    } else {
      // Sinon, tout sélectionner
      allDecisions.forEach(d => newSelected.add(d.id));
    }
    setSelectedDecisions(newSelected);
    setSelectAllLoading(false);
  };

  const formatBatchResult = (data, total, successLabel, fallback = 'Traitement terminé') => {
    if (data?.message) return data.message;
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

  const formatDependencyError = (data, fallback = 'Une erreur est survenue.') => {
    const details = [data?.message || data?.error || fallback];
    if (data?.missing_download?.length) {
      details.push(`Télécharger d'abord: ${data.missing_download.slice(0, 5).join(', ')}${data.missing_download.length > 5 ? '…' : ''}`);
    }
    if (data?.missing_translation?.length) {
      details.push(`Traduire d'abord: ${data.missing_translation.slice(0, 5).join(', ')}${data.missing_translation.length > 5 ? '…' : ''}`);
    }
    return details.filter(Boolean).join('\n');
  };

  const showSelectionModal = () => {
    setBatchModal({
      isOpen: true,
      type: 'info',
      title: 'Sélection requise',
      message: 'Sélectionnez au moins une décision pour lancer cette action.',
      confirmText: 'Fermer',
      cancelText: 'Fermer',
      showCancel: false,
      loading: false,
      onConfirm: closeBatchModal
    });
  };

  const batchActionConfigs = {
    download: {
      confirmTitle: 'Télécharger les décisions',
      confirmMessage: (count) => `Voulez-vous télécharger ${count} décision(s) sélectionnée(s) ?`,
      progressTitle: (count) => `Téléchargement (${count})`,
      successTitle: 'Téléchargement terminé',
      successLabel: 'décision téléchargée'
    },
    translate: {
      confirmTitle: 'Traduire les décisions',
      confirmMessage: (count) => `Voulez-vous traduire ${count} décision(s) sélectionnée(s) ?\nCette opération peut prendre plusieurs minutes.`,
      progressTitle: (count) => `Traduction (${count})`,
      successTitle: 'Traduction terminée',
      successLabel: 'décision traduite'
    },
    analyze: {
      confirmTitle: 'Analyser les décisions',
      confirmMessage: (count) => `Voulez-vous analyser ${count} décision(s) sélectionnée(s) avec l'IA ?`,
      progressTitle: (count) => `Analyse IA (${count})`,
      successTitle: 'Analyse IA terminée',
      successLabel: 'décision analysée'
    },
    embed: {
      confirmTitle: 'Générer les embeddings',
      confirmMessage: (count) => `Voulez-vous générer les embeddings pour ${count} décision(s) sélectionnée(s) ?`,
      progressTitle: (count) => `Embeddings (${count})`,
      successTitle: 'Embeddings terminés',
      successLabel: 'embedding généré'
    }
  };

  const runBatchAction = async (action, config, ids, force = false) => {
    setBatchProcessing(true);
    setBatchModal({
      isOpen: true,
      type: 'info',
      title: config.progressTitle(ids.length),
      message: `Traitement en cours...\n0/${ids.length} décision(s)`,
      confirmText: 'En cours...',
      cancelText: 'Fermer',
      showCancel: false,
      loading: true,
      onConfirm: () => {}
    });

    try {
      const response = await fetch(api(`/batch/${action}`), {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({decision_ids: ids, force})
      });
      const data = await response.json();

      if (data.needs_confirmation && !force) {
        setBatchProcessing(false);
        setBatchModal({
          isOpen: true,
          type: 'warning',
          title: 'Confirmation requise',
          message: data.message || 'Certaines décisions ont déjà été traitées. Voulez-vous relancer le traitement ?',
          confirmText: 'Relancer',
          cancelText: 'Annuler',
          showCancel: true,
          loading: false,
          onConfirm: () => runBatchAction(action, config, ids, true)
        });
        return;
      }

      if (!response.ok || data.error) {
        setBatchProcessing(false);
        setBatchModal({
          isOpen: true,
          type: 'danger',
          title: 'Erreur traitement',
          message: formatDependencyError(data),
          confirmText: 'Fermer',
          cancelText: 'Fermer',
          showCancel: false,
          loading: false,
          onConfirm: closeBatchModal
        });
        return;
      }

      setBatchProcessing(false);
      setBatchModal({
        isOpen: true,
        type: 'success',
        title: config.successTitle,
        message: formatBatchResult(data, ids.length, config.successLabel),
        confirmText: 'Fermer',
        cancelText: 'Fermer',
        showCancel: false,
        loading: false,
        onConfirm: () => {
          closeBatchModal();
        }
      });
    } catch (error) {
      setBatchProcessing(false);
      setBatchModal({
        isOpen: true,
        type: 'danger',
        title: 'Erreur réseau',
        message: error.message || 'Impossible de contacter le serveur.',
        confirmText: 'Fermer',
        cancelText: 'Fermer',
        showCancel: false,
        loading: false,
        onConfirm: closeBatchModal
      });
    }
  };

  const handleBatchAction = (action) => {
    const config = batchActionConfigs[action];
    if (!config) return;
    const ids = Array.from(selectedDecisions);
    if (ids.length === 0) {
      showSelectionModal();
      return;
    }
    setBatchModal({
      isOpen: true,
      type: 'info',
      title: config.confirmTitle,
      message: config.confirmMessage(ids.length),
      confirmText: 'Lancer',
      cancelText: 'Annuler',
      showCancel: true,
      loading: false,
      onConfirm: () => runBatchAction(action, config, ids)
    });
  };

  // Vérifier si un thème a au moins une décision sélectionnée
  const getThemeDecisionIds = (themeId) => (decisions[themeId] || []).map((d) => d.id);
  const getChamberDecisionIds = (chamberId) => {
    const chamberThemes = themes[chamberId] || [];
    const ids = new Set();
    chamberThemes.forEach((theme) => {
      getThemeDecisionIds(theme.id).forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  };

  const getAllDecisionIds = () => {
    if (allDecisionIds && allDecisionIds.length > 0) return allDecisionIds;
    const ids = new Set();
    safeChambers.forEach((chamber) => {
      getChamberDecisionIds(chamber.id).forEach((id) => ids.add(id));
    });
    return Array.from(ids);
  };

  const isThemeSelected = (themeId) => {
    const ids = getThemeDecisionIds(themeId);
    if (ids.length === 0) return false;
    return ids.every((id) => selectedDecisions.has(id));
  };

  const isChamberSelected = (chamberId) => {
    const ids = getChamberDecisionIds(chamberId);
    if (ids.length === 0) return false;
    return ids.every((id) => selectedDecisions.has(id));
  };

  const areAllDecisionsSelected = () => {
    const ids = getAllDecisionIds();
    if (ids.length === 0) return false;
    return ids.every((id) => selectedDecisions.has(id));
  };

  // Sélectionner ou désélectionner toutes les décisions
  const toggleSelectAll = async () => {
    if (areAllDecisionsSelected()) {
      // Tout désélectionner
      setSelectedDecisions(new Set());
      setSelectAllLoading(false);
    } else {
      // Charger toutes les données et sélectionner
      setBatchProcessing(true);
      setSelectAllLoading(true);
      try {
        // Charger toutes les décisions (une seule fois)
        if (!allDecisionIds || allDecisionIds.length === 0) {
          const ids = [];
          for (const chamber of safeChambers) {
            const chamberThemes = await ensureThemesLoaded(chamber.id);
            if (!chamberThemes || chamberThemes.length === 0) continue;
            const decisionsLists = await Promise.all(
              chamberThemes.map((theme) => ensureDecisionsLoaded(theme.id))
            );
            decisionsLists.forEach((list) => {
              ids.push(...(list || []).map((d) => d.id));
            });
          }
          const uniqueIds = Array.from(new Set(ids));
          setAllDecisionIds(uniqueIds);
          setSelectedDecisions(new Set(uniqueIds));
        } else {
          setSelectedDecisions(new Set(allDecisionIds));
        }
      } catch (error) {
        console.error('Erreur lors de la sélection:', error);
      }
      setBatchProcessing(false);
      setSelectAllLoading(false);
    }
  };

  const fetchChambers = async () => {
    try {
      const response = await fetch(api('/chambers'));
      const data = await response.json();
      setChambers(Array.isArray(data?.chambers) ? data.chambers : []);
      setLoading(false);
    } catch (error) {
      console.error('Erreur:', error);
      setChambers([]);
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
      const response = await fetch(api(`/chambers/${chamberId}/themes`));
      const data = await response.json();
      const chamberThemes = Array.isArray(data?.themes) ? data.themes : [];
      setThemes(prev => ({ ...prev, [chamberId]: chamberThemes }));
      return chamberThemes;
    } catch (error) {
      console.error('Erreur:', error);
      setThemes(prev => ({ ...prev, [chamberId]: [] }));
      return [];
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
      const response = await fetch(api(`/themes/${themeId}/decisions`));
      const data = await response.json();
      const themeDecisions = Array.isArray(data?.decisions) ? data.decisions : [];
      setDecisions(prev => ({ ...prev, [themeId]: themeDecisions }));
      return themeDecisions;
    } catch (error) {
      console.error('Erreur:', error);
      setDecisions(prev => ({ ...prev, [themeId]: [] }));
      return [];
    }
  };

  const fetchDecisionDetail = async (id, decisionsList = null) => {
    try {
      const response = await fetch(api(`/decisions/${id}`));
      const data = await response.json();
      setSelectedDecision(data);
      setModalOpen(true);
      
      if (decisionsList) {
        setCurrentDecisionList(decisionsList);
        const index = decisionsList.findIndex(d => d.id === id);
        setCurrentDecisionIndex(index);
      }
    } catch (error) {
      console.error('Erreur:', error);
    }
  };

  const navigateDecision = (direction) => {
    const newIndex = direction === 'next' ? currentDecisionIndex + 1 : currentDecisionIndex - 1;
    if (newIndex >= 0 && newIndex < currentDecisionList.length) {
      setCurrentDecisionIndex(newIndex);
      fetchDecisionDetail(currentDecisionList[newIndex].id, currentDecisionList);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) return;
    try {
      const response = await fetch(api(`/search?q=${encodeURIComponent(searchTerm)}`));
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche:', error);
    }
  };

  const handleAdvancedSearch = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.keywordsInclusive) params.append('keywords_inc', filters.keywordsInclusive);
      if (filters.keywordsExclusive) params.append('keywords_exc', filters.keywordsExclusive);
      if (filters.decisionNumber) params.append('decision_number', filters.decisionNumber);
      if (filters.dateFrom) params.append('date_from', filters.dateFrom);
      if (filters.dateTo) params.append('date_to', filters.dateTo);
      
      const response = await fetch(api(`/search/advanced?${params}`));
      const data = await response.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error('Erreur recherche avancée:', error);
    }
  };

  const handleDownloadDecision = async (id) => {
    try {
      const response = await fetch(api(`/download/${id}`), {method: 'POST'});
      const data = await response.json();
      alert(data.message || 'Téléchargement lancé');
    } catch (error) {
      alert('Erreur');
    }
  };

  const handleDeleteDecision = async (id) => {
    if (!window.confirm('Supprimer?')) return;
    try {
      await fetch(api(`/decisions/${id}`), {method: 'DELETE'});
      alert('Supprimée');
      fetchChambers();
    } catch (error) {
      alert('Erreur');
    }
  };

  const runIncrementalHarvest = async () => {
    setIncrementalHarvestLoading(true);
    setIncrementalHarvestMessage('');
    try {
      const res = await fetch(`${COURSUPREME_API_URL}/harvest/incremental-root`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setIncrementalHarvestMessage(data.error || 'Erreur moissonnage incrémental');
      } else {
        setIncrementalHarvestMessage(
          `Moissonnage incrémental: ${data.inserted} insérés / ${data.found} trouvés (skip: ${data.skipped_existing}).`
        );
        fetchChambers();
      }
    } catch (error) {
      setIncrementalHarvestMessage('Erreur réseau moissonnage incrémental');
    } finally {
      setIncrementalHarvestLoading(false);
    }
  };

  const handleShowMetadata = async (id) => {
    try {
      const response = await fetch(api(`/metadata/${id}`));
      const data = await response.json();
      setSelectedMetadata(data);
      setMetadataModalOpen(true);
    } catch (error) {
      alert('Erreur chargement métadonnées');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-transparent">
      <div className="w-full">
        {!embedded && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h1 className="text-2xl font-bold text-center mb-4">Cour Suprême d'Algérie</h1>

            {/* Onglets de navigation */}
            <div className="flex gap-2 justify-center mb-6">
              <button
                onClick={() => setActiveTab('hierarchy')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'hierarchy'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Vue Hiérarchique
              </button>
              <button
                onClick={() => setActiveTab('management')}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  activeTab === 'management'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Gestion des Décisions
              </button>
            </div>

            <div className="flex justify-center mb-4">
              <button
                onClick={runIncrementalHarvest}
                disabled={incrementalHarvestLoading}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-60"
              >
                <RefreshCw className={`w-4 h-4 ${incrementalHarvestLoading ? 'animate-spin' : ''}`} />
                {incrementalHarvestLoading ? 'Moissonnage en cours...' : 'Moissonnage incrémental'}
              </button>
            </div>
            {incrementalHarvestMessage && (
              <p className="text-center text-sm text-gray-600 mb-4">{incrementalHarvestMessage}</p>
            )}

            {activeTab === 'hierarchy' && (
            <>
            {/* Panneau de recherche */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
              <div className="flex gap-2 mb-3">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Recherche rapide..."
                  className="flex-1 px-4 py-2 border rounded-lg"
                />
                <button onClick={handleSearch} className="px-6 py-2 bg-blue-600 text-white rounded-lg flex items-center gap-2">
                  <Search className="w-5 h-5" />
                  Rechercher
                </button>
                {searchResults && (
                  <button onClick={() => {setSearchResults(null); setSearchTerm('');}} className="px-4 py-2 bg-gray-200 rounded-lg">
                    Effacer
                  </button>
                )}
              </div>

              <button onClick={() => setShowAdvancedSearch(!showAdvancedSearch)} className="text-blue-600 hover:text-blue-800 text-sm font-medium mb-2">
                {showAdvancedSearch ? '▼ Masquer recherche avancée' : '▶ Recherche avancée'}
              </button>

              {showAdvancedSearch && (
                <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés inclusifs (ET)</label>
                      <input type="text" value={filters.keywordsInclusive} onChange={(e) => setFilters({...filters, keywordsInclusive: e.target.value})} placeholder="ex: مرور حادث" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés exclusifs (NON)</label>
                      <input type="text" value={filters.keywordsExclusive} onChange={(e) => setFilters({...filters, keywordsExclusive: e.target.value})} placeholder="ex: استئناف" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de décision</label>
                      <input type="text" value={filters.decisionNumber} onChange={(e) => setFilters({...filters, decisionNumber: e.target.value})} placeholder="ex: 00001" className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
                      <input type="date" value={filters.dateFrom} onChange={(e) => setFilters({...filters, dateFrom: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
                      <input type="date" value={filters.dateTo} onChange={(e) => setFilters({...filters, dateTo: e.target.value})} className="w-full px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>

                  <button onClick={handleAdvancedSearch} className="w-full py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                    Rechercher avec filtres
                  </button>
                </div>
              )}
            </div>

            {/* Panneau de sélection retiré */}

        {searchResults ? (
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold mb-4">Résultats ({searchResults.length})</h2>
            <div className="space-y-3">
              {searchResults.map((decision) => (
                <div key={decision.id} className="border-b pb-3 flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <span className="font-bold text-blue-600">{decision.decision_number}</span>
                    <span className="text-sm text-gray-500">{decision.decision_date}</span>
                    {decision.object_ar && (
                      <span className="text-sm text-gray-700 flex-1" dir="rtl">{decision.object_ar}</span>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleDownloadDecision(decision.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Télécharger">
                      <Download className="w-4 h-4" />
                    </button>
                    <button onClick={() => fetchDecisionDetail(decision.id, searchResults)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded" title="Voir">
                      <Eye className="w-4 h-4" />
                    </button>
                    <a href={decision.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-purple-600 hover:bg-purple-50 rounded" title="Site">
                      <Globe className="w-4 h-4" />
                    </a>
                    <button onClick={() => handleShowMetadata(decision.id)} className="p-1.5 text-orange-600 hover:bg-orange-50 rounded" title="Métadonnées IA">
                      <Database className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDeleteDecision(decision.id)} className="p-1.5 text-red-600 hover:bg-red-50 rounded" title="Supprimer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {safeChambers.map((chamber) => (
              <div key={chamber.id} className="bg-white rounded-lg shadow-sm">
                <button onClick={() => toggleChamber(chamber.id)} className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                  <div className="flex items-center gap-3">
                    {expandedChamber === chamber.id ? <ChevronDown /> : <ChevronRight />}
                    <FolderOpen className="text-purple-600" />
                    <div>
                      <h2 className="font-bold" dir="rtl">{chamber.name_ar}</h2>
                      {chamber.name_fr && <p className="text-sm text-gray-500">{chamber.name_fr}</p>}
                    </div>
                  </div>
                  <span className="text-sm text-gray-600">{chamber.decision_count} décisions</span>
                </button>

                {expandedChamber === chamber.id && themes[chamber.id] && (
                  <div className="border-t bg-gray-50">
                    {themes[chamber.id].map((theme) => (
                      <div key={theme.id}>
                        <button onClick={() => toggleTheme(theme.id)} className="w-full px-8 py-3 flex items-center justify-between hover:bg-white">
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              style={{ display: 'none' }}
                            />
                            {expandedTheme === theme.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            <Tag className="text-blue-600" size={18} />
                            <span dir="rtl">{theme.name_ar}</span>
                          </div>
                          <span className="text-sm">{theme.decision_count}</span>
                        </button>

                        {expandedTheme === theme.id && decisions[theme.id] && (
                          <div className="bg-white px-10 py-2">
                            {decisions[theme.id].map((decision) => (
                              <div key={decision.id} className="py-3 border-b flex justify-between">
                                <div className="flex items-center gap-3">
                                  <span className="font-bold text-blue-600">{decision.decision_number}</span>
                                  <span className="text-sm text-gray-500">{decision.decision_date}</span>
                                </div>
                                <div className="flex gap-1">
                                  <button onClick={() => handleDownloadDecision(decision.id)} className="p-1.5 text-green-600" title="Télécharger">
                                    <Download className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => fetchDecisionDetail(decision.id, decisions[expandedTheme])} className="p-1.5 text-blue-600" title="Voir">
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  <a href={decision.url} target="_blank" rel="noopener noreferrer" className="p-1.5 text-purple-600" title="Site">
                                    <Globe className="w-4 h-4" />
                                  </a>
                                  <button onClick={() => handleShowMetadata(decision.id)} className="p-1.5 text-orange-600" title="Métadonnées IA">
                                    <Database className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDeleteDecision(decision.id)} className="p-1.5 text-red-600" title="Supprimer">
                                    <Trash2 className="w-4 h-4" />
                                  </button>
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
        </>
        )}

        {/* Vue Gestion des Décisions */}
        {activeTab === 'management' && (
          <DecisionStatusManager />
        )}
      </div>
    )}

        {modalOpen && selectedDecision && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b p-6">
                <div className="flex justify-between items-center mb-4">
                  <button onClick={() => navigateDecision('prev')} className="p-2">← Précédent</button>
                  <div className="text-center">
                    <h2 className="text-2xl font-bold">Décision {selectedDecision.decision_number}</h2>
                    <p className="text-gray-600">{selectedDecision.decision_date}</p>
                  </div>
                  <button onClick={() => navigateDecision('next')} className="p-2">Suivant →</button>
                  <button onClick={() => setModalOpen(false)} className="text-2xl ml-4">×</button>
                </div>
                
                <div className="flex gap-2 bg-white rounded-lg p-1">
                  <button onClick={() => setSelectedLang('ar')} className={`px-6 py-2 rounded-md ${selectedLang === 'ar' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                    العربية
                  </button>
                  <button onClick={() => setSelectedLang('fr')} className={`px-6 py-2 rounded-md ${selectedLang === 'fr' ? 'bg-blue-600 text-white' : 'text-gray-600'}`}>
                    Français
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                {selectedLang === 'ar' && selectedDecision.content_ar && (
                  <div className="bg-white rounded-lg p-6" dir="rtl">
                    <div 
                      className="prose prose-sm max-w-none"
                      style={{fontSize: '15px', lineHeight: '1.8'}}
                      dangerouslySetInnerHTML={{__html: selectedDecision.content_ar}}
                    />
                  </div>
                )}
                {selectedLang === 'fr' && selectedDecision.content_fr && (
                  <div className="bg-white rounded-lg p-6">
                    <div 
                      className="prose prose-sm max-w-none"
                      style={{fontSize: '15px', lineHeight: '1.8'}}
                      dangerouslySetInnerHTML={{__html: selectedDecision.content_fr}}
                    />
                  </div>
                )}
                {!selectedDecision.content_ar && !selectedDecision.content_fr && (
                  <div className="text-center py-16">
                    <p className="text-gray-500">Contenu non disponible</p>
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
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-2xl font-bold">🤖 Métadonnées IA</h2>
                    <p className="text-gray-600 text-sm">Décision {selectedMetadata.decision_number} - {selectedMetadata.decision_date}</p>
                  </div>
                  <button onClick={() => setMetadataModalOpen(false)} className="text-2xl">×</button>
                </div>
                
                <div className="flex gap-2 bg-white rounded-lg p-1">
                  <button onClick={() => setMetadataLang('ar')} className={`px-6 py-2 rounded-md ${metadataLang === 'ar' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
                    العربية
                  </button>
                  <button onClick={() => setMetadataLang('fr')} className={`px-6 py-2 rounded-md ${metadataLang === 'fr' ? 'bg-orange-500 text-white' : 'text-gray-600'}`}>
                    Français
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-8 bg-gray-50">
                {metadataLang === 'ar' ? (
                  <div className="space-y-6" dir="rtl">
                    {(selectedMetadata.title_ar || selectedMetadata.summary_ar) ? (
                      <>
                        {selectedMetadata.title_ar && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500">
                            <h3 className="font-bold text-orange-700 mb-2">العنوان</h3>
                            <p className="text-gray-800">{selectedMetadata.title_ar}</p>
                          </div>
                        )}
                        {selectedMetadata.summary_ar && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">الملخص</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_ar}</p>
                          </div>
                        )}
                        {(() => {
                          const entities = parseEntities(selectedMetadata.entities_ar);
                          if (entities.length === 0) return null;
                          const grouped = entities.reduce((acc, e) => {
                            const type = e.type || 'other';
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(e.name || e);
                            return acc;
                          }, {});
                          
                          const typeLabels = {
                            person: '👤 أشخاص',
                            institution: '🏛️ مؤسسات',
                            location: '📍 أماكن',
                            legal: '⚖️ قانونية',
                            other: '📋 أخرى'
                          };
                          
                          return (
                            <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
                              <h3 className="font-bold text-purple-700 mb-3">الكيانات المسماة</h3>
                              {Object.entries(grouped).map(([type, items]) => (
                                <div key={type} className="mb-3 last:mb-0">
                                  <p className="text-sm font-semibold text-gray-600 mb-1" dir="rtl">{typeLabels[type] || '📋 أخرى'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {items.map((name, i) => (
                                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">🤖</div>
                        <p className="text-gray-500">لم يتم التحليل بعد</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-6">
                    {(selectedMetadata.title_fr || selectedMetadata.summary_fr) ? (
                      <>
                        {selectedMetadata.title_fr && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-orange-500">
                            <h3 className="font-bold text-orange-700 mb-2">Titre</h3>
                            <p className="text-gray-800">{selectedMetadata.title_fr}</p>
                          </div>
                        )}
                        {selectedMetadata.summary_fr && (
                          <div className="bg-white rounded-lg p-6 border-l-4 border-blue-500">
                            <h3 className="font-bold text-blue-700 mb-2">Résumé</h3>
                            <p className="text-gray-800">{selectedMetadata.summary_fr}</p>
                          </div>
                        )}
                        {(() => {
                          const entities = parseEntities(selectedMetadata.entities_fr);
                          if (entities.length === 0) return null;
                          const grouped = entities.reduce((acc, e) => {
                            const type = e.type || 'other';
                            if (!acc[type]) acc[type] = [];
                            acc[type].push(e.name || e);
                            return acc;
                          }, {});
                          
                          const typeLabels = {
                            person: '👤 Personnes',
                            institution: '🏛️ Institutions',
                            location: '📍 Lieux',
                            legal: '⚖️ Juridique',
                            other: '📋 Autres'
                          };
                          
                          return (
                            <div className="bg-white rounded-lg p-6 border-l-4 border-purple-500">
                              <h3 className="font-bold text-purple-700 mb-3">Entités nommées</h3>
                              {Object.entries(grouped).map(([type, items]) => (
                                <div key={type} className="mb-3 last:mb-0">
                                  <p className="text-sm font-semibold text-gray-600 mb-1">{typeLabels[type] || '📋 Autres'}</p>
                                  <div className="flex flex-wrap gap-2">
                                    {items.map((name, i) => (
                                      <span key={i} className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
                                        {name}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          );
                        })()}
                      </>
                    ) : (
                      <div className="text-center py-16">
                        <div className="text-6xl mb-4">🤖</div>
                        <p className="text-gray-500">Pas encore analysée</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        <ConfirmationModal
          isOpen={batchModal.isOpen}
          onClose={closeBatchModal}
          onConfirm={batchModal.onConfirm}
          title={batchModal.title}
          message={batchModal.message}
          type={batchModal.type}
          confirmText={batchModal.confirmText}
          cancelText={batchModal.cancelText}
          showCancel={batchModal.showCancel}
          loading={batchModal.loading}
        />
      </div>
    </div>
  );
};

export default CoursSupremeViewer;
