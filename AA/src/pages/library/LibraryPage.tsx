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
import { LibraryDocument, LibraryFilters, LibraryStats } from '../../types/library';
import { FiltersPanel } from '../../components/library/FiltersPanel';
import { DocumentTable } from '../../components/library/DocumentTable';
import { SemanticModal } from '../../components/library/SemanticModal';

const API_BASE = (import.meta.env.VITE_MIZANE_API_URL ?? 'http://localhost:5002/api/mizane').replace(/\/$/, '');
const DEFAULT_LIMIT = 20;

export default function LibraryPage() {
  const [filters, setFilters] = useState<LibraryFilters>({});
  const [documents, setDocuments] = useState<LibraryDocument[]>([]);
  const [stats, setStats] = useState<LibraryStats>({ total: 0, last_updated: null });
  const [corpus, setCorpus] = useState<'joradp' | 'coursupreme'>('joradp');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [metadataDoc, setMetadataDoc] = useState<LibraryDocument | null>(null);
  const [semanticOpen, setSemanticOpen] = useState(false);
  const [semanticResponse, setSemanticResponse] = useState<string | null>(null);
  const [semanticLoading, setSemanticLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/statistics`);
      if (!response.ok) {
        return;
      }
      const data: LibraryStats = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Impossible de récupérer les stats', error);
    }
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('corpus', corpus);
      params.set('page', page.toString());
      params.set('limit', DEFAULT_LIMIT.toString());
      if (filters.year) {
        params.set('year', filters.year);
      }
      if (filters.search) {
        params.set('search', filters.search);
      }
      if (filters.from) {
        params.set('from', filters.from);
      }
      if (filters.to) {
        params.set('to', filters.to);
      }
      if (filters.keywordsAnd) {
        params.set('keywords_and', filters.keywordsAnd);
      }
      if (filters.keywordsOr) {
        params.set('keywords_or', filters.keywordsOr);
      }
      if (filters.keywordsNot) {
        params.set('keywords_not', filters.keywordsNot);
      }
      if (filters.documentNumber) {
        params.set('document_number', filters.documentNumber);
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
      setStats((prev) => ({ ...prev, total: incomingTotal }));
    } catch (error) {
      console.error('Impossible de récupérer les documents', error);
    } finally {
      setLoading(false);
    }
  }, [filters, page, corpus]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);


  const handleFiltersChange = (next: LibraryFilters) => {
    setFilters(next);
    setPage(1);
  };

  const handleSearch = () => {
    if (page === 1) {
      fetchDocuments();
      return;
    }
    setPage(1);
  };

  const handleCorpusChange = (next: 'joradp' | 'coursupreme') => {
    if (next === corpus) {
      return;
    }
    setCorpus(next);
    setFilters({});
    setSelectedIds([]);
    setPage(1);
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

  const handleSemanticSearch = async (query: string) => {
    setSemanticLoading(true);
    try {
      const payload = {
        corpus: 'joradp',
        query,
        filters,
      };
      const response = await fetch(`${API_BASE}/semantic-search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        setSemanticResponse('Aucun résultat');
        return;
      }
      const data = await response.json();
      setSemanticResponse(data.message ?? 'Résultats prêts');
    } catch (error) {
      console.error('Recherche sémantique échouée', error);
      setSemanticResponse('Erreur de recherche');
    } finally {
      setSemanticLoading(false);
    }
  };

  const metadataOutput = useMemo(() => {
    if (!metadataDoc?.extra_metadata) {
      return 'Pas de métadonnées disponibles.';
    }
    try {
      const parsed = typeof metadataDoc.extra_metadata === 'string'
        ? JSON.parse(metadataDoc.extra_metadata)
        : metadataDoc.extra_metadata;
      return JSON.stringify(parsed, null, 2);
    } catch {
      return typeof metadataDoc.extra_metadata === 'string'
        ? metadataDoc.extra_metadata
        : JSON.stringify(metadataDoc.extra_metadata);
    }
  }, [metadataDoc]);

  const handleCloseMetadata = () => {
    setMetadataDoc(null);
  };

  const displayTitle = corpus === 'joradp' ? 'Consultation JORADP' : 'Cour suprême';
  const lastUpdatedLine = stats.last_updated
    ? `Dernière mise à jour : ${new Date(stats.last_updated).toLocaleString('fr-FR')}`
    : 'En attente d’une première synchronisation';
  return (
    <section className="flex flex-col gap-6 w-full">
      <section className="grid gap-6 md:grid-cols-[1fr_200px] w-full">
        <div className="space-y-3">
          <h1 className="text-3xl font-bold text-slate-900">{displayTitle}</h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">{lastUpdatedLine}</span>
            <span className="text-xs uppercase tracking-[0.4em] text-slate-400">{corpus === 'joradp' ? 'JO' : 'Décisions'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <span className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Corpus</span>
            <Select value={corpus} onValueChange={(value) => handleCorpusChange(value as 'joradp' | 'coursupreme')}>
              <SelectTrigger className="h-9 rounded-full border border-slate-200 bg-white px-4 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="joradp">JORADP</SelectItem>
                <SelectItem value="coursupreme">Cour suprême</SelectItem>
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
        onSemanticOpen={() => setSemanticOpen(true)}
        corpus={corpus}
      />

      <DocumentTable
        documents={documents}
        loading={loading}
        selectedIds={selectedIds}
        onToggleSelect={handleSelectOne}
        onToggleSelectAll={handleSelectAll}
        onViewMetadata={(doc) => setMetadataDoc(doc)}
      />

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

      <SemanticModal
        open={semanticOpen}
        onOpenChange={setSemanticOpen}
        onSubmit={handleSemanticSearch}
        isLoading={semanticLoading}
        response={semanticResponse}
      />

      <Dialog open={Boolean(metadataDoc)} onOpenChange={(open) => !open && handleCloseMetadata()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Métadonnées</DialogTitle>
            <DialogDescription>Les informations extraites lors de l’analyse IA.</DialogDescription>
          </DialogHeader>
          <pre className="max-h-[360px] overflow-auto rounded-xl border border-slate-200 bg-slate-950 p-4 text-xs leading-relaxed text-slate-100">
            {metadataOutput}
          </pre>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseMetadata}>
              Fermer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
