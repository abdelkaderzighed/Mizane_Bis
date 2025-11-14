import { supabase } from './supabase';
import { buildEdgeFunctionUrl, getSupabaseEdgeCredentials } from './supabase/edge';
import { misanAuth } from './supabase/auth';
import type { Address, CartItem, Invoice, InvoiceStatus, PaymentMethod, AdminOrder, OrderSummary } from '../types';
import { calculateOrderSummary } from './orderUtils';

const PAYMENT_METHOD_DB_MAP: Record<PaymentMethod, string> = {
  card_cib: 'card_cib',
  paypal: 'paypal',
  bank_transfer: 'bank_transfer',
  mobile_payment: 'edahabia',
  card_international: 'card_visa'
};

const PAYMENT_METHOD_APP_MAP: Record<string, PaymentMethod> = {
  card_cib: 'card_cib',
  card_visa: 'card_international',
  bank_transfer: 'bank_transfer',
  edahabia: 'mobile_payment',
  paypal: 'paypal',
};

const mapPaymentMethodFromDb = (value: string | null): PaymentMethod => {
  if (!value) {
    return 'bank_transfer';
  }
  return PAYMENT_METHOD_APP_MAP[value] ?? 'bank_transfer';
};

const mapInvoiceStatusFromDb = (value: string | null, paymentMethod: PaymentMethod): InvoiceStatus => {
  if (paymentMethod === 'bank_transfer') {
    return value === 'paid' ? 'paid' : 'bank_pending';
  }
  switch (value) {
    case 'paid':
      return 'paid';
    case 'cancelled':
      return 'cancelled';
    case 'overdue':
      return 'pending';
    default:
      return 'pending';
  }
};

const generateInvoiceNumber = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .ilike('invoice_number', `MS-${year}-%`)
    .order('invoice_number', { ascending: false })
    .limit(1);

  let sequence = 1;

  if (data && data.length > 0) {
    const match = data[0].invoice_number.match(/MS-\d{4}-(\d+)/);
    if (match) {
      sequence = Number(match[1]) + 1;
    }
  }

  return `MS-${year}-${sequence.toString().padStart(4, '0')}`;
};

const mapInvoiceRowToInvoice = (row: any): Invoice => {
  const transaction = row.transactions?.[0] ?? null;
  const paymentMethod = mapPaymentMethodFromDb(transaction?.payment_method ?? null);
  const status = mapInvoiceStatusFromDb(row.status, paymentMethod);

  const lineItems = Array.isArray(row.line_items)
    ? row.line_items.map((item: any, index: number) => ({
        id: item.id ?? `${row.invoice_number}-${index + 1}`,
        label: item.label ?? 'Produit',
        quantity: Number(item.quantity) || 1,
        unitPrice: Number(item.unit_price_ht) || 0,
        vatRate: Number(item.vat_rate ?? row.tax_rate ?? 0),
        total: Number(item.total_ht) || 0
      }))
    : [];

  return {
    id: row.invoice_number,
    orderNumber: row.invoice_number,
    createdAt: row.issue_date,
    dueDate: row.due_date,
    amount: Number(row.total_da) || 0,
    currency: (row.currency || 'DZD') as Invoice['currency'],
    status,
    type: lineItems[0]?.label?.toLowerCase().includes('jeton') ? 'tokens' : 'subscription',
    description: lineItems[0]?.label ?? 'Commande Misan',
    paymentMethod,
    paymentDate: row.paid_at || transaction?.payment_date || null,
    paymentReference: transaction?.reference_id || null,
    lines: lineItems,
    notes: row.notes ?? undefined,
    billingAddress: row.billing_address ?? null
  };
};

export const fetchUserInvoices = async (userId: string): Promise<Invoice[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select('*, transactions:transactions(payment_method, reference_id, payment_date, status)')
    .eq('user_id', userId)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Erreur chargement factures:', error);
    return [];
  }

  return (data || []).map(mapInvoiceRowToInvoice);
};

interface PersistInvoiceParams {
  userId: string;
  userEmail: string;
  userName: string;
  userRole?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string;
  subscriptionStart?: string;
  tokens?: number;
  cart: CartItem[];
  billingAddress: Address;
  paymentMethod: PaymentMethod;
  vatRate: number;
  notes?: string | null;
  initialStatus?: 'paid' | 'pending';
  transactionId?: string | null;
}

const mapRoleToProfileRole = (role?: string) => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'collaborateur':
      return 'pro';
    default:
      return 'premium';
  }
};

const mapSubscriptionTypeToProfile = (type?: string) => {
  switch (type) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'pro';
    default:
      return 'premium';
  }
};

