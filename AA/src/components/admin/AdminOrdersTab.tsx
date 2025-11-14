import React from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../ui/dropdown-menu';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import {
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Edit,
  Eye,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Trash2,
  Receipt,
} from './icons';
import type { AdminOrder } from '../../types';

type OrderStatus = AdminOrder['status'];

interface AdminOrdersTabProps {
  orders: AdminOrder[];
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  ordersFilter: string;
  onOrdersFilterChange: (value: string) => void;
  orderTypeFilter: string;
  onOrderTypeFilterChange: (value: string) => void;
  orderPaymentFilter: string;
  onOrderPaymentFilterChange: (value: string) => void;
  currentPage: number;
  onPageChange: (page: number) => void;
  ordersPerPage: number;
  onEditOrder: (order: AdminOrder) => void;
  onViewInvoice: (order: AdminOrder) => void;
  onExportOrders: () => void;
  selectedOrderIds: string[];
  onSelectOrder: (orderId: string, checked: boolean) => void;
  onClearSelection: () => void;
  onBulkMarkPaid: (ids: string[]) => void;
  onBulkMarkCompleted: (ids: string[]) => void;
  onBulkMarkCancelled: (ids: string[]) => void;
  onBulkDelete: (ids: string[]) => void;
  onBulkExport: (ids: string[]) => void;
  ordersLoading: boolean;
  ordersError: string | null;
  refetchOrders: () => void;
}

const STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'En attente de paiement',
  paid: 'Payée',
  overdue: 'En retard',
  cancelled: 'Annulée',
};

const STATUS_CLASSNAMES: Record<OrderStatus, string> = {
  paid: 'text-green-600 bg-green-50 border-green-200',
  pending: 'text-yellow-600 bg-yellow-50 border-yellow-200',
  overdue: 'text-orange-600 bg-orange-50 border-orange-200',
  cancelled: 'text-red-600 bg-red-50 border-red-200',
};

const PAYMENT_LABELS: Record<string, string> = {
  card_cib: 'Carte CIB',
  card_international: 'Carte internationale',
  paypal: 'PayPal',
  bank_transfer: 'Virement bancaire',
  mobile_payment: 'Paiement mobile (Edahabia)',
  card_visa: 'Carte internationale',
  edahabia: 'Paiement mobile (Edahabia)',
  collective_contract: 'Contrat collectif',
  contract: 'Contrat collectif',
  other: 'Autre',
};

function getOrderType(order: AdminOrder): 'abonnements' | 'jetons' | 'mixte' | 'inconnu' {
  const items = order.items ?? [];
  const hasSubscription = items.some(item => item?.type === 'subscription');
  const hasTokens = items.some(item => item?.type === 'tokens');
  if (hasSubscription && hasTokens) return 'mixte';
  if (hasSubscription) return 'abonnements';
  if (hasTokens) return 'jetons';
  return 'inconnu';
}

