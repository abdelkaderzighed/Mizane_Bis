import React from 'react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { 
  Bold, 
  Italic, 
  Strikethrough, 
  Heading1, 
  Heading2, 
  Heading3,
  List, 
  ListOrdered, 
  Quote, 
  Code, 
  CodeSquare,
  Link,
  Image,
  Table,
  Minus,
  CheckSquare
} from 'lucide-react';

interface MarkdownToolbarProps {
  onInsert: (before: string, after?: string, placeholder?: string) => void;
  language: 'fr' | 'en' | 'ar';
}

export default function MarkdownToolbar({ onInsert, language }: MarkdownToolbarProps) {
  const translations = {
    fr: {
      bold: 'Gras',
      italic: 'Italique',
      strikethrough: 'Barré',
      heading1: 'Titre 1',
      heading2: 'Titre 2', 
      heading3: 'Titre 3',
      bulletList: 'Liste à puces',
      numberedList: 'Liste numérotée',
      taskList: 'Liste de tâches',
      quote: 'Citation',
      inlineCode: 'Code en ligne',
      codeBlock: 'Bloc de code',
      link: 'Lien',
      image: 'Image',
      table: 'Tableau',
      horizontalRule: 'Ligne horizontale'
    },
    en: {
      bold: 'Bold',
      italic: 'Italic',
      strikethrough: 'Strikethrough',
      heading1: 'Heading 1',
      heading2: 'Heading 2',
      heading3: 'Heading 3',
      bulletList: 'Bullet List',
      numberedList: 'Numbered List',
      taskList: 'Task List',
      quote: 'Quote',
      inlineCode: 'Inline Code',
      codeBlock: 'Code Block',
      link: 'Link',
      image: 'Image',
      table: 'Table',
      horizontalRule: 'Horizontal Rule'
    },
    ar: {
      bold: 'عريض',
      italic: 'مائل',
      strikethrough: 'مشطوب',
      heading1: 'عنوان 1',
      heading2: 'عنوان 2',
      heading3: 'عنوان 3',
      bulletList: 'قائمة نقطية',
      numberedList: 'قائمة مرقمة',
      taskList: 'قائمة مهام',
      quote: 'اقتباس',
      inlineCode: 'كود مضمن',
      codeBlock: 'بلوك كود',
      link: 'رابط',
      image: 'صورة',
      table: 'جدول',
      horizontalRule: 'خط أفقي'
    }
  };

  const t = translations[language];

  const toolbarItems = [
    // Formatage de base
    {
      icon: Bold,
      title: t.bold,
      action: () => onInsert('**', '**', 'texte en gras')
    },
    {
      icon: Italic,
      title: t.italic,
      action: () => onInsert('*', '*', 'texte en italique')
    },
    {
      icon: Strikethrough,
      title: t.strikethrough,
      action: () => onInsert('~~', '~~', 'texte barré')
    },
    'separator',
    // Titres
    {
      icon: Heading1,
      title: t.heading1,
      action: () => onInsert('# ', '', 'Titre de niveau 1')
    },
    {
      icon: Heading2,
      title: t.heading2,
      action: () => onInsert('## ', '', 'Titre de niveau 2')
    },
    {
      icon: Heading3,
      title: t.heading3,
      action: () => onInsert('### ', '', 'Titre de niveau 3')
    },
    'separator',
    // Listes
    {
      icon: List,
      title: t.bulletList,
      action: () => onInsert('- ', '', 'élément de liste')
    },
    {
      icon: ListOrdered,
      title: t.numberedList,
      action: () => onInsert('1. ', '', 'élément numéroté')
    },
    {
      icon: CheckSquare,
      title: t.taskList,
      action: () => onInsert('- [ ] ', '', 'tâche à faire')
    },
    'separator',
    // Autres éléments
    {
      icon: Quote,
      title: t.quote,
      action: () => onInsert('> ', '', 'texte de citation')
    },
    {
      icon: Code,
      title: t.inlineCode,
      action: () => onInsert('`', '`', 'code')
    },
    {
      icon: CodeSquare,
      title: t.codeBlock,
      action: () => onInsert('```\n', '\n```', 'votre code ici')
    },
    'separator',
    // Liens et médias
    {
      icon: Link,
      title: t.link,
      action: () => onInsert('[', '](url)', 'texte du lien')
    },
    {
      icon: Image,
      title: t.image,
      action: () => onInsert('![', '](url)', 'texte alternatif')
    },
    {
      icon: Table,
      title: t.table,
      action: () => onInsert('| Colonne 1 | Colonne 2 |\n|-----------|------------|\n| ', ' | Cellule 2 |', 'Cellule 1')
    },
    {
      icon: Minus,
      title: t.horizontalRule,
      action: () => onInsert('\n---\n', '', '')
    }
  ];

  return (
    <div className="flex items-center gap-1 p-2 border-b border-border bg-muted/30 flex-wrap">
      {toolbarItems.map((item, index) => {
        if (item === 'separator') {
          return <Separator key={index} orientation="vertical" className="h-6 mx-1" />;
        }

        const IconComponent = item.icon;
        return (
          <Button
            key={index}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-secondary"
            onClick={item.action}
            title={item.title}
          >
            <IconComponent className="w-4 h-4" />
          </Button>
        );
      })}
      
      {/* Indication Markdown */}
      <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
        <span>Markdown</span>
        <div className="px-2 py-1 bg-primary/10 rounded text-primary">
          MD
        </div>
      </div>
    </div>
  );
}