import { useCallback, useEffect, useRef, useState } from 'react';
import {
  appendConversationEntries,
  buildConversationEntry,
  ClientSummary,
  initialiseWorkspace,
  listClients,
  loadConversation,
  pickWorkspaceDirectory,
  pickClientDirectory,
  saveConversation,
  createClient,
  ClientWorkspaceError,
  listConversationSummaries,
  createConversationFile,
  ConversationFileSummary,
  isClientDirectory,
} from '../utils/clientWorkspace';
import { toast } from 'sonner';
import { ensureWorkspaceDirectories } from '../utils/workspaceUtils';
import {
  fetchWorkspaceClientProfiles,
  upsertWorkspaceClientProfile,
  WorkspaceClientInput,
  WorkspaceClientProfile,
} from '../utils/workspaceClientService';

const LOCAL_STORAGE_KEY = 'misan.workspaceHandle';

export interface WorkspaceState {
  root?: FileSystemDirectoryHandle;
  loading: boolean;
  error?: string;
  clients: ClientSummary[];
  selectedClient?: ClientSummary;
  conversation: ReturnType<typeof buildConversationEntry>[];
  conversationFilename?: string;
  conversations: ConversationFileSummary[];
  clientProfiles: Record<string, WorkspaceClientProfile>;
}

export interface NewClientDetails {
  folderSlug: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  description: string;
}

