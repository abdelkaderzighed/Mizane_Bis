import React from 'react';
import { Checkbox } from '../ui/checkbox';
import { Table, TableHead, TableHeader, TableRow, TableBody, TableCell } from '../ui/table';
import { BookOpen, Eye, Globe, FileText } from 'lucide-react';
import { LibraryDocument } from '../../types/library';

interface DocumentTableProps {
  documents: LibraryDocument[];
  selectedIds: number[];
  loading?: boolean;
  onToggleSelect: (id: number, checked: boolean) => void;
  onToggleSelectAll: (checked: boolean) => void;
  onViewMetadata: (doc: LibraryDocument) => void;
}

export function DocumentTable({
  documents,
  selectedIds,
  loading,
  onToggleSelect,
  onToggleSelectAll,
  onViewMetadata,
}: DocumentTableProps) {
  const allSelected = documents.length > 0 && documents.every((doc) => selectedIds.includes(doc.id));
  const handleSelectAll = (value: boolean | 'indeterminate') => {
    onToggleSelectAll(value === true);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm shadow-slate-200 w-full">
      <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
          <span>{documents.length} documents listés</span>
        </div>
        <span className="text-xs text-slate-500">Trié par date de publication</span>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-1/12">
              <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
            </TableHead>
            <TableHead className="w-2/12">Année</TableHead>
            <TableHead className="w-3/12">Document</TableHead>
            <TableHead className="w-3/12">Liens</TableHead>
            <TableHead className="w-3/12">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documents.length === 0 && (
            <TableRow>
              <TableCell className="py-10 text-center" colSpan={5}>
                {loading ? 'Chargement en cours...' : 'Aucun document correspondant aux filtres'}
              </TableCell>
            </TableRow>
          )}
          {documents.map((document) => {
            const isSelected = selectedIds.includes(document.id);
            const year = document.publication_date ? new Date(document.publication_date).getFullYear() : '—';
            const formattedDate = document.publication_date
              ? new Date(document.publication_date).toLocaleDateString('fr-FR')
              : '—';

            return (
              <TableRow key={document.id}>
                <TableCell>
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) => onToggleSelect(document.id, checked === true)}
                  />
                </TableCell>
                <TableCell>
                  <div className="text-sm font-semibold text-slate-700">{year}</div>
                  <div className="text-xs text-slate-400">{formattedDate}</div>
                </TableCell>
                <TableCell className="max-w-[220px]">
                  <p className="text-sm font-medium text-slate-800">{document.url ?? 'Sans titre'}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{document.file_path ?? '—'}</p>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-2 text-xs text-slate-500">
                    {document.file_path && (
                      <a
                        href={document.file_path}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
                      >
                        <Eye className="w-4 h-4 text-emerald-600" />
                        Voir sur R2
                      </a>
                    )}
                    {document.url && (
                      <a
                        href={document.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-2 text-slate-600 hover:text-slate-800"
                      >
                        <Globe className="w-4 h-4 text-sky-600" />
                        Version officielle
                      </a>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600 hover:bg-slate-50"
                      onClick={() => onViewMetadata(document)}
                    >
                      <FileText className="w-4 h-4" />
                      Métadonnées
                    </button>
                    <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700">
                      <BookOpen className="w-3 h-3" />
                      {document.metadata_collected_at ? 'Analyser' : 'Non analysé'}
                    </span>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
