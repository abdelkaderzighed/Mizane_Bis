import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Label } from '../ui/label';
import {
  ShoppingCart,
  Minus,
  Plus,
  Trash2,
  CreditCard,
  CheckCircle,
  Calendar,
  Coins,
  Zap,
  Loader2,
} from 'lucide-react';

import {
  calculateOrderSummary,
  getStatusColor
} from '../../utils/orderUtils';

const formatCurrencyValue = (value: number, currency: string) => {
  const code = currency === 'DA' ? 'DZD' : currency;
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0
  }).format(value);
};
import type {
  CartItem,
  Order,
  Address,
  PaymentMethod,
  PricingSettings,
  PaymentSettings,
  UserInfo
} from '../../types';
import { buildPaymentRequest } from '../../utils/payments';
import type { PaymentExecutionRequest, PaymentExecutionResponse } from '../../utils/payments';
import { convertAmountForPayment } from '../../utils/payments/currency';
import { CARD_TEST_HINTS } from '../../utils/payments/mockGateway';

interface CartDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onOpenStore: () => void;
  onOpenCheckout: () => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  vatRate: number;
  t: any;
}

export function CartDialog({
  open,
  onOpenChange,
  cart,
  onOpenStore,
  onOpenCheckout,
  updateCartItemQuantity,
  removeFromCart,
  vatRate,
  t
}: CartDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t.cart} ({cart.length})
          </DialogTitle>
          <DialogDescription>{t.cartDescription}</DialogDescription>
        </DialogHeader>

        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
            <ShoppingCart className="w-12 h-12 mb-4 opacity-50" />
            <p>{t.cartEmpty}</p>
            <Button variant="outline" onClick={onOpenStore} className="mt-4">
              {t.browseProducts}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="max-h-[40vh]">
              <div className="space-y-3">
                {cart.map((item) => (
                  <Card key={item.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h4 className="font-medium">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.description}</p>
                        <div className="flex items-center gap-4 mt-2">
                          <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItemQuantity(item.id, item.quantity - 1)}
                          className="h-8 w-8 p-0"
                          disabled={item.quantity <= 1}
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                            <span className="text-sm min-w-[2ch] text-center">{item.quantity}</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateCartItemQuantity(item.id, item.quantity + 1)}
                              className="h-8 w-8 p-0"
                            >
                              <Plus className="w-4 h-4" />
                            </Button>
                          </div>
                        {item.tokensIncluded && (
                          <Badge variant="secondary" className="text-xs">
                            +{(item.tokensIncluded || 0).toLocaleString()} {t.tokensLabel}
                          </Badge>
                        )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex flex-col items-end">
                          <p className="font-medium">{(item.unitPriceHT || 0).toLocaleString()} DA HT</p>
                          <p className="text-xs text-muted-foreground">{t.unitPrice}</p>
                          <p className="text-sm text-muted-foreground mt-1">{t.total}: {(item.totalHT || 0).toLocaleString()} DA HT</p>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFromCart(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            <Separator />

            <div className="space-y-2">
              {(() => {
                const summary = calculateOrderSummary(cart, vatRate);
                if (!summary) return null;
                return (
                  <>
                    <div className="flex justify-between text-sm">
                      <span>{t.subtotalHT}</span>
                      <span>{(summary.subtotalHT || 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>{t.vat20}</span>
                      <span>{(summary.totalTVA || summary.vat || 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between font-medium">
                      <span>{t.totalTTC}</span>
                      <span>{(summary.totalTTC || 0).toLocaleString()} DA</span>
                    </div>
                    {(summary.totalTokens || 0) > 0 && (
                      <div className="flex justify-between text-sm text-green-600">
                        <span>{t.tokensIncluded}</span>
                        <span>+{(summary.totalTokens || 0).toLocaleString()}</span>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button onClick={onOpenCheckout} className="w-full sm:flex-1">
                {t.proceedToPayment}
              </Button>
              <Button variant="outline" onClick={onOpenStore} className="w-full sm:flex-1">
                {t.continueShopping}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface CheckoutDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  billingAddress: Address;
  onEditAddresses: () => void;
  onBackToCart: () => void;
  onContinueToPayment: () => void;
  vatRate: number;
  t: any;
}

export function CheckoutDialog({
  open,
  onOpenChange,
  cart,
  billingAddress,
  onEditAddresses,
  onBackToCart,
  onContinueToPayment,
  vatRate,
  t
}: CheckoutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t.checkout}</DialogTitle>
          <DialogDescription>{t.checkoutDescription}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-6">
            <div>
              <h3 className="font-medium mb-3">{t.orderSummary}</h3>
              <div className="space-y-2">
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>{(item.totalHT || 0).toLocaleString()} DA HT</span>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">{t.billingAddress}</h3>
              <Card className="p-3">
                <p className="text-sm">
                  {billingAddress.street}<br />
                  {billingAddress.zipCode} {billingAddress.city}<br />
                  {billingAddress.country}
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onEditAddresses}
                  className="mt-2"
                >
                  {t.edit}
                </Button>
              </Card>
            </div>

            <Separator />

            <div className="space-y-2">
              {(() => {
                const summary = calculateOrderSummary(cart, vatRate);
                if (!summary) return null;
                return (
                  <>
                    <div className="flex justify-between">
                      <span>{t.subtotalHT}</span>
                      <span>{(summary.subtotalHT || 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between">
                      <span>{t.vat20}</span>
                      <span>{(summary.totalTVA || summary.vat || 0).toLocaleString()} DA</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg">
                      <span>{t.totalTTC}</span>
                      <span>{(summary.totalTTC || 0).toLocaleString()} DA</span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        </ScrollArea>

        <div className="flex gap-2">
          <Button onClick={onContinueToPayment} className="flex-1">
            {t.proceedToPayment}
          </Button>
          <Button variant="outline" onClick={onBackToCart}>
            {t.backToCart}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  selectedPaymentMethod: PaymentMethod;
  onPaymentMethodChange: (method: PaymentMethod) => void;
  onProcessOrder: (request: PaymentExecutionRequest) => Promise<PaymentExecutionResponse>;
  onBackToCheckout: () => void;
  vatRate: number;
  paymentSettings: PaymentSettings | null;
  userInfo: UserInfo;
  t: any;
}

const getDefaultPaymentLabel = (method: PaymentMethod, t: any): string => {
  switch (method) {
    case 'card_cib':
      return t.cardCIB ?? 'Carte CIB';
    case 'mobile_payment':
      return t.mobilePayment ?? 'Paiement mobile';
    case 'bank_transfer':
      return t.bankTransfer ?? 'Virement bancaire';
    case 'paypal':
      return t.paypal ?? 'PayPal';
    case 'card_international':
      return t.cardInternational ?? 'Carte internationale';
    default:
      return 'Paiement';
  }
};

export function PaymentDialog({
  open,
  onOpenChange,
  cart,
  selectedPaymentMethod,
  onPaymentMethodChange,
  onProcessOrder,
  onBackToCheckout,
  vatRate,
  paymentSettings,
  userInfo,
  t
}: PaymentDialogProps) {
  const methodConfigs = React.useMemo(() => {
    const baseMethods = paymentSettings?.methods ?? {
      card_cib: { enabled: true, label: getDefaultPaymentLabel('card_cib', t) },
      mobile_payment: { enabled: true, label: getDefaultPaymentLabel('mobile_payment', t) },
      bank_transfer: { enabled: true, label: getDefaultPaymentLabel('bank_transfer', t) },
      card_international: { enabled: true, label: getDefaultPaymentLabel('card_international', t) },
      paypal: { enabled: true, label: getDefaultPaymentLabel('paypal', t) }
    };
    return baseMethods;
  }, [paymentSettings]);

  const availableMethods = React.useMemo(() => {
    return (Object.entries(methodConfigs) as Array<[PaymentMethod, typeof methodConfigs[PaymentMethod]]>)
      .filter(([method, config]) => config?.enabled && getDefaultPaymentLabel(method, t));
  }, [methodConfigs]);

  React.useEffect(() => {
    if (!availableMethods.find(([method]) => method === selectedPaymentMethod)) {
      if (availableMethods.length > 0) {
        onPaymentMethodChange(availableMethods[0][0]);
      }
    }
  }, [availableMethods, selectedPaymentMethod, onPaymentMethodChange]);

  const summary = React.useMemo(() => calculateOrderSummary(cart, vatRate), [cart, vatRate]);
  const activeConfig = methodConfigs[selectedPaymentMethod];
  const bankAccounts = selectedPaymentMethod === 'bank_transfer'
    ? activeConfig?.bankAccounts ?? []
    : [];

  const [cardForm, setCardForm] = React.useState({
    cardNumber: CARD_TEST_HINTS[selectedPaymentMethod] ?? '',
    holderName: userInfo.name || 'Misan',
    expiryMonth: '01',
    expiryYear: '30',
    cvc: '123',
  });
  const [paypalAccount, setPaypalAccount] = React.useState(userInfo.email || '');
  const [mobilePhone, setMobilePhone] = React.useState(userInfo.phone || '');
  const [bankReference, setBankReference] = React.useState(() => `VIR-${Date.now().toString(36).toUpperCase()}`);
  const [fieldErrors, setFieldErrors] = React.useState<Record<string, string>>({});
  const [genericError, setGenericError] = React.useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  React.useEffect(() => {
    if (selectedPaymentMethod === 'card_cib' || selectedPaymentMethod === 'card_international') {
      setCardForm((prev) => ({
        ...prev,
        cardNumber: prev.cardNumber || CARD_TEST_HINTS[selectedPaymentMethod] || '',
      }));
    }

    if (selectedPaymentMethod === 'bank_transfer' && !bankReference) {
      setBankReference(`VIR-${Date.now().toString(36).toUpperCase()}`);
    }
  }, [selectedPaymentMethod, bankReference]);

  const amountDzd = summary?.totalTTC ?? 0;
  const conversion = convertAmountForPayment(amountDzd, selectedPaymentMethod, paymentSettings?.exchangeRates);
  const formattedConvertedAmount = conversion.converted
    ? conversion.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : null;

  const customerEmail = userInfo.email || paypalAccount || '';
  const customerName = userInfo.name || customerEmail || 'Client';

  const handleSubmitPayment = async () => {
    if (availableMethods.length === 0) {
      setGenericError('Aucun mode de paiement n\'est disponible pour le moment.');
      return;
    }

    setGenericError(null);
    setFieldErrors({});

    if (!summary || cart.length === 0) {
      setGenericError(t.emptyCartMessage ?? 'Votre panier est vide.');
      return;
    }

    try {
      const request = buildPaymentRequest({
        method: selectedPaymentMethod,
        amount: conversion.amount,
        currency: conversion.currency,
        customerEmail,
        customerName,
        data: selectedPaymentMethod === 'card_cib' || selectedPaymentMethod === 'card_international'
          ? cardForm
          : selectedPaymentMethod === 'paypal'
            ? { paypalAccount }
            : selectedPaymentMethod === 'mobile_payment'
              ? { phoneNumber: mobilePhone }
              : { reference: bankReference }
      });

      setIsSubmitting(true);
      const response = await onProcessOrder(request);

      if (!response.ok) {
        const nextErrors: Record<string, string> = {};
        response.errors?.forEach((error) => {
          nextErrors[error.field] = error.message;
        });
        setFieldErrors(nextErrors);
        if (response.errors && response.errors.length > 0) {
          setGenericError(response.errors[0].message);
        } else if (response.result?.message) {
          setGenericError(response.result.message);
        } else if (response.result?.failureReason) {
          setGenericError(response.result.failureReason);
        } else {
          setGenericError('Le paiement a été refusé. Merci de vérifier les informations fournies.');
        }
      }
    } catch (error) {
      console.error('Erreur lors du traitement du paiement', error);
      setGenericError('Une erreur inattendue est survenue. Merci de réessayer.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderFieldError = (field: string) => {
    if (!fieldErrors[field]) return null;
    return <p className="text-xs text-destructive">{fieldErrors[field]}</p>;
  };

  const renderMethodSpecificFields = () => {
    switch (selectedPaymentMethod) {
      case 'card_cib':
      case 'card_international':
        return (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="card-number">{t.cardNumber ?? 'Numéro de carte'}</Label>
              <Input
                id="card-number"
                value={cardForm.cardNumber}
                onChange={(e) => setCardForm((prev) => ({ ...prev, cardNumber: e.target.value }))}
                placeholder={CARD_TEST_HINTS[selectedPaymentMethod]}
              />
              <p className="text-xs text-muted-foreground">
                Carte de test : {CARD_TEST_HINTS[selectedPaymentMethod]}
              </p>
              {renderFieldError('cardNumber')}
            </div>
            <div className="space-y-1">
              <Label htmlFor="holder-name">{t.cardHolder ?? 'Titulaire de la carte'}</Label>
              <Input
                id="holder-name"
                value={cardForm.holderName}
                onChange={(e) => setCardForm((prev) => ({ ...prev, holderName: e.target.value }))}
              />
              {renderFieldError('holderName')}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Label htmlFor="expiry-month">MM</Label>
                <Input
                  id="expiry-month"
                  value={cardForm.expiryMonth}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, expiryMonth: e.target.value }))}
                  placeholder="MM"
                />
                {renderFieldError('expiryMonth')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="expiry-year">AA</Label>
                <Input
                  id="expiry-year"
                  value={cardForm.expiryYear}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, expiryYear: e.target.value }))}
                  placeholder="AA"
                />
                {renderFieldError('expiryYear')}
              </div>
              <div className="space-y-1">
                <Label htmlFor="card-cvc">CVC</Label>
                <Input
                  id="card-cvc"
                  value={cardForm.cvc}
                  onChange={(e) => setCardForm((prev) => ({ ...prev, cvc: e.target.value }))}
                  placeholder="123"
                />
                {renderFieldError('cvc')}
              </div>
            </div>
          </div>
        );
      case 'paypal':
        return (
          <div className="space-y-1">
            <Label htmlFor="paypal-account">{t.paypalAccount ?? 'Compte PayPal'}</Label>
            <Input
              id="paypal-account"
              value={paypalAccount}
              onChange={(e) => setPaypalAccount(e.target.value)}
              placeholder="utilisateur@example.com"
            />
            {renderFieldError('paypalAccount')}
          </div>
        );
      case 'mobile_payment':
        return (
          <div className="space-y-1">
            <Label htmlFor="mobile-phone">{t.mobilePhone ?? 'Numéro de téléphone'}</Label>
            <Input
              id="mobile-phone"
              value={mobilePhone}
              onChange={(e) => setMobilePhone(e.target.value)}
              placeholder="0550 00 00 00"
            />
            {renderFieldError('phoneNumber')}
            <p className="text-xs text-muted-foreground">
              {t.mobilePaymentHint ?? 'Vous recevrez une notification pour valider le paiement.'}
            </p>
          </div>
        );
      case 'bank_transfer':
        return (
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="bank-reference">{t.bankTransferReference ?? 'Référence du virement'}</Label>
              <Input
                id="bank-reference"
                value={bankReference}
                onChange={(e) => setBankReference(e.target.value)}
              />
            </div>
            {activeConfig?.instructions && (
              <p className="text-xs text-muted-foreground">{activeConfig.instructions}</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CreditCard className="w-5 h-5" />
            {t.payment}
          </DialogTitle>
          <DialogDescription>{t.paymentDescription}</DialogDescription>
        </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-3">
              <Label>{t.paymentMethod}</Label>
              <div className="space-y-2">
                {availableMethods.map(([method, config]) => (
                  <div key={method} className="flex items-center space-x-2">
                  <input
                    type="radio"
                    id={method}
                    name="payment"
                    value={method}
                    checked={selectedPaymentMethod === method}
                    onChange={(e) => onPaymentMethodChange(e.target.value as PaymentMethod)}
                  />
                  <div className="flex-1">
                    <Label htmlFor={method}>{config.label ?? getDefaultPaymentLabel(method, t)}</Label>
                    {config.description && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                </div>
              ))}
              {availableMethods.length === 0 && (
                <p className="text-sm text-muted-foreground">{t.noPaymentMethods}</p>
              )}
            </div>
          </div>

          {renderMethodSpecificFields()}

          {selectedPaymentMethod === 'bank_transfer' && bankAccounts.length > 0 && (
            <div className="space-y-2 text-sm bg-muted/50 border border-muted p-3 rounded-md">
              <p className="font-medium">{t.bankTransferInstructions}</p>
              {bankAccounts.map(account => (
                <div key={account.id} className="rounded border border-dashed border-muted p-3 space-y-1">
                  <div className="font-semibold">{account.label}</div>
                  {account.bankName && <div>{account.bankName}</div>}
                  {account.accountNumber && (
                    <div>
                      <span className="font-medium">{t.accountNumber}: </span>
                      {account.accountNumber}
                    </div>
                  )}
                  {account.iban && (
                    <div>
                      <span className="font-medium">IBAN: </span>
                      {account.iban}
                    </div>
                  )}
                  {account.swift && (
                    <div>
                      <span className="font-medium">SWIFT: </span>
                      {account.swift}
                    </div>
                  )}
                  {account.notes && (
                    <div className="text-xs text-muted-foreground">{account.notes}</div>
                  )}
                </div>
              ))}
              {activeConfig?.instructions && (
                <p className="text-xs text-muted-foreground">{activeConfig.instructions}</p>
              )}
            </div>
          )}

          <div className="p-3 bg-muted rounded-md">
            <div className="flex justify-between font-medium">
              <span>{t.amountDue}</span>
              <span>{summary ? (summary.totalTTC || 0).toLocaleString() : '0'} DA TTC</span>
            </div>
            {conversion.converted && (
              <div className="mt-2 space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>{t.chargedAmount ?? 'Montant débité'}</span>
                  <span>{formattedConvertedAmount} {conversion.currency}</span>
                </div>
                {conversion.exchangeRate && (
                  <div className="flex justify-between">
                    <span>{t.officialExchangeRate ?? 'Taux de change officiel'}</span>
                    <span>
                      1 {conversion.currency} = {conversion.exchangeRate.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DZD
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {genericError && (
            <div className="rounded border border-destructive bg-destructive/10 p-2 text-sm text-destructive">
              {genericError}
            </div>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleSubmitPayment}
              className="flex-1"
              disabled={availableMethods.length === 0 || isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {t.processingPayment ?? 'Traitement en cours...'}
                </>
              ) : (
                t.confirmPayment
              )}
            </Button>
            <Button variant="outline" onClick={onBackToCheckout}>
              {t.back}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface OrderCompleteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentOrder: Order | null;
  selectedPaymentMethod: PaymentMethod;
  t: any;
}

export function OrderCompleteDialog({
  open,
  onOpenChange,
  currentOrder,
  selectedPaymentMethod,
  t
}: OrderCompleteDialogProps) {
  const paymentLabels: Record<PaymentMethod, string> = {
    card_cib: t.cardCIB,
    card_international: t.cardInternational ?? 'Carte internationale',
    paypal: t.paypal,
    bank_transfer: t.bankTransfer,
    mobile_payment: t.mobilePayment
  };
  const paymentMethod = currentOrder?.payment.method ?? selectedPaymentMethod;
  const paymentLabel = paymentLabels[paymentMethod] ?? t.paymentMethod ?? 'Paiement';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600">
            <CheckCircle className="w-5 h-5" />
            {t.orderConfirmed}
          </DialogTitle>
          <DialogDescription>{t.orderConfirmedDescription}</DialogDescription>
        </DialogHeader>

        {currentOrder && (
          <div className="space-y-4">
            <div className="text-center">
              <p className="font-medium">{t.orderNumber}</p>
              <p className="text-2xl font-bold text-green-600">{currentOrder.id}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t.amount}</span>
                <span>{(currentOrder.summary?.totalTTC || 0).toLocaleString()} DA TTC</span>
              </div>
              <div className="flex justify-between">
                <span>{t.paymentMethod}</span>
                <span>{paymentLabel}</span>
              </div>
              <div className="flex justify-between">
                <span>{t.status}</span>
                <Badge className={getStatusColor(currentOrder.status)}>
                  {currentOrder.status}
                </Badge>
              </div>
              {currentOrder.payment.reference && (
                <div className="flex justify-between text-sm">
                  <span>{t.paymentReference ?? 'Référence'}</span>
                  <span className="font-medium">{currentOrder.payment.reference}</span>
                </div>
              )}
            </div>

            {currentOrder.summary?.totalTokens ? (
              <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                <p className="text-sm text-green-700">
                  <Coins className="w-4 h-4 inline mr-1" />
                  {t.tokensAdded.replace('{tokens}', currentOrder.summary.totalTokens.toLocaleString())}
                </p>
              </div>
            ) : null}

            {currentOrder.payment.message && (
              <div className="p-3 bg-muted/20 border border-muted-foreground/40 rounded-md text-sm">
                {currentOrder.payment.message}
              </div>
            )}

            {selectedPaymentMethod === 'bank_transfer' && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-sm text-amber-800 rounded-md">
                {"L'activation de votre compte sera effective à l'encaissement du montant TTC. Vous serez automatiquement informé à l'encaissement."}
              </div>
            )}

            <Button onClick={() => onOpenChange(false)} className="w-full">
              {t.close}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface StoreDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  onViewCart: () => void;
  addToCart: (type: 'subscription' | 'tokens', quantity: number) => void;
  updateCartItemQuantity: (id: string, quantity: number) => void;
  removeFromCart: (id: string) => void;
  pricing: PricingSettings | null;
  onProceedToCheckout: () => void;
  t: any;
}

export function StoreDialog({
  open,
  onOpenChange,
  cart,
  onViewCart,
  addToCart,
  updateCartItemQuantity,
  removeFromCart,
  pricing,
  onProceedToCheckout,
  t
}: StoreDialogProps) {
  const vatPercent = pricing?.vat.enabled ? pricing.vat.rate : 0;
  const vatFraction = vatPercent / 100;
  const currency = pricing?.subscription.currency ?? 'DA';

  const subscriptionItem = cart.find(item => item.type === 'subscription') ?? null;
  const tokenItem = cart.find(item => item.type === 'tokens') ?? null;

  const subscriptionQuantity = subscriptionItem?.quantity ?? 0;
  const tokenQuantity = tokenItem?.quantity ?? 0;

  const format = (value: number) => formatCurrencyValue(value, currency);

  const getSubscriptionDiscount = React.useCallback((months: number) => {
    if (!pricing || months <= 0) return 0;
    return pricing.discounts
      .filter(rule => rule.threshold <= 12 && months >= rule.threshold)
      .reduce((acc, rule) => Math.max(acc, rule.percentage), 0);
  }, [pricing]);

  const getTokenDiscount = React.useCallback((millions: number) => {
    if (!pricing || millions <= 0) return 0;
    const tokens = millions * 1_000_000;
    return pricing.discounts
      .filter(rule => rule.threshold > 12 && tokens >= rule.threshold)
      .reduce((acc, rule) => Math.max(acc, rule.percentage), 0);
  }, [pricing]);

  const subscriptionTotals = React.useMemo(() => {
    if (!pricing || subscriptionQuantity <= 0) {
      const basePrice = pricing?.subscription.monthlyPrice ?? 0;
      return {
        discount: 0,
        unitPriceHT: basePrice,
        totalHT: 0,
        taxAmount: 0,
        totalTTC: 0
      };
    }

    const discount = getSubscriptionDiscount(subscriptionQuantity);
    const baseHT = pricing.subscription.monthlyPrice * subscriptionQuantity;
    const discountedHT = baseHT * (1 - discount / 100);
    const taxAmount = discountedHT * vatFraction;
    const totalTTC = discountedHT + taxAmount;

    return {
      discount,
      unitPriceHT: discountedHT / subscriptionQuantity,
      totalHT: discountedHT,
      taxAmount,
      totalTTC
    };
  }, [pricing, subscriptionQuantity, getSubscriptionDiscount, vatFraction]);

  const tokenTotals = React.useMemo(() => {
    if (!pricing || tokenQuantity <= 0) {
      const basePrice = pricing?.tokens.pricePerMillion ?? 0;
      return {
        discount: 0,
        unitPriceHT: basePrice,
        totalHT: 0,
        taxAmount: 0,
        totalTTC: 0
      };
    }

    const discount = getTokenDiscount(tokenQuantity);
    const baseHT = pricing.tokens.pricePerMillion * tokenQuantity;
    const discountedHT = baseHT * (1 - discount / 100);
    const taxAmount = discountedHT * vatFraction;
    const totalTTC = discountedHT + taxAmount;

    return {
      discount,
      unitPriceHT: discountedHT / tokenQuantity,
      totalHT: discountedHT,
      taxAmount,
      totalTTC
    };
  }, [pricing, tokenQuantity, getTokenDiscount, vatFraction]);

  const summary = React.useMemo(() => {
    return calculateOrderSummary(cart, vatFraction || 0);
  }, [cart, vatFraction]);

  const handleSubscriptionQuantityChange = (nextQuantity: number) => {
    if (!pricing) return;
    if (nextQuantity <= 0) {
      if (subscriptionItem) {
        removeFromCart(subscriptionItem.id);
      }
      return;
    }
    if (subscriptionItem) {
      updateCartItemQuantity(subscriptionItem.id, nextQuantity);
    } else {
      addToCart('subscription', nextQuantity);
    }
  };

  const handleTokenQuantityChange = (nextQuantity: number) => {
    if (!pricing) return;
    if (nextQuantity <= 0) {
      if (tokenItem) {
        removeFromCart(tokenItem.id);
      }
      return;
    }
    if (tokenItem) {
      updateCartItemQuantity(tokenItem.id, nextQuantity);
    } else {
      addToCart('tokens', nextQuantity);
    }
  };

  const hasItems = cart.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="w-5 h-5" />
            {t.storeTitle}
          </DialogTitle>
          <DialogDescription>{t.storeDescription}</DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-2">
          <Tabs defaultValue="subscriptions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscriptions">
                <Calendar className="w-4 h-4 mr-2" />
                {t.storeSubscriptionsTab}
              </TabsTrigger>
              <TabsTrigger value="tokens">
                <Coins className="w-4 h-4 mr-2" />
                {t.storeTokensTab}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="space-y-4">
              <Card className="p-6 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-medium">{t.monthlySubscriptionTitle}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t.monthlySubscriptionDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSubscriptionQuantityChange(Math.max(subscriptionQuantity - 1, 0))}
                        disabled={!pricing || subscriptionQuantity === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="min-w-[3ch] text-center text-lg font-semibold">{subscriptionQuantity}</span>
                      <Button
                        size="sm"
                        onClick={() => handleSubscriptionQuantityChange(subscriptionQuantity + 1)}
                        disabled={!pricing}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      <Zap className="w-3 h-3 mr-1" />
                      {(pricing?.subscription.monthlyTokens ?? 0).toLocaleString()} jetons / mois
                    </Badge>
                    <Badge variant="outline">
                      <Calendar className="w-3 h-3 mr-1" />
                      {t.subscriptionRenewable}
                    </Badge>
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Remise : {subscriptionTotals.discount}%
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="flex justify-between">
                      <span>Prix unitaire HT</span>
                      <span>{format(subscriptionTotals.unitPriceHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total HT</span>
                      <span>{format(subscriptionTotals.totalHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA ({vatPercent}%)</span>
                      <span>{format(subscriptionTotals.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total TTC</span>
                      <span>{format(subscriptionTotals.totalTTC)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4">
              <Card className="p-6 space-y-4">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                      <h3 className="text-lg font-medium">{t.tokenPackTitle}</h3>
                      <p className="text-sm text-muted-foreground">
                        {t.tokenPackDescription}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleTokenQuantityChange(Math.max(tokenQuantity - 1, 0))}
                        disabled={!pricing || tokenQuantity === 0}
                      >
                        <Minus className="w-4 h-4" />
                      </Button>
                      <span className="min-w-[3ch] text-center text-lg font-semibold">{tokenQuantity}</span>
                      <Button
                        size="sm"
                        onClick={() => handleTokenQuantityChange(tokenQuantity + 1)}
                        disabled={!pricing}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge variant="secondary">
                      <Coins className="w-3 h-3 mr-1" />
                      {t.storeTokenAmount}
                    </Badge>
                    <Badge variant="outline">
                      <Zap className="w-3 h-3 mr-1" />
                      {t.tokenUsageImmediate}
                    </Badge>
                    <Badge variant="outline">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Remise : {tokenTotals.discount}%
                    </Badge>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 text-sm">
                    <div className="flex justify-between">
                      <span>Prix unitaire HT</span>
                      <span>{format(tokenTotals.unitPriceHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total HT</span>
                      <span>{format(tokenTotals.totalHT)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>TVA ({vatPercent}%)</span>
                      <span>{format(tokenTotals.taxAmount)}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Total TTC</span>
                      <span>{format(tokenTotals.totalTTC)}</span>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <Card className="mt-6 p-6 space-y-2">
            <h3 className="text-lg font-semibold">{t.orderSummary}</h3>
            <div className="flex justify-between text-sm">
              <span>{t.subtotalHT}</span>
              <span>{format(summary.subtotalHT || 0)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>TVA ({vatPercent}%)</span>
              <span>{format(summary.totalTVA || summary.vat || 0)}</span>
            </div>
            <div className="flex justify-between font-semibold text-base">
              <span>{t.totalTTC}</span>
              <span>{format(summary.totalTTC || 0)}</span>
            </div>
          </Card>
        </ScrollArea>

        <div className="flex flex-col gap-3 pt-4 border-t border-border">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span>{t.storeBenefitIncluded}</span>
            <span>•</span>
            <span>{t.storeBenefitBalance}</span>
            <span>•</span>
            <span>{t.storeBenefitDiscounts}</span>
          </div>
          <div className="flex flex-col sm:flex-row-reverse sm:items-center gap-2">
            <Button onClick={onProceedToCheckout} disabled={!hasItems}>
              {t.proceedToPayment}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onViewCart} disabled={!hasItems}>
                {t.viewCart} ({cart.length})
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.close}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
