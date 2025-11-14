import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { Plus, RefreshCw, Pencil, Trash2, Search, Maximize2 } from 'lucide-react';
import {
  fetchAlertRules,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule
} from '../../utils/settings';
import type {
  AlertRule,
  AlertRuleInput,
  AlertComparator,
  AlertSeverity,
  AlertTargetType,
  AlertTriggerType,
  AlertAppliesRole
} from '../../types';
import { ScrollArea } from '../ui/scroll-area';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious
} from '../ui/pagination';

const comparatorLabels: Record<AlertComparator, string> = {
  '<': '< (strictement inférieur)',
  '<=': '≤ (inférieur ou égal)',
  '=': '= (égal)',
  '>=': '≥ (supérieur ou égal)',
  '>': '> (strictement supérieur)'
};

const severityLabels: Record<AlertSeverity, { label: string; badge: string }> = {
  info: { label: 'Information', badge: 'bg-blue-100 text-blue-800 border border-blue-200' },
  warning: { label: 'Avertissement', badge: 'bg-amber-100 text-amber-800 border border-amber-200' },
  error: { label: 'Critique', badge: 'bg-red-100 text-red-800 border border-red-200' }
};

const targetLabels: Record<AlertTargetType, string> = {
  subscription: 'Abonnement',
  tokens: 'Jetons',
  general: 'Général'
};

const statusLabels: Record<'active' | 'inactive' | 'expired', string> = {
  active: 'Comptes actifs',
  inactive: 'Comptes en attente',
  expired: 'Comptes expirés'
};

const roleLabels: Record<AlertAppliesRole, string> = {
  pro: 'Abonnés Pro',
  premium: 'Utilisateurs premium / essai',
  any: 'Tous les utilisateurs'
};

type FormState = {
  name: string;
  description: string;
  triggerType: AlertTriggerType;
  target: AlertTargetType;
  comparator: AlertComparator;
  threshold: string;
  severity: AlertSeverity;
  messageTemplate: string;
  appliesToRole: AlertAppliesRole;
  isBlocking: boolean;
  isActive: boolean;
  statusFilter: Array<'active' | 'inactive' | 'expired'>;
};

const defaultFormState: FormState = {
  name: '',
  description: '',
  triggerType: 'scheduled',
  target: 'subscription',
  comparator: '=',
  threshold: '0',
  severity: 'info',
  messageTemplate: '',
  appliesToRole: 'any',
  isBlocking: false,
  isActive: true,
  statusFilter: []
};

function toInputPayload(state: FormState): AlertRuleInput | null {
  const thresholdValue = Number(state.threshold);
  if (Number.isNaN(thresholdValue)) {
    return null;
  }

  const metadata: Record<string, unknown> = {};

  if (state.target === 'general') {
    metadata.statusFilter = state.statusFilter;
  }

  return {
    name: state.name.trim(),
    description: state.description.trim() || null,
    triggerType: state.triggerType,
    target: state.target,
    comparator: state.comparator,
    threshold: thresholdValue,
    severity: state.severity,
    messageTemplate: state.messageTemplate.trim(),
    appliesToRole: state.appliesToRole,
    isBlocking: state.isBlocking,
    isActive: state.isActive,
    metadata
  };
}

function toFormState(rule: AlertRule): FormState {
  const statusFilter = Array.isArray(rule.metadata?.statusFilter)
    ? (rule.metadata.statusFilter as Array<'active' | 'inactive' | 'expired'>)
    : [];

  return {
    name: rule.name,
    description: rule.description ?? '',
    triggerType: rule.triggerType,
    target: rule.target,
    comparator: rule.comparator,
    threshold: String(rule.threshold),
    severity: rule.severity,
    messageTemplate: rule.messageTemplate,
    appliesToRole: rule.appliesToRole,
    isBlocking: rule.isBlocking,
    isActive: rule.isActive,
    statusFilter
  };
}

interface AlertRulesTabProps {
  variant?: 'card' | 'page';
  onOpenFullPage?: () => void;
}