const ensureUserProfile = async ({
  userId,
  email,
  name,
  role,
  subscriptionType,
  subscriptionStatus,
  subscriptionEnd,
  subscriptionStart,
  tokens
}: {
  userId: string;
  email: string;
  name: string;
  role?: string;
  subscriptionType?: string;
  subscriptionStatus?: string;
  subscriptionEnd?: string | null;
  subscriptionStart?: string | null;
  tokens?: number;
}) => {
  if (!email) {
    throw new Error('Adresse email utilisateur manquante.');
  }

  const normalizedStart = subscriptionStart === undefined
    ? new Date().toISOString()
    : (typeof subscriptionStart === 'string' && subscriptionStart.trim().length > 0
        ? subscriptionStart
        : null);
  const normalizedEnd = subscriptionEnd === undefined
    ? null
    : (typeof subscriptionEnd === 'string' && subscriptionEnd.trim().length > 0
        ? subscriptionEnd
        : null);
  const normalizedTokens = Number.isFinite(tokens) ? Math.max(Number(tokens), 0) : 0;

  const { error } = await supabase.rpc('ensure_user_profile', {
    _user_id: userId,
    _email: email,
    _name: name || email,
    _role: mapRoleToProfileRole(role),
    _subscription_type: mapSubscriptionTypeToProfile(subscriptionType),
    _subscription_status: subscriptionStatus ?? 'active',
    _subscription_start: normalizedStart,
    _subscription_end: normalizedEnd,
    _tokens_balance: normalizedTokens
  });

  if (error) {
    console.error('Erreur ensure_user_profile RPC:', error);
    throw error;
  }
};

export const createTransactionAndInvoice = async ({
  userId,
  userEmail,
  userName,
  userRole,
  subscriptionType,
  subscriptionStatus,
  subscriptionEnd,
  subscriptionStart,
  tokens,
  cart,
  billingAddress,
  paymentMethod,
  vatRate,
  notes,
  initialStatus,
  transactionId
}: PersistInvoiceParams): Promise<Invoice | null> => {
  if (!cart.length) {
    return null;
  }

  const resolvedStatus = initialStatus
    ? initialStatus
    : paymentMethod === 'bank_transfer'
      ? 'pending'
      : 'paid';

  const invoiceStatus: InvoiceStatus = resolvedStatus === 'paid'
    ? 'paid'
    : paymentMethod === 'bank_transfer'
      ? 'bank_pending'
      : 'pending';

  const previousStatus = (subscriptionStatus as 'active' | 'inactive' | 'expired' | undefined) ?? 'inactive';
  const targetProfileStatus: 'active' | 'inactive' | 'expired' =
    resolvedStatus === 'paid'
      ? 'active'
      : (previousStatus === 'expired' ? 'expired' : 'inactive');

  const sanitizedSubscriptionStart = typeof subscriptionStart === 'string' ? subscriptionStart : null;
  const sanitizedSubscriptionEnd = typeof subscriptionEnd === 'string' ? subscriptionEnd : null;

  const nextSubscriptionStart = targetProfileStatus === 'active'
    ? (sanitizedSubscriptionStart && sanitizedSubscriptionStart.trim().length > 0
        ? sanitizedSubscriptionStart
        : new Date().toISOString())
    : null;

  const nextSubscriptionEnd = targetProfileStatus === 'active'
    ? (sanitizedSubscriptionEnd && sanitizedSubscriptionEnd.trim().length > 0
        ? sanitizedSubscriptionEnd
        : null)
    : null;

  await ensureUserProfile({
    userId,
    email: userEmail,
    name: userName,
    role: userRole,
    subscriptionType,
    subscriptionStatus: targetProfileStatus,
    subscriptionEnd: nextSubscriptionEnd,
    subscriptionStart: nextSubscriptionStart,
    tokens
  });

  const invoiceNumber = await generateInvoiceNumber();
  const summary = calculateOrderSummary(cart, vatRate / 100);
  const subtotal = Math.round(summary.subtotalHT || 0);
  const taxAmount = Math.round(summary.vat || 0);
  const total = Math.round((summary.totalTTC || 0));

  const referenceId = transactionId || invoiceNumber;
  const tokensAmount = cart.reduce((totalTokens, item) => totalTokens + (item.tokensIncluded || 0), 0);
  const description = cart.map(item => `${item.quantity}× ${item.name}`).join(' + ');

  const dbPaymentMethod = PAYMENT_METHOD_DB_MAP[paymentMethod] ?? 'bank_transfer';

  const { data: transactionData, error: transactionError } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: cart.some(item => item.type === 'subscription') ? 'subscription' : 'tokens',
      description,
      amount_da: subtotal,
      tax_amount_da: taxAmount,
      total_amount_da: total,
      tokens_amount: tokensAmount,
      payment_method: dbPaymentMethod,
      status: resolvedStatus,
      reference_id: referenceId,
      invoice_number: invoiceNumber,
      payment_date: resolvedStatus === 'paid' ? new Date().toISOString() : null
    })
    .select('id, payment_method, reference_id, payment_date, status')
    .maybeSingle();

  if (transactionError || !transactionData) {
    console.error('Erreur création transaction:', transactionError);
    throw transactionError || new Error('Transaction non créée');
  }

  const lineItems = cart.map((item, index) => {
    const unitPrice = item.quantity > 0 ? item.totalHT / item.quantity : item.totalHT;
    return {
      id: item.id ?? `${invoiceNumber}-${index + 1}`,
      label: item.name,
      quantity: item.quantity,
      unit_price_ht: unitPrice,
      total_ht: item.totalHT,
      vat_rate: vatRate
    };
  });

  const { data: invoiceRow, error: invoiceError } = await supabase
    .from('invoices')
    .insert({
      user_id: userId,
      transaction_id: transactionData.id,
      invoice_number: invoiceNumber,
      issue_date: new Date().toISOString().slice(0, 10),
      due_date: new Date().toISOString().slice(0, 10),
      status: invoiceStatus === 'paid' ? 'paid' : 'pending',
      subtotal_da: subtotal,
      tax_rate: vatRate,
      tax_amount_da: taxAmount,
      total_da: total,
      currency: 'DZD',
      billing_address: billingAddress,
      line_items: lineItems,
      notes: notes ?? (paymentMethod === 'bank_transfer'
        ? "L'activation de votre compte sera effective à l'encaissement du montant TTC. Vous serez automatiquement informé à l'encaissement."
        : null),
      paid_at: invoiceStatus === 'paid' ? new Date().toISOString() : null
    })
    .select('*, transactions:transactions(payment_method, reference_id, payment_date, status)')
    .maybeSingle();

  if (invoiceError || !invoiceRow) {
    console.error('Erreur création facture:', invoiceError);
    throw invoiceError || new Error('Facture non créée');
  }

  return mapInvoiceRowToInvoice(invoiceRow);
};

