import React, { useState } from 'react';
import { LibraryFilters } from '../../types/library';
import { Loader2, Search, Sparkles } from 'lucide-react';

interface FiltersPanelProps {
  filters: LibraryFilters;
  onFiltersChange: (filters: LibraryFilters) => void;
  onSearch: () => void;
  onSemanticSearch: () => void;
  onReset: () => void;
  semanticQuery: string;
  onSemanticQueryChange: (value: string) => void;
  languageScope: 'ar' | 'fr' | 'both';
  onLanguageScopeChange: (scope: 'ar' | 'fr' | 'both') => void;
  resultCount?: number;
  isSearching?: boolean;
  isSemanticSearching?: boolean;
  corpus: 'joradp' | 'cour_supreme';
}

const yearOptions = Array.from({ length: 64 }, (_, i) => `${2025 - i}`);

export function FiltersPanel({
  filters,
  onFiltersChange,
  onSearch,
  onSemanticSearch,
  onReset,
  semanticQuery,
  onSemanticQueryChange,
  languageScope,
  onLanguageScopeChange,
  resultCount,
  isSearching,
  isSemanticSearching,
  corpus,
}: FiltersPanelProps) {
  const [showAdvancedCs, setShowAdvancedCs] = useState(false);
  const handleChange =
    (key: keyof LibraryFilters) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      onFiltersChange({
        ...filters,
        [key]: event.target.value,
      });
    };

  const renderJoradp = () => (
    <div className="mt-3 bg-gray-50 p-4 rounded border">
      <div className="grid grid-cols-5 gap-2">
        <div>
          <label className="block text-xs font-medium mb-1">Année</label>
          <select
            value={filters.year ?? ''}
            onChange={handleChange('year')}
            className="w-full px-2 py-1 border rounded text-xs"
          >
            <option value="">Toutes</option>
            {yearOptions.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Date début</label>
          <input
            type="date"
            value={filters.from ?? ''}
            onChange={handleChange('from')}
            className="w-full px-2 py-1 border rounded text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Date fin</label>
          <input
            type="date"
            value={filters.to ?? ''}
            onChange={handleChange('to')}
            className="w-full px-2 py-1 border rounded text-xs"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Statut</label>
          <select
            value={filters.status ?? 'all'}
            onChange={handleChange('status')}
            className="w-full px-2 py-1 border rounded text-xs"
          >
            <option value="all">Tous</option>
            <option value="collected">Collectés</option>
            <option value="downloaded">Téléchargés</option>
            <option value="analyzed">Analysés</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">N° Document</label>
          <input
            type="text"
            value={filters.documentNumber ?? ''}
            onChange={handleChange('documentNumber')}
            placeholder="Ex: 045"
            className="w-full px-2 py-1 border rounded text-xs"
          />
        </div>
      </div>

      <div className="grid grid-cols-5 gap-2 mt-3 pt-3 border-t">
        <div>
          <label className="block text-xs font-medium mb-1">Contient TOUS (ET)</label>
          <input
            type="text"
            value={filters.keywordsAnd ?? ''}
            onChange={handleChange('keywordsAnd')}
            placeholder="mot1, mot2"
            className="w-full px-2 py-1 border rounded text-xs"
            title="Documents contenant tous ces mots"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Contient UN DE (OU)</label>
          <input
            type="text"
            value={filters.keywordsOr ?? ''}
            onChange={handleChange('keywordsOr')}
            placeholder="mot1, mot2, mot3"
            className="w-full px-2 py-1 border rounded text-xs"
            title="Documents contenant au moins un de ces mots"
          />
        </div>
        <div>
          <label className="block text-xs font-medium mb-1">Ne contient pas</label>
          <input
            type="text"
            value={filters.keywordsNot ?? ''}
            onChange={handleChange('keywordsNot')}
            placeholder="mot1, mot2"
            className="w-full px-2 py-1 border rounded text-xs"
          />
        </div>
        <div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 mt-3 items-center">
        <button
          onClick={onSearch}
          disabled={isSearching}
          className={`px-4 py-2 rounded text-sm font-medium text-white ${isSearching ? 'bg-blue-300' : 'bg-blue-600 hover:bg-blue-700'}`}
        >
          {isSearching ? (
            <span className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Filtrage...
            </span>
          ) : (
            'Filtrer'
          )}
        </button>
        <button
          onClick={onReset}
          className="px-4 py-2 text-xs text-blue-600 hover:text-blue-800"
        >
          ↻ Réinitialiser
        </button>
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <input
            type="text"
            value={semanticQuery}
            onChange={(e) => onSemanticQueryChange(e.target.value)}
            placeholder="Recherche sémantique (requête en langage naturel)"
            className="flex-1 px-3 py-2 border rounded text-sm bg-white"
          />
          <button
            onClick={onSemanticSearch}
            disabled={isSemanticSearching}
            className="px-4 py-2 rounded text-xs font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-60 flex items-center gap-1"
          >
            {isSemanticSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {isSemanticSearching ? 'Recherche...' : 'Recherche sémantique'}
          </button>
        </div>
        <div className="text-xs text-gray-600 flex items-center">
          Résultats : {resultCount ?? 0}
        </div>
      </div>
    </div>
  );

  const renderLanguageChips = () => (
    <div className="flex flex-wrap gap-2 items-center">
      <span className="text-sm font-medium text-gray-700">Langue de recherche :</span>
      {(['ar', 'fr', 'both'] as const).map((key) => (
        <button
          key={key}
          onClick={() => onLanguageScopeChange(key)}
          className={`px-3 py-1 text-xs font-medium rounded-full border ${
            languageScope === key
              ? 'bg-blue-600 text-white border-blue-600'
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-100'
          }`}
        >
          {key === 'ar' ? 'Arabe' : key === 'fr' ? 'Français' : 'Les deux'}
        </button>
      ))}
    </div>
  );

  const renderCourSupreme = () => (
    <div className="bg-white rounded-lg shadow-sm border p-4">
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input
          type="text"
          placeholder="Recherche sémantique, tapez ce que vous souhaitez"
          value={semanticQuery}
          onChange={(e) => onSemanticQueryChange(e.target.value)}
          className="flex-1 border rounded-lg px-4 py-2 min-w-[200px]"
        />
        <button
          onClick={onSemanticSearch}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all flex items-center gap-2"
          disabled={isSemanticSearching}
        >
          {isSemanticSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          {isSemanticSearching ? 'Recherche...' : 'Rechercher'}
        </button>
        {onReset && (
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-200 rounded-lg text-xs font-medium"
          >
            Effacer
          </button>
        )}
        <div className="flex-1 flex items-center justify-end gap-2 text-xs text-gray-500">
          {isSearching && (
            <span
              className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"
              role="status"
              aria-label="Recherche en cours"
            />
          )}
          <span>
            {typeof resultCount === 'number'
              ? `${resultCount} décision(s) trouvée(s)`
              : 'Aucun résultat calculé pour l’instant'}
          </span>
        </div>
      </div>

      <button
        onClick={() => setShowAdvancedCs((prev) => !prev)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
        type="button"
      >
        {showAdvancedCs ? '▼ Masquer recherche avancée' : '▶ Recherche avancée'}
      </button>

      {showAdvancedCs && (
        <div className="bg-gray-50 rounded-lg p-4 space-y-3 mt-3">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés inclusifs (ET)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="ex: مرور حادث"
                value={filters.keywordsAnd ?? ''}
                onChange={handleChange('keywordsAnd')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés alternatifs (OU)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="ex: حادث|حريق"
                value={filters.keywordsOr ?? ''}
                onChange={handleChange('keywordsOr')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mots-clés exclusifs (NON)</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="ex: استئناف"
                value={filters.keywordsNot ?? ''}
                onChange={handleChange('keywordsNot')}
              />
            </div>
          </div>

          {renderLanguageChips()}

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Numéro de décision</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="ex: 00001"
                value={filters.documentNumber ?? ''}
                onChange={handleChange('documentNumber')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="JJ/MM/AAAA"
                value={filters.from ?? ''}
                onChange={handleChange('from')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="text"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="JJ/MM/AAAA"
                value={filters.to ?? ''}
                onChange={handleChange('to')}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2 mt-2">
            <button
              type="button"
              onClick={onSearch}
              className="flex-1 min-w-[180px] py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-center"
            >
              Rechercher avec filtres
            </button>
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="flex-1 min-w-[180px] py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-medium text-center"
              >
                Réinitialiser les filtres
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  const title = corpus === 'joradp' ? 'Barre de filtres JORADP' : 'Recherche Cour Suprême';
  return (
    <section className="w-full">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      </div>
      {corpus === 'joradp' ? renderJoradp() : renderCourSupreme()}
    </section>
  );
}