export function AlertRulesTab({ variant = 'card', onOpenFullPage }: AlertRulesTabProps) {
  const isFullPage = variant === 'page';
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formState, setFormState] = useState<FormState>(defaultFormState);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingRule, setEditingRule] = useState<AlertRule | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [page, setPage] = useState(1);

  const loadRules = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchAlertRules();
      setRules(data);
    } catch (error) {
      console.error('Erreur chargement alert rules:', error);
      toast.error("Impossible de charger les alertes.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRules();
  }, [loadRules]);

  const openCreateDialog = () => {
    setFormState(defaultFormState);
    setEditingRule(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (rule: AlertRule) => {
    setFormState(toFormState(rule));
    setEditingRule(rule);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    if (isSaving) return;
    setIsDialogOpen(false);
    setEditingRule(null);
    setFormState(defaultFormState);
  };

  const handleSubmit = async () => {
    const payload = toInputPayload(formState);
    if (!payload) {
      toast.error('Veuillez saisir une valeur numérique valide pour le seuil.');
      return;
    }

    if (!payload.name) {
      toast.error('Le nom de l\'alerte est obligatoire.');
      return;
    }

    if (!payload.messageTemplate) {
      toast.error('Le message de l\'alerte est obligatoire.');
      return;
    }

    setIsSaving(true);
    try {
      if (editingRule) {
        const updated = await updateAlertRule(editingRule.id, payload);
        setRules(prev => prev.map(rule => rule.id === updated.id ? updated : rule));
        toast.success('Alerte mise à jour');
      } else {
        const created = await createAlertRule(payload);
        setRules(prev => [created, ...prev]);
        toast.success('Alerte créée');
      }
      closeDialog();
    } catch (error: any) {
      console.error('Erreur sauvegarde alerte:', error);
      toast.error(error?.message || 'Erreur lors de la sauvegarde de l\'alerte');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const data = await fetchAlertRules();
      setRules(data);
      toast.success('Alertes rechargées');
    } catch (error) {
      console.error('Erreur de rafraîchissement des alertes:', error);
      toast.error('Impossible de recharger les alertes');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (rule: AlertRule) => {
    const confirmed = window.confirm(`Supprimer l\'alerte « ${rule.name} » ?`);
    if (!confirmed) {
      return;
    }

    try {
      await deleteAlertRule(rule.id);
      setRules(prev => prev.filter(item => item.id !== rule.id));
      toast.success('Alerte supprimée');
    } catch (error: any) {
      console.error('Erreur suppression alerte:', error);
      toast.error(error?.message || 'Impossible de supprimer cette alerte');
    }
  };

  const handleToggleActive = async (rule: AlertRule, value: boolean) => {
    try {
      const updated = await updateAlertRule(rule.id, {
        name: rule.name,
        description: rule.description ?? null,
        triggerType: rule.triggerType,
        target: rule.target,
        comparator: rule.comparator,
        threshold: rule.threshold,
        severity: rule.severity,
        messageTemplate: rule.messageTemplate,
        appliesToRole: rule.appliesToRole,
        isBlocking: rule.isBlocking,
        isActive: value,
        metadata: rule.metadata ?? {}
      });
      setRules(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (error: any) {
      console.error('Erreur changement statut alerte:', error);
      toast.error(error?.message || 'Impossible de modifier le statut de l\'alerte');
    }
  };

  const sortedRules = useMemo(() => {
    return [...rules].sort((a, b) => a.name.localeCompare(b.name));
  }, [rules]);

  const filteredRules = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return sortedRules;
    }
    return sortedRules.filter(rule => {
      return (
        rule.name.toLowerCase().includes(term) ||
        (rule.description ?? '').toLowerCase().includes(term) ||
        rule.messageTemplate.toLowerCase().includes(term) ||
        severityLabels[rule.severity].label.toLowerCase().includes(term)
      );
    });
  }, [sortedRules, searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, pageSize]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [filteredRules.length, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredRules.length / pageSize));
  const pageIndex = Math.max(0, Math.min(page - 1, totalPages - 1));
  const pagedRules = useMemo(() => {
    const start = pageIndex * pageSize;
    return filteredRules.slice(start, start + pageSize);
  }, [filteredRules, pageIndex, pageSize]);

  const handlePageChange = (nextPage: number) => {
    setPage(Math.min(Math.max(1, nextPage), totalPages));
  };

  return (
    <Card className={isFullPage ? 'h-full flex flex-col shadow-none border' : undefined}>
      <CardHeader
        className={`flex flex-col md:flex-row md:items-center md:justify-between gap-4 ${isFullPage ? 'border-b pb-3' : ''}`}
      >
        <div>
          <CardTitle>Gestion des alertes</CardTitle>
          <CardDescription>
            Configurez les règles déclenchant les notifications liées aux abonnements et aux jetons.
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
            <Plus className="w-4 h-4 mr-2" />
            Nouvelle alerte
          </Button>
        </div>
      </CardHeader>
      <CardContent className={`space-y-4 ${isFullPage ? 'flex-1 flex flex-col overflow-hidden' : ''}`}>
        {isLoading ? (
          <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
            Chargement des alertes...
          </div>
        ) : filteredRules.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-sm text-muted-foreground">
            <Badge variant="secondary" className="mb-3">Aucune alerte configurée</Badge>
            <p className="text-center max-w-md">
              {searchTerm
                ? 'Aucune alerte ne correspond à votre recherche. Modifiez les filtres pour afficher à nouveau la liste complète.'
                : 'Créez votre première alerte pour informer vos utilisateurs lorsqu\'un abonnement approche de l\'expiration ou lorsque leur solde de jetons est bas.'}
            </p>
            <Button className="mt-4" onClick={openCreateDialog}>
              <Plus className="w-4 h-4 mr-2" />
              Ajouter une alerte
            </Button>
          </div>
        ) : (
          <div className={`flex flex-col gap-4 ${isFullPage ? 'flex-1 min-h-0' : ''}`}>
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex w-full md:w-80 items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Rechercher une alerte..."
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Résultats / page</span>
                <Select
                  value={String(pageSize)}
                  onValueChange={(value) => setPageSize(Number(value))}
                >
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

            <div className={`overflow-hidden rounded-md border ${isFullPage ? 'flex-1 min-h-0' : ''}`}>
              <ScrollArea className={isFullPage ? 'h-full max-h-none' : 'max-h-[460px]'}>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nom</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Condition</TableHead>
                  <TableHead>Seuil</TableHead>
                  <TableHead>Gravité</TableHead>
                  <TableHead>Rôle cible</TableHead>
                  <TableHead>Bloquante</TableHead>
                  <TableHead>Active</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedRules.map(rule => {
                  const statusFilter = Array.isArray(rule.metadata?.statusFilter)
                    ? (rule.metadata.statusFilter as Array<'active' | 'inactive' | 'expired'>)
                    : [];
                  const statusSummary =
                    rule.target === 'general'
                      ? (statusFilter.length > 0
                          ? statusFilter
                              .map(status => statusLabels[status])
                              .join(', ')
                          : 'Tous les statuts')
                      : null;

                  return (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <span>{rule.name}</span>
                          {rule.description && (
                            <span className="text-xs text-muted-foreground">{rule.description}</span>
                          )}
                          {statusSummary && (
                            <span className="text-xs text-muted-foreground">
                              Cible : {statusSummary}
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{targetLabels[rule.target]}</Badge>
                      </TableCell>
                      <TableCell>
                        {rule.target === 'general'
                          ? <span className="text-muted-foreground">—</span>
                          : comparatorLabels[rule.comparator]}
                      </TableCell>
                      <TableCell>
                        {rule.target === 'general'
                          ? <span className="text-muted-foreground">—</span>
                          : rule.threshold.toLocaleString()}
                      </TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${severityLabels[rule.severity].badge}`}>
                        {severityLabels[rule.severity].label}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{roleLabels[rule.appliesToRole]}</Badge>
                    </TableCell>
                    <TableCell>
                      {rule.isBlocking ? (
                        <Badge variant="destructive" className="text-xs">Bloquante</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">Information</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={rule.isActive}
                        onCheckedChange={(value) => handleToggleActive(rule, value)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end items-center gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEditDialog(rule)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(rule)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
              </ScrollArea>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between text-xs text-muted-foreground">
              <span>
                Affichage {filteredRules.length === 0 ? 0 : pageIndex * pageSize + 1}–
                {Math.min(filteredRules.length, (pageIndex + 1) * pageSize)} sur {filteredRules.length} alertes
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

      <Dialog open={isDialogOpen} onOpenChange={(open) => (open ? setIsDialogOpen(true) : closeDialog())}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingRule ? 'Modifier une alerte' : 'Créer une alerte'}</DialogTitle>
            <DialogDescription>
              Définissez la condition de déclenchement et le message affiché aux utilisateurs.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="alert-name">Nom de l'alerte</Label>
              <Input
                id="alert-name"
                value={formState.name}
                onChange={(event) => setFormState((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Alerte abonnement 7 jours"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="alert-description">Description (optionnel)</Label>
              <Textarea
                id="alert-description"
                value={formState.description}
                onChange={(event) => setFormState((prev) => ({ ...prev, description: event.target.value }))}
                placeholder="Explication interne de l'usage de cette alerte"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Type de déclenchement</Label>
                <Select
                  value={formState.triggerType}
                  onValueChange={(value: AlertTriggerType) => setFormState(prev => ({ ...prev, triggerType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="scheduled">Planifié (CRON)</SelectItem>
                    <SelectItem value="login">Lors de la connexion</SelectItem>
                    <SelectItem value="assistant_access">Accès à l'assistant</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Cible surveillée</Label>
                <Select
                  value={formState.target}
                  onValueChange={(value: AlertTargetType) =>
                    setFormState(prev => ({
                      ...prev,
                      target: value,
                      comparator: value === 'general' ? '=' : prev.comparator,
                      threshold: value === 'general' ? '0' : prev.threshold,
                      statusFilter:
                        value === 'general'
                          ? (prev.statusFilter.length > 0 ? prev.statusFilter : ['inactive'])
                          : []
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subscription">Expiration d'abonnement</SelectItem>
                    <SelectItem value="tokens">Solde de jetons</SelectItem>
                    <SelectItem value="general">Annonce générale</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formState.target !== 'general' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Comparateur</Label>
                  <Select
                    value={formState.comparator}
                    onValueChange={(value: AlertComparator) => setFormState(prev => ({ ...prev, comparator: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Comparateur" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="<">&lt; (strictement inférieur)</SelectItem>
                      <SelectItem value="<=">≤ (inférieur ou égal)</SelectItem>
                      <SelectItem value="=">= (égal)</SelectItem>
                      <SelectItem value=">=">≥ (supérieur ou égal)</SelectItem>
                      <SelectItem value=">">&gt; (strictement supérieur)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="alert-threshold">Valeur seuil</Label>
                  <Input
                    id="alert-threshold"
                    type="number"
                    value={formState.threshold}
                    onChange={(event) => setFormState(prev => ({ ...prev, threshold: event.target.value }))}
                    placeholder="Ex: 7"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Gravité</Label>
                <Select
                  value={formState.severity}
                  onValueChange={(value: AlertSeverity) => setFormState(prev => ({ ...prev, severity: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Gravité" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Information</SelectItem>
                    <SelectItem value="warning">Avertissement</SelectItem>
                    <SelectItem value="error">Critique</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Rôle concerné</Label>
                <Select
                  value={formState.appliesToRole}
                  onValueChange={(value: AlertAppliesRole) => setFormState(prev => ({ ...prev, appliesToRole: value }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Tous les utilisateurs</SelectItem>
                    <SelectItem value="pro">Abonnés Pro</SelectItem>
                    <SelectItem value="premium">Utilisateurs premium / essai</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {formState.target === 'general' && (
              <div className="space-y-2">
                <Label>Statuts utilisateur ciblés</Label>
                <p className="text-xs text-muted-foreground">
                  Sélectionnez les statuts de compte concernés. Sans sélection, l'alerte s'affiche pour tous les statuts.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(['inactive', 'active', 'expired'] as const).map((status) => {
                    const checked = formState.statusFilter.includes(status);
                    return (
                      <label
                        key={status}
                        htmlFor={`status-${status}`}
                        className="flex items-center gap-2 rounded-md border p-2 text-sm"
                      >
                        <Checkbox
                          id={`status-${status}`}
                          checked={checked}
                          onCheckedChange={(value) =>
                            setFormState(prev => {
                              const next = new Set(prev.statusFilter);
                              if (value === true) {
                                next.add(status);
                              } else {
                                next.delete(status);
                              }
                              return { ...prev, statusFilter: Array.from(next) as Array<'active' | 'inactive' | 'expired'> };
                            })
                          }
                        />
                        <span>{statusLabels[status]}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="alert-message">Message affiché à l'utilisateur</Label>
              <Textarea
                id="alert-message"
                value={formState.messageTemplate}
                onChange={(event) => setFormState(prev => ({ ...prev, messageTemplate: event.target.value }))}
                placeholder="Votre abonnement expire dans {{days}} jours. Pensez à le renouveler."
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Variables disponibles : {'{{days}}'}, {'{{tokens}}'} et {'{{user_name}}'}.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label>Bloquante</Label>
                  <p className="text-xs text-muted-foreground">Empêche l'accès à l'assistant IA tant que l'alerte est active.</p>
                </div>
                <Switch
                  checked={formState.isBlocking}
                  onCheckedChange={(value) => setFormState(prev => ({ ...prev, isBlocking: value }))}
                />
              </div>
              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <Label>Active</Label>
                  <p className="text-xs text-muted-foreground">Les alertes inactives sont conservées mais non évaluées.</p>
                </div>
                <Switch
                  checked={formState.isActive}
                  onCheckedChange={(value) => setFormState(prev => ({ ...prev, isActive: value }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={closeDialog} disabled={isSaving}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving}>
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
