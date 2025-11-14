import { PaymentExecutionRequest, PaymentExecutionResponse, PaymentExecutionResult, PaymentValidationError } from './types';

const LuhnCheck = (cardNumber: string): boolean => {
  const sanitized = cardNumber.replace(/\D/g, '');
  let sum = 0;
  let shouldDouble = false;

  for (let i = sanitized.length - 1; i >= 0; i -= 1) {
    let digit = parseInt(sanitized.charAt(i), 10);
    if (Number.isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return sum % 10 === 0;
};

const CARD_NUMBER_HINT: Record<string, string> = {
  card_cib: '6037 9900 0000 0000',
  card_international: '1234 1234 1234 1234',
};

const SPECIAL_TEST_CARDS: Record<string, { result?: 'success' | 'pending'; message?: string }> = {
  '1234123412341234': {
    result: 'success',
    message: 'Paiement de test simulé (carte fictive).'
  }
};

const normalizeCardNumber = (value: string) => value.replace(/\s+/g, '');

function validateCardRequest(request: PaymentExecutionRequest): PaymentValidationError[] {
  if (request.method !== 'card_cib' && request.method !== 'card_international') {
    return [];
  }

  const errors: PaymentValidationError[] = [];
  const { card } = request;
  const number = normalizeCardNumber(card.cardNumber);
  const isSpecialTestCard = SPECIAL_TEST_CARDS[number] !== undefined;

  if (number.length < 12 || number.length > 19) {
    errors.push({ field: 'cardNumber', message: 'Numéro de carte invalide' });
  } else if (!isSpecialTestCard && !LuhnCheck(number)) {
    errors.push({ field: 'cardNumber', message: 'Numéro de carte invalide (Luhn)' });
  }

  if (!card.holderName.trim()) {
    errors.push({ field: 'holderName', message: 'Nom du titulaire requis' });
  }

  if (!/^(0[1-9]|1[0-2])$/.test(card.expiryMonth)) {
    errors.push({ field: 'expiryMonth', message: 'Mois invalide' });
  }

  if (!/^\d{2}$/.test(card.expiryYear)) {
    errors.push({ field: 'expiryYear', message: 'Année invalide (format AA)' });
  }

  if (!/^\d{3,4}$/.test(card.cvc)) {
    errors.push({ field: 'cvc', message: 'CVC invalide' });
  }

  return errors;
}

function fakeTransactionId(prefix: string) {
  const random = Math.random().toString(36).slice(2, 10).toUpperCase();
  return `${prefix}-${Date.now()}-${random}`;
}

const simulateDelay = (ms = 600) => new Promise((resolve) => setTimeout(resolve, ms));

async function processCardPayment(request: PaymentExecutionRequest): Promise<PaymentExecutionResponse> {
  const errors = validateCardRequest(request);
  if (errors.length) {
    return { ok: false, errors };
  }

  const number = normalizeCardNumber(request.card.cardNumber);
  const specialCard = SPECIAL_TEST_CARDS[number];
  await simulateDelay();

  const result: PaymentExecutionResult = {
    status: specialCard?.result
      ?? (number.endsWith('0000') ? 'pending' : 'success'),
    transactionId: fakeTransactionId(request.method === 'card_cib' ? 'CIB' : 'INT'),
    message: specialCard?.message
      ?? (number.endsWith('0000')
        ? 'Transaction en attente de confirmation bancaire'
        : 'Paiement accepté')
  };

  return { ok: true, result };
}

async function processPayPalPayment(request: PaymentExecutionRequest): Promise<PaymentExecutionResponse> {
  await simulateDelay(400);
  const { paypalAccount } = request;
  if (!paypalAccount || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(paypalAccount)) {
    return {
      ok: false,
      errors: [{ field: 'paypalAccount', message: 'Adresse PayPal invalide' }]
    };
  }

  return {
    ok: true,
    result: {
      status: 'success',
      transactionId: fakeTransactionId('PP'),
      message: 'Paiement PayPal simulé avec succès'
    }
  };
}

async function processMobilePayment(request: PaymentExecutionRequest): Promise<PaymentExecutionResponse> {
  await simulateDelay(300);
  const { phoneNumber } = request;
  if (!phoneNumber || phoneNumber.replace(/\D/g, '').length < 8) {
    return {
      ok: false,
      errors: [{ field: 'phoneNumber', message: 'Numéro de téléphone invalide' }]
    };
  }

  return {
    ok: true,
    result: {
      status: 'pending',
      transactionId: fakeTransactionId('MOB'),
      message: 'Paiement mobile en attente de confirmation'
    }
  };
}

async function processBankTransfer(request: PaymentExecutionRequest): Promise<PaymentExecutionResponse> {
  await simulateDelay(200);
  return {
    ok: true,
    result: {
      status: 'pending',
      transactionId: fakeTransactionId('VIR'),
      message: 'Instructions de virement communiquées au client',
      metadata: {
        reference: request.reference,
      }
    }
  };
}

export async function executeMockPayment(request: PaymentExecutionRequest): Promise<PaymentExecutionResponse> {
  switch (request.method) {
    case 'card_cib':
    case 'card_international':
      return processCardPayment(request);
    case 'paypal':
      return processPayPalPayment(request);
    case 'mobile_payment':
      return processMobilePayment(request);
    case 'bank_transfer':
      return processBankTransfer(request);
    default:
      return {
        ok: false,
        errors: [{ field: 'method', message: 'Mode de paiement non supporté' }]
      };
  }
}

export const CARD_TEST_HINTS = CARD_NUMBER_HINT;
