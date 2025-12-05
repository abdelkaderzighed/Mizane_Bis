import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import { Badge } from '../../components/ui/badge';
import { Sparkles } from 'lucide-react';
import { LibraryDocument, LibraryFilters, LibraryStats } from '../../types/library';
import { FiltersPanel } from '../../components/library/FiltersPanel';
import { DocumentTable } from '../../components/library/DocumentTable';

const API_BASE = (import.meta.env.VITE_MIZANE_API_URL ?? 'http://localhost:5002/api/mizane').replace(/\/$/, '');
const DEFAULT_LIMIT = 20;
type Corpus = 'joradp' | 'cour_supreme';
type SearchMode = 'filters' | 'semantic';
type SortField = 'date' | 'year' | 'number';
type SortOrder = 'asc' | 'desc';

export default function LibraryPage() {
  const [filters, setFilters] = useState<LibraryFilters>({});
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ total: 0, last_updated: null });
  const [corpus, setCorpus] = useState<Corpus>('joradp');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [metadataDoc, setMetadataDoc] = useState<LibraryDocument | null>(null);
  const [semanticResponse, setSemanticResponse] = useState<string | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);
  const [searchMode, setSearchMode] = useState<SearchMode>('filters');
  const [semanticResults, setSemanticResults] = useState<LibraryDocument[]>([]);
  const [semanticQuery, setSemanticQuery] = useState('');
  const [languageScope, setLanguageScope] = useState<'ar' | 'fr' | 'both'>('both');
  const [resultCount, setResultCount] = useState(0);
  const [activeFilters, setActiveFilters] = useState<LibraryFilters>({});
  const [metadataTab, setMetadataTab] = useState<'fr' | 'ar'>('fr');
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [documentPreview, setDocumentPreview] = useState<{
    doc: LibraryDocument | null;
    fr?: string | null;
    ar?: string | null;
    loading: boolean;
    tab: 'fr' | 'ar';
  }>({ doc: null, fr: null, ar: null, loading: false, tab: 'fr' });

  const sortDocuments = useCallback((list: LibraryDocument[]) => {
    if (searchMode !== 'semantic') return list;
    const sorted = [...list].sort((a, b) => {
      const dir = sortOrder === 'asc' ? 1 : -1;
      const dateA = a.publication_date ? new Date(a.publication_date).getTime() : 0;
      const dateB = b.publication_date ? new Date(b.publication_date).getTime() : 0;
      const yearA = a.publication_date ? new Date(a.publication_date).getFullYear() : 0;
      const yearB = b.publication_date ? new Date(b.publication_date).getFullYear() : 0;
      const numA = a.decision_number ? parseInt(a.decision_number.replace(/\D/g, '') || '0', 10) : 0;
      const numB = b.decision_number ? parseInt(b.decision_number.replace(/\D/g, '') || '0', 10) : 0;
      switch (sortField) {
        case 'year':
          return (yearA - yearB) * dir || (dateA - dateB) * dir;
        case 'number':
          return (numA - numB) * dir || (dateA - dateB) * dir;
        case 'date':
        default:
          return (dateA - dateB) * dir;
      }
    });
    return sorted;
  }, [sortField, sortOrder]);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/statistics?corpus=${corpus}`);
      if (!response.ok) {
        return;
      }
      const data: LibraryStats = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Impossible de récupérer les stats', error);
    }
  }, [corpus]);

  const fetchDocuments = useCallback(async (pageOverride?: number, filtersOverride?: LibraryFilters) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('corpus', corpus);
      const currentPage = pageOverride ?? page;
      params.set('page', currentPage.toString());
      params.set('limit', DEFAULT_LIMIT.toString());
      params.set('sort_field', sortField);
      params.set('sort_order', sortOrder);
      const f = filtersOverride ?? activeFilters;
      if (f.year) {
        params.set('year', f.year);
      }
      if (f.search) {
        params.set('search', f.search);
      }
      if (f.from) {
        params.set('from', f.from);
      }
      if (f.to) {
        params.set('to', f.to);
      }
      if (f.keywordsAnd) {
        params.set('keywords_and', f.keywordsAnd);
      }
      if (f.keywordsOr) {
        params.set('keywords_or', f.keywordsOr);
      }
      if (f.keywordsNot) {
        params.set('keywords_not', f.keywordsNot);
      }
      if (f.documentNumber) {
        params.set('document_number', f.documentNumber);
      }

      const response = await fetch(`${API_BASE}/documents?${params.toString()}`);
      if (!response.ok) {
        setDocuments([]);
        return;
      }
      const payload = await response.json();
      setDocuments(payload.documents ?? []);
      const incomingTotal = Number(payload.total ?? payload.documents?.length ?? 0);
      const pages = incomingTotal ? Math.max(1, Math.ceil(incomingTotal / DEFAULT_LIMIT)) : 1;
      setTotalPages(pages);
      setResultCount(incomingTotal);
    } catch (error) {
      console.error('Impossible de récupérer les documents', error);
    } finally {
      setLoading(false);
    }
  }, [activeFilters, page, corpus, sortDocuments]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (searchMode !== 'filters') {
      return;
    }
    fetchDocuments();
  }, [fetchDocuments, searchMode, corpus, page]);

  useEffect(() => {
    if (searchMode !== 'semantic') {
      return;
    }
    const pages = Math.max(1, Math.ceil(semanticResults.length / DEFAULT_LIMIT));
    if (page > pages) {
      setPage(1);
      return;
    }
    const start = (page - 1) * DEFAULT_LIMIT;
    const nextSlice = semanticResults.slice(start, start + DEFAULT_LIMIT);
    setDocuments(nextSlice);
    setTotalPages(pages || 1);
  }, [page, searchMode, semanticResults]);

  useEffect(() => {
    if (searchMode === 'semantic') {
      const sorted = sortDocuments(semanticResults);
      setSemanticResults(sorted);
      setDocuments(sorted.slice((page - 1) * DEFAULT_LIMIT, (page - 1) * DEFAULT_LIMIT + DEFAULT_LIMIT));
    } else {
      setDocuments((prev) => sortDocuments(prev));
    }
  }, [sortField, sortOrder, sortDocuments, searchMode, page, semanticResults]);


  const resetSemanticState = () => {
    setSemanticQuery('');
    setSemanticResults([]);
    setSemanticResponse(null);
  };

  const handleFiltersChange = (next: LibraryFilters) => {
    setFilters(next);
    setSearchMode('filters');
    resetSemanticState();
    setSelectedIds([]);
    setPage(1);
  };

  const handleSearch = () => {
    setSearchMode('filters');
    resetSemanticState();
    setSelectedIds([]);
    setActiveFilters(filters);
    if (page !== 1) {
      setPage(1);
    }
    fetchDocuments(1, filters);
  };

  const handleSortChange = (field: SortField) => {
    const nextOrder = sortField === field && sortOrder === 'desc' ? 'asc' : 'desc';
    setSortField(field);
    setSortOrder(nextOrder);
  };

  const handleCorpusChange = (next: Corpus) => {
    if (next === corpus) {
      return;
    }
    setCorpus(next);
    setFilters({});
    setSearchMode('filters');
    resetSemanticState();
    setSelectedIds([]);
    setDocuments([]);
    setTotalPages(1);
    setResultCount(0);
    setPage(1);
    setActiveFilters({});
  };

  const handleReset = () => {
    setFilters({});
    resetSemanticState();
    setSelectedIds([]);
    setSearchMode('filters');
    setDocuments([]);
    setPage(1);
    setResultCount(0);
    setActiveFilters({});
    fetchDocuments(1);
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const ids = documents.map((doc) => doc.id);
      setSelectedIds(ids);
      return;
    }
    setSelectedIds([]);
  };

  const handleSelectOne = (id: number, checked: boolean) => {
    setSelectedIds((prev) => {
      if (checked) {
        return [...prev, id];
      }
      return prev.filter((item) => item !== id);
    });
  };

  const fetchDocumentText = async (url?: string | null) => {
    if (!url) return null;
    try {
      const endpoint = `${API_BASE}/document-content?url=${encodeURIComponent(url)}`;
      const res = await fetch(endpoint);
      if (!res.ok) return null;
      const data = await res.json();
      return data?.content ?? null;
    } catch (err) {
      console.error('Impossible de charger le document', err);
      return null;
    }
  };

  const handleOpenDocument = async (doc: LibraryDocument) => {
    setDocumentPreview({ doc, fr: null, ar: null, loading: true, tab: 'fr' });
    // Pour le modal on privilégie toujours le texte brut; on ne tombe pas sur le PDF.
    const deriveTxtFromPdf = (pdf?: string | null) => {
      if (!pdf) return null;
      return pdf.replace(/\.pdf(\?.*)?$/i, '.txt');
    };
    const frUrl =
      doc.text_path_signed ??
      doc.text_path_fr_signed ??
      doc.text_path_fr ??
      doc.text_path ??
      deriveTxtFromPdf(doc.file_path_fr_signed ?? doc.file_path_signed ?? doc.file_path_fr ?? doc.file_path);
    const arUrl =
      doc.text_path_ar_signed ??
      doc.text_path_ar;

    const [fr, ar] = await Promise.all([fetchDocumentText(frUrl), fetchDocumentText(arUrl)]);
    setDocumentPreview({
      doc,
      fr: fr ?? '',
      ar: ar ?? null,
      loading: false,
      tab: fr ? 'fr' : 'ar',
    });
  };

  const closeDocumentPreview = () => {
    setDocumentPreview({ doc: null, fr: null, ar: null, loading: false, tab: 'fr' });
  };

  const handleSemanticSearch = async () => {
    const normalizedQuery = semanticQuery.trim();
    if (!normalizedQuery) {
      setSemanticResponse('Saisissez une requête');
      return;
    }
    setSearchMode('semantic');
    setSelectedIds([]);
    setPage(1);
    setLoading(true);
    setSemanticLoading(true);
    try {
      const response = await fetch(`${API_BASE}/semantic-search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          corpus,
          query: normalizedQuery,
          limit: 0,
          score_threshold: 0,
        }),
      });
      if (!response.ok) {
        setSemanticResponse('Aucun résultat');
        setSemanticResults([]);
        setDocuments([]);
        setTotalPages(1);
        return;
      }
      const data = await response.json();
      const rawResults = Array.isArray(data.results) ? data.results : [];
      const mapped = rawResults.map((item: any) => ({
        id: item.id,
        publication_date: item.publication_date ?? item.decision_date ?? item.created_at ?? null,
        url: item.url ?? item.file_path_r2 ?? item.file_path_fr_r2 ?? item.file_path ?? null,
        file_path: item.file_path_r2 ?? item.file_path_fr_r2 ?? item.file_path ?? null,
        file_path_fr: item.file_path_fr ?? item.file_path_fr_r2 ?? item.file_path_fr_signed ?? null,
        file_path_ar: item.file_path_ar ?? item.file_path_ar_r2 ?? item.file_path_ar_signed ?? null,
        file_path_signed: item.file_path_signed ?? null,
        file_path_fr_signed: item.file_path_fr_signed ?? null,
        file_path_ar_signed: item.file_path_ar_signed ?? null,
        text_path: item.text_path_r2 ?? item.text_path ?? item.html_content_fr_r2 ?? null,
        text_path_fr: item.text_path_fr ?? item.html_content_fr_r2 ?? null,
        text_path_ar: item.text_path_ar ?? item.html_content_ar_r2 ?? null,
        text_path_signed: item.text_path_signed ?? null,
        text_path_fr_signed: item.text_path_fr_signed ?? null,
        text_path_ar_signed: item.text_path_ar_signed ?? null,
        metadata_collected_at: item.metadata_collected_at ?? item.updated_at ?? null,
        extra_metadata: item.extra_metadata ?? null,
        score: typeof item.score === 'number' ? item.score : Number(item.score) || null,
        decision_number: item.decision_number ?? null,
        chamber_name: item.chamber_name ?? null,
        theme_name: item.theme_name ?? null,
      }));
      const sortedSemantic = sortDocuments(mapped);
      setSemanticResults(sortedSemantic);
      setDocuments(sortedSemantic.slice(0, DEFAULT_LIMIT));
      const pages = Math.max(1, Math.ceil(mapped.length / DEFAULT_LIMIT));
      setTotalPages(pages);
      setResultCount(mapped.length);
      if (mapped.length === 0) {
        setSemanticResponse('Aucun résultat');
      } else {
        const maxScore = mapped[0].score;
        setSemanticResponse(
          `Résultats classés par score${typeof maxScore === 'number' ? ` (max ${maxScore.toFixed(2)})` : ''}`
        );
      }
    } catch (error) {
      console.error('Recherche sémantique échouée', error);
      setSemanticResponse('Erreur de recherche');
      setSemanticResults([]);
      setDocuments([]);
      setTotalPages(1);
    } finally {
      setSemanticLoading(false);
      setLoading(false);
    }
  };

  const metadataOutput = useMemo(() => {
    if (!metadataDoc?.extra_metadata) {
      return null;
    }
    try {
      return typeof metadataDoc.extra_metadata === 'string'
        ? JSON.parse(metadataDoc.extra_metadata)
        : metadataDoc.extra_metadata;
    } catch {
      return metadataDoc.extra_metadata;
    }
  }, [metadataDoc]);

  const renderMetadataContent = (lang: 'fr' | 'ar') => {
    if (!metadataOutput || typeof metadataOutput !== 'object') {
      return (
        <p className="text-sm text-slate-700">
          {typeof metadataDoc?.extra_metadata === 'string'
            ? metadataDoc.extra_metadata
            : 'Contenu indisponible'}
        </p>
      );
    }
    const meta = metadataOutput as any;
    const isFr = lang === 'fr';
    const title = isFr ? meta.title_fr || meta.title : meta.title_ar;
    const summary = isFr ? meta.summary_fr || meta.summary : meta.summary_ar;
    const keywords = Array.isArray(isFr ? (meta.keywords_fr || meta.keywords) : meta.keywords_ar)
      ? (isFr ? (meta.keywords_fr || meta.keywords) : meta.keywords_ar)
      : [];
    const entities = Array.isArray(isFr ? meta.entities_fr : meta.entities_ar)
      ? (isFr ? meta.entities_fr : meta.entities_ar)
      : [];

    return (
      <div className="space-y-4" dir={isFr ? 'ltr' : 'rtl'}>
        {title && (
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{isFr ? 'Titre' : 'العنوان'}</h4>
            <p className="text-sm text-slate-700">{title}</p>
          </div>
        )}
        {summary && (
          <div>
            <h4 className="text-sm font-semibold text-slate-800">{isFr ? 'Résumé' : 'الملخص'}</h4>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{summary}</p>
          </div>
        )}
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k: string, idx: number) => (
              <Badge
                key={`${lang}-kw-${idx}`}
                variant="secondary"
                className={isFr ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-emerald-50 text-emerald-700 border-emerald-100'}
              >
                {k}
              </Badge>
            ))}
          </div>
        )}
        {entities.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-slate-800">{isFr ? 'Entités' : 'الكيانات'}</h4>
            <div className="flex flex-wrap gap-2">
              {entities.map((e: any, idx: number) => (
                <Badge key={`${lang}-ent-${idx}`} variant="outline">{e?.name || e}</Badge>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleCloseMetadata = () => {
    setMetadataDoc(null);
  };

  const displayTitle = corpus === 'joradp' ? 'Consultation JORADP' : 'Cour suprême';
  const lastUpdatedLine = stats.last_updated
    ? `Dernière mise à jour : ${new Date(stats.last_updated).toLocaleString('fr-FR')}`
    : 'En attente d’une première synchronisation';
  const isFilterLoading = searchMode === 'filters' && loading;
  const isSemanticSearching = searchMode === 'semantic' && (loading || semanticLoading);
  return (
    <section className="flex flex-col gap-6 w-full min-h-screen pb-24">
      <section className="grid gap-6 md:grid-cols-[1fr_200px] w-full">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">{displayTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{lastUpdatedLine}</span>
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">{corpus === 'joradp' ? 'JO' : 'Décisions'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Corpus</span>
            <Select value={corpus} onValueChange={(value) => handleCorpusChange(value as Corpus)}>
              <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-4 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="joradp">JORADP</SelectItem>
                <SelectItem value="cour_supreme">Cour suprême</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3">
          <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm text-slate-600">
            <p className="text-xs uppercase tracking-[0.5em] text-slate-400">
              {corpus === 'joradp' ? 'JORADP' : 'Cour suprême'}
            </p>
            <p className="text-2xl font-semibold text-slate-900">{stats.total ?? 0}</p>
          </div>
        </div>
      </section>

      <FiltersPanel
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onSearch={handleSearch}
        onSemanticSearch={handleSemanticSearch}
        onReset={handleReset}
        semanticQuery={semanticQuery}
        onSemanticQueryChange={setSemanticQuery}
        languageScope={languageScope}
        onLanguageScopeChange={setLanguageScope}
        resultCount={resultCount}
        isSearching={isFilterLoading}
        isSemanticSearching={isSemanticSearching}
        corpus={corpus}
      />

      {searchMode === 'semantic' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 flex items-center gap-3">
          <Sparkles className="w-4 h-4" />
          <div className="flex flex-col">
            <span className="font-semibold">Recherche sémantique</span>
            <span className="text-amber-900">
              {semanticResponse || 'Résultats classés par score'} • requête « {semanticQuery} » • {stats.total ?? 0} résultats
            </span>
          </div>
        </div>
      )}

      <div className="max-h-[65vh] overflow-auto rounded-2xl border border-slate-100">
        <DocumentTable
          documents={documents}
          loading={loading || semanticLoading}
          selectedIds={selectedIds}
          showScore={searchMode === 'semantic'}
          corpus={corpus}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSortChange}
          onToggleSelect={handleSelectOne}
          onToggleSelectAll={handleSelectAll}
          onViewMetadata={(doc) => setMetadataDoc(doc)}
          onOpenDocument={handleOpenDocument}
        />
      </div>

      <div className="flex items-center justify-between text-sm text-slate-500">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
          disabled={page <= 1}
        >
          Précédent
        </Button>
        <span>
          Page {page} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
          disabled={page >= totalPages}
        >
          Suivant
        </Button>
      </div>

      <Dialog open={Boolean(metadataDoc)} onOpenChange={(open) => !open && handleCloseMetadata()}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>📄 Métadonnées du Document</DialogTitle>
            <DialogDescription>Informations complètes et analyse IA.</DialogDescription>
          </DialogHeader>

          {/* Informations générales */}
          {metadataDoc && (
            <div className="mb-4 p-4 bg-slate-50 rounded-lg">
              <h4 className="font-semibold mb-3 text-sm">Informations générales</h4>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="font-medium">Numéro :</span> {metadataDoc.id}</div>
                <div><span className="font-medium">Date :</span> {metadataDoc.publication_date ? new Date(metadataDoc.publication_date).toLocaleDateString('fr-FR') : '—'}</div>
                {metadataDoc.file_size && (
                  <div><span className="font-medium">Taille :</span> {(metadataDoc.file_size / 1024).toFixed(1)} KB</div>
                )}
                <div><span className="font-medium">ID :</span> {metadataDoc.id}</div>
              </div>
              {metadataDoc.url && (
                <div className="mt-3 text-sm">
                  <span className="font-medium">URL :</span>{' '}
                  <a href={metadataDoc.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                    {metadataDoc.url}
                  </a>
                </div>
              )}
            </div>
          )}

          {/* Analyse IA */}
          <div className="mb-4 p-4 bg-purple-50 rounded-lg">
            <h4 className="font-semibold mb-3 text-sm">🤖 Analyse IA</h4>
            <div className="flex items-center gap-2 mb-3">
              <Button
                variant={metadataTab === 'fr' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetadataTab('fr')}
              >
                Français
              </Button>
              <Button
                variant={metadataTab === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMetadataTab('ar')}
              >
                العربية
              </Button>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-800">
              {metadataTab === 'fr' ? renderMetadataContent('fr') : renderMetadataContent('ar')}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseMetadata}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(documentPreview.doc)} onOpenChange={(open) => !open && closeDocumentPreview()}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {documentPreview.doc?.decision_number
                ? `Décision ${documentPreview.doc.decision_number}`
                : 'Document'}
            </DialogTitle>
            <DialogDescription>Affichage du contenu (FR / AR si disponible).</DialogDescription>
          </DialogHeader>
          <div className="flex items-center gap-2 mb-3">
            <Button
              variant={documentPreview.tab === 'fr' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setDocumentPreview((prev) => ({ ...prev, tab: 'fr' }))}
              disabled={!documentPreview.fr}
            >
              Français
            </Button>
            {documentPreview.ar && (
              <Button
                variant={documentPreview.tab === 'ar' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDocumentPreview((prev) => ({ ...prev, tab: 'ar' }))}
              >
                العربية
              </Button>
            )}
            {documentPreview.loading && (
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <div className="h-4 w-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                Chargement...
              </span>
            )}
          </div>
          <div className="max-h-[60vh] overflow-auto rounded border border-slate-200 bg-slate-50 p-4 text-sm">
            {documentPreview.tab === 'fr' && (
              <pre className="whitespace-pre-wrap text-slate-900">
                {documentPreview.fr ?? ''}
              </pre>
            )}
            {documentPreview.tab === 'ar' && (
              <pre className="whitespace-pre-wrap text-slate-900" dir="rtl" style={{ fontFamily: 'Amiri, Scheherazade, serif' }}>
                {documentPreview.ar ?? ''}
              </pre>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDocumentPreview}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
