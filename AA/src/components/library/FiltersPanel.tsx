import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { LibraryFilters } from '../../types/library';
import { ChevronDown, ChevronUp, Search, Sparkles } from 'lucide-react';

interface FiltersPanelProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onSearch: () => void;
  onSemanticOpen: () => void;
  corpus: 'joradp' | 'coursupreme';
}

export function FiltersPanel({
  filters,
  onFiltersChange,
  onSearch,
  onSemanticOpen,
  corpus,
}: FiltersPanelProps) {
  const [expanded, setExpanded] = useState(true);
  const handleChange =
    (key: keyof LibraryFilters) => (event: React.ChangeEvent<HTMLInputElement>) => {
      onFiltersChange({
        ...filters,
        [key]: event.target.value,
      });
    };

  return (
    <section className="bg-white/90 border border-slate-200 rounded-2xl p-6 shadow-sm backdrop-blur w-full">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Filtres</p>
          <h2 className="text-lg font-semibold text-slate-900">Affinez vos résultats</h2>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onSearch} className="flex items-center gap-2">
            <Search className="w-4 h-4" />
            Rechercher
          </Button>
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.4em] text-slate-500 hover:text-slate-700"
            onClick={() => setExpanded((prev) => !prev)}
          >
            {expanded ? (
              <>
                <ChevronUp className="w-3 h-3" />
                Réduire
              </>
            ) : (
              <>
                <ChevronDown className="w-3 h-3" />
                Déplier
              </>
            )}
          </button>
        </div>
      </div>

      <div
        className="w-full overflow-hidden transition-[max-height] duration-200"
        style={{ maxHeight: expanded ? '1000px' : '0px', width: '100%' }}
      >
        <div className="grid gap-4 md:grid-cols-[120px_160px_170px_170px_minmax(200px,1fr)] items-end">
          <label className="text-xs font-semibold text-slate-600">
            Année
            <Input
              placeholder="ex. 2025"
              value={filters.year ?? ''}
              onChange={handleChange('year')}
              className="mt-1"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            {corpus === 'joradp' ? 'N° de JO' : 'N° de décision'}
            <Input
              placeholder={corpus === 'joradp' ? 'ex. 45/2025' : 'ex. 10/2024'}
              value={filters.documentNumber ?? ''}
              onChange={handleChange('documentNumber')}
              className="mt-1"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Date de publication (début)
            <Input
              type="date"
              value={filters.from ?? ''}
              onChange={handleChange('from')}
              className="mt-1"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Date de publication (fin)
            <Input
              type="date"
              value={filters.to ?? ''}
              onChange={handleChange('to')}
              className="mt-1"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            Texte libre
            <Input
              placeholder="Rechercher un terme"
              value={filters.search ?? ''}
              onChange={handleChange('search')}
              className="mt-1"
            />
          </label>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-semibold text-slate-600">
            ET
            <Input
              placeholder="ex. fiscal, conformité"
              value={filters.keywordsAnd ?? ''}
              onChange={handleChange('keywordsAnd')}
              className="mt-1"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            OU
            <Input
              placeholder="ex. prud’h"
              value={filters.keywordsOr ?? ''}
              onChange={handleChange('keywordsOr')}
              className="mt-1"
            />
          </label>

          <label className="text-xs font-semibold text-slate-600">
            NOT
            <Input
              placeholder="ex. projet"
              value={filters.keywordsNot ?? ''}
              onChange={handleChange('keywordsNot')}
              className="mt-1"
            />
          </label>
        </div>

        <div className="mt-6">
          <Button
            variant="ghost"
            size="default"
            onClick={onSemanticOpen}
            className="rounded-full border border-slate-200 text-slate-700 hover:border-slate-400"
          >
            <Sparkles className="w-4 h-4" />
            Recherche sémantique
          </Button>
        </div>
      </div>
    </section>
  );
}
