// Fonction pour convertir du Markdown basique en RTF
export function markdownToRtf(markdown: string): string {
  let rtf = '{\\rtf1\\ansi\\deff0 {\\fonttbl \\f0 Times New Roman;}}';
  
  // Diviser en lignes pour traitement
  const lines = markdown.split('\n');
  let result = '';
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i];
    
    // Titres
    if (line.startsWith('### ')) {
      const text = line.substring(4);
      result += `\\fs24\\b ${escapeRtf(text)}\\b0\\fs20\\par`;
    } else if (line.startsWith('## ')) {
      const text = line.substring(3);
      result += `\\fs28\\b ${escapeRtf(text)}\\b0\\fs20\\par`;
    } else if (line.startsWith('# ')) {
      const text = line.substring(2);
      result += `\\fs32\\b ${escapeRtf(text)}\\b0\\fs20\\par`;
    }
    // Citations
    else if (line.startsWith('> ')) {
      const text = line.substring(2);
      result += `\\li720\\i ${escapeRtf(text)}\\i0\\li0\\par`;
    }
    // Listes à puces
    else if (line.startsWith('- ') || line.startsWith('* ')) {
      const text = line.substring(2);
      result += `\\li360 \\bullet\\tab ${processInlineFormatting(text)}\\li0\\par`;
    }
    // Listes numérotées
    else if (line.match(/^\d+\. /)) {
      const match = line.match(/^(\d+)\. (.*)$/);
      if (match) {
        const number = match[1];
        const text = match[2];
        result += `\\li360 ${number}.\\tab ${processInlineFormatting(text)}\\li0\\par`;
      }
    }
    // Listes de tâches
    else if (line.startsWith('- [ ] ')) {
      const text = line.substring(6);
      result += `\\li360 ☐\\tab ${processInlineFormatting(text)}\\li0\\par`;
    } else if (line.startsWith('- [x] ') || line.startsWith('- [X] ')) {
      const text = line.substring(6);
      result += `\\li360 ☑\\tab ${processInlineFormatting(text)}\\li0\\par`;
    }
    // Blocs de code
    else if (line.startsWith('```')) {
      // Détecter le début d'un bloc de code
      i++; // Passer la ligne avec ```
      let codeContent = '';
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeContent += lines[i] + '\\par';
        i++;
      }
      result += `\\f1\\fs18 ${escapeRtf(codeContent)}\\f0\\fs20\\par`;
    }
    // Lignes horizontales
    else if (line.trim() === '---' || line.trim() === '***') {
      result += '\\brdrb\\brdrs\\brdrw10\\brsp20 \\par\\pard\\par';
    }
    // Ligne vide
    else if (line.trim() === '') {
      result += '\\par';
    }
    // Texte normal
    else {
      result += processInlineFormatting(line) + '\\par';
    }
  }
  
  rtf += result + '}';
  return rtf;
}

// Traiter le formatage en ligne (gras, italique, code)
function processInlineFormatting(text: string): string {
  let processed = text;
  
  // Gras (**texte** ou __texte__)
  processed = processed.replace(/\*\*(.*?)\*\*/g, '\\b $1\\b0');
  processed = processed.replace(/__(.*?)__/g, '\\b $1\\b0');
  
  // Italique (*texte* ou _texte_)
  processed = processed.replace(/(?<!\*)\*([^*]+?)\*(?!\*)/g, '\\i $1\\i0');
  processed = processed.replace(/(?<!_)_([^_]+?)_(?!_)/g, '\\i $1\\i0');
  
  // Barré (~~texte~~)
  processed = processed.replace(/~~(.*?)~~/g, '\\strike $1\\strike0');
  
  // Code en ligne (`code`)
  processed = processed.replace(/`([^`]+?)`/g, '\\f1\\fs18 $1\\f0\\fs20');
  
  // Liens [texte](url) - on garde juste le texte pour RTF
  processed = processed.replace(/\[([^\]]+?)\]\([^)]+?\)/g, '\\ul $1\\ul0');
  
  return escapeRtf(processed);
}

// Échapper les caractères spéciaux RTF
function escapeRtf(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/\n/g, '\\par ');
}

// Fonction pour détecter si le contenu contient du Markdown
export function hasMarkdownFormatting(text: string): boolean {
  const markdownPatterns = [
    /^#{1,6}\s/m,           // Titres
    /\*\*.*?\*\*/,          // Gras
    /\*.*?\*/,              // Italique
    /~~.*?~~/,              // Barré
    /`.*?`/,                // Code en ligne
    /^```/m,                // Blocs de code
    /^\s*[-*+]\s/m,         // Listes
    /^\s*\d+\.\s/m,         // Listes numérotées
    /^>\s/m,                // Citations
    /\[.*?\]\(.*?\)/,       // Liens
    /!\[.*?\]\(.*?\)/       // Images
  ];
  
  return markdownPatterns.some(pattern => pattern.test(text));
}