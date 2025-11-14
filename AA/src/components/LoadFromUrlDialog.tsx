import React, { useEffect, useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import {
  Globe,
  Download,
  AlertCircle,
  CheckCircle,
  Loader2,
  FileText,
  Link as LinkIcon,
  BookOpen,
  Info,
  BarChart2
} from 'lucide-react';
import { toast } from 'sonner';

interface LoadFromUrlDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFileLoaded: (content: string, filename: string) => void;
  language?: 'fr' | 'en' | 'ar';
}

const translations = {
  fr: {
    title: "Charger fichier depuis URL",
    description: "Entrez l'URL directe d'un fichier pour charger son contenu dans l'éditeur.",
    fileUrl: "URL du fichier",
    load: "Analyser",
    reanalyze: "Relancer l'analyse",
    insertIntoEditor: "Insérer dans l'éditeur",
    cancel: "Annuler",
    loading: "Chargement...",
    fileLoaded: "Fichier chargé avec succès",
    analysisReady: "Analyse prête",
    loadError: "Erreur lors du chargement",
    invalidUrl: "URL invalide",
    networkError: "Erreur réseau",
    unsupportedFormat: "Format de fichier non supporté",
    urlPlaceholder: "https://example.com/document.txt",
    supportedFormats: "Formats supportés",
    preview: "Aperçu",
    analysisTitle: "Analyse IA",
    analysisSummary: "Résumé généré",
    analysisSummaryFallback: "Le résumé sera disponible après le chargement du contenu.",
    analysisMetadata: "Métadonnées",
    analysisPreview: "Aperçu du contenu",
    analysisPlaceholder: "Saisissez une URL puis lancez l'analyse pour obtenir un résumé et des métadonnées.",
    analysisSource: "Source",
    analysisType: "Type détecté",
    analysisCharacters: "Caractères",
    analysisLines: "Lignes",
    analysisLanguage: "Langue détectée",
    analysisEstimatedReading: "Temps de lecture",
    analysisMinutes: "min",
    analysisFilename: "Nom de fichier",
    analysisGeneratedAt: "Analysé le",
    examples: "Exemples d'URLs valides",
    directLink: "Lien direct vers fichier",
    rawContent: "Contenu brut (GitHub, etc.)",
    publicFile: "Fichier public",
    insertPrompt: "Analysez pour voir le résumé avant insertion."
  },
  en: {
    title: "Load file from URL",
    description: "Enter the direct URL of a file to load its content into the editor.",
    fileUrl: "File URL",
    load: "Analyse",
    reanalyze: "Re-run analysis",
    insertIntoEditor: "Insert into editor",
    cancel: "Cancel",
    loading: "Loading...",
    fileLoaded: "File loaded successfully",
    analysisReady: "Analysis ready",
    loadError: "Error loading file",
    invalidUrl: "Invalid URL",
    networkError: "Network error",
    unsupportedFormat: "Unsupported file format",
    urlPlaceholder: "https://example.com/document.txt",
    supportedFormats: "Supported formats",
    preview: "Preview",
    analysisTitle: "AI analysis",
    analysisSummary: "Generated summary",
    analysisSummaryFallback: "The summary will appear after analysing the document.",
    analysisMetadata: "Metadata",
    analysisPreview: "Content preview",
    analysisPlaceholder: "Enter a URL and launch the analysis to generate a summary and metadata.",
    analysisSource: "Source",
    analysisType: "Detected type",
    analysisCharacters: "Characters",
    analysisLines: "Lines",
    analysisLanguage: "Detected language",
    analysisEstimatedReading: "Reading time",
    analysisMinutes: "min",
    analysisFilename: "Filename",
    analysisGeneratedAt: "Analysed at",
    examples: "Valid URL examples",
    directLink: "Direct file link",
    rawContent: "Raw content (GitHub, etc.)",
    publicFile: "Public file",
    insertPrompt: "Analyse first to review the summary before inserting."
  },
  ar: {
    title: "تحميل ملف من رابط",
    description: "أدخل الرابط المباشر للملف لتحميل محتواه في المحرر.",
    fileUrl: "رابط الملف",
    load: "تحليل",
    reanalyze: "إعادة التحليل",
    insertIntoEditor: "إدراج في المحرر",
    cancel: "إلغاء",
    loading: "جارٍ التحميل...",
    fileLoaded: "تم تحميل الملف بنجاح",
    analysisReady: "اكتمل التحليل",
    loadError: "حدث خطأ أثناء التحميل",
    invalidUrl: "رابط غير صالح",
    networkError: "خطأ في الشبكة",
    unsupportedFormat: "تنسيق غير مدعوم",
    urlPlaceholder: "https://example.com/document.txt",
    supportedFormats: "التنسيقات المدعومة",
    preview: "معاينة",
    analysisTitle: "تحليل بالذكاء الاصطناعي",
    analysisSummary: "ملخص تم توليده",
    analysisSummaryFallback: "سيظهر الملخص بعد تحليل المستند.",
    analysisMetadata: "البيانات الوصفية",
    analysisPreview: "معاينة المحتوى",
    analysisPlaceholder: "أدخل رابطًا ثم ابدأ التحليل للحصول على ملخص وبيانات وصفية.",
    analysisSource: "المصدر",
    analysisType: "النوع المكتشف",
    analysisCharacters: "عدد الأحرف",
    analysisLines: "عدد الأسطر",
    analysisLanguage: "اللغة المكتشفة",
    analysisEstimatedReading: "مدة القراءة",
    analysisMinutes: "دقيقة",
    analysisFilename: "اسم الملف",
    analysisGeneratedAt: "تاريخ التحليل",
    examples: "أمثلة على الروابط الصحيحة",
    directLink: "رابط مباشر للملف",
    rawContent: "محتوى خام (GitHub وغيرها)",
    publicFile: "ملف عام",
    insertPrompt: "قم بالتحليل لمراجعة الملخص قبل الإدراج."
  }
} as const;


