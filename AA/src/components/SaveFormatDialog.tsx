import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Download, FileText, File, FileType } from 'lucide-react';

interface SaveFormatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filename: string;
  onSave: (filename: string, format: string) => Promise<void> | void;
  hasMarkdown: boolean;
  onFilenameChange?: (value: string) => void;
  language?: string;
}

export default function SaveFormatDialog({
  open,
  onOpenChange,
  filename,
  onSave,
  hasMarkdown,
  onFilenameChange,
  language
}: SaveFormatDialogProps) {
  const [selectedFormat, setSelectedFormat] = useState<'txt' | 'rtf' | 'md' | 'docx'>('txt');
  const [saveFilename, setSaveFilename] = useState(filename);

  const translations = {
    fr: {
      saveAs: 'Sauvegarder sous',
      chooseFormat: 'Choisir le format',
      filename: 'Nom du fichier',
      save: 'Sauvegarder',
      cancel: 'Annuler',
      description: 'Choisissez le format et le nom pour votre fichier.',
      txtFormat: 'Texte brut (TXT)',
      rtfFormat: 'Texte enrichi (RTF)',
      mdFormat: 'Markdown (MD)',
      docxFormat: 'Microsoft Word (DOCX)',
      txtDescription: 'Format texte simple, compatible partout',
      rtfDescription: 'Format avec mise en forme basique, compatible Word',
      mdDescription: 'Format Markdown avec formatage préservé',
      docxDescription: 'Word généré automatiquement à partir du contenu'
    },
    en: {
      saveAs: 'Save As',
      chooseFormat: 'Choose format',
      filename: 'Filename',
      save: 'Save',
      cancel: 'Cancel',
      description: 'Choose the format and name for your file.',
      txtFormat: 'Plain Text (TXT)',
      rtfFormat: 'Rich Text (RTF)',
      mdFormat: 'Markdown (MD)',
      docxFormat: 'Microsoft Word (DOCX)',
      txtDescription: 'Simple text format, works everywhere',
      rtfDescription: 'Format with basic formatting, Word compatible',
      mdDescription: 'Markdown format with preserved formatting',
      docxDescription: 'Word document automatically generated from your content'
    },
    ar: {
      saveAs: 'حفظ باسم',
      chooseFormat: 'اختيار التنسيق',
      filename: 'اسم الملف',
      save: 'حفظ',
      cancel: 'إلغاء',
      description: 'اختر التنسيق والاسم لملفك.',
      txtFormat: 'نص عادي (TXT)',
      rtfFormat: 'نص منسق (RTF)',
      mdFormat: 'ماركداون (MD)',
      docxFormat: 'وورد (DOCX)',
      txtDescription: 'تنسيق نص بسيط، يعمل في كل مكان',
      rtfDescription: 'تنسيق مع تنسيق أساسي، متوافق مع Word',
      mdDescription: 'تنسيق ماركداون مع حفظ التنسيق',
      docxDescription: 'ملف Word يتم توليده تلقائياً من المحتوى'
    }
  };

  const t = translations['fr']; // Utiliser le français par défaut

  const handleSave = async () => {
    if (!saveFilename.trim()) return;
    
    // Assurer l'extension correcte
    let finalFilename = saveFilename;
    const hasExtension = finalFilename.includes('.');
    
    if (!hasExtension) {
      finalFilename += selectedFormat === 'rtf'
        ? '.rtf'
        : selectedFormat === 'md'
          ? '.md'
          : selectedFormat === 'docx'
            ? '.docx'
            : '.txt';
    } else {
      // Remplacer l'extension si elle ne correspond pas au format sélectionné
      const extensionMatch = finalFilename.match(/\.([^.]+)$/);
      if (extensionMatch) {
        const currentExt = extensionMatch[1].toLowerCase();
        const expectedExt = selectedFormat;
        if (currentExt !== expectedExt) {
          finalFilename = finalFilename.replace(/\.[^.]+$/, `.${expectedExt}`);
        }
      }
    }

    const result = onSave(finalFilename, selectedFormat);
    if (result instanceof Promise) {
      await result;
    }
    onOpenChange(false);
  };

  React.useEffect(() => {
    setSaveFilename(filename);
    // Si le document contient du Markdown, suggérer le format MD par défaut
    if (hasMarkdown) {
      setSelectedFormat('md');
    }
  }, [filename, hasMarkdown]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="w-5 h-5" />
            {t.saveAs}
          </DialogTitle>
          <DialogDescription>
            {t.description}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Sélection du format */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.chooseFormat}</label>
            <Select
              value={selectedFormat}
              onValueChange={(value: 'txt' | 'rtf' | 'md' | 'docx') => setSelectedFormat(value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="txt">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    <div>
                      <div>{t.txtFormat}</div>
                      <div className="text-xs text-muted-foreground">{t.txtDescription}</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="rtf">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <div>
                      <div>{t.rtfFormat}</div>
                      <div className="text-xs text-muted-foreground">{t.rtfDescription}</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="md">
                  <div className="flex items-center gap-2">
                    <File className="w-4 h-4" />
                    <div>
                      <div>{t.mdFormat}</div>
                      <div className="text-xs text-muted-foreground">{t.mdDescription}</div>
                    </div>
                  </div>
                </SelectItem>
                <SelectItem value="docx">
                  <div className="flex items-center gap-2">
                    <FileType className="w-4 h-4" />
                    <div>
                      <div>{t.docxFormat}</div>
                      <div className="text-xs text-muted-foreground">{t.docxDescription}</div>
                    </div>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Nom du fichier */}
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.filename}</label>
            <div className="flex gap-2">
              <Input
                value={saveFilename}
                onChange={(e) => {
                  setSaveFilename(e.target.value);
                  onFilenameChange?.(e.target.value);
                }}
                placeholder={t.filename}
                className="flex-1"
                style={{
                  direction: language === 'ar' ? 'rtl' : 'ltr',
                  textAlign: language === 'ar' ? 'right' : 'left'
                }}
              />
              <Badge variant="outline" className="px-3 py-2">
                .{selectedFormat}
              </Badge>
            </div>
          </div>

          {/* Aperçu des fonctionnalités */}
          <div className="p-3 bg-muted/50 rounded-lg text-xs">
            {selectedFormat === 'rtf' ? (
              <div className="space-y-1">
                <div className="font-medium text-green-600">Format RTF - Fonctionnalités :</div>
                <div>✓ Conversion automatique du Markdown</div>
                <div>✓ Gras, italique, titres</div>
                <div>✓ Compatible Microsoft Word</div>
              </div>
            ) : selectedFormat === 'docx' ? (
              <div className="space-y-1">
                <div className="font-medium text-purple-600">Format DOCX - Fonctionnalités :</div>
                <div>✓ Fichier Word généré automatiquement</div>
                <div>✓ Titres et listes convertis</div>
                <div>✓ Compatible Word, Google Docs, LibreOffice</div>
              </div>
            ) : selectedFormat === 'md' ? (
              <div className="space-y-1">
                <div className="font-medium text-amber-600">Format MD - Fonctionnalités :</div>
                <div>✓ Markdown natif conservé</div>
                <div>✓ Idéal pour la réutilisation dans l'éditeur</div>
                <div>✓ Compatible générateurs statiques</div>
              </div>
            ) : (
              <div className="space-y-1">
                <div className="font-medium text-blue-600">Format TXT - Fonctionnalités :</div>
                <div>✓ Préservation du Markdown</div>
                <div>✓ Compatible tous éditeurs</div>
                <div>✓ Taille de fichier optimale</div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
          <Button onClick={handleSave} disabled={!saveFilename.trim()}>
            <Download className="w-4 h-4 mr-2" />
            {t.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