export function useClientWorkspace() {
  const [root, setRoot] = useState<FileSystemDirectoryHandle | undefined>();
  const [clients, setClients] = useState<ClientSummary[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string | undefined>();
  const [selectedClient, setSelectedClient] = useState<ClientSummary | undefined>();
  const [conversation, setConversation] = useState<ReturnType<typeof buildConversationEntry>[]>([]);
  const [conversationFilename, setConversationFilename] = useState<string | undefined>();
  const [conversations, setConversations] = useState<ConversationFileSummary[]>([]);
  const [clientProfiles, setClientProfiles] = useState<Record<string, WorkspaceClientProfile>>({});
  const [profilesEnabled, setProfilesEnabled] = useState(true);
  const conversationFilenameRef = useRef<string | undefined>(undefined);
  const selectedSlugRef = useRef<string | undefined>(undefined);
  const autoCreatedProfilesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    conversationFilenameRef.current = conversationFilename;
  }, [conversationFilename]);
  useEffect(() => {
    selectedSlugRef.current = selectedSlug;
  }, [selectedSlug]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const loadClients = useCallback(
    async (handle: FileSystemDirectoryHandle, preferredSlug?: string): Promise<ClientSummary[]> => {
      setLoading(true);
      let items: ClientSummary[] = [];
      try {
        if (!preferredSlug) {
          autoCreatedProfilesRef.current = new Set();
        }
        setClientProfiles((prev) => (preferredSlug ? prev : {}));
        if (await isClientDirectory(handle)) {
          throw new ClientWorkspaceError('Sélectionnez le dossier racine /Misan, pas un dossier client.');
        }
        await initialiseWorkspace(handle);
        items = await listClients(handle);
        if (profilesEnabled) {
          try {
            const profiles = await fetchWorkspaceClientProfiles();
            setClientProfiles(profiles);
            const remoteSlugs = Object.keys(profiles ?? {});
            if (remoteSlugs.length > 0) {
              const localSlugs = new Set(items.map((item) => item.slug));
              const missing = remoteSlugs.filter((slug) => !localSlugs.has(slug));
              if (missing.length > 0) {
                toast.warning(
                  `Les dossiers suivants sont absents de /Misan : ${missing
                    .map((slug) => `/Misan/${slug}`)
                    .join(', ')}. Pensez à les restaurer ou à les supprimer de la base clients.`,
                );
              }
            }
          } catch (profileError: any) {
            if (profileError?.code === 'PGRST205') {
              console.info('[useClientWorkspace] Table workspace_clients absente, désactivation des profils');
              setProfilesEnabled(false);
            } else {
              console.warn('[useClientWorkspace] Chargement profils clients échoué', profileError);
            }
          }
        }
        setClients(items);
        const previous = selectedSlugRef.current;
        let nextSlug: string | undefined;
        if (preferredSlug && items.some((item) => item.slug === preferredSlug)) {
          nextSlug = preferredSlug;
        } else if (previous && items.some((item) => item.slug === previous)) {
          nextSlug = previous;
        } else {
          nextSlug = undefined;
        }
        setSelectedSlug(nextSlug);
        setSelectedClient(nextSlug ? items.find((item) => item.slug === nextSlug) : undefined);
      } catch (err) {
        console.error('[useClientWorkspace] Chargement clients échoué', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        toast.error(err instanceof ClientWorkspaceError ? err.message : 'Impossible de charger les dossiers clients.');
        throw err;
      } finally {
        setLoading(false);
      }
      return items;
    },
    [profilesEnabled],
  );

  const syncConversationsForClient = useCallback(
    async (client: ClientSummary, preferredFilename?: string) => {
      try {
        let list = await listConversationSummaries(client.directoryHandle);
        if (list.length === 0) {
          const created = await createConversationFile(client.directoryHandle);
          list = [created];
          toast.info(`Aucune conversation trouvée pour ${client.name}. Un fichier vierge a été créé.`);
        }
        setConversations(list);

        const current = preferredFilename
          && list.some((item) => item.filename === preferredFilename)
          ? preferredFilename
          : conversationFilenameRef.current && list.some((item) => item.filename === conversationFilenameRef.current)
            ? conversationFilenameRef.current
            : list[0]?.filename;

        setConversationFilename(current);
        return current;
      } catch (error) {
        console.error('[useClientWorkspace] Synchronisation conversations échouée', error);
        toast.error('Impossible de récupérer les conversations du dossier.');
        setConversations([]);
        setConversationFilename(undefined);
        return undefined;
      }
    },
    [],
  );

  useEffect(() => {
    const restoreWorkspace = async () => {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return;
      try {
        const handle = await (window as any).navigator.storage?.getDirectory?.();
        if (!handle) return;
      } catch (error) {
        console.warn('[useClientWorkspace] Impossible de restaurer le workspace', error);
      }
    };
    restoreWorkspace();
  }, []);

  const selectClient = useCallback((slug: string) => {
    setSelectedSlug(slug);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedSlug(undefined);
  }, []);

  useEffect(() => {
    setSelectedClient(selectedSlug ? clients.find((client) => client.slug === selectedSlug) : undefined);
  }, [clients, selectedSlug]);

  useEffect(() => {
    if (!selectedClient || !selectedClient.structureIssues?.length) {
      return;
    }

    selectedClient.structureIssues.forEach((issue) => {
      if (issue.type === 'conversation_created' || issue.type === 'legacy_conversation_migrated') {
        toast.info(issue.message);
        return;
      }
      toast.warning(issue.message);
    });

    setClients((prev) =>
      prev.map((client) =>
        client.slug === selectedClient.slug ? { ...client, structureIssues: [] } : client,
      ),
    );
  }, [selectedClient]);

  useEffect(() => {
    if (!selectedClient || !profilesEnabled || !root) {
      return;
    }

    const slug = selectedClient.slug;
    if (clientProfiles[slug]) {
      return;
    }

    if (autoCreatedProfilesRef.current.has(slug)) {
      return;
    }

    const ensureProfile = async () => {
      try {
        const profile = await upsertWorkspaceClientProfile({
          slug,
          displayName: selectedClient.name,
          firstName: '',
          lastName: '',
          email: '',
          phone: '',
          address: '',
          description: '',
        });
        autoCreatedProfilesRef.current.add(slug);
        setClientProfiles((prev) => ({
          ...prev,
          [slug]: profile,
        }));
        toast.warning(`Fiche Supabase absente pour ${selectedClient.name}. Un profil vierge a été créé.`);
      } catch (error: any) {
        if (error?.code === 'PGRST205') {
          setProfilesEnabled(false);
          toast.info('Profils clients désactivés : la table workspace_clients est indisponible.');
        } else {
          console.error('[useClientWorkspace] Auto-création profil client échouée', error);
          toast.error('Impossible de créer la fiche client dans la base.');
        }
      }
    };

    void ensureProfile();
  }, [selectedClient, profilesEnabled, root, clientProfiles]);

  useEffect(() => {
    const prepareClient = async () => {
      if (!root || !selectedClient) {
        setConversation([]);
        setConversationFilename(undefined);
        setConversations([]);
        return;
      }
      setLoading(true);
      const loaded = await syncConversationsForClient(selectedClient);
      if (loaded) {
        toast.success(`Conversation « ${loaded} » chargée.`);
      }
      setLoading(false);
    };
    prepareClient();
  }, [root, selectedClient, syncConversationsForClient]);

  useEffect(() => {
    const fetchConversationEntries = async () => {
      if (!root || !selectedClient || !conversationFilename) {
        setConversation([]);
        return;
      }
      setLoading(true);
      try {
        const { entries, filename } = await loadConversation(selectedClient.directoryHandle, conversationFilename);
        setConversation(entries);
        setConversationFilename(filename);
      } catch (err) {
        console.error('[useClientWorkspace] Chargement conversation échoué', err);
        setError(err instanceof Error ? err.message : 'Erreur inconnue');
        toast.error('Impossible de charger la conversation du dossier.');
      } finally {
        setLoading(false);
      }
    };
    fetchConversationEntries();
  }, [root, selectedClient, conversationFilename]);

  const chooseWorkspace = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    try {
      const handle = await pickWorkspaceDirectory();
      setRoot(handle);
      await loadClients(handle);
      localStorage.setItem(LOCAL_STORAGE_KEY, (handle as any).name ?? '');
      toast.success('Espace /Misan sélectionné');

      try {
        const { created, missing } = await ensureWorkspaceDirectories(handle);
        if (created.length > 0) {
          toast.success(`Dossier${created.length > 1 ? 's' : ''} ${created.join(', ')} créé${created.length > 1 ? 's' : ''}.`);
        }
        if (missing.length > 0) {
          toast.warning(`Dossier${missing.length > 1 ? 's' : ''} manquant${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
        }
      } catch (error) {
        console.error('[useClientWorkspace] Vérification structure workspace échouée', error);
        toast.error('Impossible de vérifier les dossiers /Misan.');
      }

      return handle;
    } catch (err) {
      if (err instanceof ClientWorkspaceError) {
        toast.error(err.message);
      } else if (err instanceof DOMException && err.name === 'AbortError') {
        // utilisateur a annulé
      } else {
        console.error('[useClientWorkspace] Sélection workspace échouée', err);
        toast.error('Impossible d\'accéder au dossier.');
      }
      return null;
    }
  }, [loadClients]);

  const pickClientFromWorkspace = useCallback(async (): Promise<boolean> => {
    try {
      let workspaceHandle = root;
      if (!workspaceHandle) {
        const handle = await pickWorkspaceDirectory();
        let rootClients: ClientSummary[] = [];
        try {
          rootClients = await loadClients(handle);
        } catch {
          return;
        }
        if (rootClients.length === 0) {
          toast.error('Le dossier sélectionné ne contient pas de dossiers clients. Sélectionnez le dossier /Misan.');
          return false;
        }
        setRoot(handle);
        localStorage.setItem(LOCAL_STORAGE_KEY, (handle as any).name ?? '');
        workspaceHandle = handle;
      }

      if (!workspaceHandle) {
        toast.error('Sélectionnez d\'abord le dossier /Misan.');
        return false;
      }

      const directoryHandle = await pickClientDirectory(workspaceHandle);
      if (!(await isClientDirectory(directoryHandle))) {
        toast.error('Choisissez un dossier client contenant un fichier metadata.json.');
        return false;
      }
      const slug = directoryHandle.name;
      let clients: ClientSummary[];
      try {
        clients = await loadClients(workspaceHandle, slug);
      } catch {
        return false;
      }
      const matching = clients.find((client) => client.slug === slug);
      if (!matching) {
        toast.error('Ce dossier ne correspond pas à un dossier client /Misan.');
        return false;
      }
      setSelectedSlug(slug);
      await syncConversationsForClient(matching);
      toast.success(`Dossier ${matching.name} chargé`);
      return true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return false;
      }
      if (err instanceof ClientWorkspaceError) {
        toast.error(err.message);
      } else {
        console.error('[useClientWorkspace] Sélection dossier client échouée', err);
        toast.error('Impossible de charger ce dossier client.');
      }
      return false;
    }
  }, [root, loadClients, syncConversationsForClient]);

  const refreshClients = useCallback(async () => {
    if (!root) return;
    await loadClients(root);
  }, [root, loadClients]);

  const saveClientProfile = useCallback(
    async (slug: string, details: Omit<WorkspaceClientInput, 'slug'>) => {
      if (!root) {
        toast.error('Sélectionnez d\'abord un espace de travail.');
        return;
      }
      if (!profilesEnabled) {
        toast.info('Profils clients non disponibles (table workspace_clients manquante).');
        return;
      }
      try {
        const profile = await upsertWorkspaceClientProfile({
          slug,
          displayName: `${details.firstName} ${details.lastName}`.trim() || slug,
          ...details,
        });
        setClientProfiles((prev) => ({
          ...prev,
          [slug]: profile,
        }));
        toast.success('Fiche client mise à jour');
      } catch (error: any) {
        if (error?.code === 'PGRST205') {
          setProfilesEnabled(false);
          toast.info('Profils clients désactivés : la table workspace_clients est indisponible.');
        } else {
          console.error('[useClientWorkspace] Enregistrement profil client échoué', error);
          toast.error('Impossible d\'enregistrer les informations du client.');
        }
      }
    },
    [root, profilesEnabled],
  );

  const selectConversation = useCallback((filename: string) => {
    setConversationFilename(filename);
  }, []);

  const createConversation = useCallback(async () => {
    if (!selectedClient) {
      toast.error('Sélectionnez un dossier client avant de créer une conversation.');
      return;
    }
    try {
      const created = await createConversationFile(selectedClient.directoryHandle);
      await syncConversationsForClient(selectedClient, created.filename);
      toast.success('Nouvelle conversation créée');
    } catch (error) {
      console.error('[useClientWorkspace] Création conversation échouée', error);
      toast.error('Impossible de créer la conversation.');
    }
  }, [selectedClient, syncConversationsForClient]);

  const createClientFolder = useCallback(
    async (details: NewClientDetails): Promise<ClientSummary | undefined> => {
      if (!root) {
        toast.error('Sélectionnez d\'abord un espace de travail.');
        return undefined;
      }

      try {
        const friendlyName = `${details.firstName} ${details.lastName}`.trim() || details.folderSlug;
        const summary = await createClient(root, {
          folderSlug: details.folderSlug,
          displayName: friendlyName,
        });
        const profile = await upsertWorkspaceClientProfile({
          slug: summary.slug,
          displayName: friendlyName,
          firstName: details.firstName,
          lastName: details.lastName,
          email: details.email,
          phone: details.phone,
          address: details.address,
          description: details.description,
        });

        setClientProfiles((prev) => ({
          ...prev,
          [summary.slug]: profile,
        }));

        setClients((prev) => {
          const next = [...prev, summary].sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
          return next;
        });
        setSelectedSlug(summary.slug);
        toast.success(`Dossier « ${summary.name} » prêt (/Misan/${summary.slug}).`);
        if (summary.slug !== details.folderSlug) {
          toast.info(`Nom ajusté en « ${summary.slug} » pour respecter le format.`);
        }
        return summary;
      } catch (err: any) {
        if (err instanceof ClientWorkspaceError) {
          toast.error(err.message);
        } else if (err?.code === '23505') {
          toast.error('Impossible de créer le dossier : un client avec ce nom existe déjà.');
        } else if (err?.code === '23503') {
          toast.error('Autorisations insuffisantes : vérifiez votre inscription ou reconnectez-vous.');
        } else {
          console.error('[useClientWorkspace] Création dossier échouée', err);
          toast.error('Impossible de créer le dossier client.');
        }
      }
      return undefined;
    },
    [root, clients],
  );

  const appendConversation = useCallback(
    async (entries: { role: 'user' | 'assistant' | 'system'; content: string; metadata?: Record<string, unknown> }[]) => {
      if (!selectedClient) {
        toast.error('Aucun dossier client sélectionné.');
        return;
      }

      let targetFilename = conversationFilenameRef.current;
      if (!targetFilename) {
        targetFilename = await syncConversationsForClient(selectedClient);
        if (!targetFilename) return;
      }

      try {
        const conversationEntries = entries.map((entry) => buildConversationEntry(entry.role, entry.content, entry.metadata));
        const { entries: merged, filename } = await appendConversationEntries(
          selectedClient.directoryHandle,
          conversationEntries,
          targetFilename,
        );
        setConversation(merged);
        setConversationFilename(filename);
        await syncConversationsForClient(selectedClient, filename);
        toast.success('Conversation sauvegardée');
      } catch (err) {
        if (err instanceof ClientWorkspaceError) {
          toast.error(err.message);
        } else {
          console.error('[useClientWorkspace] Ajout conversation échoué', err);
          toast.error('Impossible de sauvegarder la conversation.');
        }
      }
    },
    [selectedClient, syncConversationsForClient],
  );

  const saveConversationManually = useCallback(
    async (entries: ReturnType<typeof buildConversationEntry>[]) => {
      if (!selectedClient) {
        toast.error('Aucun dossier client sélectionné.');
        return;
      }

      let targetFilename = conversationFilenameRef.current;
      if (!targetFilename) {
        targetFilename = await syncConversationsForClient(selectedClient);
        if (!targetFilename) return;
      }

      try {
        const filename = await saveConversation(selectedClient.directoryHandle, entries, targetFilename);
        setConversation(entries);
        setConversationFilename(filename);
        await syncConversationsForClient(selectedClient, filename);
        toast.success('Conversation enregistrée');
      } catch (err) {
        if (err instanceof ClientWorkspaceError) {
          toast.error(err.message);
        } else {
          console.error('[useClientWorkspace] Sauvegarde conversation échouée', err);
          toast.error('Impossible de sauvegarder la conversation.');
        }
      }
    },
    [selectedClient, syncConversationsForClient],
  );

  return {
    state: {
      root,
      loading,
      error,
      clients,
      selectedClient,
      conversation,
      conversationFilename,
      conversations,
      clientProfiles,
    } satisfies WorkspaceState,
    actions: {
      chooseWorkspace,
      pickClient: pickClientFromWorkspace,
      refreshClients,
      selectClient,
      clearSelection,
      createClientFolder,
      appendConversation,
      saveConversation: saveConversationManually,
      selectConversation,
      createConversation,
      saveClientProfile,
    },
  };
}

export type ClientWorkspaceState = ReturnType<typeof useClientWorkspace>['state'];
export type ClientWorkspaceActions = ReturnType<typeof useClientWorkspace>['actions'];
