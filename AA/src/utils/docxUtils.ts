import { Document, HeadingLevel, Packer, Paragraph, TextRun } from 'docx';
import mammoth from 'mammoth/mammoth.browser';

const BULLET_PATTERN = /^[-*]\s+/;
const HEADING_PATTERNS: Array<{ pattern: RegExp; level: HeadingLevel }> = [
  { pattern: /^###\s+/, level: HeadingLevel.HEADING_3 },
  { pattern: /^##\s+/, level: HeadingLevel.HEADING_2 },
  { pattern: /^#\s+/, level: HeadingLevel.HEADING_1 },
];

export const isDocxFilename = (filename: string): boolean => filename.trim().toLowerCase().endsWith('.docx');

export async function convertDocxFileToMarkdown(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  return convertDocxArrayBufferToMarkdown(arrayBuffer);
}

export async function convertDocxArrayBufferToMarkdown(arrayBuffer: ArrayBuffer): Promise<string> {
  const result = await mammoth.convertToMarkdown({ arrayBuffer });
  return result.value?.trim?.() ?? '';
}

export async function generateDocxBlob(markdown: string): Promise<Blob> {
  const document = buildDocxDocumentFromMarkdown(markdown);
  return Packer.toBlob(document);
}

function buildDocxDocumentFromMarkdown(markdown: string): Document {
  const blocks = markdown.split(/\n{2,}/);
  const paragraphs: Paragraph[] = [];

  blocks.forEach((rawBlock) => {
    const block = rawBlock.replace(/\r/g, '');
    if (!block.trim()) {
      paragraphs.push(new Paragraph({ text: '' }));
      return;
    }

    const lines = block.split('\n');

    if (lines.every((line) => BULLET_PATTERN.test(line))) {
      lines.forEach((line) => {
        const text = line.replace(BULLET_PATTERN, '').trim();
        if (!text) {
          return;
        }
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(text)],
            bullet: { level: 0 },
          }),
        );
      });
      return;
    }

    if (lines.length === 1) {
      const line = lines[0];
      const headingMatch = HEADING_PATTERNS.find(({ pattern }) => pattern.test(line));
      if (headingMatch) {
        const text = line.replace(headingMatch.pattern, '').trim();
        paragraphs.push(
          new Paragraph({
            children: [new TextRun(text)],
            heading: headingMatch.level,
          }),
        );
        return;
      }
    }

    const paragraphText = lines.map((line) => line.trim()).join(' ');
    paragraphs.push(new Paragraph({ text: paragraphText }));
  });

  if (paragraphs.length === 0) {
    paragraphs.push(new Paragraph({ text: '' }));
  }

  return new Document({
    sections: [
      {
        properties: {},
        children: paragraphs,
      },
    ],
  });
}
