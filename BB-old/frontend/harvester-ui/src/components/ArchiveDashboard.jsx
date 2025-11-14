import React, { useEffect, useMemo, useState } from 'react';
import {
  RefreshCw,
  Play,
  Activity,
  Download,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { API_URL } from '../config';

const numberFormatter = new Intl.NumberFormat('fr-FR');

function siteLabelFromUrl(url) {
  if (!url) return '';
  try {
    return new URL(url).hostname || url;
  } catch (e) {
    return url;
  }
}

function formatBytes(bytes) {
  if (!bytes || Number.isNaN(bytes)) return '0 o';
  const sizes = ['o', 'Ko', 'Mo', 'Go', 'To'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value < 10 ? 1 : 0)} ${sizes[i]}`;
}

function formatDate(value) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('fr-FR');
  } catch (e) {
    return value;
  }
}

export default function ArchiveDashboard() {
  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const [sites, setSites] = useState([]);
  const [sitesLoading, setSitesLoading] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [scanYear, setScanYear] = useState(currentYear);
  const [scanLoading, setScanLoading] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [error, setError] = useState(null);

  const selectedSite = useMemo(
    () => sites.find((site) => Number(site.id) === Number(selectedSiteId)),
    [sites, selectedSiteId]
  );

  const siteLabel = selectedSite ? siteLabelFromUrl(selectedSite.base_url) : null;

  const fetchSites = async () => {
    try {
      setSitesLoading(true);
      const response = await fetch(`${API_URL}/sites`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      const data = await response.json();
      const list = (data.sites || []).map((site) => ({
        ...site,
        id: Number(site.id),
        total_documents: Number(site.total_documents || 0),
        indexed_documents: Number(site.indexed_documents || 0),
      }));
      setSites(list);
      if (!selectedSiteId && list.length > 0) {
        setSelectedSiteId(list[0].id);
      }
    } catch (err) {
      console.error('Erreur chargement sites:', err);
      setError(err.message || 'Impossible de charger la liste des sites');
    } finally {
      setSitesLoading(false);
    }
  };

  const fetchStats = async (isBackground = false) => {
    if (!selectedSiteId) return;
    try {
      if (!isBackground) {
        setLoading(true);
        setError(null);
      } else {
        setRefreshing(true);
      }
      const response = await fetch(`${API_URL}/archive/${selectedSiteId}/stats`);
      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (err) {
      console.error('Erreur stats archive:', err);
      setError(err.message || 'Impossible de charger les statistiques');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchSites();
  }, []);

  useEffect(() => {
    if (selectedSiteId) {
      setScanYear(currentYear);
      fetchStats();
    }
  }, [selectedSiteId]);

  const handleScanYear = async () => {
    if (!scanYear || !selectedSiteId) return;
    setScanLoading(true);
    setScanResult(null);
    try {
      const response = await fetch(`${API_URL}/archive/${selectedSiteId}/scan-year/${scanYear}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const details = await response.json().catch(() => ({}));
        throw new Error(details.error || `Erreur ${response.status}`);
      }

      const data = await response.json();
      setScanResult({
        scan_id: data.scan_id,
        status: data.status,
        message: `Scan lancé pour ${scanYear}.`
      });
      // rafraîchir les stats en tâche de fond
      setTimeout(() => fetchStats(true), 1000);
    } catch (err) {
      console.error('Erreur lancement scan:', err);
      setScanResult({
        status: 'error',
        message: err.message || 'Impossible de lancer le scan'
      });
    } finally {
      setScanLoading(false);
    }
  };

  const totalDocs = stats?.totals?.documents || 0;
  const downloaded = stats?.totals?.downloaded || 0;
  const available = stats?.totals?.available || 0;
  const errorsCount = stats?.totals?.errors || 0;
  const checking = stats?.totals?.checking || 0;

  const completionRate = totalDocs > 0 ? Math.round((downloaded / totalDocs) * 100) : 0;

  const perYear = useMemo(() => {
    const rows = (stats?.per_year || [])
      .filter((row) => row.year !== null && row.year !== undefined)
      .map((row) => ({
        ...row,
        year: Number(row.year),
        total: Number(row.total || 0),
        downloaded: Number(row.downloaded || 0),
        errors: Number(row.errors || 0),
      }));
    return rows.sort((a, b) => b.year - a.year);
  }, [stats]);

  const hasSites = sites.length > 0;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold text-gray-800">
              📚 Archive {siteLabel ? `: ${siteLabel}` : ''}
            </h2>
            <p className="text-gray-600">
              Gestion des documents moissonnés et suivi de complétude.
            </p>
            {selectedSite && (
              <p className="mt-1 text-xs text-gray-500">
                Base URL : {selectedSite.base_url}
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600" htmlFor="archive-site-select">
                Site
              </label>
              <select
                id="archive-site-select"
                value={selectedSiteId ?? ''}
                onChange={(e) => setSelectedSiteId(e.target.value ? Number(e.target.value) : null)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                disabled={sitesLoading}
              >
                <option value="">Sélectionner…</option>
                {sites.map((site) => (
                  <option key={site.id} value={site.id}>
                    {siteLabelFromUrl(site.base_url)}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1962"
                max={currentYear}
                value={scanYear}
                onChange={(e) => setScanYear(parseInt(e.target.value, 10) || '')}
                className="w-28 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Année"
                disabled={!hasSites}
              />
              <button
                onClick={handleScanYear}
                disabled={scanLoading || !scanYear || !hasSites}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
              >
                <Play className="w-4 h-4" />
                Scanner l&apos;année
              </button>
            </div>

            <button
              onClick={() => fetchStats(true)}
              disabled={loading || refreshing || !hasSites}
              className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100 disabled:opacity-50 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Actualiser
            </button>
          </div>
        </div>

        {scanResult && (
          <div
            className={`mt-4 px-4 py-3 rounded-lg text-sm ${
              scanResult.status === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
            }`}
          >
            {scanResult.status === 'error' ? <AlertTriangle className="inline w-4 h-4 mr-2" /> : <Play className="inline w-4 h-4 mr-2" />}
            {scanResult.message}
            {scanResult.scan_id && (
              <span className="ml-2 text-xs text-gray-500">ID scan : {scanResult.scan_id}</span>
            )}
          </div>
        )}

        {error && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-red-50 text-red-700 border border-red-200 text-sm">
            <AlertTriangle className="inline w-4 h-4 mr-2" />
            {error}
          </div>
        )}

        {!hasSites && !sitesLoading && (
          <div className="mt-4 px-4 py-3 rounded-lg bg-yellow-50 text-yellow-700 border border-yellow-200 text-sm">
            Aucun site configuré pour l’archive. Configurez un moissonnage pour commencer.
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-white rounded-lg shadow p-5 border border-gray-100">
          <div className="text-sm text-gray-500 uppercase">Documents total</div>
          <div className="mt-2 text-3xl font-bold text-gray-800">
            {numberFormatter.format(totalDocs)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            Volume estimé : {formatBytes(stats?.totals?.storage_bytes || 0)}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border border-green-100">
          <div className="flex items-center justify-between text-sm text-gray-500 uppercase">
            <span>Téléchargés</span>
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-green-600">
            {numberFormatter.format(downloaded)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {completionRate}% de complétion
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border border-indigo-100">
          <div className="flex items-center justify-between text-sm text-gray-500 uppercase">
            <span>Disponibles</span>
            <Download className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-indigo-600">
            {numberFormatter.format(available)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {numberFormatter.format(available - downloaded)} en attente de téléchargement
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-5 border border-amber-100">
          <div className="flex items-center justify-between text-sm text-gray-500 uppercase">
            <span>En cours / Erreurs</span>
            <Activity className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 text-3xl font-bold text-amber-600">
            {numberFormatter.format(errorsCount + checking)}
          </div>
          <div className="mt-1 text-xs text-gray-500">
            {numberFormatter.format(checking)} en vérification • {numberFormatter.format(errorsCount)} erreurs
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-800">Progression par année</h3>
          <span className="text-xs text-gray-500">
            Dernière mise à jour : {stats ? formatDate(stats.recent_scans?.[0]?.started_at) : '—'}
          </span>
        </div>

        <div className="max-h-96 overflow-y-auto">
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Année</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Téléchargés</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Erreurs</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500 uppercase tracking-wider">Avancement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {perYear.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    {loading ? 'Chargement…' : 'Aucune donnée pour le moment.'}
                  </td>
                </tr>
              )}

              {perYear.map((row) => {
                const progress = row.total > 0 ? Math.round((row.downloaded / row.total) * 100) : 0;
                return (
                  <tr key={row.year}>
                    <td className="px-6 py-4 font-medium text-gray-800">{row.year}</td>
                    <td className="px-6 py-4 text-gray-600">{numberFormatter.format(row.total)}</td>
                    <td className="px-6 py-4 text-gray-600">{numberFormatter.format(row.downloaded)}</td>
                    <td className="px-6 py-4 text-gray-600">{numberFormatter.format(row.errors)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 transition-all"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500 w-12">{progress}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

        <div className="bg-white rounded-lg shadow border border-gray-100">
          <div className="px-6 py-4 border-b border-gray-100">
            <h3 className="text-lg font-semibold text-gray-800">Historique des derniers scans</h3>
          </div>
        <div className="divide-y divide-gray-100">
          {stats?.recent_scans?.length ? (
            stats.recent_scans.map((scan) => {
              const params = scan.parameters || {};
              const label =
                scan.scan_type === 'year' && params.year
                  ? `Année ${params.year}`
                  : scan.scan_type;

              return (
                <div key={scan.id} className="px-6 py-4 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-gray-800">
                      {label}
                    </div>
                    <div className="text-xs text-gray-500">
                      Démarré le {formatDate(scan.started_at)} · Terminé le {formatDate(scan.completed_at)}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span>Vérifiés : {numberFormatter.format(scan.total_checked)}</span>
                    <span>Disponibles : {numberFormatter.format(scan.found_available)}</span>
                    <span>Erreurs : {numberFormatter.format(scan.found_errors)}</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        scan.status === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : scan.status === 'running'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {scan.status}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-8 text-center text-gray-500 text-sm">
              Aucun scan enregistré pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
