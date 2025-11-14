import React from 'react';

interface MarkdownPreviewProps {
  content: string;
  language: 'fr' | 'en' | 'ar';
}

export default function MarkdownPreview({ content, language }: MarkdownPreviewProps) {
  // Fonction pour convertir le Markdown en HTML
  const convertMarkdownToHtml = (markdown: string): string => {
    let html = markdown;

    // Titres
    html = html.replace(/^### (.*$)/gm, '<h3>$1</h3>');
    html = html.replace(/^## (.*$)/gm, '<h2>$1</h2>');
    html = html.replace(/^# (.*$)/gm, '<h1>$1</h1>');

    // Gras et italique
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // Barré
    html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

    // Code en ligne
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    // Blocs de code
    html = html.replace(/```([\s\S]*?)```/g, '<pre class="code-block"><code>$1</code></pre>');

    // Citations
    html = html.replace(/^> (.*$)/gm, '<blockquote>$1</blockquote>');

    // Listes non ordonnées
    html = html.replace(/^- (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

    // Listes numérotées
    html = html.replace(/^\d+\. (.*$)/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>)/gs, (match) => {
      if (!match.includes('<ul>')) {
        return `<ol>${match}</ol>`;
      }
      return match;
    });

    // Listes de tâches
    html = html.replace(/^- \[ \] (.*$)/gm, '<li class="task-item"><input type="checkbox" disabled> $1</li>');
    html = html.replace(/^- \[x\] (.*$)/gm, '<li class="task-item"><input type="checkbox" disabled checked> $1</li>');

    // Liens
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');

    // Images
    html = html.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" />');

    // Lignes horizontales
    html = html.replace(/^---$/gm, '<hr>');

    // Tableaux (basique)
    const lines = html.split('\n');
    let inTable = false;
    let tableHtml = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      if (line.includes('|') && !inTable) {
        inTable = true;
        tableHtml = '<table class="markdown-table"><thead><tr>';
        const headers = line.split('|').filter(h => h.trim());
        headers.forEach(header => {
          tableHtml += `<th>${header.trim()}</th>`;
        });
        tableHtml += '</tr></thead><tbody>';
        
        // Skip separator line
        if (i + 1 < lines.length && lines[i + 1].includes('---')) {
          i++;
        }
      } else if (line.includes('|') && inTable) {
        tableHtml += '<tr>';
        const cells = line.split('|').filter(c => c.trim());
        cells.forEach(cell => {
          tableHtml += `<td>${cell.trim()}</td>`;
        });
        tableHtml += '</tr>';
      } else if (inTable && !line.includes('|')) {
        tableHtml += '</tbody></table>';
        html = html.replace(new RegExp(lines.slice(lines.indexOf(lines.find(l => l.includes('|'))), i).join('\n')), tableHtml);
        inTable = false;
        tableHtml = '';
      }
    }

    // Paragraphes
    html = html.replace(/\n\n/g, '</p><p>');
    html = `<p>${html}</p>`;

    // Nettoyer les paragraphes vides et les doublons
    html = html.replace(/<p><\/p>/g, '');
    html = html.replace(/<p>(<h[1-6]>.*?<\/h[1-6]>)<\/p>/g, '$1');
    html = html.replace(/<p>(<ul>.*?<\/ul>)<\/p>/gs, '$1');
    html = html.replace(/<p>(<ol>.*?<\/ol>)<\/p>/gs, '$1');
    html = html.replace(/<p>(<blockquote>.*?<\/blockquote>)<\/p>/g, '$1');
    html = html.replace(/<p>(<pre.*?<\/pre>)<\/p>/gs, '$1');
    html = html.replace(/<p>(<hr>)<\/p>/g, '$1');
    html = html.replace(/<p>(<table.*?<\/table>)<\/p>/gs, '$1');

    return html;
  };

  const htmlContent = convertMarkdownToHtml(content);

  if (!content.trim()) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <div className="text-center">
          <div className="text-2xl mb-2">📄</div>
          <p>Aucun contenu à prévisualiser</p>
          <p className="text-sm">Passez en mode édition pour commencer à écrire</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="h-full p-6 overflow-auto prose prose-gray max-w-none"
      dir={language === 'ar' ? 'rtl' : 'ltr'}
      style={{
        direction: language === 'ar' ? 'rtl' : 'ltr'
      }}
    >
      <style dangerouslySetInnerHTML={{__html: `
        .markdown-preview h1 {
          font-size: 2rem;
          font-weight: 600;
          margin: 1.5rem 0 1rem 0;
          padding-bottom: 0.5rem;
          border-bottom: 2px solid #e2e8f0;
          color: #1a202c;
        }
        
        .markdown-preview h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1.25rem 0 0.75rem 0;
          color: #2d3748;
        }
        
        .markdown-preview h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 1rem 0 0.5rem 0;
          color: #4a5568;
        }
        
        .markdown-preview p {
          margin: 0.75rem 0;
          line-height: 1.6;
          color: #2d3748;
        }
        
        .markdown-preview strong {
          font-weight: 600;
          color: #1a202c;
        }
        
        .markdown-preview em {
          font-style: italic;
          color: #4a5568;
        }
        
        .markdown-preview del {
          text-decoration: line-through;
          color: #a0aec0;
        }
        
        .markdown-preview .inline-code {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.25rem;
          padding: 0.125rem 0.25rem;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          color: #e53e3e;
        }
        
        .markdown-preview .code-block {
          background: #f7fafc;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          padding: 1rem;
          margin: 1rem 0;
          overflow-x: auto;
        }
        
        .markdown-preview .code-block code {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 0.875rem;
          color: #2d3748;
        }
        
        .markdown-preview blockquote {
          border-left: 4px solid #3182ce;
          padding-left: 1rem;
          margin: 1rem 0;
          font-style: italic;
          color: #4a5568;
          background: #f7fafc;
          padding: 0.75rem 1rem;
          border-radius: 0 0.5rem 0.5rem 0;
        }
        
        .markdown-preview ul, .markdown-preview ol {
          margin: 1rem 0;
          padding-left: 1.5rem;
        }
        
        .markdown-preview li {
          margin: 0.25rem 0;
          line-height: 1.6;
        }
        
        .markdown-preview .task-item {
          list-style: none;
          margin-left: -1.5rem;
          padding-left: 1.5rem;
        }
        
        .markdown-preview .task-item input {
          margin-right: 0.5rem;
        }
        
        .markdown-preview a {
          color: #3182ce;
          text-decoration: underline;
        }
        
        .markdown-preview a:hover {
          color: #2c5aa0;
        }
        
        .markdown-preview img {
          max-width: 100%;
          height: auto;
          border-radius: 0.5rem;
          margin: 1rem 0;
        }
        
        .markdown-preview hr {
          border: none;
          border-top: 2px solid #e2e8f0;
          margin: 2rem 0;
        }
        
        .markdown-preview .markdown-table {
          border-collapse: collapse;
          width: 100%;
          margin: 1rem 0;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          overflow: hidden;
        }
        
        .markdown-preview .markdown-table th,
        .markdown-preview .markdown-table td {
          border: 1px solid #e2e8f0;
          padding: 0.75rem;
          text-align: left;
        }
        
        .markdown-preview .markdown-table th {
          background: #f7fafc;
          font-weight: 600;
          color: #2d3748;
        }
        
        .markdown-preview .markdown-table tr:nth-child(even) {
          background: #f7fafc;
        }
      `}} />
      
      <div 
        className="markdown-preview"
        dangerouslySetInnerHTML={{ __html: htmlContent }}
      />
    </div>
  );
}