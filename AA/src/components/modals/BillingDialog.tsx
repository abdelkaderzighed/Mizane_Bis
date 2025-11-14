import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Download, Eye, FileText, Layers, Loader2, PlaneTakeoff, RefreshCcw, XIcon } from 'lucide-react';
import { format } from 'date-fns';

import type { Invoice, InvoiceStatus, UserInfo, Address } from '../../types';
import { getStatusColor } from '../../utils/orderUtils';
import { toast } from 'sonner';
import { cn } from '../ui/utils';
import { generateInvoiceHtml } from '../../utils/invoiceUtils';

interface BillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  invoices: Invoice[];
  loading?: boolean;
  onSelectInvoice: (invoice: Invoice) => void;
  onDownloadInvoice: (invoice: Invoice) => void;
  onUpdateInvoice: (invoiceId: string, updates: Partial<Pick<Invoice, 'status' | 'paymentMethod' | 'paymentDate' | 'paymentReference'>>) => void;
  translations: any;
  userInfo: UserInfo;
  billingAddress: Address;
}

const STATUS_OPTIONS: { value: InvoiceStatus; icon: React.ReactNode }[] = [
  { value: 'paid', icon: <PlaneTakeoff className="w-3.5 h-3.5" /> },
  { value: 'pending', icon: <RefreshCcw className="w-3.5 h-3.5" /> },
  { value: 'bank_pending', icon: <Layers className="w-3.5 h-3.5" /> },
  { value: 'free', icon: <FileText className="w-3.5 h-3.5" /> },
  { value: 'cancelled', icon: <FileText className="w-3.5 h-3.5" /> }
];

const PAYMENT_METHODS = [
  'Carte bancaire',
  'PayPal',
  'Virement bancaire',
  'Paiement mobile',
  'Gratuit'
];

const formatAmount = (amount: number, currency: Invoice['currency']) => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency
  }).format(amount);
};

const calculateSubtotal = (invoice: Invoice) =>
  invoice.lines.reduce((total, line) => total + line.unitPrice * line.quantity, 0);

const calculateVat = (invoice: Invoice) =>
  invoice.lines.reduce((total, line) => total + (line.total - line.unitPrice * line.quantity), 0);

const normalizeDateValue = (value?: string | null) => {
  if (!value) {
    return '';
  }
  try {
    return format(new Date(value), 'yyyy-MM-dd');
  } catch (error) {
    return '';
  }
};

