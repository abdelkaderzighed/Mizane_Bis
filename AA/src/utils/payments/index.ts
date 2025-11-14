import { executeMockPayment } from './mockGateway';
import {
  PaymentExecutionRequest,
  PaymentExecutionResponse,
  SimulatedPaymentMethod
} from './types';

export type {
  PaymentExecutionRequest,
  PaymentExecutionResult,
  PaymentExecutionStatus,
  PaymentExecutionResponse,
  PaymentValidationError,
} from './types';

export interface BuildPaymentRequestParams {
  method: SimulatedPaymentMethod;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
  data: Record<string, unknown>;
}

export function buildPaymentRequest({
  method,
  amount,
  currency,
  customerEmail,
  customerName,
  data,
}: BuildPaymentRequestParams): PaymentExecutionRequest {
  switch (method) {
    case 'card_cib':
    case 'card_international':
      return {
        method,
        amount,
        currency,
        customerEmail,
        customerName,
        card: {
          cardNumber: String(data.cardNumber ?? ''),
          holderName: String(data.holderName ?? ''),
          expiryMonth: String(data.expiryMonth ?? ''),
          expiryYear: String(data.expiryYear ?? ''),
          cvc: String(data.cvc ?? ''),
          brand: method === 'card_cib' ? 'cib' : 'visa'
        }
      };
    case 'paypal':
      return {
        method,
        amount,
        currency,
        customerEmail,
        customerName,
        paypalAccount: String(data.paypalAccount ?? customerEmail)
      };
    case 'mobile_payment':
      return {
        method,
        amount,
        currency,
        customerEmail,
        customerName,
        phoneNumber: String(data.phoneNumber ?? '')
      };
    case 'bank_transfer':
      return {
        method,
        amount,
        currency,
        customerEmail,
        customerName,
        reference: String(data.reference ?? '')
      };
    default:
      throw new Error(`Unsupported payment method: ${method}`);
  }
}

export async function executePayment(request: PaymentExecutionRequest): Promise<PaymentExecutionResponse> {
  return executeMockPayment(request);
}
