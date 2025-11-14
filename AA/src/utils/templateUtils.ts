export const TEMPLATES_DIRECTORY = 'templates';
export const TEMPLATE_FILENAME_PREFIX = 'temp_';
export const DEFAULT_WORKSPACE_NAME = 'Misan';

/**
 * Ensure the templates directory exists at the workspace root and return its handle.
 */
export async function ensureTemplatesDirectory(
  root: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  return root.getDirectoryHandle(TEMPLATES_DIRECTORY, { create: true });
}

/**
 * Generate a normalized filename for templates.
 * Always enforces the `.rtf` extension and the `temp_` prefix.
 */
export function ensureTemplateFilename(rawName: string): string {
  const trimmed = (rawName ?? '').trim() || 'modele';
  const sanitized = trimmed.replace(/\s+/g, '_');
  const withoutExtension = sanitized.replace(/\.[^/.]+$/, '');
  let finalName = `${withoutExtension}.rtf`;

  if (!finalName.toLowerCase().startsWith(`${TEMPLATE_FILENAME_PREFIX}`)) {
    finalName = `${TEMPLATE_FILENAME_PREFIX}${finalName}`;
  }

  return finalName;
}

/**
 * Build the absolute path (UI friendly) for a template file within the workspace.
 */
export function buildTemplateFullPath(
  rootName: string | undefined,
  filename: string,
): string {
  const safeRoot = rootName?.trim() || DEFAULT_WORKSPACE_NAME;
  return `/${safeRoot}/${TEMPLATES_DIRECTORY}/${filename}`;
}
