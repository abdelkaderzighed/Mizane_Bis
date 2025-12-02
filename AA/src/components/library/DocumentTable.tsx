import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '../ui/table';
import { Eye, Globe, FileText } from 'lucide-react';
import { Badge } from '../ui/badge';
import { LibraryDocument } from '../../types/library';

interface DocumentTableProps {
  documents: LibraryDocument[];
  selectedIds: number[];
  loading?: boolean;
  corpus?: 'joradp' | 'cour_supreme';
  showScore?: boolean;
  sortField?: 'date' | 'year' | 'number';
  sortOrder?: 'asc' | 'desc';
  onSort?: (field: 'date' | 'year' | 'number') => void;
  onToggleSelect: (id: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onViewMetadata: (doc: LibraryDocument) => void;
  onOpenDocument?: (doc: LibraryDocument) => void;
}

export function DocumentTable({
  documents,
  selectedIds,
  loading,
  corpus = 'joradp',
  showScore = false,
  sortField = 'date',
  sortOrder = 'desc',
  onSort,
  onToggleSelect,
  onToggleSelectAll,
  onViewMetadata,
  onOpenDocument,
}: DocumentTableProps) {
  const allSelected = documents.length > 0 && documents.every((doc) => selectedIds.includes(doc.id));
  const handleSelectAll = (value: boolean | 'indeterminate') => {
    onToggleSelectAll(value === true);
  };

  const formatDate = (value?: string | null) => {
    if (!value) return '—';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('fr-FR');
  };

  const shorten = (value?: string | null, max = 20) => {
    if (!value) return '—';
    if (value.length <= max) return value;
    return `${value.slice(0, max - 1)}…`;
  };

  const formatScore = (value?: number | null) => {
    if (typeof value !== 'number' || Number.isNaN(value)) return '—';
    return value.toFixed(2);
  };

  const parseMeta = (doc: LibraryDocument) => {
    if (!doc.extra_metadata) return null;
    try {
      return typeof doc.extra_metadata === 'string' ? JSON.parse(doc.extra_metadata) : doc.extra_metadata;
    } catch {
      return null;
    }
  };

  const columnCount = (() => {
    if (corpus === 'cour_supreme') {
      return showScore ? 6 : 5;
    }
    return showScore ? 6 : 5;
  })();

  const SortHeader = ({ label, field, width }: { label: string; field: 'date' | 'year' | 'number'; width?: string }) => (
    <TableHead style={width ? { width } : undefined}>
      <button
        type="button"
        onClick={() => onSort?.(field)}
        className="flex items-center gap-1 text-left"
      >
        <span>{label}</span>
        <span className="text-[10px] text-slate-500">
          {sortField === field ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
        </span>
      </button>
    </TableHead>
  );

  const renderCsRow = (document: LibraryDocument, formattedDate: string, year: string) => (
    <>
      <TableCell className="whitespace-nowrap align-top">
        <div className="text-sm font-semibold text-slate-800">{year}</div>
      </TableCell>
      <TableCell className="whitespace-nowrap align-top">
        <div className="text-sm font-semibold text-slate-800">{formattedDate}</div>
      </TableCell>
      <TableCell className="max-w-[220px] align-top">
        <p className="text-sm font-semibold text-slate-900 leading-tight">
          {document.decision_number ?? '—'}
        </p>
      </TableCell>
      {showScore && (
        <TableCell className="text-center">
          <span className="text-sm font-semibold text-slate-800">{formatScore(document.score)}</span>
        </TableCell>
      )}
      <TableCell className="text-center">
        <div className="flex items-center justify-center gap-3">
          {document.file_path && (
            <button
              type="button"
              onClick={() => onOpenDocument?.(document)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
              title="Aperçu du document"
            >
              <Eye className="w-4 h-4 text-emerald-600" />
            </button>
          )}
          {document.url && (
            <a
              href={document.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
              title="Version officielle"
            >
              <Globe className="w-4 h-4 text-sky-600" />
            </a>
          )}
          {document.text_path && (
            <button
              type="button"
              onClick={() => onOpenDocument?.(document)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
              title="Texte brut (prévisualisation)"
            >
              <FileText className="w-4 h-4 text-amber-600" />
            </button>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
            onClick={() => onViewMetadata(document)}
            title="Métadonnées IA"
          >
            <FileText className="w-4 h-4 text-slate-700" />
          </button>
        </div>
      </TableCell>
    </>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-200 w-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
          <span>{documents.length} documents listés</span>
        </div>
        <span className="text-xs text-slate-500">
          {showScore ? 'Trié par score décroissant' : 'Trié par date de publication'}
        </span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[50px]">
              <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
            </TableHead>
            {corpus === 'cour_supreme' ? (
              <>
                <SortHeader label="Année" field="year" width="90px" />
                <SortHeader label="Date de publication" field="date" width="140px" />
                <SortHeader label="N° décision" field="number" width="200px" />
                {showScore && <TableHead className="w-[90px] text-center">Score</TableHead>}
                <TableHead className="w-[200px] text-center">Liens</TableHead>
              </>
            ) : (
              <>
                <SortHeader label="Année" field="year" width="120px" />
                <SortHeader label="Date de publication" field="date" width="140px" />
                <TableHead className="w-[220px]">Document</TableHead>
                {showScore && <TableHead className="w-[100px] text-center">Score</TableHead>}
                <TableHead className="w-[200px] text-center">Liens</TableHead>
              </>
            )}
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell className="py-10 text-center" colSpan={columnCount}>
                {loading ? 'Chargement en cours...' : 'Aucun document trouvé'}
              </TableCell>
            </TableRow>
          )}
          {documents.map((document) => {
            const isSelected = selectedIds.includes(document.id);
            const formattedDate = formatDate(document.publication_date);
            const year = formattedDate !== '—' ? formattedDate.split('/')[2] : '—';

            return (
              <React.Fragment key={document.id}>
                <TableRow className="align-middle">
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={(checked) => onToggleSelect(document.id, checked === true)}
                    />
                  </TableCell>
                  {corpus === 'cour_supreme'
                    ? renderCsRow(document, formattedDate, year)
                    : (
                      <>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-800">{year}</div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <div className="text-sm font-semibold text-slate-800">{formattedDate}</div>
                        </TableCell>
                        <TableCell className="max-w-[220px]">
                          {(() => {
                            const meta = parseMeta(document);
                            const title = meta?.title || meta?.title_fr || meta?.title_ar;
                            const keywords = Array.isArray(meta?.keywords) ? meta.keywords : [];
                            if (title || keywords.length > 0) {
                              return (
                                <>
                                  <p className="text-sm font-medium text-slate-800 line-clamp-2">
                                    {title}
                                  </p>
                                  {keywords.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      {keywords.slice(0, 4).map((kw: string, idx: number) => (
                                        <Badge key={`${document.id}-kw-${idx}`} variant="secondary" className="text-[10px] font-medium bg-slate-100 text-slate-700 border-slate-200">
                                          {kw}
                                        </Badge>
                                      ))}
                                    </div>
                                  )}
                                </>
                              );
                            }
                            return (
                              <p className="text-xs text-slate-500">
                                Disponible après analyse IA
                              </p>
                            );
                          })()}
                        </TableCell>
                        {showScore && (
                          <TableCell className="text-center">
                            <span className="text-sm font-semibold text-slate-800">{formatScore(document.score)}</span>
                          </TableCell>
                        )}
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-3">
                            {document.file_path && (
                              <a
                                href={document.file_path_signed ?? document.file_path}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                                title="Document (PDF)"
                              >
                                <Eye className="w-4 h-4 text-emerald-600" />
                              </a>
                            )}
                            {document.url && (
                              <a
                                href={document.url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                                title="Version officielle"
                              >
                                <Globe className="w-4 h-4 text-sky-600" />
                              </a>
                            )}
                            {document.text_path && (
                              <button
                                type="button"
                                onClick={() => onOpenDocument?.(document)}
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                                title="Texte brut (prévisualisation)"
                              >
                                <FileText className="w-4 h-4 text-amber-600" />
                              </button>
                            )}
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 hover:bg-slate-50"
                              onClick={() => onViewMetadata(document)}
                              title="Métadonnées IA"
                            >
                              <FileText className="w-4 h-4 text-slate-700" />
                            </button>
                          </div>
                        </TableCell>
                      </>
                    )}
                </TableRow>
                {corpus === 'cour_supreme' && (document.chamber_name || document.theme_name) && (
                  <TableRow className="bg-slate-50/50">
                    <TableCell colSpan={columnCount} className="py-2">
                      <div className="flex flex-wrap gap-2">
                        {document.chamber_name && (
                          <Badge variant="secondary" className="text-[11px] font-medium bg-emerald-100 text-emerald-800 border-emerald-200">
                            {document.chamber_name}
                          </Badge>
                        )}
                        {document.theme_name && (
                          <Badge variant="secondary" className="text-[11px] font-medium bg-sky-100 text-sky-800 border-sky-200">
                            {document.theme_name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
