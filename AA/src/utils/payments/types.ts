export type SupportedCardBrand = 'cib' | 'visa' | 'mastercard';

export type SimulatedPaymentMethod =
  | 'card_cib'
  | 'card_international'
  | 'mobile_payment'
  | 'bank_transfer'
  | 'paypal';

export interface BasePaymentRequest {
  method: SimulatedPaymentMethod;
  amount: number;
  currency: string;
  customerEmail: string;
  customerName: string;
}

export interface CardPaymentDetails {
  cardNumber: string;
  holderName: string;
  expiryMonth: string;
  expiryYear: string;
  cvc: string;
  brand: SupportedCardBrand;
}

export interface CardPaymentRequest extends BasePaymentRequest {
  method: 'card_cib' | 'card_international';
  card: CardPaymentDetails;
}

export interface PayPalPaymentRequest extends BasePaymentRequest {
  method: 'paypal';
  paypalAccount: string;
}

export interface MobilePaymentRequest extends BasePaymentRequest {
  method: 'mobile_payment';
  phoneNumber: string;
}

export interface BankTransferRequest extends BasePaymentRequest {
  method: 'bank_transfer';
  reference: string;
}

export type PaymentExecutionRequest =
  | CardPaymentRequest
  | PayPalPaymentRequest
  | MobilePaymentRequest
  | BankTransferRequest;

export type PaymentExecutionStatus = 'success' | 'pending' | 'failed';

export interface PaymentExecutionResult {
  status: PaymentExecutionStatus;
  transactionId?: string;
  message?: string;
  failureReason?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentValidationError {
  field: string;
  message: string;
}

export interface PaymentExecutionResponse {
  ok: boolean;
  result?: PaymentExecutionResult;
  errors?: PaymentValidationError[];
}