const buildCartItemsFromInvoice = (
  invoiceId: string,
  lineItems: any[],
  description: string,
  invoiceType: Invoice['type'],
  fallbackAmount: number
): CartItem[] => {
  if (!Array.isArray(lineItems) || lineItems.length === 0) {
    return [{
      id: `${invoiceId}-1`,
      type: invoiceType === 'tokens' ? 'tokens' : 'subscription',
      name: description || 'Commande Misan',
      description,
      quantity: 1,
      unitPriceHT: fallbackAmount,
      totalHT: fallbackAmount,
      discount: 0,
      tokensIncluded: invoiceType === 'tokens' ? 0 : undefined,
    }];
  }

  return lineItems.map((item: any, index: number) => {
    const label: string = item.label ?? `Article ${index + 1}`;
    const normalizedLabel = label.toLowerCase();
    const itemType: CartItem['type'] = normalizedLabel.includes('jeton') || normalizedLabel.includes('token')
      ? 'tokens'
      : 'subscription';

    return {
      id: item.id ?? `${invoiceId}-${index + 1}`,
      type: itemType,
      name: label,
      description,
      quantity: Number(item.quantity) || 1,
      unitPriceHT: Number(item.unit_price_ht) || 0,
      totalHT: Number(item.total_ht) || 0,
      discount: 0,
      tokensIncluded: itemType === 'tokens' ? Number(item.tokens ?? 0) : undefined,
      planType: itemType === 'subscription' ? 'pro' : undefined,
    };
  });
};

const toAdminOrderStatus = (status: InvoiceStatus): AdminOrder['status'] => {
  switch (status) {
    case 'paid':
      return 'paid';
    case 'cancelled':
      return 'cancelled';
    case 'overdue':
      return 'overdue';
    default:
      return 'pending';
  }
};

