import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { ScrollArea } from './ui/scroll-area';
import { Separator } from './ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { toast } from 'sonner';
import { ClientWorkspaceActions, ClientWorkspaceState, NewClientDetails } from '../hooks/useClientWorkspace';
import { cn } from './ui/utils';
import { FolderOpen, FilePlus, MessageSquarePlus, Save, Undo2, Loader2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { slugify } from '../utils/clientWorkspace';

interface ClientWorkspacePanelProps {
  state: ClientWorkspaceState;
  actions: ClientWorkspaceActions;
  onRequestClose?: () => void;
}

const emptyClientDetails: NewClientDetails = {
  folderSlug: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  description: '',
};

const emptyProfileDraft = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  address: '',
  description: '',
};

export function ClientWorkspacePanel({ state, actions, onRequestClose }: ClientWorkspacePanelProps) {
  const [newClient, setNewClient] = useState<NewClientDetails>(emptyClientDetails);
  const [profileDraft, setProfileDraft] = useState(emptyProfileDraft);
  const [profileDirty, setProfileDirty] = useState(false);
  const [mode, setMode] = useState<'view' | 'create'>('view');
  const [creatingClient, setCreatingClient] = useState(false);
  const isCreating = mode === 'create';
  const newClientSectionRef = useRef<HTMLDivElement | null>(null);
  const newClientSlugRef = useRef<HTMLInputElement | null>(null);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [selectorStep, setSelectorStep] = useState<'workspace' | 'client'>('workspace');
  const [selectorLoading, setSelectorLoading] = useState(false);

  useEffect(() => {
    if (!isCreating) {
      return;
    }
    if (!newClient.folderSlug.trim()) {
      const candidate = [newClient.firstName.trim(), newClient.lastName.trim()]
        .filter(Boolean)
        .join('-');
      if (candidate) {
        setNewClient((prev) => ({ ...prev, folderSlug: slugify(candidate) }));
      }
    }
  }, [isCreating, newClient.firstName, newClient.lastName, newClient.folderSlug]);

  const selectedClient = state.selectedClient;
  const selectedSlug = selectedClient?.slug;
  const workspaceName = useMemo(() => {
    try {
      const base = (state.root as any)?.name;
      return `/${base ?? 'Misan'}`;
    } catch {
      return '/Misan';
    }
  }, [state.root]);

  const selectValue = selectedSlug ?? '';
  const selectedProfile = selectedSlug ? state.clientProfiles[selectedSlug] : undefined;

  const resetProfileDraft = React.useCallback(() => {
    if (selectedProfile) {
      setProfileDraft({
        firstName: selectedProfile.firstName,
        lastName: selectedProfile.lastName,
        email: selectedProfile.email,
        phone: selectedProfile.phone,
        address: selectedProfile.address,
        description: selectedProfile.description,
      });
    } else {
      setProfileDraft(emptyProfileDraft);
    }
    setProfileDirty(false);
  }, [selectedProfile]);

  useEffect(() => {
    resetProfileDraft();
  }, [resetProfileDraft]);

  const handleNewClientChange = (field: keyof NewClientDetails, value: string) => {
    setNewClient((prev) => ({ ...prev, [field]: value }));
  };

  const handleProfileChange = (field: keyof typeof profileDraft, value: string) => {
    setProfileDraft((prev) => ({ ...prev, [field]: value }));
    setProfileDirty(true);
  };

  const startCreateMode = async () => {
    if (!state.root) {
      const selectedRoot = await actions.chooseWorkspace();
      if (!selectedRoot) {
        toast.info('Sélection du workspace annulée.');
        return;
      }
    }
    actions.clearSelection();
    setMode('create');
    setProfileDirty(false);
    setNewClient(emptyClientDetails);
    window.setTimeout(() => {
      newClientSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      newClientSlugRef.current?.focus();
    }, 150);
  };

  const cancelCreateMode = () => {
    setMode('view');
    setNewClient(emptyClientDetails);
  };

  const handleCreateClient = async () => {
    const slugCandidate = newClient.folderSlug.trim();
    if (!slugCandidate) {
      toast.error('Indiquez le nom du dossier.');
      newClientSlugRef.current?.focus();
      return;
    }

    const normalizedSlug = slugify(slugCandidate);
    if (!normalizedSlug) {
      toast.error('Le nom du dossier doit contenir uniquement lettres, chiffres ou tirets.');
      newClientSlugRef.current?.focus();
      return;
    }

    if (normalizedSlug !== slugCandidate) {
      setNewClient((prev) => ({ ...prev, folderSlug: normalizedSlug }));
      toast.info(`Nom du dossier ajusté en “${normalizedSlug}”.`);
    }

    if (state.clients.some((client) => client.slug === normalizedSlug)) {
      toast.error('Un dossier avec ce nom existe déjà.');
      newClientSlugRef.current?.focus();
      return;
    }

    const friendlyName = [newClient.firstName.trim(), newClient.lastName.trim()]
      .filter(Boolean)
      .join(' ')
      .trim() || normalizedSlug;

    if (state.clients.some((client) => client.name.trim().toLowerCase() === friendlyName.toLowerCase())) {
      toast.error(`Un dossier client nommé « ${friendlyName} » existe déjà.`);
      return;
    }

    setCreatingClient(true);
    try {
      const created = await actions.createClientFolder({
        ...newClient,
        folderSlug: normalizedSlug,
      });
      if (created) {
        setNewClient(emptyClientDetails);
        setMode('view');
        onRequestClose?.();
      }
    } finally {
      setCreatingClient(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!selectedSlug) return;
    await actions.saveClientProfile(selectedSlug, {
      firstName: profileDraft.firstName,
      lastName: profileDraft.lastName,
      email: profileDraft.email,
      phone: profileDraft.phone,
      address: profileDraft.address,
      description: profileDraft.description,
    });
    setProfileDirty(false);
  };

  const handleCancelProfile = () => {
    resetProfileDraft();
  };

  const conversations = state.conversations;
  const activeConversation = state.conversationFilename;
  const canSubmitNewClient = Boolean(newClient.folderSlug.trim());
  const hasWorkspace = Boolean(state.root);

  useEffect(() => {
    if (!isCreating) {
      return;
    }
    if (state.selectedClient) {
      setMode('view');
    }
  }, [isCreating, state.selectedClient]);

  useEffect(() => {
    if (state.root) {
      setSelectorStep('client');
      if (selectorOpen) {
        toast.success('Espace de travail sélectionné.');
      }
    }
    if (state.selectedClient) {
      setSelectorOpen(false);
      toast.success(`Dossier ${state.selectedClient.name} prêt.`);
    }
  }, [state.root, state.selectedClient, selectorOpen]);

  const openSelector = () => {
    setSelectorStep(state.root ? 'client' : 'workspace');
    setSelectorOpen(true);
    toast.info(state.root ? 'Étape 2 : choisissez le dossier client.' : 'Étape 1 : sélectionnez le dossier /Misan.');
  };

  const handleSelectWorkspace = async () => {
    setSelectorLoading(true);
    const selectedRoot = await actions.chooseWorkspace();
    setSelectorLoading(false);
    if (selectedRoot) {
      setSelectorStep('client');
      toast.info('Workspace chargé. Passez à la sélection du dossier client.');
    }
  };

  const handleSelectClient = async () => {
    setSelectorLoading(true);
    const success = await actions.pickClient();
    setSelectorLoading(false);
    if (success) {
      setSelectorOpen(false);
    }
  };

  useEffect(() => {
    if (selectorOpen && selectorStep === 'client' && state.root && !state.selectedClient) {
      toast.info('Choisissez le dossier client dans le Finder.');
    }
  }, [selectorOpen, selectorStep, state.root, state.selectedClient]);

  return (
    <Card className="mb-4 border-dashed">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold">Espace client local</CardTitle>
          <div className="flex items-center gap-2">
            {!isCreating && (
              <Button
                size="sm"
                variant="outline"
                onClick={openSelector}
              >
                <FolderOpen className="w-4 h-4 mr-1" />
                Choisir…
              </Button>
            )}
            {isCreating ? (
              <Button size="sm" variant="ghost" onClick={cancelCreateMode} disabled={creatingClient}>
                <Undo2 className="w-4 h-4 mr-1" />
                Annuler
              </Button>
            ) : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  void startCreateMode();
                }}
                disabled={state.loading}
              >
                <FilePlus className="w-4 h-4 mr-1" />
                Nouveau dossier
              </Button>
            )}
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {state.root ? `Workspace : ${workspaceName}` : 'Workspace : /Misan (à sélectionner)'}
          {state.selectedClient && !isCreating
            ? ` • Dossier courant : ${state.selectedClient.name} (/Misan/${state.selectedClient.slug})`
            : ''}
        </div>
      </CardHeader>
      <Separator className="opacity-40" />
      <CardContent className="pt-4 space-y-5">
        {!isCreating && (
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground">Sélection rapide</h3>
            <div className="flex items-center gap-2">
              <Select
                value={selectValue}
                onValueChange={(value) => {
                  if (value === selectValue) {
                    return;
                  }
                  if (!value) {
                    actions.clearSelection();
                  } else {
                    actions.selectClient(value);
                    toast.success('Dossier client chargé.');
                  }
                }}
                disabled={!hasWorkspace || state.clients.length === 0 || state.loading}
              >
                <SelectTrigger className="w-full" disabled={!hasWorkspace || state.clients.length === 0 || state.loading}>
                  <SelectValue
                    placeholder={state.clients.length === 0 ? 'Aucun dossier détecté' : 'Choisir un dossier'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {state.clients.map((client) => (
                    <SelectItem key={client.slug} value={client.slug}>
                      <div className="flex flex-col">
                        <span>{client.name}</span>
                        <span className="text-[11px] text-muted-foreground">/{client.slug}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void actions.refreshClients();
                }}
                disabled={!hasWorkspace || state.loading}
              >
                Actualiser
              </Button>
            </div>
            {selectedClient && (
              <p className="text-[11px] text-muted-foreground">
                Dossier courant : <span className="font-medium">{selectedClient.name}</span>
              </p>
            )}
          </div>
        )}

        {isCreating ? (
          <div ref={newClientSectionRef} className="space-y-3">
            <div>
              <h3 className="text-xs font-semibold text-muted-foreground">Nouveau dossier client</h3>
              <p className="text-xs text-muted-foreground mt-1">
                Renseignez les informations du client. Le dossier et sa structure seront créés automatiquement sous
                <span className="font-medium"> /Misan/</span> dès la validation.
              </p>
            </div>
            <div className="space-y-2">
              <Input
                ref={newClientSlugRef}
                value={newClient.folderSlug}
                onChange={(event) => handleNewClientChange('folderSlug', event.target.value)}
                placeholder="Nom du dossier (clé) — ex: dossier-client"
                disabled={creatingClient}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Input
                value={newClient.email}
                onChange={(event) => handleNewClientChange('email', event.target.value)}
                placeholder="Email"
                disabled={creatingClient}
              />
              <Input
                value={newClient.firstName}
                onChange={(event) => handleNewClientChange('firstName', event.target.value)}
                placeholder="Prénom"
                disabled={creatingClient}
              />
              <Input
                value={newClient.lastName}
                onChange={(event) => handleNewClientChange('lastName', event.target.value)}
                placeholder="Nom"
                disabled={creatingClient}
              />
              <Input
                value={newClient.phone}
                onChange={(event) => handleNewClientChange('phone', event.target.value)}
                placeholder="Téléphone"
                disabled={creatingClient}
              />
              <Input
                value={newClient.address}
                onChange={(event) => handleNewClientChange('address', event.target.value)}
                placeholder="Adresse"
                disabled={creatingClient}
              />
            </div>
            <Textarea
              value={newClient.description}
              onChange={(event) => handleNewClientChange('description', event.target.value)}
              placeholder="Descriptif du dossier (10 lignes max)"
              rows={3}
              disabled={creatingClient}
              maxLength={1200}
            />
            <div className="flex items-center justify-between">
              <Button
                size="sm"
                onClick={() => {
                  void handleCreateClient();
                }}
                disabled={creatingClient || !canSubmitNewClient || !hasWorkspace}
              >
                {creatingClient ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <FilePlus className="w-4 h-4 mr-2" />
                )}
                Créer le dossier
              </Button>
            </div>
          </div>
        ) : selectedClient ? (
          <>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">Informations client</span>
                {profileDirty && (
                  <div className="flex items-center gap-2">
                    <Button size="xs" variant="ghost" onClick={handleCancelProfile}>
                      <Undo2 className="w-3 h-3 mr-1" />
                      Annuler
                    </Button>
                    <Button size="xs" variant="outline" onClick={handleSaveProfile}>
                      <Save className="w-3 h-3 mr-1" />
                      Sauvegarder
                    </Button>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Input
                  value={profileDraft.firstName}
                  onChange={(event) => handleProfileChange('firstName', event.target.value)}
                  placeholder="Prénom"
                />
                <Input
                  value={profileDraft.lastName}
                  onChange={(event) => handleProfileChange('lastName', event.target.value)}
                  placeholder="Nom"
                />
                <Input
                  value={profileDraft.email}
                  onChange={(event) => handleProfileChange('email', event.target.value)}
                  placeholder="Email"
                />
                <Input
                  value={profileDraft.phone}
                  onChange={(event) => handleProfileChange('phone', event.target.value)}
                  placeholder="Téléphone"
                />
              </div>
              <Input
                value={profileDraft.address}
                onChange={(event) => handleProfileChange('address', event.target.value)}
                placeholder="Adresse"
              />
              <Textarea
                value={profileDraft.description}
                onChange={(event) => handleProfileChange('description', event.target.value)}
                placeholder="Descriptif du dossier"
                rows={6}
                maxLength={1200}
              />
            </div>

            <Separator className="opacity-40" />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">Conversations</span>
                <Button
                  size="xs"
                  variant="outline"
                  onClick={actions.createConversation}
                  disabled={state.loading || !selectedClient}
                >
                  <MessageSquarePlus className="w-3 h-3 mr-1" />
                  Nouvelle
                </Button>
              </div>
              <ScrollArea className="h-32 rounded border border-dashed">
                <div className="p-2 space-y-1">
                  {conversations.length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-6">
                      Aucune conversation disponible.
                    </div>
                  )}
                  {conversations.map((conversation) => (
                    <button
                      key={conversation.filename}
                      type="button"
                      onClick={() => actions.selectConversation(conversation.filename)}
                      className={cn(
                        'w-full text-left px-3 py-2 rounded border transition-colors text-sm',
                        activeConversation === conversation.filename
                          ? 'border-primary/60 bg-primary/5 text-primary'
                          : 'border-transparent hover:border-border hover:bg-muted'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{conversation.filename}</span>
                        {conversation.lastModified && (
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(conversation.lastModified).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>Cliquez sur « Choisir… » pour sélectionner un dossier client existant dans /Misan.</p>
            <p>Utilisez « Nouveau dossier » pour préparer un nouveau client puis enregistrez-le lorsque les informations sont complètes.</p>
            {state.clients.length > 0 && (
              <p className="italic text-muted-foreground/80">Dossier courant : {state.selectedClient?.name ?? 'aucun'}</p>
            )}
          </div>
        )}
        <Dialog open={selectorOpen} onOpenChange={setSelectorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Sélection du dossier client</DialogTitle>
              <DialogDescription>
                {selectorStep === 'workspace'
                  ? 'Commencez par sélectionner le dossier racine /Misan.'
                  : 'Choisissez le dossier client dans /Misan pour charger ses informations.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3 py-2 text-sm">
              <p className="text-muted-foreground">
                Étape {selectorStep === 'workspace' ? '1' : '2'} / 2
              </p>
              {selectorStep === 'workspace' ? (
                <div className="space-y-2">
                  <p>Sélectionnez le dossier racine contenant tous vos clients (par exemple /Misan).</p>
                  <Button onClick={handleSelectWorkspace} disabled={selectorLoading}>
                    {selectorLoading ? 'Ouverture…' : 'Choisir /Misan'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <p>Choisissez maintenant le dossier client que vous souhaitez ouvrir.</p>
                  <Button onClick={handleSelectClient} disabled={selectorLoading}>
                    {selectorLoading ? 'Ouverture…' : 'Choisir un dossier client'}
                  </Button>
                  {state.selectedClient && (
                    <p className="text-xs text-muted-foreground">
                      Dossier actuellement chargé : {state.selectedClient.name}
                    </p>
                  )}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setSelectorOpen(false)} disabled={selectorLoading}>
                Fermer
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
