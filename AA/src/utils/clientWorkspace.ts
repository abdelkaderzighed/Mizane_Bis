import { nanoid } from 'nanoid/non-secure';

const WORKSPACE_MARKER_FILE = '.misan-workspace.json';
const METADATA_FILE = 'metadata.json';
const LEGACY_CONVERSATION_FILE = 'conversation.jsonl';
const DOCUMENTS_DIR = 'documents';
const MEDIA_DIR = 'media';
const CONVERSATIONS_DIR = 'Conversations';
const CONVERSATION_EXTENSION = '.json';

export type ConversationRole = 'user' | 'assistant' | 'system';

export interface ConversationEntry {
  id: string;
  timestamp: string;
  role: ConversationRole;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface ConversationFileSummary {
  filename: string;
  path: string;
  lastModified?: string;
  size?: number;
}

export interface ClientMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
  notes?: string;
}

export interface ClientSummary extends ClientMetadata {
  slug: string;
  conversationLines: number;
  documentsCount: number;
  mediaCount: number;
  lastConversationAt?: string;
  directoryHandle: FileSystemDirectoryHandle;
  conversations: ConversationFileSummary[];
  structureIssues: ClientStructureIssue[];
}

export type ClientStructureIssueType =
  | 'metadata_created'
  | 'directory_created'
  | 'conversation_created'
  | 'legacy_conversation_migrated';

export interface ClientStructureIssue {
  type: ClientStructureIssueType;
  path: string;
  message: string;
}

export class ClientWorkspaceError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'ClientWorkspaceError';
  }
}

export interface WorkspaceHandle {
  root: FileSystemDirectoryHandle;
  marker: {
    version: number;
    createdAt: string;
    updatedAt: string;
  };
}

function assertFileSystemSupport(): void {
  if (typeof window === 'undefined' || !('showDirectoryPicker' in window)) {
    throw new ClientWorkspaceError('File System Access API indisponible dans cet environnement.');
  }
}

export function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

async function readJsonFile<T>(directory: FileSystemDirectoryHandle, name: string): Promise<T | null> {
  try {
    const fileHandle = await directory.getFileHandle(name);
    const file = await fileHandle.getFile();
    const text = await file.text();
    return JSON.parse(text) as T;
  } catch (error) {
    if ((error as DOMException).name === 'NotFoundError') {
      return null;
    }
    throw new ClientWorkspaceError(`Lecture JSON échouée (${name})`, error);
  }
}

async function writeJsonFile(directory: FileSystemDirectoryHandle, name: string, value: unknown): Promise<void> {
  try {
    const fileHandle = await directory.getFileHandle(name, { create: true });
    const writable = await fileHandle.createWritable({});
    await writable.write(JSON.stringify(value, null, 2));
    await writable.close();
  } catch (error) {
    throw new ClientWorkspaceError(`Écriture JSON échouée (${name})`, error);
  }
}

async function ensureSubdirectory(parent: FileSystemDirectoryHandle, name: string): Promise<FileSystemDirectoryHandle> {
  try {
    return await parent.getDirectoryHandle(name, { create: true });
  } catch (error) {
    throw new ClientWorkspaceError(`Impossible de créer/obtenir le dossier "${name}"`, error);
  }
}

async function getOrCreateSubdirectoryWithReport(
  parent: FileSystemDirectoryHandle,
  name: string,
  issues: ClientStructureIssue[],
): Promise<FileSystemDirectoryHandle> {
  try {
    return await parent.getDirectoryHandle(name);
  } catch (error) {
    if ((error as DOMException).name === 'NotFoundError') {
      try {
        const handle = await parent.getDirectoryHandle(name, { create: true });
        issues.push({
          type: 'directory_created',
          path: `${parent.name}/${name}`,
          message: `Le sous-dossier "${name}" était manquant et a été créé automatiquement.`,
        });
        return handle;
      } catch (creationError) {
        throw new ClientWorkspaceError(`Impossible de créer le dossier "${name}"`, creationError);
      }
    }
    throw new ClientWorkspaceError(`Impossible d'accéder au dossier "${name}"`, error);
  }
}