export function AdminOrdersTab({
  orders,
  searchTerm,
  onSearchTermChange,
  ordersFilter,
  onOrdersFilterChange,
  orderTypeFilter,
  onOrderTypeFilterChange,
  orderPaymentFilter,
  onOrderPaymentFilterChange,
  currentPage,
  onPageChange,
  ordersPerPage,
  onEditOrder,
  onViewInvoice,
  onExportOrders,
  selectedOrderIds,
  onSelectOrder,
  onClearSelection,
  onBulkMarkPaid,
  onBulkMarkCompleted,
  onBulkMarkCancelled,
  onBulkDelete,
  onBulkExport,
  ordersLoading,
  ordersError,
  refetchOrders,
}: AdminOrdersTabProps) {
  const filteredOrders = React.useMemo(() => {
    return orders.filter(order => {
      const status = (order.status as OrderStatus) ?? 'pending';
      const paymentMethod = order.payment?.method ?? 'other';
      const type = getOrderType(order);

      const matchesSearch = [
        order.id,
        order.user?.name,
        order.user?.email,
        order.billingInfo?.name,
        order.billingInfo?.city,
      ]
        .filter(Boolean)
        .some(value => value!.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchesStatus = ordersFilter === 'all'
        || status === ordersFilter;

      const matchesType = orderTypeFilter === 'all' || type === orderTypeFilter;

      const matchesPayment = orderPaymentFilter === 'all'
        || paymentMethod === orderPaymentFilter
        || (orderPaymentFilter === 'card_visa' && paymentMethod === 'card_international');

      return matchesSearch && matchesStatus && matchesType && matchesPayment;
    });
  }, [orders, searchTerm, ordersFilter, orderTypeFilter, orderPaymentFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / ordersPerPage));
  const clampedPage = Math.min(currentPage, totalPages);
  const start = (clampedPage - 1) * ordersPerPage;
  const paginated = filteredOrders.slice(start, start + ordersPerPage);

  const selectedInPage = paginated.filter(order => selectedOrderIds.includes(order.id));
  const allSelected = paginated.length > 0 && selectedInPage.length === paginated.length;
  const someSelected = selectedInPage.length > 0 && !allSelected;

  const handleSelectAllInPage = () => {
    if (allSelected) {
      selectedInPage.forEach(order => onSelectOrder(order.id, false));
    } else {
      paginated.forEach(order => onSelectOrder(order.id, true));
    }
  };

  if (ordersLoading) {
    return (
      <Card className="p-8">
        <div className="flex items-center justify-center">
          <LoaderIndicator />
        </div>
      </Card>
    );
  }

  if (ordersError) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <AlertTriangle className="w-12 h-12 mx-auto text-red-500" />
          <div>
            <h3 className="font-medium text-red-600">Erreur de chargement</h3>
            <p className="text-sm text-muted-foreground">{ordersError}</p>
          </div>
          <Button onClick={refetchOrders} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </div>
      </Card>
    );
  }

  if (orders.length === 0) {
    return (
      <Card className="p-8">
        <div className="text-center space-y-4">
          <ShoppingCartEmpty />
          <div>
            <h3 className="font-medium">Aucune commande</h3>
            <p className="text-sm text-muted-foreground">
              Les commandes apparaîtront ici une fois que les utilisateurs commenceront à acheter des abonnements ou des jetons.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher commandes, clients, villes..."
              value={searchTerm}
              onChange={(e) => onSearchTermChange(e.target.value)}
              className="pl-8 w-80"
            />
          </div>

          <Select value={ordersFilter} onValueChange={onOrdersFilterChange}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="paid">Payées</SelectItem>
              <SelectItem value="pending">En attente de paiement</SelectItem>
              <SelectItem value="overdue">En retard</SelectItem>
              <SelectItem value="cancelled">Annulées</SelectItem>
            </SelectContent>
          </Select>

          <Select value={orderTypeFilter} onValueChange={onOrderTypeFilterChange}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les types</SelectItem>
              <SelectItem value="abonnements">Abonnements</SelectItem>
              <SelectItem value="jetons">Jetons</SelectItem>
              <SelectItem value="mixte">Mixtes</SelectItem>
            </SelectContent>
          </Select>

          <Select value={orderPaymentFilter} onValueChange={onOrderPaymentFilterChange}>
            <SelectTrigger className="w-44">
              <SelectValue placeholder="Paiement" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les modes</SelectItem>
              <SelectItem value="card_cib">Carte CIB</SelectItem>
              <SelectItem value="card_visa">Carte Visa/MC</SelectItem>
              <SelectItem value="bank_transfer">Virement</SelectItem>
              <SelectItem value="edahabia">Edahabia</SelectItem>
              <SelectItem value="collective_contract">Contrat collectif</SelectItem>
              <SelectItem value="other">Autre</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button variant="outline" onClick={onExportOrders}>
          <Download className="w-4 h-4 mr-2" />
          Exporter ({filteredOrders.length})
        </Button>
      </div>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          {filteredOrders.length} commande(s) trouvée(s) sur {orders.length} au total
          {selectedOrderIds.length > 0 && (
            <span className="ml-2 text-primary">
              • {selectedOrderIds.length} sélectionnée(s)
            </span>
          )}
        </div>
        <div>
          Page {clampedPage} sur {totalPages} ({ordersPerPage} par page)
        </div>
      </div>

      {selectedOrderIds.length > 0 && (
        <Card className="p-4 bg-muted/30 border-primary/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="font-medium text-sm">
                {selectedOrderIds.length} commande(s) sélectionnée(s)
              </div>
              <Button variant="ghost" size="sm" onClick={onClearSelection} className="h-7 px-2">
                Désélectionner
              </Button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => onBulkExport(selectedOrderIds)} className="h-8">
                <Download className="w-4 h-4 mr-1" />
                Exporter
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkMarkPaid(selectedOrderIds)}
                className="h-8 text-green-600 hover:text-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-1" />
                Marquer payées
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkMarkCompleted(selectedOrderIds)}
                className="h-8 text-blue-600 hover:text-blue-700"
              >
                <RefreshCw className="w-4 h-4 mr-1" />
                Marquer terminées
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkMarkCancelled(selectedOrderIds)}
                className="h-8 text-orange-600 hover:text-orange-700"
              >
                <AlertTriangle className="w-4 h-4 mr-1" />
                Annuler
              </Button>

              <Separator orientation="vertical" className="h-6" />

              <Button
                variant="outline"
                size="sm"
                onClick={() => onBulkDelete(selectedOrderIds)}
                className="h-8 text-red-600 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4 mr-1" />
                Supprimer
              </Button>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={handleSelectAllInPage}
                  {...(someSelected && { indeterminate: true })}
                />
              </TableHead>
              <TableHead>Commande</TableHead>
              <TableHead>Date création</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Mode de paiement</TableHead>
              <TableHead>Montant HT</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Facture</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginated.map(order => {
              const status = (order.status as OrderStatus) ?? 'pending';
              const subtotalHT = order.summary?.subtotalHT ?? 0;
              const paymentMethod = order.payment?.method ?? 'other';
              const typeLabel = getOrderType(order);
              const billingName = order.billingInfo?.name ?? order.user?.name ?? 'Client inconnu';
              const billingEmail = order.user?.email ?? order.billingInfo?.email ?? '—';

              return (
                <TableRow key={order.id} className={selectedOrderIds.includes(order.id) ? 'bg-muted/30' : ''}>
                  <TableCell>
                    <Checkbox
                      checked={selectedOrderIds.includes(order.id)}
                      onCheckedChange={(checked) => onSelectOrder(order.id, Boolean(checked))}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{order.id}</div>
                    <div className="text-xs text-muted-foreground">{order.summary?.orderNumber ?? '—'}</div>
                  </TableCell>
                  <TableCell>{formatDate(order.createdAt)}</TableCell>
                  <TableCell>
                    <div className="font-medium">{billingName}</div>
                    <div className="text-xs text-muted-foreground">{billingEmail}</div>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/50 px-2 py-1 text-xs font-medium">
                      {typeLabel}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      <Receipt className="w-3 h-3" />
                      {PAYMENT_LABELS[paymentMethod] ?? paymentMethod}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{Math.round(subtotalHT).toLocaleString()} DA</div>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium ${
                      STATUS_CLASSNAMES[status] ?? 'text-gray-600 bg-gray-50 border-gray-200'
                    }`}>
                      {STATUS_LABELS[status] ?? status}
                    </span>
                  </TableCell>
                  <TableCell>{order.payment?.invoiceId ?? '—'}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="icon" onClick={() => onEditOrder(order)}>
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => onViewInvoice(order)}>
                        <Eye className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => onBulkExport([order.id])}>
                            <Download className="w-4 h-4 mr-2" />
                            Exporter
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onBulkMarkPaid([order.id])}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Marquer payée
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onBulkMarkCancelled([order.id])}>
                            <AlertTriangle className="w-4 h-4 mr-2" />
                            Annuler
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onBulkDelete([order.id])} className="text-red-600">
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Card>

      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Affichage des commandes {start + 1} à {Math.min(start + ordersPerPage, filteredOrders.length)}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={clampedPage === 1}
            onClick={() => onPageChange(Math.max(1, clampedPage - 1))}
          >
            Précédent
          </Button>
          <span>
            Page {clampedPage} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={clampedPage === totalPages}
            onClick={() => onPageChange(Math.min(totalPages, clampedPage + 1))}
          >
            Suivant
          </Button>
        </div>
      </div>
    </div>
  );
}

const ShoppingCartEmpty = () => (
  <div className="flex flex-col items-center text-muted-foreground">
    <Receipt className="w-10 h-10 mb-2 opacity-50" />
    <span className="text-sm">Aucune commande enregistrée</span>
  </div>
);

const LoaderIndicator = () => (
  <div className="flex items-center justify-center">
    <RefreshCw className="w-6 h-6 animate-spin" />
    <span className="ml-2 text-sm">Chargement des commandes...</span>
  </div>
);

function formatDate(value: Date | string | undefined): string {
  if (!value) return '—';
  try {
    const date = typeof value === 'string' ? new Date(value) : value;
    return date.toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '—';
  }
}
