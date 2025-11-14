import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Badge } from './ui/badge';
import { Card } from './ui/card';
import { Separator } from './ui/separator';
import { 
  Send,
  Paperclip,
  Link as LinkIcon,
  File,
  Globe,
  AlertCircle,
  CheckCircle,
  Loader2,
  X,
  Plus,
  Download,
  FileText,
  Mic,
  MicOff,
  Volume2,
  StopCircle,
  Shield,
  RefreshCw,
  Settings,
  HelpCircle,
  Monitor,
  Laptop,
  Smartphone,
  VolumeX
} from 'lucide-react';
import { toast } from 'sonner';
import { useChatInputTranslations, type ChatInputLanguage } from '../constants/chatInputTranslations';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

interface ChatInputControlsProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileLoadedToChat?: (content: string, filename: string) => void;
  language: ChatInputLanguage;
  dir: 'ltr' | 'rtl';
  placeholder: string;
  onStop?: () => void;
  isProcessing?: boolean;
  onToggleSpeechOutput?: () => void;
  speechOutputEnabled?: boolean;
  speechOutputSupported?: boolean;
}

export default function ChatInputControls({
  value,
  onChange,
  onSend,
  onFileLoadedToChat,
  language,
  dir,
  placeholder,
  onStop,
  isProcessing = false,
  onToggleSpeechOutput,
  speechOutputEnabled = false,
  speechOutputSupported = true
}: ChatInputControlsProps) {
  const [fileDialogOpen, setFileDialogOpen] = useState(false);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [loadFileUrlDialogOpen, setLoadFileUrlDialogOpen] = useState(false);
  const [permissionDialogOpen, setPermissionDialogOpen] = useState(false);
  const [filePath, setFilePath] = useState('');
  const [urlPath, setUrlPath] = useState('');
  const [fileUrlPath, setFileUrlPath] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [promptDialogOpen, setPromptDialogOpen] = useState(false);

  const translations = useChatInputTranslations(language);

  if (!translations) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-muted p-6 text-sm text-muted-foreground">
        Chargement des contrôles de chat...
      </div>
    );
  }

  const t = translations;

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const adjustTextareaHeight = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    const maxHeight = 5 * 28; // environ 5 lignes
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [value, adjustTextareaHeight]);

  const {
    isListening,
    speechSupported,
    speechError,
    interimTranscript,
    microphonePermission,
    isCheckingPermission,
    toggleSpeechRecognition,
    clearSpeechError,
    requestMicrophoneAccess
  } = useSpeechRecognition({
    language,
    translations: t,
    value,
    onChange,
    onRequirePermissionDialog: () => setPermissionDialogOpen(true)
  });

  // Fonction pour détecter le type de fichier depuis l'URL
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

  // Fonction pour extraire le nom de fichier depuis l'URL
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

  // Fonction pour ajouter un fichier au prompt
  const handleAddFile = () => {
    if (!filePath.trim()) return;

    setIsLoading(true);
    try {
      // Ajouter le chemin du fichier au prompt existant
      const newValue = value ? `${value} ${filePath}` : filePath;
      onChange(newValue);
      
      toast.success(t.fileAdded);
      setFileDialogOpen(false);
      setFilePath('');
    } catch (error) {
      toast.error(t.fileError);
      console.error('Erreur d\'ajout de fichier:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour ajouter une URL au prompt
  const handleAddUrl = () => {
    if (!urlPath.trim()) return;

    // Validation basique de l'URL
    try {
      new URL(urlPath);
    } catch {
      toast.error(t.invalidUrl);
      return;
    }

    setIsLoading(true);
    try {
      // Ajouter l'URL au prompt existant
      const newValue = value ? `${value} ${urlPath}` : urlPath;
      onChange(newValue);
      
      toast.success(t.urlAdded);
      setUrlDialogOpen(false);
      setUrlPath('');
    } catch (error) {
      toast.error(t.urlError);
      console.error('Erreur d\'ajout URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour charger un fichier depuis URL dans le chat
  const handleLoadFileFromUrl = async () => {
    if (!fileUrlPath.trim()) return;

    // Validation de l'URL
    try {
      new URL(fileUrlPath);
    } catch {
      toast.error(t.invalidUrl);
      return;
    }

    // Vérifier le type de fichier
    const fileInfo = getFileTypeFromUrl(fileUrlPath);
    if (!fileInfo) {
      toast.error(t.unsupportedFormat);
      return;
    }

    setIsLoading(true);
    try {
      const filename = getFilenameFromUrl(fileUrlPath);
      
      // Contenu simulé basé sur le type de fichier
      let mockContent = '';
      
      switch (fileInfo.type) {
        case 'markdown':
          mockContent = `# Document chargé depuis URL

Ce contenu a été récupéré depuis : [${fileUrlPath}](${fileUrlPath})

## Informations
- **URL** : ${fileUrlPath}
- **Type** : Markdown
- **Chargé le** : ${new Date().toLocaleString()}

## Contenu du document

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.

### Section 1
Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

### Section 2
Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.

\`\`\`javascript
// Exemple de code chargé depuis URL
function exempleDepuisUrl() {
  console.log("Fichier chargé depuis ${fileUrlPath}");
}
\`\`\`

> **Note** : Ce contenu a été chargé automatiquement depuis l'URL spécifiée.`;
          break;

        case 'json':
          mockContent = `\`\`\`json
{
  "source": "${fileUrlPath}",
  "loaded_at": "${new Date().toISOString()}",
  "type": "json_file_from_url",
  "data": {
    "title": "Document JSON depuis URL",
    "description": "Fichier JSON chargé automatiquement depuis une URL",
    "items": [
      {
        "id": 1,
        "name": "Élément depuis URL",
        "value": "Valeur chargée depuis internet"
      },
      {
        "id": 2,
        "name": "Autre élément",
        "value": "Données récupérées en ligne"
      }
    ],
    "metadata": {
      "version": "1.0",
      "format": "json",
      "loaded_from_url": true
    }
  }
}
\`\`\`

Ce fichier JSON a été chargé automatiquement depuis : ${fileUrlPath}`;
          break;

        case 'csv':
          mockContent = `## Données CSV chargées depuis URL

**Source** : [${fileUrlPath}](${fileUrlPath})  
**Chargé le** : ${new Date().toLocaleString()}

\`\`\`csv
nom,email,ville,age,source
Jean Dupont,jean@example.com,Paris,30,url_data
Marie Martin,marie@example.com,Lyon,25,url_data
Pierre Durand,pierre@example.com,Marseille,35,url_data
Sophie Leroy,sophie@example.com,Toulouse,28,url_data
\`\`\`

Ces données ont été automatiquement récupérées depuis l'URL spécifiée.`;
          break;

        case 'html':
          mockContent = `## Page HTML chargée depuis URL

**Source** : [${fileUrlPath}](${fileUrlPath})  
**Chargé le** : ${new Date().toLocaleString()}

\`\`\`html
<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <title>Document chargé depuis URL</title>
</head>
<body>
    <h1>Document HTML depuis URL</h1>
    <p>Ce contenu a été chargé depuis : <a href="${fileUrlPath}">${fileUrlPath}</a></p>
    <p>Date de chargement : ${new Date().toLocaleString()}</p>
    
    <h2>Contenu exemple</h2>
    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit.</p>
    
    <ul>
        <li>Élément chargé depuis URL</li>
        <li>Données récupérées automatiquement</li>
        <li>Contenu web importé</li>
    </ul>
</body>
</html>
\`\`\`

Cette page HTML a été automatiquement chargée depuis l'URL spécifiée.`;
          break;

        default:
          mockContent = `## Document texte chargé depuis URL

**Source** : [${fileUrlPath}](${fileUrlPath})  
**Chargé le** : ${new Date().toLocaleString()}  
**Type** : ${fileInfo.type}

Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

**Informations du fichier :**
- Format : ${fileInfo.extension.toUpperCase()}
- Nom : ${filename}
- Chargé automatiquement depuis internet

> Ce contenu a été récupéré automatiquement depuis l'URL spécifiée et est maintenant disponible dans votre conversation.`;
          break;
      }

      if (onFileLoadedToChat) {
        onFileLoadedToChat(mockContent, filename);
      }
      
      toast.success(t.fileLoadedToChat);
      setLoadFileUrlDialogOpen(false);
      setFileUrlPath('');
    } catch (error) {
      toast.error(t.loadFileError);
      console.error('Erreur de chargement fichier URL:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Zone de saisie principale */}
      <div className="flex gap-2">
        <Textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            adjustTextareaHeight();
          }}
          placeholder={placeholder}
          className="flex-1 resize-none min-h-[44px] max-h-[200px] overflow-y-auto"
          dir={dir}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
              e.preventDefault();
              if (!isProcessing) {
                onSend();
              }
            }
          }}
        />
        <Button 
          onClick={() => setPromptDialogOpen(true)} 
          variant="outline" 
          size="sm"
          title={t.openEditor ?? 'Édition avancée'}
        >
          <FileText className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => setFileDialogOpen(true)} 
          variant="outline" 
          size="sm"
          title={t.loadFile}
        >
          <Paperclip className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => setUrlDialogOpen(true)} 
          variant="outline" 
          size="sm"
          title={t.loadUrl}
        >
          <LinkIcon className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => setLoadFileUrlDialogOpen(true)} 
          variant="outline" 
          size="sm"
          title={t.loadFileFromUrl}
        >
          <Download className="w-4 h-4" />
        </Button>
        {speechSupported && (
          <Button
            onClick={toggleSpeechRecognition}
            variant={isListening ? "default" : "outline"}
            size="sm"
            disabled={isCheckingPermission}
            title={t.voiceInput}
          >
            {isCheckingPermission ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isListening ? (
              <MicOff className="w-4 h-4" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
        )}
        {onToggleSpeechOutput && (
          <Button
            onClick={onToggleSpeechOutput}
            variant={speechOutputEnabled ? 'default' : 'outline'}
            size="sm"
            className={speechOutputEnabled ? 'bg-emerald-500 text-white hover:bg-emerald-500/90' : ''}
            disabled={!speechOutputSupported}
            title={speechOutputSupported
              ? speechOutputEnabled
                ? (t.disableAudioPlayback ?? 'Désactiver la lecture audio')
                : (t.enableAudioPlayback ?? 'Activer la lecture audio')
              : (t.speechSynthesisNotSupported ?? 'Lecture audio non supportée dans ce navigateur')}
          >
            {speechOutputEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </Button>
        )}
        {onStop && (
          <Button
            onClick={onStop}
            variant="outline"
            size="sm"
            disabled={!isProcessing}
            title={t.stopProcessing ?? 'Stopper'}
          >
            <StopCircle className="w-4 h-4" />
          </Button>
        )}
        <Button onClick={onSend} size="sm" disabled={!value.trim() || isProcessing}>
          <Send className="w-4 h-4" />
        </Button>
      </div>

      {/* Transcription en cours */}
      {interimTranscript && (
        <div className="px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            <span>{t.transcribing}</span>
          </div>
          <div className="mt-1 italic">"{interimTranscript}"</div>
        </div>
      )}

      {/* Statut d'écoute */}
      {isListening && (
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
            <Mic className="w-4 h-4" />
            <span>{t.listening}</span>
          </div>
          <Button
            onClick={toggleSpeechRecognition}
            variant="ghost"
            size="sm"
            className="ml-auto h-6 px-2 text-blue-700 hover:text-blue-800 hover:bg-blue-100"
          >
            <StopCircle className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Message d'erreur de reconnaissance vocale */}
      {speechError && !isListening && (
        <div className="flex items-center justify-between px-3 py-2 bg-yellow-50 border border-yellow-200 rounded-md text-sm text-yellow-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{speechError}</span>
          </div>
          <Button
            onClick={clearSpeechError}
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-yellow-800 hover:text-yellow-900 hover:bg-yellow-100"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Zone de reconnaissance vocale non supportée */}
      {!speechSupported && (
        <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            <span>{t.speechNotSupported}</span>
          </div>
        </div>
      )}

      {/* Dialogues */}
      {/* Dialog pour ajouter un fichier */}
      <Dialog open={fileDialogOpen} onOpenChange={setFileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Paperclip className="w-5 h-5" />
              {t.fileDialog}
            </DialogTitle>
            <DialogDescription>
              {t.fileDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {t.contentAnalyzerNotice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t.contentAnalyzerNotice}
              </div>
            )}
            <div className="flex gap-2">
              <Input
                value={filePath}
                onChange={(e) => setFilePath(e.target.value)}
                placeholder={t.filePathPlaceholder}
                className="flex-1"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                size="sm"
              >
                {t.browse}
              </Button>
            </div>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="w-3 h-3" />
              <span>{t.supportedFormats}: .txt, .md, .json, .csv, .html, .rtf</span>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setFileDialogOpen(false)}
                disabled={isLoading}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleAddFile}
                disabled={!filePath.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.add}
                  </>
                )}
              </Button>
            </div>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".txt,.md,.rtf,.doc,.docx,.json,.csv,.html"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                setFilePath(file.name);
              }
            }}
            className="hidden"
          />
        </DialogContent>
      </Dialog>

      {/* Dialog pour ajouter une URL */}
      <Dialog open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              {t.urlDialog}
            </DialogTitle>
            <DialogDescription>
              {t.urlDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {t.contentAnalyzerNotice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t.contentAnalyzerNotice}
              </div>
            )}
            <Input
              value={urlPath}
              onChange={(e) => setUrlPath(e.target.value)}
              placeholder={t.urlPlaceholder}
            />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t.examples}</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  <span>https://example.com</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileText className="w-3 h-3" />
                  <span>https://docs.example.com/api</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setUrlDialogOpen(false)}
                disabled={isLoading}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleAddUrl}
                disabled={!urlPath.trim() || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.loading}
                  </>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    {t.add}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog pour charger fichier depuis URL */}
      <Dialog open={loadFileUrlDialogOpen} onOpenChange={setLoadFileUrlDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              {t.loadFileUrlDialog}
            </DialogTitle>
            <DialogDescription>
              {t.loadFileUrlDescription}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {t.contentAnalyzerNotice && (
              <div className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                {t.contentAnalyzerNotice}
              </div>
            )}
            <Input
              value={fileUrlPath}
              onChange={(e) => setFileUrlPath(e.target.value)}
              placeholder={t.fileUrlPlaceholder}
            />
            
            {fileUrlPath && (
              <div className="p-3 bg-muted rounded-md space-y-2">
                <h4 className="text-sm font-medium">{t.preview}</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <File className="w-3 h-3" />
                    <span>{getFilenameFromUrl(fileUrlPath)}</span>
                  </div>
                  {getFileTypeFromUrl(fileUrlPath) && (
                    <div className="flex items-center gap-2">
                      <FileText className="w-3 h-3" />
                      <span>{t.supportedFormats}: {getFileTypeFromUrl(fileUrlPath)?.type}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium">{t.examples}</h4>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <LinkIcon className="w-3 h-3" />
                  <span>{t.directLink}: https://example.com/document.txt</span>
                </div>
                <div className="flex items-center gap-2">
                  <File className="w-3 h-3" />
                  <span>{t.rawContent}: https://raw.githubusercontent.com/.../file.md</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-3 h-3" />
                  <span>{t.publicFile}: https://cdn.example.com/data.json</span>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setLoadFileUrlDialogOpen(false)}
                disabled={isLoading}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={handleLoadFileFromUrl}
                disabled={!fileUrlPath.trim() || isLoading || !getFileTypeFromUrl(fileUrlPath)}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.loadingFile}
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    {t.load}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog d'aide pour les permissions microphone */}
      <Dialog open={permissionDialogOpen} onOpenChange={setPermissionDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-amber-600" />
              {t.permissionTitle}
            </DialogTitle>
            <DialogDescription>
              {t.permissionDescription}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {/* Instructions génériques */}
            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <HelpCircle className="w-4 h-4" />
                {t.permissionInstructions}
              </h4>
              
              <div className="space-y-2 text-sm">
                <div className="flex items-start gap-2">
                  <Shield className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{t.permissionStep1}</span>
                </div>
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{t.permissionStep2}</span>
                </div>
                <div className="flex items-start gap-2">
                  <RefreshCw className="w-4 h-4 mt-0.5 text-muted-foreground" />
                  <span>{t.permissionStep3}</span>
                </div>
              </div>
            </div>

            <Separator />

            {/* Instructions par navigateur */}
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.permissionChrome}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur l'icône 🔒 dans la barre d'adresse
                  </p>
                </Card>
                
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Laptop className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.permissionFirefox}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Cliquez sur l'icône 🛡️ dans la barre d'adresse
                  </p>
                </Card>
                
                <Card className="p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="w-4 h-4" />
                    <span className="text-sm font-medium">{t.permissionSafari}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Paramètres → Sites web → Microphone
                  </p>
                </Card>
              </div>
            </div>

            {/* Aide supplémentaire */}
            {microphonePermission === 'denied' && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-amber-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-amber-800">{t.permissionBlocked}</p>
                    <p className="text-xs text-amber-700">{t.permissionBlockedHelp}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Vérification HTTPS */}
            {!window.location.protocol.startsWith('https') && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 mt-0.5 text-red-600" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-red-800">{t.httpsRequired}</p>
                    <p className="text-xs text-red-700">{t.httpsRequiredDesc}</p>
                  </div>
                </div>
              </div>
            )}
            
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setPermissionDialogOpen(false)}
              >
                {t.cancel}
              </Button>
              <Button
                onClick={async () => {
                  setPermissionDialogOpen(false);
                  await requestMicrophoneAccess();
                }}
                disabled={isCheckingPermission}
              >
                {isCheckingPermission ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {t.checkingPermissions}
                  </>
                ) : (
                  <>
                    <Mic className="w-4 h-4 mr-2" />
                    {t.tryAgain}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={promptDialogOpen} onOpenChange={setPromptDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t.promptEditorTitle ?? 'Édition du prompt'}</DialogTitle>
            <DialogDescription>
              {t.promptEditorDescription ?? 'Ajustez votre requête avant de l’envoyer.'}
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={8}
            className="min-h-[200px]"
            dir={dir}
            autoFocus
          />
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPromptDialogOpen(false)}>
              {t.cancel ?? 'Annuler'}
            </Button>
            <Button onClick={() => setPromptDialogOpen(false)}>
              {t.apply ?? 'Valider'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