export function BillingDialog({
  open,
  onOpenChange,
  invoices,
  loading,
  onSelectInvoice,
  onDownloadInvoice,
  onUpdateInvoice,
  translations: t,
  userInfo,
  billingAddress
}: BillingDialogProps) {
  React.useEffect(() => {
    if (open) {
      console.log('[BillingDialog] ouvert avec', invoices.length, 'factures');
    }
  }, [open, invoices.length]);
  const hasInvoices = invoices.length > 0;
  const [activeInvoice, setActiveInvoice] = React.useState<Invoice | null>(null);
  const showDetail = Boolean(activeInvoice);

  const handleViewInvoice = (invoice: Invoice) => {
    setActiveInvoice(invoice);
    onSelectInvoice(invoice);
  };

  const closeDetail = () => {
    setActiveInvoice(null);
    console.log('[BillingDialog] fermeture détail');
  };

  React.useEffect(() => {
    if (!open) {
      setActiveInvoice(null);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-none lg:max-w-[85vw] xl:max-w-[1200px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {t.billing}
          </DialogTitle>
          <DialogDescription>{t.billingDescription}</DialogDescription>
        </DialogHeader>

        <div className="relative">
        {loading ? (
          <div className="flex h-64 flex-col items-center justify-center text-muted-foreground">
            <Loader2 className="mb-3 h-6 w-6 animate-spin" />
            {t.loadingInvoices}
          </div>
        ) : hasInvoices ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground/80">{t.totalInvoices}</div>
                <div className="text-lg font-semibold text-foreground">{invoices.length}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground/80">{t.totalPaid}</div>
                <div className="text-lg font-semibold text-foreground">
                  {formatAmount(
                    invoices.filter(invoice => invoice.status === 'paid' || invoice.status === 'free').reduce((acc, invoice) => acc + invoice.amount, 0),
                    invoices[0]?.currency ?? 'EUR'
                  )}
                </div>
              </div>
            </div>

            <div className="rounded-lg border bg-background">
              <div className="max-h-[60vh] min-h-[40vh] overflow-auto overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[150px]">{t.invoice}</TableHead>
                      <TableHead className="w-[130px]">{t.order}</TableHead>
                      <TableHead className="w-[220px]">{t.description}</TableHead>
                      <TableHead className="w-[110px] text-right">{t.totalTTC}</TableHead>
                      <TableHead className="w-[150px]">{t.status}</TableHead>
                      <TableHead className="w-[150px]">{t.paymentMethod}</TableHead>
                      <TableHead className="w-[130px]">{t.paymentDate}</TableHead>
                      <TableHead className="w-[110px] text-right">{t.actions}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map(invoice => (
                      <TableRow key={invoice.id}>
                        <TableCell>
                          <div className="font-medium">{invoice.id}</div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(invoice.createdAt), 'dd/MM/yyyy')}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{invoice.orderNumber}</div>
                          {invoice.dueDate && (
                            <div className="text-xs text-muted-foreground">
                              {t.due} {format(new Date(invoice.dueDate), 'dd/MM/yyyy')}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-normal break-words">
                          <div className="font-medium text-foreground leading-snug">{invoice.description}</div>
                          <div className="text-xs text-muted-foreground capitalize leading-snug">{t[invoice.type] || invoice.type}</div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatAmount(invoice.amount, invoice.currency)}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={invoice.status}
                            onValueChange={(value) => onUpdateInvoice(invoice.id, { status: value as InvoiceStatus })}
                          >
                            <SelectTrigger className={cn('h-9 justify-between', getStatusColor(invoice.status))}>
                              <SelectValue>
                                <span className="flex items-center gap-2">
                                  <span className="h-2.5 w-2.5 rounded-full bg-current" />
                                  {t[valueToTranslationKey(invoice.status)] || invoice.status}
                                </span>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map(option => (
                                <SelectItem key={option.value} value={option.value}>
                                  <span className="flex items-center gap-2">
                                    {option.icon}
                                    <span>{t[valueToTranslationKey(option.value)] || option.value}</span>
                                  </span>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={invoice.paymentMethod}
                            onValueChange={(value) => onUpdateInvoice(invoice.id, { paymentMethod: value })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder={t.chooseMethod}>{invoice.paymentMethod}</SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {PAYMENT_METHODS.map(method => (
                                <SelectItem key={method} value={method}>
                                  {method}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="date"
                            value={normalizeDateValue(invoice.paymentDate)}
                            onChange={(event) => onUpdateInvoice(invoice.id, { paymentDate: event.target.value || null })}
                          />
                          {invoice.paymentReference && (
                            <div className="mt-1 text-xs text-muted-foreground">{invoice.paymentReference}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleViewInvoice(invoice)}
                              aria-label={t.view}
                            >
                              <span className="sr-only">{t.view}</span>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onDownloadInvoice(invoice)}
                              aria-label={t.download}
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center space-y-3 text-center text-muted-foreground">
            <FileText className="h-12 w-12 opacity-40" />
            <p className="font-medium text-foreground">{t.noInvoicesTitle}</p>
            <p className="max-w-sm text-sm">{t.noInvoicesDescription}</p>
          </div>
        )}
        {showDetail && activeInvoice && (
          <div
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-6"
            onClick={closeDetail}
          >
            <div
              className="relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-2xl"
              onClick={event => event.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b border-emerald-100 bg-emerald-50/80 px-6 py-4">
                <div>
                  <p className="text-xs uppercase tracking-wide text-emerald-700">Facture sélectionnée</p>
                  <p className="text-lg font-semibold text-emerald-900">{activeInvoice.id}</p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onDownloadInvoice(activeInvoice)}
                    className="flex items-center gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    <Download className="h-4 w-4" />
                    {t.download}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      toast.success(`Facture ${activeInvoice.id} envoyée à ${userInfo.email}`);
                    }}
                    className="flex items-center gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download className="h-4 w-4 rotate-180" />
                    Envoyer
                  </Button>
                  <button
                    type="button"
                    onClick={closeDetail}
                    className="flex h-8 w-8 items-center justify-center rounded-full border border-emerald-200 bg-white text-emerald-700 shadow-sm transition-colors hover:bg-emerald-50"
                  >
                    <XIcon className="h-4 w-4" />
                    <span className="sr-only">Fermer</span>
                  </button>
                </div>
              </div>

              <iframe
                title={`Facture ${activeInvoice.id}`}
                srcDoc={generateInvoiceHtml(activeInvoice, userInfo, activeInvoice.billingAddress || billingAddress, t)}
                className="h-[70vh] w-full flex-1 border-t"
                sandbox="allow-same-origin allow-popups allow-downloads"
              />
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

const valueToTranslationKey = (value: InvoiceStatus): string => {
  switch (value) {
    case 'bank_pending':
      return 'bankPending';
    case 'free':
      return 'freeStatus';
    default:
      return value;
  }
};