async function ensureFile(directory: FileSystemDirectoryHandle, name: string, initialContent = ''): Promise<FileSystemFileHandle> {
  try {
    const fileHandle = await directory.getFileHandle(name, { create: true });
    const file = await fileHandle.getFile();
    if (file.size === 0 && initialContent) {
      const writable = await fileHandle.createWritable();
      await writable.write(initialContent);
      await writable.close();
    }
    return fileHandle;
  } catch (error) {
    throw new ClientWorkspaceError(`Impossible de créer/obtenir le fichier "${name}"`, error);
  }
}

async function ensureConversationsDirectory(directory: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return ensureSubdirectory(directory, CONVERSATIONS_DIR);
}

function generateConversationFilename(date = new Date()): string {
  const pad = (value: number) => value.toString().padStart(2, '0');
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `conv-${day}-${month}-${year}-${hours}-${minutes}${CONVERSATION_EXTENSION}`;
}

async function listConversationFiles(directory: FileSystemDirectoryHandle): Promise<ConversationFileSummary[]> {
  const conversationsDir = await ensureConversationsDirectory(directory);
  const summaries: ConversationFileSummary[] = [];

  for await (const entry of conversationsDir.values()) {
    if (entry.kind !== 'file' || !entry.name.toLowerCase().endsWith(CONVERSATION_EXTENSION)) {
      continue;
    }

    const fileHandle = await conversationsDir.getFileHandle(entry.name);
    const file = await fileHandle.getFile();
    summaries.push({
      filename: entry.name,
      path: `${directory.name}/${CONVERSATIONS_DIR}/${entry.name}`,
      lastModified: new Date(file.lastModified).toISOString(),
      size: file.size,
    });
  }

  return summaries.sort((a, b) => (b.lastModified ?? '').localeCompare(a.lastModified ?? ''));
}

async function ensureDefaultConversationFile(
  directory: FileSystemDirectoryHandle,
  issues?: ClientStructureIssue[],
): Promise<ConversationFileSummary> {
  const conversationsDir = await ensureConversationsDirectory(directory);
  const existing = await listConversationFiles(directory);
  if (existing.length > 0) {
    return existing[0];
  }

  // Legacy migration: conversation.jsonl at root
  try {
    const legacyHandle = await directory.getFileHandle(LEGACY_CONVERSATION_FILE);
    const legacyFile = await legacyHandle.getFile();
    const content = await legacyFile.text();
    let parsedEntries: ConversationEntry[] = [];
    if (content.trim()) {
      try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
          parsedEntries = parsed as ConversationEntry[];
        }
      } catch {
        const lines = content.split('\n').filter(Boolean);
        parsedEntries = lines.reduce<ConversationEntry[]>((acc, line) => {
          try {
            acc.push(JSON.parse(line) as ConversationEntry);
          } catch {
            // ignore
          }
          return acc;
        }, []);
      }
    }
    const filename = generateConversationFilename();
    const newHandle = await conversationsDir.getFileHandle(filename, { create: true });
    const writable = await newHandle.createWritable();
    await writable.write(JSON.stringify(parsedEntries, null, 2));
    await writable.close();
    // Attempt to remove legacy file
    try {
      await directory.removeEntry(LEGACY_CONVERSATION_FILE);
    } catch {
      // ignore
    }
    issues?.push({
      type: 'legacy_conversation_migrated',
      path: `${directory.name}/${CONVERSATIONS_DIR}/${filename}`,
      message: 'Ancien fichier de conversation converti au format JSON.',
    });
    return {
      filename,
      path: `${directory.name}/${CONVERSATIONS_DIR}/${filename}`,
      lastModified: new Date().toISOString(),
      size: legacyFile.size,
    };
  } catch {
    const filename = generateConversationFilename();
    const handle = await conversationsDir.getFileHandle(filename, { create: true });
    const writable = await handle.createWritable();
    await writable.write('[]');
    await writable.close();
    issues?.push({
      type: 'conversation_created',
      path: `${directory.name}/${CONVERSATIONS_DIR}/${filename}`,
      message: 'Aucun historique de conversation trouvé. Un fichier vierge a été ajouté.',
    });
    return {
      filename,
      path: `${directory.name}/${CONVERSATIONS_DIR}/${filename}`,
      lastModified: new Date().toISOString(),
      size: 0,
    };
  }
}

