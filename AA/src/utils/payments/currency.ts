import type { PaymentMethod } from '../../types';

type SupportedForeignCurrency = 'EUR' | 'USD';

const DEFAULT_OFFICIAL_RATES: Record<SupportedForeignCurrency, number> = {
  EUR: 147.0,
  USD: 135.0,
};

const INTERNATIONAL_METHOD_CURRENCY: Partial<Record<PaymentMethod, SupportedForeignCurrency>> = {
  card_international: 'EUR',
  paypal: 'USD',
};

const ensureRate = (
  currency: SupportedForeignCurrency,
  override?: Partial<Record<SupportedForeignCurrency, number>>
): number => {
  const overrideValue = override?.[currency];
  if (typeof overrideValue === 'number' && Number.isFinite(overrideValue) && overrideValue > 0) {
    return overrideValue;
  }

  const raw = currency === 'EUR'
    ? import.meta.env.VITE_OFFICIAL_EUR_RATE
    : import.meta.env.VITE_OFFICIAL_USD_RATE;
  const parsed = raw ? Number(raw) : Number.NaN;
  if (Number.isFinite(parsed) && parsed > 0) {
    return parsed;
  }
  return DEFAULT_OFFICIAL_RATES[currency];
};

const roundCurrency = (value: number): number => Math.round(value * 100) / 100;

export interface PaymentConversionResult {
  amount: number;
  currency: string;
  converted: boolean;
  exchangeRate?: number;
  baseCurrency: string;
  baseAmount: number;
}

export const convertAmountForPayment = (
  amountDzd: number,
  method: PaymentMethod,
  exchangeRates?: { eur?: number | null; usd?: number | null }
): PaymentConversionResult => {
  const targetCurrency = INTERNATIONAL_METHOD_CURRENCY[method];
  if (!targetCurrency) {
    return {
      amount: amountDzd,
      currency: 'DZD',
      converted: false,
      baseCurrency: 'DZD',
      baseAmount: amountDzd,
    };
  }

  const rate = ensureRate(targetCurrency, exchangeRates ?? undefined);
  const convertedAmount = roundCurrency(amountDzd / rate);

  return {
    amount: convertedAmount,
    currency: targetCurrency,
    converted: true,
    exchangeRate: rate,
    baseCurrency: 'DZD',
    baseAmount: amountDzd,
  };
};
