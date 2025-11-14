import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { ScrollArea } from '../ui/scroll-area';
import { toast } from 'sonner';
import { MailPlus, Pencil, Trash2, RefreshCw, Loader2, Search, Maximize2 } from 'lucide-react';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '../ui/pagination';
import {
  fetchEmailTemplates,
  createEmailTemplate,
  updateEmailTemplate,
  deleteEmailTemplate
} from '../../utils/settings';
import type { EmailTemplate, EmailTemplateInput, EmailTemplateRecipient, EmailTemplateMetadata } from '../../types';

const recipientLabels: Record<EmailTemplateRecipient, string> = {
  user: 'Utilisateur',
  admin: 'Administrateur',
  both: 'Utilisateur + Administrateur'
};

type FormState = {
  name: string;
  subject: string;
  recipients: EmailTemplateRecipient;
  cc: string;
  bcc: string;
  body: string;
  signature: string;
  isActive: boolean;
  allowAttachments: boolean;
  plainBody: string;
};

const DEFAULT_SIGNATURE = "L'équipe Misan\nVous accompagne dans votre réussite";

const defaultFormState: FormState = {
  name: '',
  subject: '',
  recipients: 'user',
  cc: '',
  bcc: '',
  body: '',
  signature: DEFAULT_SIGNATURE,
  isActive: true,
  allowAttachments: false,
  plainBody: ''
};

function toFormState(template: EmailTemplate): FormState {
  return {
    name: template.name,
    subject: template.subject,
    recipients: template.recipients,
    cc: template.cc.join(', '),
    bcc: template.bcc.join(', '),
    body: template.body,
    signature: template.signature,
    isActive: template.isActive,
    allowAttachments: Boolean(template.metadata?.allowAttachments),
    plainBody: typeof template.metadata?.plainBody === 'string' ? template.metadata?.plainBody : ''
  };
}

function toInput(form: FormState, baseMetadata: EmailTemplateMetadata = {}): EmailTemplateInput | null {
  if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
    return null;
  }

  const cc = form.cc
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);
  const bcc = form.bcc
    .split(',')
    .map(email => email.trim())
    .filter(Boolean);

  return {
    name: form.name.trim(),
    subject: form.subject.trim(),
    recipients: form.recipients,
    cc,
    bcc,
    body: form.body,
    signature: form.signature || DEFAULT_SIGNATURE,
    isActive: form.isActive,
    metadata: {
      ...baseMetadata,
      allowAttachments: form.allowAttachments,
      plainBody: form.plainBody.trim()
    }
  };
}

interface EmailTemplatesTabProps {
  variant?: 'card' | 'page';
  onOpenFullPage?: () => void;
}

