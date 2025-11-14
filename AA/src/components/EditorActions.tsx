import React from 'react';
import { Button } from './ui/button';
import {
  AlertTriangle,
  CheckCircle,
  Download,
  FilePlus,
  FolderOpen,
  Loader2,
  Sparkles,
  Upload,
  XCircle,
  Globe,
  Save as SaveIcon,
} from 'lucide-react';

interface EditorActionsProps {
  isTemplateMode: boolean;
  translations: any;
  saveStatus: 'idle' | 'saving' | 'success' | 'error';
  showWorkspaceReminder: boolean;
  showClientReminder: boolean;
  workspaceSelectionWarning: string;
  clientSelectionWarning: string;
  onDismissWorkspaceReminder: () => void;
  onDismissClientReminder: () => void;
  onCreateNew: () => void;
  onOpenFile: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onInsertFile: () => void;
  onInsertTemplate: () => void;
  onLoadFromUrl: () => void;
}

export function EditorActions({
  isTemplateMode,
  translations,
  saveStatus,
  showWorkspaceReminder,
  showClientReminder,
  workspaceSelectionWarning,
  clientSelectionWarning,
  onDismissWorkspaceReminder,
  onDismissClientReminder,
  onCreateNew,
  onOpenFile,
  onSave,
  onSaveAs,
  onInsertFile,
  onInsertTemplate,
  onLoadFromUrl,
}: EditorActionsProps) {
  const t = translations;

  const renderSaveIcon = () => {
    if (saveStatus === 'saving') return <Loader2 className="w-4 h-4 mr-1 animate-spin" />;
    if (saveStatus === 'success') return <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />;
    if (saveStatus === 'error') return <XCircle className="w-4 h-4 mr-1 text-destructive" />;
    return <SaveIcon className="w-4 h-4 mr-1" />;
  };

  const renderSaveAsIcon = () => {
    if (saveStatus === 'saving') return <Loader2 className="w-4 h-4 mr-1 animate-spin" />;
    if (saveStatus === 'success') return <CheckCircle className="w-4 h-4 mr-1 text-emerald-600" />;
    if (saveStatus === 'error') return <XCircle className="w-4 h-4 mr-1 text-destructive" />;
    return <Download className="w-4 h-4 mr-1" />;
  };

  return (
    <>
      {(showWorkspaceReminder || (showClientReminder && !isTemplateMode)) && (
        <div className="space-y-2">
          {showWorkspaceReminder && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm cursor-pointer"
              onClick={onDismissWorkspaceReminder}
            >
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {workspaceSelectionWarning}
                </span>
                <span className="text-xs text-amber-800">
                  Sélectionnez le dossier /Misan pour activer les dossiers clients et accéder aux templates et documents.
                </span>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismissWorkspaceReminder();
                }}
                aria-label="Fermer l'avertissement workspace"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          )}

          {showClientReminder && !isTemplateMode && (
            <div
              role="alert"
              className="flex items-start justify-between gap-3 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 shadow-sm cursor-pointer"
              onClick={onDismissClientReminder}
            >
              <div className="flex flex-col gap-1">
                <span className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4" />
                  {clientSelectionWarning}
                </span>
                <span className="text-xs text-amber-800">
                  Ouvrez un dossier client pour activer l'enregistrement automatique des documents.
                </span>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="text-amber-700 hover:text-amber-900 hover:bg-amber-100"
                onClick={(event) => {
                  event.stopPropagation();
                  onDismissClientReminder();
                }}
                aria-label="Fermer l'avertissement client"
              >
                <XCircle className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.editorGeneralActions ?? 'Actions générales'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onCreateNew} variant="outline" size="sm" className="bg-white">
            <FilePlus className="w-4 h-4 mr-1" />
            {isTemplateMode ? (t.newTemplate ?? 'Nouveau template') : t.newDocument}
          </Button>

          <Button onClick={onOpenFile} variant="outline" size="sm" className="bg-white">
            <FolderOpen className="w-4 h-4 mr-1" />
            {isTemplateMode ? (t.openTemplate ?? 'Ouvrir un template') : t.openFile}
          </Button>

          <Button
            onClick={onSave}
            variant="secondary"
            size="sm"
            className="bg-white text-foreground"
            disabled={saveStatus === 'saving'}
          >
            {renderSaveIcon()}
            {t.saveFile}
          </Button>

          <Button
            onClick={onSaveAs}
            variant="outline"
            size="sm"
            className="bg-white"
            disabled={saveStatus === 'saving'}
          >
            {renderSaveAsIcon()}
            {t.saveAs}
          </Button>
        </div>
      </div>

      <div className="space-y-3">
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {t.editorInsertActions ?? 'Insertion ciblée'}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onInsertFile} variant="outline" size="sm" className="bg-white">
            <Upload className="w-4 h-4 mr-1" />
            {t.insertFromFile ?? t.insertFile}
          </Button>

          <Button onClick={onInsertTemplate} variant="outline" size="sm" className="bg-white">
            <Sparkles className="w-4 h-4 mr-1" />
            {t.insertTemplate ?? 'Insérer un template'}
          </Button>

          <Button onClick={onLoadFromUrl} variant="outline" size="sm" className="bg-white">
            <Globe className="w-4 h-4 mr-1" />
            {t.insertFromUrl ?? t.loadFromUrl}
          </Button>
        </div>
      </div>
    </>
  );
}