async function getConversationFileHandle(
  directory: FileSystemDirectoryHandle,
  conversationFilename?: string,
): Promise<{ fileHandle: FileSystemFileHandle; filename: string }> {
  const conversationsDir = await ensureConversationsDirectory(directory);
  let filename = conversationFilename;

  if (!filename) {
    const existing = await listConversationFiles(directory);
    if (existing.length > 0) {
      filename = existing[0].filename;
    } else {
      const created = await ensureDefaultConversationFile(directory);
      filename = created.filename;
    }
  }

  const fileHandle = await conversationsDir.getFileHandle(filename, { create: true });
  return { fileHandle, filename };
}

async function bootstrapWorkspace(root: FileSystemDirectoryHandle): Promise<WorkspaceHandle> {
  const marker = await readJsonFile<WorkspaceHandle['marker']>(root, WORKSPACE_MARKER_FILE);
  if (marker) {
    return {
      root,
      marker,
    };
  }

  const now = new Date().toISOString();
  const payload: WorkspaceHandle['marker'] = {
    version: 1,
    createdAt: now,
    updatedAt: now,
  };
  await writeJsonFile(root, WORKSPACE_MARKER_FILE, payload);
  return {
    root,
    marker: payload,
  };
}

async function buildClientMetadata(name: string, slug: string): Promise<ClientMetadata> {
  const now = new Date().toISOString();
  return {
    id: nanoid(12),
    name,
    createdAt: now,
    updatedAt: now,
  };
}

const RESERVED_ROOT_DIRECTORIES = new Set(['template', 'templates']);

async function ensureClientStructure(
  directory: FileSystemDirectoryHandle,
  name: string | null = null,
): Promise<ClientSummary> {
  const slug = directory.name;
  const issues: ClientStructureIssue[] = [];

  let metadata = await readJsonFile<ClientMetadata>(directory, METADATA_FILE);
  if (!metadata) {
    if (!name) {
      throw new ClientWorkspaceError(`Le dossier "${slug}" ne contient pas de métadonnées valides.`);
    }
    metadata = await buildClientMetadata(name, slug);
    await writeJsonFile(directory, METADATA_FILE, metadata);
    issues.push({
      type: 'metadata_created',
      path: `${slug}/${METADATA_FILE}`,
      message: 'Fichier metadata.json recréé pour ce dossier client.',
    });
  }

  const documentsDir = await getOrCreateSubdirectoryWithReport(directory, DOCUMENTS_DIR, issues);
  const mediaDir = await getOrCreateSubdirectoryWithReport(directory, MEDIA_DIR, issues);
  const conversationsDir = await getOrCreateSubdirectoryWithReport(directory, CONVERSATIONS_DIR, issues);

  let conversations = await listConversationFiles(directory);
  if (conversations.length === 0) {
    const created = await ensureDefaultConversationFile(directory, issues);
    conversations = [created];
  }

  let conversationLines = 0;
  let lastConversationAt: string | undefined;

  for (const conversation of conversations) {
    try {
      const fileHandle = await conversationsDir.getFileHandle(conversation.filename);
      const file = await fileHandle.getFile();
      const text = await file.text();
      let parsedEntries: ConversationEntry[] = [];
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) {
          parsedEntries = parsed as ConversationEntry[];
        } else if (typeof parsed === 'string') {
          const lines = parsed.split('\n').filter(Boolean);
          parsedEntries = lines.map((line) => JSON.parse(line) as ConversationEntry);
        }
      } catch {
        const lines = text.split('\n').filter(Boolean);
        try {
          parsedEntries = lines.map((line) => JSON.parse(line) as ConversationEntry);
        } catch {
          parsedEntries = [];
        }
      }

      conversationLines += parsedEntries.length;
      if (parsedEntries.length > 0) {
        const lastEntry = parsedEntries[parsedEntries.length - 1];
        if (lastEntry.timestamp) {
          if (!lastConversationAt || lastEntry.timestamp > lastConversationAt) {
            lastConversationAt = lastEntry.timestamp;
          }
        }
      }
    } catch (error) {
      console.warn('[ensureClientStructure] Lecture conversation échouée', conversation.filename, error);
    }
  }

  let documentsCount = 0;
  for await (const entry of documentsDir.values()) {
    if (entry.kind === 'file') {
      documentsCount += 1;
    }
  }

  let mediaCount = 0;
  for await (const entry of mediaDir.values()) {
    if (entry.kind === 'file') {
      mediaCount += 1;
    }
  }

  return {
    slug,
    directoryHandle: directory,
    conversationLines,
    documentsCount,
    mediaCount,
    lastConversationAt,
    conversations,
    structureIssues: issues,
    ...metadata!,
  };
}

