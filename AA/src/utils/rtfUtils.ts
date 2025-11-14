const HEX_BYTE_REGEX = /\\'([0-9a-fA-F]{2})/g;
const UNICODE_CHAR_REGEX = /\\u(-?\d+)(?:\\'?\w{0,2})?/g;
const CONTROL_WORD_REGEX = /\\[a-zA-Z]+-?\d* ?/g;
const CONTROL_SYMBOL_REGEX = /\\[^a-zA-Z0-9]?/g;

export function isRtf(content: string): boolean {
  return content.trimStart().startsWith('{\\rtf');
}

export function rtfToPlainText(rtf: string): string {
  let text = rtf;

  // Normalize line endings
  text = text.replace(/\r\n?/g, '\n');

  // Decode hex encoded characters (e.g. \'e9 for é)
  text = text.replace(HEX_BYTE_REGEX, (_, hex: string) => {
    try {
      return String.fromCharCode(parseInt(hex, 16));
    } catch {
      return '';
    }
  });

  // Decode unicode control words (\uXXXX)
  text = text.replace(UNICODE_CHAR_REGEX, (_, code: string) => {
    const intCode = parseInt(code, 10);
    if (Number.isNaN(intCode)) {
      return '';
    }
    return String.fromCharCode(intCode < 0 ? intCode + 65536 : intCode);
  });

  // Replace paragraph and tab markers with plain equivalents
  text = text.replace(/\\par[d]?/g, '\n');
  text = text.replace(/\\tab/g, '\t');

  // Remove remaining control words and symbols
  text = text.replace(CONTROL_WORD_REGEX, '');
  text = text.replace(CONTROL_SYMBOL_REGEX, '');

  // Remove groups and braces
  text = text.replace(/[{}]/g, '');

  // Collapse excess whitespace
  text = text.replace(/\n{3,}/g, '\n\n');
  text = text.replace(/[ \t]+\n/g, '\n');

  return text.trim();
}