export function EmailTemplatesTab(props: EmailTemplatesTabProps = {}) {
  const { variant = 'card', onOpenFullPage } = props;
  const isFullPage = variant === 'page';
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data);
    } catch (error) {
      console.error('Erreur chargement templates emails:', error);
      toast.error('Impossible de charger les emails.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadTemplates();
  }, []);

  const openCreateDialog = () => {
    setFormState(defaultFormState);
    setEditingTemplate(null);
    setDialogOpen(true);
  };

  const openEditDialog = (template: EmailTemplate) => {
    setFormState(toFormState(template));
    setEditingTemplate(template);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) return;
    setDialogOpen(false);
    setEditingTemplate(null);
    setFormState(defaultFormState);
  };

  const handleSave = async () => {
    const baseMetadata: EmailTemplateMetadata = editingTemplate ? { ...editingTemplate.metadata } : {};
    const payload = toInput(formState, baseMetadata);
    if (!payload) {
      toast.error('Nom, objet et contenu sont obligatoires.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingTemplate) {
        const updated = await updateEmailTemplate(editingTemplate.id, payload);
        setTemplates(prev => prev.map(item => item.id === updated.id ? updated : item));
        toast.success('Template mis à jour');
      } else {
        const created = await createEmailTemplate(payload);
        setTemplates(prev => [created, ...prev]);
        toast.success('Template créé');
      }
      closeDialog();
    } catch (error: any) {
      console.error('Erreur sauvegarde template email:', error);
      toast.error(error?.message || 'Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (template: EmailTemplate) => {
    if (!confirm(`Supprimer le template « ${template.name} » ?`)) {
      return;
    }
    try {
      await deleteEmailTemplate(template.id);
      setTemplates(prev => prev.filter(item => item.id !== template.id));
      toast.success('Template supprimé');
    } catch (error: any) {
      console.error('Erreur suppression template email:', error);
      toast.error(error?.message || 'Impossible de supprimer ce template');
    }
  };

  const handleToggleActive = async (template: EmailTemplate, value: boolean) => {
    try {
      const updated = await updateEmailTemplate(template.id, {
        name: template.name,
        subject: template.subject,
        recipients: template.recipients,
        cc: template.cc,
        bcc: template.bcc,
        body: template.body,
        signature: template.signature,
        isActive: value,
        metadata: template.metadata
      });
      setTemplates(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (error: any) {
      console.error('Erreur changement statut template email:', error);
      toast.error(error?.message || 'Impossible de modifier le statut du template');
    }
  };

  const sortedTemplates = useMemo(() => {
    return [...templates].sort((a, b) => a.name.localeCompare(b.name));
  }, [templates]);

  const filteredTemplates = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return sortedTemplates;
    }
    return sortedTemplates.filter(template => {
      return (
        template.name.toLowerCase().includes(term) ||
        template.subject.toLowerCase().includes(term) ||
        recipientLabels[template.recipients].toLowerCase().includes(term) ||
        template.cc.join(', ').toLowerCase().includes(term) ||
        template.bcc.join(', ').toLowerCase().includes(term)
      );
    });
  }, [sortedTemplates, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredTemplates.length, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTemplates.length / pageSize));
  const pageIndex = Math.max(0, Math.min(page - 1, totalPages - 1));
  const pagedTemplates = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredTemplates.slice(start, start + pageSize);
  }, [filteredTemplates, pageIndex, pageSize]);

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchEmailTemplates();
      setTemplates(data);
      toast.success('Templates rechargés');
    } catch (error) {
      console.error('Erreur rafraîchissement templates:', error);
      toast.error('Impossible de recharger les templates');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <Card className={isFullPage ? 'h-full flex flex-col shadow-none border' : 'h-full'}>
      <CardHeader
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isFullPage ? 'border-b pb-3' : ''}`}
      >
        <div>
          <CardTitle>Gestion des emails</CardTitle>
          <CardDescription>
            Liste des messages automatiques envoyés aux utilisateurs et aux administrateurs.
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          {!isFullPage && onOpenFullPage && (
            <Button variant="outline" size="sm" onClick={onOpenFullPage}>
              <Maximize2 className="w-4 h-4 mr-2" />
              Vue pleine page
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isRefreshing || isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualiser
          </Button>
          <Button size="sm" onClick={openCreateDialog}>
            <MailPlus className="w-4 h-4 mr-2" />
            Nouveau template
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`flex-1 flex flex-col space-y-4 ${isFullPage ? 'overflow-hidden' : ''}`}>
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Chargement des emails...
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-sm text-muted-foreground">
            <Badge variant="secondary" className="mb-3">Aucun template</Badge>
            <p className="max-w-md text-center">
              {searchTerm
                ? 'Aucun template ne correspond à votre recherche. Essayez d\'ajuster les mots-clés ou les filtres.'
                : 'Ajoutez vos premiers templates pour automatiser les communications clés avec vos utilisateurs.'}
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <MailPlus className="w-4 h-4 mr-2" />
              Créer un template
            </Button>
          </div>
        ) : (
          <div className={`flex flex-col gap-4 ${isFullPage ? 'flex-1 min-h-0' : ''}`}>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Rechercher un template..."
                  className="pl-9"
                />
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Résultats / page</span>
                <Select value={String(pageSize)} onValueChange={(value) => setPageSize(Number(value))}>
                  <SelectTrigger className="h-8 w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="20">20</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className={`flex-1 overflow-hidden rounded-md border ${isFullPage ? 'min-h-0' : ''}`}>
              <ScrollArea className={isFullPage ? 'h-full max-h-none' : 'max-h-[460px]'}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Objet</TableHead>
                      <TableHead>Destinataires</TableHead>
                      <TableHead>CC / BCC</TableHead>
                      <TableHead>Pièces jointes</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                {pagedTemplates.map(template => (
                  <TableRow key={template.id}>
                    <TableCell className="font-medium">
                      {template.name}
                    </TableCell>
                    <TableCell>{template.subject}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{recipientLabels[template.recipients]}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs text-muted-foreground">
                        {template.cc.length > 0 && (
                          <span>CC: {template.cc.join(', ')}</span>
                        )}
                        {template.bcc.length > 0 && (
                          <span>BCC: {template.bcc.join(', ')}</span>
                        )}
                        {template.cc.length === 0 && template.bcc.length === 0 && (
                          <span>-</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={(template.metadata?.allowAttachments ? 'default' : 'secondary')} className="text-xs">
                        {template.metadata?.allowAttachments ? 'Autorisé' : 'Désactivé'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={template.isActive ? 'default' : 'secondary'} className="text-xs">
                          {template.isActive ? 'Actif' : 'Inactif'}
                        </Badge>
                        <Switch
                          checked={template.isActive}
                          onCheckedChange={(value) => handleToggleActive(template, value)}
                        />
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(template)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(template)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
                </Table>
              </ScrollArea>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs text-muted-foreground">
              <span>
                Affichage {filteredTemplates.length === 0 ? 0 : pageIndex * pageSize + 1}–
                {Math.min(filteredTemplates.length, (pageIndex + 1) * pageSize)} sur {filteredTemplates.length} templates
              </span>
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      href="#"
                      className={page <= 1 ? 'pointer-events-none opacity-40' : ''}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page > 1) {
                          handlePageChange(page - 1);
                        }
                      }}
                    />
                  </PaginationItem>
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((pageNumber) => (
                    <PaginationItem key={pageNumber}>
                      <PaginationLink
                        href="#"
                        isActive={pageNumber === page}
                        onClick={(event) => {
                          event.preventDefault();
                          handlePageChange(pageNumber);
                        }}
                      >
                        {pageNumber}
                      </PaginationLink>
                    </PaginationItem>
                  ))}
                  <PaginationItem>
                    <PaginationNext
                      href="#"
                      className={page >= totalPages ? 'pointer-events-none opacity-40' : ''}
                      onClick={(event) => {
                        event.preventDefault();
                        if (page < totalPages) {
                          handlePageChange(page + 1);
                        }
                      }}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(open) => (open ? setDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingTemplate ? 'Modifier le template' : 'Nouveau template'}</DialogTitle>
            <DialogDescription>
              Définissez l''objet, le contenu et les destinataires du message.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nom interne</Label>
                <Input
                  id="template-name"
                  value={formState.name}
                  onChange={(event) => setFormState(prev => ({ ...prev, name: event.target.value }))}
                  placeholder="Confirmation inscription"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-subject">Objet</Label>
                <Input
                  id="template-subject"
                  value={formState.subject}
                  onChange={(event) => setFormState(prev => ({ ...prev, subject: event.target.value }))}
                  placeholder="Bienvenue sur Misan"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Destinataires principaux</Label>
                <Select
                  value={formState.recipients}
                  onValueChange={(value: EmailTemplateRecipient) => setFormState(prev => ({ ...prev, recipients: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">Utilisateur</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                    <SelectItem value="both">Utilisateur + Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Actif</Label>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Active ou désactive l'envoi automatique de ce message.</p>
                  <Switch
                    checked={formState.isActive}
                    onCheckedChange={(value) => setFormState(prev => ({ ...prev, isActive: value }))}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Pièces jointes</Label>
              <div className="flex items-center justify-between rounded-md border p-3">
                <p className="text-xs text-muted-foreground">Autorise l'ajout de fichiers lors de l'envoi manuel de ce message.</p>
                <Switch
                  checked={formState.allowAttachments}
                  onCheckedChange={(value) => setFormState(prev => ({ ...prev, allowAttachments: value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="template-cc">CC</Label>
                <Input
                  id="template-cc"
                  value={formState.cc}
                  onChange={(event) => setFormState(prev => ({ ...prev, cc: event.target.value }))}
                  placeholder="email@exemple.com, autre@exemple.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-bcc">BCC</Label>
                <Input
                  id="template-bcc"
                  value={formState.bcc}
                  onChange={(event) => setFormState(prev => ({ ...prev, bcc: event.target.value }))}
                  placeholder="email@exemple.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-body">Contenu</Label>
              <Textarea
                id="template-body"
                value={formState.body}
                onChange={(event) => setFormState(prev => ({ ...prev, body: event.target.value }))}
                rows={8}
                placeholder="Votre message..."
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles : {'{{user_name}}'}, {'{{order_reference}}'}, {'{{amount}}'} et, pour le modèle HTML, {'{{headline}}'}, {'{{body_text}}'}, {'{{cta_label}}'}, {'{{cta_url}}'}, {'{{summary}}'}, {'{{footer_links}}'}.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Aperçu HTML</Label>
              <div className="rounded-md border overflow-hidden">
                <iframe
                  title="Aperçu template email"
                  srcDoc={formState.body || '<p style="padding:16px;font-family:Inter,Segoe UI,Arial,sans-serif;">(Aucun contenu HTML)</p>'}
                  className="w-full h-[360px] bg-white"
                  sandbox=""
                />
              </div>
              <p className="text-xs text-muted-foreground">{'Les variables {{...}} seront remplacées automatiquement lors de l\'envoi.'}</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-plain-body">Version texte (fallback)</Label>
              <Textarea
                id="template-plain-body"
                value={formState.plainBody}
                onChange={(event) => setFormState(prev => ({ ...prev, plainBody: event.target.value }))}
                rows={5}
                placeholder="Texte brut envoyé aux clients n'acceptant pas la version HTML"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="template-signature">Signature</Label>
              <Textarea
                id="template-signature"
                value={formState.signature}
                onChange={(event) => setFormState(prev => ({ ...prev, signature: event.target.value }))}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

export default EmailTemplatesTab;