export async function initialiseWorkspace(root: FileSystemDirectoryHandle): Promise<WorkspaceHandle> {
  assertFileSystemSupport();
  return bootstrapWorkspace(root);
}

async function findUniqueSlug(root: FileSystemDirectoryHandle, base: string): Promise<string> {
  let slug = base;
  let counter = 1;

  while (true) {
    try {
      await root.getDirectoryHandle(slug);
      slug = `${base}-${counter}`;
      counter += 1;
    } catch (error) {
      if ((error as DOMException).name === 'NotFoundError') {
        return slug;
      }
      throw error;
    }
  }
}

export interface CreateClientOptions {
  folderSlug: string;
  displayName: string;
}

export async function createClient(root: FileSystemDirectoryHandle, options: CreateClientOptions): Promise<ClientSummary> {
  assertFileSystemSupport();
  const cleanSlugInput = options.folderSlug.trim();
  if (!cleanSlugInput) {
    throw new ClientWorkspaceError('Le nom du dossier ne peut pas être vide.');
  }

  const baseSlug = slugify(cleanSlugInput);
  if (!baseSlug) {
    throw new ClientWorkspaceError('Le nom du dossier contient des caractères non pris en charge.');
  }
  if (RESERVED_ROOT_DIRECTORIES.has(baseSlug)) {
    throw new ClientWorkspaceError('Ce nom est réservé et ne peut pas être utilisé.');
  }

  const slug = await findUniqueSlug(root, baseSlug);
  if (slug !== baseSlug) {
    throw new ClientWorkspaceError('Un dossier portant ce nom existe déjà. Veuillez en choisir un autre.');
  }

  const directory = await root.getDirectoryHandle(slug, { create: true });
  const friendlyName = options.displayName.trim() || slug;
  const summary = await ensureClientStructure(directory, friendlyName);
  return { ...summary, structureIssues: [] };
}

export async function listClients(root: FileSystemDirectoryHandle): Promise<ClientSummary[]> {
  assertFileSystemSupport();
  const results: ClientSummary[] = [];

  for await (const entry of root.values()) {
    if (entry.kind !== 'directory') {
      continue;
    }
    const entryName = entry.name.toLowerCase();
    if (RESERVED_ROOT_DIRECTORIES.has(entryName) || entryName.startsWith('.')) {
      continue;
    }
    try {
      const directory = await root.getDirectoryHandle(entry.name);
      const fallbackName = entry.name.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
      const summary = await ensureClientStructure(directory, fallbackName || entry.name);
      results.push(summary);
    } catch (error) {
      console.warn('[ClientWorkspace] Dossier client ignoré', entry.name, error);
    }
  }

  return results.sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
}

export async function loadConversation(
  directory: FileSystemDirectoryHandle,
  conversationFilename?: string,
): Promise<{ entries: ConversationEntry[]; filename: string }> {
  assertFileSystemSupport();
  const { fileHandle, filename } = await getConversationFileHandle(directory, conversationFilename);
  const file = await fileHandle.getFile();
  const text = await file.text();

  if (!text.trim()) {
    return { entries: [], filename };
  }

  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return { entries: parsed as ConversationEntry[], filename };
    }
  } catch {
    // fallback to newline parsing below
  }

  const entries: ConversationEntry[] = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    try {
      entries.push(JSON.parse(line) as ConversationEntry);
    } catch (error) {
      console.warn('[ClientWorkspace] Ligne de conversation invalide ignorée', line, error);
    }
  }

  return { entries, filename };
}

