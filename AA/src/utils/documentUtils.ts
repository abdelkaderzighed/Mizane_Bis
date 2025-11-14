import { toast } from 'sonner';
import { hasMarkdownFormatting, markdownToRtf } from './markdownToRtf';
import { getFilenameFromPath } from './orderUtils';
import { DocumentState, ChatMessage, LanguageCode } from '../types';
import { languages } from '../constants/config';
import { convertDocxFileToMarkdown, generateDocxBlob } from './docxUtils';
import { isRtf, rtfToPlainText } from './rtfUtils';

// Fonction pour insérer du texte Markdown à la position du curseur
export const insertMarkdown = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  document: DocumentState,
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  before: string,
  after = '',
  placeholder = ''
) => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const selectedText = document.content.substring(start, end);
  const hasSelection = selectedText.length > 0;
  
  let insertText;
  if (hasSelection) {
    insertText = before + selectedText + after;
  } else {
    insertText = before + placeholder + after;
  }

  const newContent = 
    document.content.substring(0, start) + 
    insertText + 
    document.content.substring(end);

  setDocument(prev => ({
    ...prev,
    content: newContent,
    isModified: true
  }));

  setTimeout(() => {
    textarea.focus();
    if (hasSelection) {
      textarea.setSelectionRange(start + insertText.length, start + insertText.length);
    } else {
      textarea.setSelectionRange(start + before.length, start + before.length + placeholder.length);
    }
  }, 0);
};

// Fonction pour copier du contenu vers l'éditeur
export const handleCopyToEditor = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  document: DocumentState,
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  content: string,
  t: any
) => {
  const textarea = textareaRef.current;
  if (!textarea) return;

  const cursorPosition = textarea.selectionStart;
  const currentContent = document.content;
  const newContent = 
    currentContent.slice(0, cursorPosition) + 
    content + 
    currentContent.slice(cursorPosition);

  setDocument(prev => ({
    ...prev,
    content: newContent,
    isModified: true
  }));

  setTimeout(() => {
    textarea.focus();
    textarea.setSelectionRange(
      cursorPosition + content.length,
      cursorPosition + content.length
    );
  }, 0);

  toast.success(t.contentInserted);
};

// Fonction pour charger un fichier depuis une URL
export const handleFileLoadedFromUrl = (
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  setViewMode: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>,
  content: string,
  filename: string,
  t: any
) => {
  const fullPath = filename.startsWith('http') ? filename : `https://example.com/${filename}`;
  
  setDocument(prev => ({
    ...prev,
    content,
    filename: getFilenameFromPath(filename),
    fullPath: fullPath,
    originalFilename: getFilenameFromPath(filename),
    originalFullPath: fullPath,
    isModified: false
  }));
  
  if (hasMarkdownFormatting(content)) {
    toast.success(`${t.fileLoadedFromUrl} - ${t.formatDetected}`);
    setViewMode('preview');
  } else {
    toast.success(t.fileLoadedFromUrl);
  }
};

// Fonction pour charger un fichier vers le chat
export const handleFileLoadedToChat = (
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  content: string,
  filename: string
) => {
  const fileMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'assistant',
    content: content,
    timestamp: new Date(),
    source: {
      type: 'file_url',
      name: filename
    }
  };

  setChatMessages(prev => [...prev, fileMessage]);
};

// Fonction pour créer un nouveau document
export const handleNewDocument = (
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  setViewMode: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>,
  document: DocumentState,
  t: any
) => {
  setDocument({
    content: '',
    filename: '',
    fullPath: '',
    language: document.language,
    isModified: false
  });
  setViewMode('edit');
  toast.success(t.newDocumentCreated);
};

// Fonction pour ouvrir un fichier
export const handleOpenFile = async (
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  setViewMode: React.Dispatch<React.SetStateAction<'edit' | 'preview'>>,
  event: React.ChangeEvent<HTMLInputElement>,
  t: any
) => {
  const file = event.target.files?.[0];
  if (file) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'doc') {
      toast.error(t.docFormatUnsupported ?? 'Le format .doc n\'est pas supporté. Veuillez convertir votre fichier en .docx.');
      return;
    }

    if (extension === 'docx') {
      try {
        const markdownContent = await convertDocxFileToMarkdown(file);
        const simulatedPath = `C:\\Documents\\${file.name}`;

        setDocument(prev => ({
          ...prev,
          content: markdownContent,
          filename: file.name,
          fullPath: simulatedPath,
          originalFilename: file.name,
          originalFullPath: simulatedPath,
          isModified: false
        }));

        toast.success(t.fileOpenedDocx ?? 'Document DOCX importé');
        setViewMode('edit');
      } catch (error) {
        console.error('[handleOpenFile] DOCX load failed', error);
        toast.error(t.docxImportError ?? 'Impossible de convertir le fichier .docx.');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawContent = e.target?.result as string;
      const simulatedPath = `C:\\Documents\\${file.name}`;
      const textContent = isRtf(rawContent) ? rtfToPlainText(rawContent) : rawContent;
      setDocument(prev => ({
        ...prev,
        content: textContent,
        filename: file.name,
        fullPath: simulatedPath,
        originalFilename: file.name,
        originalFullPath: simulatedPath,
        isModified: false
      }));
      
      if (hasMarkdownFormatting(content)) {
        toast.success(`${t.fileOpened} - ${t.formatDetected}`);
        setViewMode('preview');
      } else {
        toast.success(t.fileOpened);
      }
    };
    reader.readAsText(file);
  }
};

// Fonction pour insérer un fichier
export const handleInsertFile = async (
  handleCopyToEditorFn: (content: string) => void,
  event: React.ChangeEvent<HTMLInputElement>,
  t?: any
) => {
  const file = event.target.files?.[0];
  if (file) {
    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'doc') {
      toast.error(t?.docFormatUnsupported ?? 'Le format .doc n\'est pas supporté.');
      return;
    }

    if (extension === 'docx') {
      try {
        const markdownContent = await convertDocxFileToMarkdown(file);
        handleCopyToEditorFn('\n\n' + markdownContent);
        toast.success(t?.docxInserted ?? 'Contenu DOCX inséré');
      } catch (error) {
        console.error('[handleInsertFile] DOCX insertion failed', error);
        toast.error(t?.docxImportError ?? 'Impossible de convertir le fichier .docx.');
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      handleCopyToEditorFn('\n\n' + content);
    };
    reader.readAsText(file);
  }
};

// Fonction pour sauvegarder avec format
// Fonction pour changer la langue du document
export const handleLanguageChange = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  newLanguage: LanguageCode
) => {
  setDocument(prev => ({ ...prev, language: newLanguage }));
  
  setTimeout(() => {
    if (textareaRef.current) {
      textareaRef.current.dir = languages[newLanguage].dir;
    }
  }, 0);
};

// Fonction pour changer le chemin complet
export const handleFullPathChange = (
  setDocument: React.Dispatch<React.SetStateAction<DocumentState>>,
  newFullPath: string
) => {
  const newFilename = getFilenameFromPath(newFullPath);
  setDocument(prev => ({
    ...prev,
    fullPath: newFullPath,
    filename: newFilename,
    isModified: true
  }));
};
