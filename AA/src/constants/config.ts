// Configuration des produits (future configuration admin)
export const SUBSCRIPTION_CONFIG = {
  pricePerMonthHT: 4000, // DA HT
  tokensPerMonth: 1000000, // 1 million de jetons par mois
  discounts: {
    6: 0.07, // 7% pour 6 mois
    12: 0.20 // 20% pour 12 mois
  }
};

export const TOKENS_CONFIG = {
  pricePerMillionHT: 1000, // DA HT pour 1 million de jetons
  discounts: {
    10: 0.10, // 10% pour 10 millions
    20: 0.20 // 20% pour 20 millions
  }
};

export const VAT_RATE = 0.20; // 20% TVA

export const languages = {
  fr: { name: 'Français', dir: 'ltr' },
  en: { name: 'English', dir: 'ltr' },
  ar: { name: 'العربية', dir: 'rtl' }
} as const;