export default function LoadFromUrlDialog({
  open,
  onOpenChange,
  onFileLoaded,
  language = 'fr'
}: LoadFromUrlDialogProps) {
  const [fileUrl, setFileUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadedContent, setLoadedContent] = useState<string | null>(null);
  const [analysisSummary, setAnalysisSummary] = useState<string | null>(null);
  const [analysisMetadata, setAnalysisMetadata] = useState<Array<{ label: string; value: string }>>([]);
  const [resolvedFilename, setResolvedFilename] = useState('');

  const t = translations[language];

  const clearAnalysis = () => {
    setLoadedContent(null);
    setAnalysisSummary(null);
    setAnalysisMetadata([]);
    setResolvedFilename('');
  };

  useEffect(() => {
    clearAnalysis();
  }, [fileUrl]);

  useEffect(() => {
    if (!open) {
      setFileUrl('');
      clearAnalysis();
      setIsLoading(false);
    }
  }, [open]);

  const getFileTypeFromUrl = (url: string): { type: string; extension: string } | null => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname.toLowerCase();
      const supportedExtensions = {
        '.txt': 'text',
        '.md': 'markdown',
        '.markdown': 'markdown',
        '.json': 'json',
        '.csv': 'csv',
        '.html': 'html',
        '.htm': 'html',
        '.xml': 'xml',
        '.rtf': 'rtf',
        '.log': 'text'
      };
      for (const [ext, type] of Object.entries(supportedExtensions)) {
        if (pathname.endsWith(ext)) {
          return { type, extension: ext };
        }
      }
      return null;
    } catch {
      return null;
    }
  };

  const getFilenameFromUrl = (url: string): string => {
    try {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      const filename = pathname.split('/').pop() || 'fichier_telecharge';
      return filename;
    } catch {
      return 'fichier_telecharge.txt';
    }
  };

  const handleLoadFile = async () => {
    if (!fileUrl.trim()) return;

    try {
      new URL(fileUrl);
    } catch {
      toast.error(t.invalidUrl);
      return;
    }

    const fileInfo = getFileTypeFromUrl(fileUrl);
    if (!fileInfo) {
      toast.error(t.unsupportedFormat);
      return;
    }

    setIsLoading(true);
    clearAnalysis();
    try {
      const filename = getFilenameFromUrl(fileUrl);
      let mockContent = '';

      switch (fileInfo.type) {
        case 'markdown':
          mockContent = `# Document chargé depuis URL

Source : ${fileUrl}
Type : Markdown
Date : ${new Date().toLocaleString()}

## Exemple
- Point clé 1
- Point clé 2
- Point clé 3

> Ce contenu est simulé pour démontrer la structure de l'analyse.`;
          break;
        case 'json':
          mockContent = `{"source":"${fileUrl}","loaded_at":"${new Date().toISOString()}","data":{"title":"Document exemple","items":[{"id":1,"value":"Contenu"},{"id":2,"value":"Additionnel"}]}}`;
          break;
        case 'csv':
          mockContent = `nom,email,ville
Jean Dupont,jean@example.com,Paris
Marie Martin,marie@example.com,Lyon`;
          break;
        case 'html':
          mockContent = `<!DOCTYPE html>
<html><body><h1>Page chargée</h1><p>URL : ${fileUrl}</p></body></html>`;
          break;
        default:
          mockContent = `Document chargé depuis ${fileUrl}

${new Date().toLocaleString()}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
          break;
      }

      setResolvedFilename(filename);
      setLoadedContent(mockContent);

      const paragraphs = mockContent.split(/(?:\r?\n){2,}/).filter(Boolean);
      const summaryCandidate = paragraphs.slice(0, 2).join('\n\n');
      const truncatedSummary = summaryCandidate.length > 600
        ? `${summaryCandidate.slice(0, 600)}…`
        : summaryCandidate;
      setAnalysisSummary(truncatedSummary || t.analysisSummaryFallback);

      const lineCount = mockContent.split('\n').length;
      const wordCount = mockContent.trim().split(/\s+/).filter(Boolean).length;
      const estimatedMinutes = Math.max(1, Math.round(wordCount / 180));

      setAnalysisMetadata([
        { label: t.analysisFilename, value: filename },
        { label: t.analysisSource, value: fileUrl },
        { label: t.analysisType, value: fileInfo.type.toUpperCase() },
        { label: t.analysisCharacters, value: mockContent.length.toLocaleString() },
        { label: t.analysisLines, value: lineCount.toString() },
        { label: t.analysisLanguage, value: language.toUpperCase() },
        { label: t.analysisEstimatedReading, value: `~${estimatedMinutes} ${t.analysisMinutes}` },
        { label: t.analysisGeneratedAt, value: new Date().toLocaleString() }
      ]);

      toast.success(t.analysisReady);
    } catch (error) {
      toast.error(t.loadError);
      console.error('Erreur de chargement URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInsertIntoEditor = () => {
    if (!loadedContent) return;
    const fallbackName = getFilenameFromUrl(fileUrl) || 'document_url.txt';
    const filename = resolvedFilename || fallbackName;
    onFileLoaded(loadedContent, filename);
    onOpenChange(false);
  };

  const fileInfo = fileUrl ? getFileTypeFromUrl(fileUrl) : null;
  const filename = fileUrl ? getFilenameFromUrl(fileUrl) : '';
  const summaryText = analysisSummary ?? t.analysisSummaryFallback;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            {t.title}
          </DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">{t.fileUrl}</label>
            <Input
              value={fileUrl}
              onChange={(e) => setFileUrl(e.target.value)}
              placeholder={t.urlPlaceholder}
              dir="ltr"
              type="url"
            />
          </div>

          {fileUrl && (
            <Card className="p-3 bg-muted/60">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">{t.preview}:</span>
                </div>
                <div className="font-mono text-xs break-all bg-background p-2 rounded border">{fileUrl}</div>
                {fileInfo ? (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <div className="flex items-center gap-2 text-sm">
                      <Badge variant="outline" className="text-xs">{fileInfo.extension.toUpperCase()}</Badge>
                      <span className="text-muted-foreground">→</span>
                      <span className="font-medium">{filename}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm text-amber-700">{t.unsupportedFormat}</span>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Separator />

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <BarChart2 className="w-4 h-4 text-muted-foreground" />
              {t.analysisTitle}
            </div>

            {loadedContent ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <Card className="p-4 bg-background">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <BookOpen className="w-4 h-4 text-muted-foreground" />
                      {t.analysisSummary}
                    </div>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{summaryText}</p>
                  </Card>

                  <Card className="p-4">
                    <div className="flex items-center gap-2 text-sm font-medium mb-2">
                      <Info className="w-4 h-4 text-muted-foreground" />
                      {t.analysisMetadata}
                    </div>
                    <div className="space-y-2 text-sm">
                      {analysisMetadata.map((item) => (
                        <div key={item.label} className="flex items-center justify-between gap-3">
                          <span className="text-muted-foreground">{item.label}</span>
                          <span className="font-medium text-right break-all">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {t.analysisPreview}
                  </div>
                  <Card className="mt-2 border-dashed border-muted-foreground/40">
                    <ScrollArea className="h-56 w-full">
                      <pre className="whitespace-pre-wrap text-xs font-mono leading-relaxed text-muted-foreground">{loadedContent}</pre>
                    </ScrollArea>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="rounded border border-dashed border-muted-foreground/50 bg-muted/40 p-4 text-xs text-muted-foreground">
                {t.analysisPlaceholder}
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm font-medium">
              <FileText className="w-4 h-4" />
              {t.supportedFormats}
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <Badge variant="outline">TXT</Badge>
              <Badge variant="outline">MD</Badge>
              <Badge variant="outline">JSON</Badge>
              <Badge variant="outline">CSV</Badge>
              <Badge variant="outline">HTML</Badge>
              <Badge variant="outline">XML</Badge>
              <Badge variant="outline">RTF</Badge>
              <Badge variant="outline">LOG</Badge>
            </div>
            <div className="space-y-2 text-xs text-muted-foreground">
              <p className="font-medium">{t.examples} :</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" />
                  <span>{t.directLink}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  <span>{t.rawContent}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span>{t.publicFile}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{loadedContent ? t.analysisReady : t.insertPrompt}</p>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => onOpenChange(false)}>{t.cancel}</Button>
            <Button
              variant="outline"
              onClick={handleLoadFile}
              disabled={!fileUrl.trim() || !fileInfo || isLoading}
            >
              {isLoading ? (<Loader2 className="w-4 h-4 mr-2 animate-spin" />) : (<Download className="w-4 h-4 mr-2" />)}
              {loadedContent ? t.reanalyze : t.load}
            </Button>
            <Button onClick={handleInsertIntoEditor} disabled={!loadedContent}>
              <Download className="w-4 h-4 mr-2" />
              {t.insertIntoEditor}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
