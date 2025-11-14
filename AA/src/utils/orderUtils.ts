import { CartItem, OrderSummary, Order, PaymentMethod } from '../types';
import { VAT_RATE } from '../constants/config';

export const calculateOrderSummary = (items: CartItem[], rate: number = VAT_RATE): OrderSummary => {
  const subtotalHT = items.reduce((sum, item) => sum + item.totalHT, 0);
  const totalDiscount = items.reduce((sum, item) => {
    const discount = item.discount || 0;
    return sum + (item.totalHT * discount / (1 - discount));
  }, 0);
  const discountedSubtotal = subtotalHT;
  const vat = discountedSubtotal * rate;
  const totalTTC = discountedSubtotal + vat;
  const totalTokens = items.reduce((sum, item) => sum + (item.tokensIncluded || 0), 0);

  return {
    subtotalHT: subtotalHT,
    totalDiscount,
    discountedSubtotal,
    vat,
    totalTVA: vat,
    totalTTC,
    totalTokens
  };
};

interface CreateOrderOptions {
  status?: 'paid' | 'pending';
  transactionId?: string | null;
  paymentReference?: string | null;
  paymentMessage?: string | null;
  paymentDate?: string | null;
  invoiceId?: string | null;
}

export const createOrder = (
  items: CartItem[],
  paymentMethod: PaymentMethod,
  userInfo: any,
  billingAddress: any,
  vatRate: number = VAT_RATE,
  options: CreateOrderOptions = {}
): Order => {
  const orderId = `ORD-${Date.now()}`;
  const summary = calculateOrderSummary(items, vatRate);
  const paymentStatus = options.status ?? (paymentMethod === 'bank_transfer' ? 'pending' : 'paid');
  const transactionId = options.transactionId || `TXN-${orderId}-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  const paymentDate = options.paymentDate ?? (paymentStatus === 'paid' ? new Date().toISOString() : null);

  return {
    id: orderId,
    items: [...items],
    summary,
    payment: {
      method: paymentMethod,
      status: paymentStatus === 'paid' ? 'completed' : 'pending',
      transactionId,
      paymentDate,
      reference: options.paymentReference ?? undefined,
      message: options.paymentMessage ?? undefined,
      invoiceId: options.invoiceId ?? undefined
    },
    billingInfo: {
      name: userInfo.name,
      email: userInfo.email,
      phone: userInfo.phone || '',
      address: billingAddress.street,
      city: billingAddress.city,
      postalCode: billingAddress.postalCode,
      country: billingAddress.country
    },
    createdAt: new Date(),
    status: paymentStatus
  };
};

export const getStatusColor = (status: string): string => {
  switch (status) {
    case 'paid':
      return 'text-green-600';
    case 'pending':
    case 'bank_pending':
      return 'text-yellow-600';
    case 'overdue':
    case 'cancelled':
      return 'text-red-600';
    case 'free':
      return 'text-sky-600';
    default:
      return 'text-gray-600';
  }
};

export const getFilenameFromPath = (fullPath: string): string => {
  return fullPath.split(/[/\\]/).pop() || fullPath;
};