export async function saveConversation(
  directory: FileSystemDirectoryHandle,
  entries: ConversationEntry[],
  conversationFilename?: string,
): Promise<string> {
  assertFileSystemSupport();
  const { fileHandle, filename } = await getConversationFileHandle(directory, conversationFilename);
  const writable = await fileHandle.createWritable();

  try {
    await writable.write(JSON.stringify(entries, null, 2));
    await writable.close();
  } catch (error) {
    await writable.abort();
    throw new ClientWorkspaceError('Échec de la sauvegarde de la conversation.', error);
  }

  const metadata = await readJsonFile<ClientMetadata>(directory, METADATA_FILE);
  if (metadata) {
    metadata.updatedAt = new Date().toISOString();
    await writeJsonFile(directory, METADATA_FILE, metadata);
  }

  return filename;
}

export async function appendConversationEntries(
  directory: FileSystemDirectoryHandle,
  newEntries: ConversationEntry[],
  conversationFilename?: string,
): Promise<{ entries: ConversationEntry[]; filename: string }> {
  const { entries: existing, filename } = await loadConversation(directory, conversationFilename);
  const merged = [...existing, ...newEntries];
  const savedFilename = await saveConversation(directory, merged, filename);
  return { entries: merged, filename: savedFilename };
}

export async function listConversationSummaries(directory: FileSystemDirectoryHandle): Promise<ConversationFileSummary[]> {
  return listConversationFiles(directory);
}

export async function createConversationFile(
  directory: FileSystemDirectoryHandle,
  desiredFilename?: string,
): Promise<ConversationFileSummary> {
  const conversationsDir = await ensureConversationsDirectory(directory);
  const filename = desiredFilename ?? generateConversationFilename();
  const handle = await conversationsDir.getFileHandle(filename, { create: true });
  const writable = await handle.createWritable();
  await writable.write('[]');
  await writable.close();

  return {
    filename,
    path: `${directory.name}/${CONVERSATIONS_DIR}/${filename}`,
    lastModified: new Date().toISOString(),
    size: 0,
  };
}

export async function touchClient(directory: FileSystemDirectoryHandle): Promise<void> {
  const metadata = await readJsonFile<ClientMetadata>(directory, METADATA_FILE);
  if (!metadata) {
    return;
  }
  metadata.updatedAt = new Date().toISOString();
  await writeJsonFile(directory, METADATA_FILE, metadata);
}

export async function ensureDocumentsDirectory(directory: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return ensureSubdirectory(directory, DOCUMENTS_DIR);
}

export async function ensureMediaDirectory(directory: FileSystemDirectoryHandle): Promise<FileSystemDirectoryHandle> {
  return ensureSubdirectory(directory, MEDIA_DIR);
}

export async function isClientDirectory(directory: FileSystemDirectoryHandle): Promise<boolean> {
  try {
    await directory.getFileHandle(METADATA_FILE);
    return true;
  } catch (error) {
    if ((error as DOMException).name === 'NotFoundError') {
      return false;
    }
    throw new ClientWorkspaceError('Impossible de vérifier le dossier client.', error);
  }
}

export function buildConversationEntry(role: ConversationRole, content: string, metadata?: Record<string, unknown>): ConversationEntry {
  return {
    id: nanoid(10),
    role,
    content,
    metadata,
    timestamp: new Date().toISOString(),
  };
}

export async function pickWorkspaceDirectory(): Promise<FileSystemDirectoryHandle> {
  assertFileSystemSupport();
  return window.showDirectoryPicker({ mode: 'readwrite' });
}

export async function pickClientDirectory(
  startIn?: FileSystemDirectoryHandle,
): Promise<FileSystemDirectoryHandle> {
  assertFileSystemSupport();
  const options: DirectoryPickerOptions = { mode: 'readwrite' };
  if (startIn) {
    (options as unknown as { startIn: FileSystemDirectoryHandle }).startIn = startIn;
  }
  return window.showDirectoryPicker(options);
}
