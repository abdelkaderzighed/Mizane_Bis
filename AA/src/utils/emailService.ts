import { generateInvoiceHtml } from './invoiceUtils';
import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './supabase/edge';
import type {
  Invoice,
  UserInfo,
  Address,
  PaymentMethod,
  BankAccountInfo
} from '../types';

export interface PaymentConfirmationEmailParams {
  invoice: Invoice;
  user: UserInfo;
  billingAddress: Address;
  paymentStatus: 'paid' | 'pending';
  paymentMethod: PaymentMethod;
  paymentMessage?: string | null;
  paymentReference?: string | null;
  instructions?: string | null;
  bankAccounts?: BankAccountInfo[];
  translations: any;
}

const encodeToBase64 = (value: string): string => {
  const encodeWithBtoa = () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    let binary = '';
    bytes.forEach(byte => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  };

  try {
    if (typeof btoa === 'function') {
      return encodeWithBtoa();
    }
  } catch {
    // Ignore and try Buffer fallback
  }

  if (typeof Buffer !== 'undefined') {
    return Buffer.from(value, 'utf-8').toString('base64');
  }

  throw new Error('Base64 encoding is not supported in this environment.');
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  card_cib: 'Carte CIB',
  card_international: 'Carte internationale',
  paypal: 'PayPal',
  bank_transfer: 'Virement bancaire',
  mobile_payment: 'Paiement mobile'
};

const STATUS_LABELS: Record<'paid' | 'pending', string> = {
  paid: 'Payé',
  pending: 'En attente de paiement'
};

async function postToMakeServer(path: string, body: unknown): Promise<Response> {
  const [{ publicAnonKey }, url] = await Promise.all([
    getSupabaseEdgeCredentials(),
    buildEdgeFunctionUrl(`/functions/v1/make-server-810b4099${path}`)
  ]);

  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${publicAnonKey}`
    },
    body: JSON.stringify(body)
  });
}

export async function sendPaymentConfirmationEmail({
  invoice,
  user,
  billingAddress,
  paymentStatus,
  paymentMethod,
  paymentMessage,
  paymentReference,
  instructions,
  bankAccounts,
  translations
}: PaymentConfirmationEmailParams): Promise<void> {
  if (!user.email) {
    console.warn('[PaymentEmail] Aucun email pour l’utilisateur, envoi annulé.');
    return;
  }

  const statusLabel = STATUS_LABELS[paymentStatus] ?? paymentStatus;
  const methodLabel = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
  const formattedAmount = new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: invoice.currency
  }).format(invoice.amount);

  const event = paymentStatus === 'paid' ? 'payment_confirmed' : 'order_pending';

  const htmlInvoice = generateInvoiceHtml(invoice, user, billingAddress, translations);
  const encodedInvoice = encodeToBase64(htmlInvoice);

  const variables: Record<string, string | undefined> = {
    payment_status: statusLabel,
    payment_method: methodLabel,
    payment_reference: paymentReference ?? undefined,
    payment_message: paymentMessage ?? undefined,
    instructions: instructions ?? undefined,
    amount: formattedAmount,
    order_reference: invoice.orderNumber,
    invoice_id: invoice.id
  };

  if (Array.isArray(bankAccounts) && bankAccounts.length > 0) {
    variables.bank_accounts = bankAccounts
      .map(account => `${account.label} ${account.bankName ?? ''} ${account.accountNumber ?? ''}`.trim())
      .join('\n');
  }

  const notifyAdmin = paymentMethod === 'bank_transfer';

  const response = await postToMakeServer('/notifications/payment-event', {
    event,
    user_email: user.email,
    user_name: user.name,
    amount: formattedAmount,
    order_reference: invoice.orderNumber,
    variables,
    notify_admin: notifyAdmin,
    attachments: [
      {
        name: `${invoice.id}.html`,
        content: encodedInvoice,
        type: 'text/html'
      }
    ]
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data?.success) {
    const errorMessage = data?.error || `Erreur lors de l’envoi de l’email (${response.status})`;
    throw new Error(errorMessage);
  }
}