const mapInvoiceRowToAdminOrder = (row: any): AdminOrder => {
  const invoice = mapInvoiceRowToInvoice(row);
  const paymentRecord = row.transactions?.[0] ?? null;
  const paymentMethod = mapPaymentMethodFromDb(paymentRecord?.payment_method ?? null);

  const paymentStatus: 'completed' | 'pending' | 'failed' = paymentRecord?.status === 'paid'
    ? 'completed'
    : paymentRecord?.status === 'failed' || paymentRecord?.status === 'cancelled'
      ? 'failed'
      : 'pending';

  const fallbackAmount = Number(row.subtotal_da ?? invoice.amount ?? 0);
  const items = buildCartItemsFromInvoice(
    invoice.id,
    row.line_items ?? [],
    invoice.description,
    invoice.type,
    fallbackAmount
  );
  const vatRate = Number(row.tax_rate ?? 0) / 100;
  const summaryBase = calculateOrderSummary(items, vatRate);

  const summary: OrderSummary = {
    ...summaryBase,
    subtotalHT: Number(row.subtotal_da ?? summaryBase.subtotalHT),
    discountedSubtotal: Number(row.subtotal_da ?? summaryBase.discountedSubtotal),
    totalDiscount: summaryBase.totalDiscount,
    vat: Number(row.tax_amount_da ?? summaryBase.vat),
    totalTVA: Number(row.tax_amount_da ?? summaryBase.totalTVA),
    totalTTC: Number(row.total_da ?? summaryBase.totalTTC),
    totalTokens: items.reduce((totalTokens, item) => totalTokens + (item.tokensIncluded || 0), 0)
  };

  const billing = (row.billing_address ?? {}) as Record<string, any>;
  const userProfile = row.user ?? {};

  const billingInfo = {
    name: billing.name ?? userProfile.name ?? '',
    email: billing.email ?? userProfile.email ?? '',
    phone: billing.phone ?? '',
    address: billing.street ?? '',
    city: billing.city ?? '',
    postalCode: billing.postalCode ?? billing.postal_code ?? '',
    country: billing.country ?? ''
  };

  return {
    id: invoice.id,
    items,
    summary,
    payment: {
      method: paymentMethod,
      status: paymentStatus,
      transactionId: paymentRecord?.id ?? undefined,
      paymentDate: invoice.paymentDate ?? paymentRecord?.payment_date ?? null,
      reference: paymentRecord?.reference_id ?? undefined,
      invoiceId: invoice.id
    },
    billingInfo,
    createdAt: invoice.createdAt ? new Date(invoice.createdAt) : new Date(),
    status: toAdminOrderStatus(invoice.status),
    user: {
      id: row.user_id ?? userProfile.id ?? '',
      name: userProfile.name ?? billing.name ?? '',
      email: userProfile.email ?? billing.email ?? ''
    }
  };
};

export const fetchAdminOrders = async (): Promise<AdminOrder[]> => {
  const { data, error } = await supabase
    .from('invoices')
    .select(`
      invoice_number,
      issue_date,
      due_date,
      subtotal_da,
      tax_amount_da,
      total_da,
      tax_rate,
      status,
      currency,
      line_items,
      billing_address,
      notes,
      paid_at,
      user_id,
      transactions:transactions(id, payment_method, status, reference_id, payment_date),
      user:user_profiles(id, name, email)
    `)
    .order('issue_date', { ascending: false });

  if (error) {
    console.error('Erreur chargement commandes:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(mapInvoiceRowToAdminOrder);
};

interface UpdateAdminOrderOptions {
  userStatus: 'active' | 'inactive' | 'expired' | 'pending';
  subscriptionStart?: string | null;
  subscriptionEnd?: string | null;
}

export const updateAdminOrder = async (
  order: AdminOrder,
  options: UpdateAdminOrderOptions
): Promise<void> => {
  const accessToken = await misanAuth.getAccessToken();
  if (!accessToken) {
    throw new Error('Session administrateur expirée. Veuillez vous reconnecter.');
  }

  const [{ publicAnonKey }, url] = await Promise.all([
    getSupabaseEdgeCredentials(),
    buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/admin/update-order')
  ]);

  const payload = {
    orderId: order.id,
    status: order.status,
    payment: {
      method: order.payment.method,
      status: order.payment.status,
      transactionId: order.payment.transactionId ?? null,
      paymentDate: order.payment.paymentDate ?? null,
      reference: order.payment.reference ?? null,
      message: order.payment.message ?? null
    },
    billingInfo: order.billingInfo,
    summary: order.summary,
    user: {
      id: order.user.id,
      status: options.userStatus,
      subscriptionStart: options.subscriptionStart ?? null,
      subscriptionEnd: options.subscriptionEnd ?? null
    }
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: publicAnonKey
    } as HeadersInit,
    body: JSON.stringify(payload)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    const message = data?.error || `Erreur lors de la mise à jour de la commande (${response.status})`;
    throw new Error(message);
  }
};

export const deleteAdminOrders = async (orderIds: string[]): Promise<boolean> => {
  if (!orderIds.length) {
    return true;
  }

  const accessToken = await misanAuth.getAccessToken();
  if (!accessToken) {
    throw new Error('Session administrateur expirée. Veuillez vous reconnecter.');
  }

  const [{ publicAnonKey }, url] = await Promise.all([
    getSupabaseEdgeCredentials(),
    buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/admin/delete-orders')
  ]);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      apikey: publicAnonKey
    } as HeadersInit,
    body: JSON.stringify({ orderIds })
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    const message = data?.error || `Erreur lors de la suppression des commandes (${response.status})`;
    throw new Error(message);
  }

  return true;
};
