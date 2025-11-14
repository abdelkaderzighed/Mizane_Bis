import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { 
  Download, 
  Receipt, 
  Calendar,
  CreditCard,
  User,
  Building2,
  Phone,
  Mail,
  MapPin,
  FileText,
  Printer
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminOrder, PaymentMethod } from '../../types';

interface OrderInvoiceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: AdminOrder | null;
}

export function OrderInvoiceModal({ open, onOpenChange, order }: OrderInvoiceModalProps) {
  if (!order) return null;

  const handleDownloadPDF = () => {
    // Simulation de téléchargement PDF
    toast.success(`Facture ${order.id} téléchargée`);
  };

  const handlePrint = () => {
    window.print();
    toast.success('Impression lancée');
  };

  const getStatusColor = (status: AdminOrder['status']) => {
    switch (status) {
      case 'paid':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'overdue':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      case 'cancelled':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPaymentMethodLabel = (method: PaymentMethod | string) => {
    switch (method) {
      case 'card_cib':
        return 'Carte CIB';
      case 'card_international':
      case 'card_visa':
        return 'Carte internationale';
      case 'paypal':
        return 'PayPal';
      case 'bank_transfer':
        return 'Virement bancaire';
      case 'mobile_payment':
      case 'edahabia':
        return 'Paiement mobile (Edahabia)';
      default:
        return method;
    }
  };

  const getStatusLabel = (status: AdminOrder['status']) => {
    switch (status) {
      case 'paid':
        return 'Payée';
      case 'pending':
        return 'En attente de paiement';
      case 'overdue':
        return 'En retard';
      case 'cancelled':
        return 'Annulée';
      default:
        return status;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-blue-600" />
            Facture - Commande {order.id}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6" id="invoice-content">
          {/* En-tête de la facture */}
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-green-700">MISAN</h1>
              <p className="text-sm text-gray-600">Assistant Juridique IA</p>
              <p className="text-sm text-gray-600">Algérie</p>
              <p className="text-sm text-gray-600">support@misan.dz</p>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-semibold">FACTURE</h2>
              <p className="text-sm font-mono">{order.id}</p>
              <p className="text-sm text-gray-600">
                Date: {order.createdAt.toLocaleDateString('fr-FR')}
              </p>
              <Badge className={`mt-2 text-xs border ${getStatusColor(order.status)}`}>
                {getStatusLabel(order.status)}
              </Badge>
            </div>
          </div>

          <Separator />

          {/* Informations client */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Informations client
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">{order.user.name}</p>
                  <p className="text-sm text-gray-600">{order.user.email}</p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Building2 className="w-4 h-4" />
                  Adresse de facturation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <p className="font-medium">{order.billingInfo.name}</p>
                  <p className="text-sm text-gray-600">{order.billingInfo.address}</p>
                  <p className="text-sm text-gray-600">
                    {order.billingInfo.postalCode} {order.billingInfo.city}
                  </p>
                  <p className="text-sm text-gray-600">{order.billingInfo.country}</p>
                  {order.billingInfo.phone && (
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      {order.billingInfo.phone}
                    </p>
                  )}
                  <p className="text-sm text-gray-600 flex items-center gap-1">
                    <Mail className="w-3 h-3" />
                    {order.billingInfo.email}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Détails de la commande */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Détails de la commande</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Description</th>
                      <th className="text-center py-2">Quantité</th>
                      <th className="text-right py-2">Prix unitaire HT</th>
                      <th className="text-right py-2">Total HT</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="py-3">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            <p className="text-sm text-gray-600">{item.description}</p>
                            {item.tokensIncluded && (
                              <p className="text-xs text-green-600">
                                {item.tokensIncluded.toLocaleString()} jetons inclus
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="text-center py-3">{item.quantity}</td>
                        <td className="text-right py-3">{item.unitPriceHT.toLocaleString()} DA</td>
                        <td className="text-right py-3">{item.totalHT.toLocaleString()} DA</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Totaux */}
          <div className="flex justify-end">
            <div className="w-full max-w-sm">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Sous-total HT:</span>
                      <span>{order.summary.subtotalHT.toLocaleString()} DA</span>
                    </div>
                    {order.summary.totalDiscount > 0 && (
                      <div className="flex justify-between text-sm">
                        <span>Remise totale:</span>
                        <span className="text-green-600">-{order.summary.totalDiscount.toLocaleString()} DA</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Sous-total après remise:</span>
                      <span>{order.summary.discountedSubtotal.toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>TVA (20%):</span>
                      <span>{order.summary.vat.toLocaleString()} DA</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total TTC:</span>
                      <span>{order.summary.totalTTC.toLocaleString()} DA</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Informations de paiement */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <CreditCard className="w-4 h-4" />
                Informations de paiement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Méthode de paiement:</p>
                  <p className="font-medium">{getPaymentMethodLabel(order.payment.method)}</p>
                </div>
                {order.payment.paymentDate && (
                  <div>
                    <p className="text-sm text-gray-600">Date de paiement:</p>
                    <p className="font-medium">
                      {new Date(order.payment.paymentDate).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                )}
                {order.payment.transactionId && (
                  <div>
                    <p className="text-sm text-gray-600">ID de transaction:</p>
                    <p className="font-mono text-sm">{order.payment.transactionId}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes légales */}
          <div className="text-xs text-gray-500 space-y-1">
            <p>• TVA applicable selon la législation algérienne en vigueur</p>
            <p>• Cette facture est générée automatiquement par le système Misan</p>
            <p>• Pour toute question, contactez support@misan.dz</p>
          </div>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Facture générée le {new Date().toLocaleDateString('fr-FR')}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handlePrint}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimer
            </Button>
            <Button
              onClick={handleDownloadPDF}
            >
              <Download className="w-4 h-4 mr-2" />
              Télécharger PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
