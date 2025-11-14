import { supabase } from './supabase';
import type {
  SiteSettings,
  PricingSettings,
  LLMSettings,
  PaymentSettings,
  AlertRule,
  AlertRuleInput,
  AlertTriggerType,
  AlertTargetType,
  AlertComparator,
  AlertSeverity,
  AlertAppliesRole,
  EmailTemplate,
  EmailTemplateInput,
  EmailTemplateMetadata,
  PublicLLMSettings,
  LLMModel,
  LLMType,
  AssistantFunctionConfig,
  AssistantPromptConfig,
  PublicAssistantFunctionConfig
} from '../types';

export const DEFAULT_PRICING_SETTINGS: PricingSettings = {
  subscription: {
    monthlyPrice: 4000,
    monthlyTokens: 1000000,
    currency: 'DA'
  },
  tokens: {
    pricePerMillion: 1000,
    currency: 'DA'
  },
  discounts: [
    { threshold: 6, percentage: 7 },
    { threshold: 12, percentage: 20 },
    { threshold: 10000000, percentage: 10 },
    { threshold: 20000000, percentage: 20 }
  ],
  vat: {
    enabled: true,
    rate: 20
  }
};

const DEFAULT_ASSISTANT_FUNCTIONS: Record<string, AssistantFunctionConfig> = {
  conversation: {
    id: 'conversation',
    name: 'Assistant conversationnel',
    description: "Assistant dédié aux échanges généraux avec l'utilisateur.",
    provider: 'openai',
    modelConfigId: 'gpt4',
    apiKeyName: 'OPENAI_API_KEY',
    prompt: {
      type: 'openai_assistant',
      openAiAssistantId: ''
    },
    temperature: 0.7,
    topP: 1,
    maxTokens: 2000,
    responseFormat: 'text',
    isEnabled: true,
    tags: ['conversation', 'général'],
    invitationMessage: null,
  },
  summary: {
    id: 'summary',
    name: 'Assistant de synthèse',
    description: 'Produit des résumés synthétiques de documents ou de conversations.',
    provider: 'openai',
    modelConfigId: 'gpt4',
    apiKeyName: 'OPENAI_API_KEY',
    prompt: {
      type: 'local',
      localPromptId: 'summary_default'
    },
    temperature: 0.2,
    topP: 1,
    maxTokens: 1500,
    responseFormat: 'text',
    isEnabled: true,
    tags: ['résumé'],
    invitationMessage: null,
  }
};

export const DEFAULT_LLM_SETTINGS: LLMSettings = {
  models: {},
  defaultModels: ['gpt4'],
  maxSimultaneousModels: 3,
  apiKeys: {},
  globalSettings: {
    allowUserOverrides: true,
    defaultTimeout: 30000,
    maxRetries: 3,
    enableCaching: true,
    allowModelSelection: true,
    defaultModelId: 'gpt4'
  },
  assistantFunctions: DEFAULT_ASSISTANT_FUNCTIONS
};

const sanitizeAssistantFunctions = (raw: any): Record<string, AssistantFunctionConfig> => {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_ASSISTANT_FUNCTIONS };
  }

  const entries = Object.entries(raw);
  if (entries.length === 0) {
    return { ...DEFAULT_ASSISTANT_FUNCTIONS };
  }

  const result: Record<string, AssistantFunctionConfig> = {};

  entries.forEach(([id, value]) => {
    if (!value || typeof value !== 'object') {
      return;
    }

    const name = typeof value.name === 'string' && value.name.trim().length > 0 ? value.name.trim() : `Assistant ${id}`;
    const description = typeof value.description === 'string' ? value.description : '';
    const provider = typeof value.provider === 'string' && value.provider.trim().length > 0 ? value.provider.trim() : 'openai';
    const modelConfigId = typeof value.modelConfigId === 'string' ? (value.modelConfigId as LLMType) : 'gpt35';
    const apiKeyName = typeof value.apiKeyName === 'string' ? value.apiKeyName : undefined;

    const promptValue = value.prompt ?? {};
    const prompt: AssistantPromptConfig = {
      type: promptValue.type === 'openai_prompt' || promptValue.type === 'openai_assistant' ? promptValue.type : 'local',
      localPromptId: typeof promptValue.localPromptId === 'string' ? promptValue.localPromptId : undefined,
      openAiPromptId: typeof promptValue.openAiPromptId === 'string' ? promptValue.openAiPromptId : undefined,
      openAiAssistantId: typeof promptValue.openAiAssistantId === 'string' ? promptValue.openAiAssistantId : undefined,
      versionTag: typeof promptValue.versionTag === 'string' ? promptValue.versionTag : undefined,
    };

    const parseNumber = (input: unknown): number | null => {
      if (input === null || input === undefined || input === '') {
        return null;
      }
      const parsed = Number(input);
      return Number.isFinite(parsed) ? parsed : null;
    };

    const tags = Array.isArray(value.tags) ? value.tags.filter((tag: unknown) => typeof tag === 'string') : undefined;

    result[id] = {
      id,
      name,
      description,
      provider,
      modelConfigId,
      apiKeyName,
      prompt,
      temperature: parseNumber(value.temperature),
      topP: parseNumber(value.topP),
      maxTokens: parseNumber(value.maxTokens),
      responseFormat:
        value.responseFormat === 'json' || value.responseFormat === 'auto' || value.responseFormat === 'text'
          ? value.responseFormat
          : 'text',
      isEnabled: value.isEnabled !== false,
      tags,
      metadata: typeof value.metadata === 'object' && value.metadata !== null ? value.metadata : undefined,
      invitationMessage: typeof value.invitationMessage === 'string' ? value.invitationMessage : null,
    };
  });

  return Object.keys(result).length > 0 ? result : { ...DEFAULT_ASSISTANT_FUNCTIONS };
};

const toPublicAssistantFunctions = (
  assistantFunctions: Record<string, AssistantFunctionConfig>
): Record<string, PublicAssistantFunctionConfig> => {
  const entries = Object.entries(assistantFunctions);
  if (entries.length === 0) {
    return {};
  }

  const result: Record<string, PublicAssistantFunctionConfig> = {};

  entries.forEach(([id, config]) => {
    if (!config || config.isEnabled === false) {
      return;
    }

    const prompt: AssistantPromptConfig = {
      type: config.prompt?.type === 'openai_prompt' || config.prompt?.type === 'openai_assistant' ? config.prompt.type : 'local',
      localPromptId: config.prompt?.localPromptId,
      openAiPromptId: config.prompt?.openAiPromptId,
      openAiAssistantId: config.prompt?.openAiAssistantId,
      versionTag: config.prompt?.versionTag,
    };

    result[id] = {
      id: config.id,
      name: config.name,
      description: config.description,
      provider: config.provider,
      modelConfigId: config.modelConfigId,
      prompt,
      temperature: config.temperature ?? null,
      topP: config.topP ?? null,
      maxTokens: config.maxTokens ?? null,
      responseFormat: config.responseFormat ?? 'text',
      tags: config.tags && config.tags.length > 0 ? [...config.tags] : undefined,
      metadata: config.metadata,
      invitationMessage: config.invitationMessage ?? null,
      hasOpenAiReference: Boolean(config.prompt?.openAiAssistantId || config.prompt?.openAiPromptId),
    };
  });

  return result;
};

export const DEFAULT_PAYMENT_SETTINGS: PaymentSettings = {
  methods: {
    card_cib: {
      enabled: true,
      label: 'Carte CIB',
      description: 'Paiement par carte interbancaire algérienne.'
    },
    mobile_payment: {
      enabled: true,
      label: 'Paiement mobile (Edahabia)',
      description: 'Paiement via services mobiles et carte Edahabia.'
    },
    bank_transfer: {
      enabled: true,
      label: 'Virement bancaire',
      description: 'Paiement par virement bancaire.'
    },
    card_international: {
      enabled: true,
      label: 'Carte internationale',
      description: 'Visa, Mastercard ou autres cartes internationales (facturation en EUR au taux officiel).'
    },
    paypal: {
      enabled: true,
      label: 'PayPal',
      description: 'Paiement via PayPal (facturation en USD au taux officiel).'
    }
  },
  exchangeRates: {
    eur: 147,
    usd: 135
  }
};

const PRICING_KEYS = [
  'pricing_subscription_monthly_price',
  'pricing_subscription_monthly_tokens',
  'pricing_subscription_currency',
  'pricing_tokens_price_per_million',
  'pricing_tokens_currency',
  'pricing_discounts',
  'pricing_vat_enabled',
  'pricing_vat_rate'
];

const PRICING_DESCRIPTIONS: Record<string, string> = {
  pricing_subscription_monthly_price: 'Prix abonnement mensuel (DA HT)',
  pricing_subscription_monthly_tokens: 'Jetons inclus par mois',
  pricing_subscription_currency: 'Devise abonnement',
  pricing_tokens_price_per_million: 'Prix du million de jetons (DA HT)',
  pricing_tokens_currency: 'Devise pour l\'achat de jetons',
  pricing_discounts: 'Paliers de remise (durée ou volume)',
  pricing_vat_enabled: 'TVA activée',
  pricing_vat_rate: 'Taux de TVA en pourcentage'
};

const LLM_KEYS = ['llm_settings'];

type SettingValue = string | number | boolean | Record<string, unknown> | null;

const extractPrimitive = (value: SettingValue, key: string): string | number | boolean | null => {
  if (value === undefined || value === null) {
    return null;
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'object') {
    if ('value' in value) {
      const nested = (value as Record<string, unknown>).value;
      if (typeof nested === 'string' || typeof nested === 'number' || typeof nested === 'boolean') {
        return nested;
      }
    }

    if (key in value) {
      const nested = (value as Record<string, unknown>)[key];
      if (typeof nested === 'string' || typeof nested === 'number' || typeof nested === 'boolean') {
        return nested;
      }
    }
  }

  return null;
};

const parseNumberSetting = (value: SettingValue, key: string, fallback: number): number => {
  const raw = extractPrimitive(value, key);

  if (raw === null || raw === '') {
    return fallback;
  }

  const parsed = Number(raw);
  if (Number.isNaN(parsed)) {
    console.warn(`Valeur numérique invalide pour ${key}, utilisation de la valeur par défaut`);
    return fallback;
  }
  return parsed;
};

const parseBooleanSetting = (value: SettingValue, key: string, fallback: boolean): boolean => {
  const raw = extractPrimitive(value, key);

  if (raw === null || raw === '') {
    return fallback;
  }
  if (raw === true || raw === 'true') return true;
  if (raw === false || raw === 'false') return false;
  console.warn(`Valeur booléenne invalide pour ${key}, utilisation de la valeur par défaut`);
  return fallback;
};

function mapPricingRows(rows: Array<{ key: string; value: any }>): PricingSettings {
  if (!rows.length) {
    return DEFAULT_PRICING_SETTINGS;
  }

  const map = new Map(rows.map(row => [row.key, row.value]));

  const subscriptionMonthlyPrice = parseNumberSetting(
    map.get('pricing_subscription_monthly_price') as SettingValue,
    'pricing_subscription_monthly_price',
    DEFAULT_PRICING_SETTINGS.subscription.monthlyPrice
  );

  const subscriptionMonthlyTokens = parseNumberSetting(
    map.get('pricing_subscription_monthly_tokens') as SettingValue,
    'pricing_subscription_monthly_tokens',
    DEFAULT_PRICING_SETTINGS.subscription.monthlyTokens
  );

  const subscriptionCurrency = map.get('pricing_subscription_currency') ?? DEFAULT_PRICING_SETTINGS.subscription.currency;

  const tokensPricePerMillion = parseNumberSetting(
    map.get('pricing_tokens_price_per_million') as SettingValue,
    'pricing_tokens_price_per_million',
    DEFAULT_PRICING_SETTINGS.tokens.pricePerMillion
  );

  const tokensCurrency = map.get('pricing_tokens_currency') ?? DEFAULT_PRICING_SETTINGS.tokens.currency;

  const vatEnabled = parseBooleanSetting(
    map.get('pricing_vat_enabled') as SettingValue,
    'pricing_vat_enabled',
    DEFAULT_PRICING_SETTINGS.vat.enabled
  );

  const vatRate = parseNumberSetting(
    map.get('pricing_vat_rate') as SettingValue,
    'pricing_vat_rate',
    DEFAULT_PRICING_SETTINGS.vat.rate
  );

  let discounts: PricingSettings['discounts'] = DEFAULT_PRICING_SETTINGS.discounts;
  const rawDiscounts = map.get('pricing_discounts') as SettingValue;
  if (rawDiscounts) {
    try {
      const baseValue = extractPrimitive(rawDiscounts, 'pricing_discounts');
      const parsed = typeof baseValue === 'string'
        ? JSON.parse(baseValue)
        : typeof rawDiscounts === 'string'
          ? JSON.parse(rawDiscounts)
          : rawDiscounts;
      if (Array.isArray(parsed)) {
        const parsedDiscounts = parsed
          .filter(item => typeof item === 'object' && item !== null)
          .map(item => {
            const threshold = Number(item.threshold);
            const percentage = Number(item.percentage);
            if (Number.isNaN(threshold) || Number.isNaN(percentage)) {
              throw new Error('Invalid discount entry');
            }
            return { threshold, percentage };
          });
        if (parsedDiscounts.length > 0) {
          discounts = parsedDiscounts;
        }
      }
    } catch (error) {
      console.warn('Impossible de parser les remises tarifaires, utilisation des valeurs par défaut', error);
    }
  }

  return {
    subscription: {
      monthlyPrice: subscriptionMonthlyPrice,
      monthlyTokens: subscriptionMonthlyTokens,
      currency: subscriptionCurrency
    },
    tokens: {
      pricePerMillion: tokensPricePerMillion,
      currency: tokensCurrency
    },
    discounts,
    vat: {
      enabled: vatEnabled,
      rate: vatRate
    }
  };
}


function mapPaymentSettings(rows: Array<{ key: string; value: any }>): PaymentSettings {
  const map = new Map(rows.map(row => [row.key, row.value]));
  const raw = map.get('payment_method_settings');
  if (!raw) {
    return DEFAULT_PAYMENT_SETTINGS;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return DEFAULT_PAYMENT_SETTINGS;
    }
    const baseMethods = { ...DEFAULT_PAYMENT_SETTINGS.methods };
    const incomingMethods = parsed.methods ?? {};

    const defaultRates = DEFAULT_PAYMENT_SETTINGS.exchangeRates ?? { eur: 147, usd: 135 };
    const incomingRates = parsed.exchangeRates;
    const normalizedRates = typeof incomingRates === 'object' && incomingRates !== null
      ? {
          eur: Number(incomingRates.eur) && Number(incomingRates.eur) > 0
            ? Number(incomingRates.eur)
            : defaultRates.eur,
          usd: Number(incomingRates.usd) && Number(incomingRates.usd) > 0
            ? Number(incomingRates.usd)
            : defaultRates.usd
        }
      : { ...defaultRates };

    return {
      methods: {
        ...baseMethods,
        ...incomingMethods
      },
      exchangeRates: normalizedRates
    };
  } catch (error) {
    console.warn('Impossible de parser les paramètres de paiement, utilisation des valeurs par défaut', error);
    return DEFAULT_PAYMENT_SETTINGS;
  }
}

function mapLLMRows(rows: Array<{ key: string; value: any }>): LLMSettings {
  const map = new Map(rows.map(row => [row.key, row.value]));
  const raw = map.get('llm_settings');

  if (!raw) {
    return DEFAULT_LLM_SETTINGS;
  }

  try {
    const parsed = JSON.parse(raw);
    const merged = {
      ...DEFAULT_LLM_SETTINGS,
      ...parsed,
      models: parsed?.models || DEFAULT_LLM_SETTINGS.models,
      defaultModels: parsed?.defaultModels || DEFAULT_LLM_SETTINGS.defaultModels,
      apiKeys: parsed?.apiKeys || DEFAULT_LLM_SETTINGS.apiKeys,
      globalSettings: {
        ...DEFAULT_LLM_SETTINGS.globalSettings,
        ...(parsed?.globalSettings || {}),
        allowModelSelection: parsed?.globalSettings?.allowModelSelection ?? DEFAULT_LLM_SETTINGS.globalSettings.allowModelSelection,
        defaultModelId: parsed?.globalSettings?.defaultModelId ?? DEFAULT_LLM_SETTINGS.globalSettings.defaultModelId
      }
    };

    if (merged.globalSettings.defaultModelId) {
      const defaultId = merged.globalSettings.defaultModelId;
      if (!merged.defaultModels.includes(defaultId)) {
        merged.defaultModels = [defaultId];
      }
    } else if (merged.defaultModels.length > 0) {
      merged.globalSettings.defaultModelId = merged.defaultModels[0];
    }

    return merged;
  } catch (error) {
    console.warn('Impossible de parser les paramètres LLM, utilisation des valeurs par défaut', error);
    return DEFAULT_LLM_SETTINGS;
  }
}

interface AdminSettingsResponse {
  settings?: SiteSettings;
  pricing?: PricingSettings;
  payment?: PaymentSettings;
  llm?: LLMSettings;
  alertRules?: AlertRule[];
  emailTemplates?: EmailTemplate[];
}

let pendingSettingsPromise: Promise<AdminSettingsResponse | null> | null = null;
let ensureAlertRulesPromise: Promise<void> | null = null;
let ensureEmailTemplatesPromise: Promise<void> | null = null;

async function ensureAlertRulesTable(): Promise<void> {
  if (!ensureAlertRulesPromise) {
    // La table alert_rules existe déjà en local, pas besoin de la créer
    ensureAlertRulesPromise = Promise.resolve();
  }
  return ensureAlertRulesPromise;
}


async function ensureEmailTemplatesTable(): Promise<void> {
  if (!ensureEmailTemplatesPromise) {
    ensureEmailTemplatesPromise = supabase
      .from('email_templates')
      .select('id')
      .limit(1)
      .then(({ error }) => {
        if (error) {
          console.warn("Impossible de vérifier l'accès à email_templates", error);
        }
      })
      .catch((error) => {
        console.warn("Impossible de vérifier l'accès à email_templates", error);
      })
      .finally(() => {
        ensureEmailTemplatesPromise = null;
      });
  }

  await ensureEmailTemplatesPromise;
}

async function fetchAdminSettings(): Promise<AdminSettingsResponse | null> {
  if (!pendingSettingsPromise) {
    pendingSettingsPromise = supabase.functions
      .invoke('admin-get-settings')
      .then(({ data, error }) => {
        if (error) {
          console.error('Erreur chargement paramètres administrateur:', error);
          return null;
        }
        return data as AdminSettingsResponse;
      })
      .finally(() => {
        pendingSettingsPromise = null;
      });
  }

  return pendingSettingsPromise;
}

export async function loadSiteSettings(): Promise<SiteSettings | null> {
  const response = await fetchAdminSettings();
  return response?.settings ?? null;
}

export async function saveSiteSettings(settings: SiteSettings): Promise<boolean> {
  const { error } = await supabase.functions.invoke('admin-update-settings', {
    body: { settings }
  });

  if (error) {
    console.error('Erreur sauvegarde paramètres site:', error);
    throw new Error(error.message || 'Erreur lors de la sauvegarde des paramètres');
  }

  return true;
}

export async function loadPricingSettings(): Promise<PricingSettings | null> {
  try {
    const { data, error } = await supabase.functions.invoke('public-get-pricing', { body: {} });
    if (!error && data && (data as any).success && (data as any).pricing) {
      return (data as any).pricing as PricingSettings;
    }
    if (error) {
      console.warn('Invocation public-get-pricing échouée, tentative directe', error);
    }
  } catch (fnError) {
    console.warn('Erreur lors de l\'invocation public-get-pricing, tentative directe', fnError);
  }

  try {
    const { data, error } = await supabase
      .from('system_settings')
      .select('key, value')
      .in('key', PRICING_KEYS);

    if (!error && data) {
      return mapPricingRows(data);
    }

    if (error) {
      console.warn('Impossible de charger les paramètres tarifaires via PostgREST, tentative via Edge Function', error);
    }
  } catch (directError) {
    console.warn('Erreur inattendue lors du chargement direct des tarifs', directError);
  }

  const response = await fetchAdminSettings();
  return response?.pricing ?? null;
}

export async function savePricingSettings(pricing: PricingSettings): Promise<boolean> {
  const records = [
    { key: 'pricing_subscription_monthly_price', value: String(pricing.subscription.monthlyPrice) },
    { key: 'pricing_subscription_monthly_tokens', value: String(pricing.subscription.monthlyTokens) },
    { key: 'pricing_subscription_currency', value: pricing.subscription.currency },
    { key: 'pricing_tokens_price_per_million', value: String(pricing.tokens.pricePerMillion) },
    { key: 'pricing_tokens_currency', value: pricing.tokens.currency },
    { key: 'pricing_discounts', value: JSON.stringify(pricing.discounts) },
    { key: 'pricing_vat_enabled', value: pricing.vat.enabled ? 'true' : 'false' },
    { key: 'pricing_vat_rate', value: String(pricing.vat.rate) }
  ].map(record => ({
    ...record,
    description: PRICING_DESCRIPTIONS[record.key] ?? null
  }));

  const { error: upsertError } = await supabase
    .from('system_settings')
    .upsert(records, { onConflict: 'key' });

  if (!upsertError) {
    return true;
  }

  console.warn('Upsert direct des paramètres tarifaires impossible, tentative via Edge Function', upsertError);

  const { error } = await supabase.functions.invoke('admin-update-settings', {
    body: { pricing }
  });

  if (error) {
    console.error('Erreur sauvegarde paramètres tarifaires (fallback Edge):', error);
    throw new Error(error.message || 'Erreur lors de la sauvegarde des paramètres tarifaires');
  }

  return true;
}

export async function fetchPublicPricingSettings(): Promise<PricingSettings> {
  try {
    const { data, error } = await supabase.functions.invoke('public-get-pricing', { body: {} });
    if (!error && data && (data as any).success && (data as any).pricing) {
      return (data as any).pricing as PricingSettings;
    }
    if (error) {
      console.warn('Invocation public-get-pricing échouée, tentative directe', error);
    }
  } catch (fnError) {
    console.warn('Erreur lors de l\'invocation public-get-pricing, tentative directe', fnError);
  }

  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .in('key', PRICING_KEYS);

  if (error) {
    console.warn('Impossible de charger les paramètres tarifaires, utilisation des valeurs par défaut', error);
    return DEFAULT_PRICING_SETTINGS;
  }

  if (!data || data.length === 0) {
    return DEFAULT_PRICING_SETTINGS;
  }

  return mapPricingRows(data);
}

export async function fetchPublicLLMSettings(): Promise<PublicLLMSettings | null> {
  try {
    const { data, error } = await supabase.functions.invoke('public-get-llm-settings', { body: {} });

    if (error) {
      console.warn('Invocation public-get-llm-settings échouée', error);
      return null;
    }

    const payload = data as { success?: boolean; settings?: any } | null;

    if (!payload?.success || !payload.settings) {
      console.warn('Réponse inattendue public-get-llm-settings', payload);
      return null;
    }

    const rawSettings = payload.settings as {
      models?: Record<string, Partial<LLMModel> & { id?: string }>;
      defaultModels?: string[];
      maxSimultaneousModels?: number;
      globalSettings?: { allowModelSelection?: boolean; defaultModelId?: string | null };
      assistantFunctions?: Record<string, unknown>;
    };

    const typedModels: Record<LLMType, LLMModel> = {};

    Object.entries(rawSettings.models ?? {}).forEach(([id, model]) => {
      if (!model) {
        return;
      }

      typedModels[id as LLMType] = {
        id: id as LLMType,
        name: model.name ?? id,
        provider: model.provider ?? 'Modèle IA',
        description: model.description ?? '',
        color: model.color ?? 'text-primary',
        isPremium: model.isPremium
      };
    });

    const defaultModels = (rawSettings.defaultModels ?? []).filter((id): id is LLMType => !!typedModels[id as LLMType]);

    const defaultModelId = (() => {
      const candidate = rawSettings.globalSettings?.defaultModelId;
      if (candidate && typedModels[candidate as LLMType]) {
        return candidate as LLMType;
      }
      if (defaultModels.length > 0) {
        return defaultModels[0];
      }
      const first = Object.keys(typedModels)[0];
      return first ? (first as LLMType) : null;
    })();

    const assistantFunctions = sanitizeAssistantFunctions(rawSettings.assistantFunctions);
    const publicAssistantFunctions = toPublicAssistantFunctions(assistantFunctions);

    return {
      models: typedModels,
      defaultModels,
      maxSimultaneousModels:
        typeof rawSettings.maxSimultaneousModels === 'number' && rawSettings.maxSimultaneousModels > 0
          ? rawSettings.maxSimultaneousModels
          : 1,
      allowModelSelection: rawSettings.globalSettings?.allowModelSelection ?? true,
      defaultModelId,
      assistantFunctions: publicAssistantFunctions
    };
  } catch (error) {
    console.error("Erreur lors du chargement public des paramètres LLM", error);
    return null;
  }
}

export async function loadLLMSettings(): Promise<LLMSettings | null> {
  const response = await fetchAdminSettings();

  if (!response?.llm) {
    return { ...DEFAULT_LLM_SETTINGS };
  }

  const raw = response.llm as Partial<LLMSettings> & { assistantFunctions?: unknown };

  const models = raw.models && typeof raw.models === 'object' ? raw.models : {};
  const apiKeys = raw.apiKeys && typeof raw.apiKeys === 'object' ? raw.apiKeys : {};
  const globalSettings = {
    ...DEFAULT_LLM_SETTINGS.globalSettings,
    ...(raw.globalSettings ?? {})
  };

  const modelIds = Object.keys(models) as LLMType[];

  const defaultModels = Array.isArray(raw.defaultModels)
    ? raw.defaultModels.filter((id): id is LLMType => modelIds.includes(id as LLMType))
    : [];

  if (globalSettings.defaultModelId && !modelIds.includes(globalSettings.defaultModelId)) {
    globalSettings.defaultModelId = defaultModels[0] ?? (modelIds[0] ?? null);
  }

  if (!globalSettings.defaultModelId && modelIds.length > 0) {
    globalSettings.defaultModelId = modelIds[0] ?? null;
  }

  const ensuredDefaultModels = defaultModels.length
    ? Array.from(new Set([...defaultModels]))
    : globalSettings.defaultModelId
      ? [globalSettings.defaultModelId]
      : [];

  const assistantFunctions = sanitizeAssistantFunctions(raw.assistantFunctions);

  return {
    models,
    defaultModels: ensuredDefaultModels,
    maxSimultaneousModels:
      typeof raw.maxSimultaneousModels === 'number' && raw.maxSimultaneousModels > 0
        ? raw.maxSimultaneousModels
        : DEFAULT_LLM_SETTINGS.maxSimultaneousModels,
    apiKeys,
    globalSettings,
    assistantFunctions,
  };
}

export async function saveLLMSettings(settings: LLMSettings): Promise<boolean> {
  const sanitized = JSON.parse(JSON.stringify(settings));
  const { error } = await supabase.functions.invoke('admin-update-settings', {
    body: { llm: sanitized }
  });

  if (error) {
    console.error('Erreur sauvegarde paramètres LLM:', error);
    throw new Error(error.message || 'Erreur lors de la sauvegarde des paramètres LLM');
  }

  return true;
}

export async function loadPaymentSettings(): Promise<PaymentSettings | null> {
  const response = await fetchAdminSettings();
  return response?.payment ?? DEFAULT_PAYMENT_SETTINGS;
}

export async function savePaymentSettings(payment: PaymentSettings): Promise<boolean> {
  const sanitized = JSON.parse(JSON.stringify(payment));

  const { error } = await supabase.functions.invoke('admin-update-settings', {
    body: { payment: sanitized }
  });

  if (error) {
    throw new Error(error.message || 'Erreur lors de la sauvegarde des paramètres de paiement');
  }

  return true;
}

export async function fetchAlertRules(): Promise<AlertRule[]> {
  await ensureAlertRulesTable();

  const { data, error } = await supabase
    .from('alert_rules')
    .select('*')
    .order('target', { ascending: true })
    .order('threshold', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    console.error('Erreur chargement alert rules:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(mapAlertRuleRow);
}

export async function createAlertRule(rule: AlertRuleInput): Promise<AlertRule> {
  await ensureAlertRulesTable();

  const payload = toDbAlertRule(rule);

  const { data, error } = await supabase
    .from('alert_rules')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Aucune donnée retournée lors de la création de la règle');
  }

  return mapAlertRuleRow(data);
}

export async function updateAlertRule(id: string, rule: AlertRuleInput): Promise<AlertRule> {
  await ensureAlertRulesTable();

  const payload = toDbAlertRule(rule);

  const { data, error } = await supabase
    .from('alert_rules')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Règle introuvable lors de la mise à jour');
  }

  return mapAlertRuleRow(data);
}

export async function deleteAlertRule(id: string): Promise<void> {
  await ensureAlertRulesTable();

  const { error } = await supabase
    .from('alert_rules')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

function mapAlertRuleRow(row: any): AlertRule {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type as AlertTriggerType,
    target: row.target as AlertTargetType,
    comparator: row.comparator as AlertComparator,
    threshold: Number(row.threshold),
    severity: row.severity as AlertSeverity,
    messageTemplate: row.message_template,
    appliesToRole: row.applies_to_role as AlertAppliesRole,
    isBlocking: Boolean(row.is_blocking),
    isActive: Boolean(row.is_active),
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDbAlertRule(rule: AlertRuleInput) {
  return {
    name: rule.name,
    description: rule.description ?? null,
    trigger_type: rule.triggerType,
    target: rule.target,
    comparator: rule.comparator,
    threshold: rule.threshold,
    severity: rule.severity,
    message_template: rule.messageTemplate,
    applies_to_role: rule.appliesToRole,
    is_blocking: rule.isBlocking ?? false,
    is_active: rule.isActive ?? true,
    metadata: rule.metadata ?? {}
  };
}

function mapEmailTemplateRow(row: any): EmailTemplate {
  const metadata: EmailTemplateMetadata = (row?.metadata && typeof row.metadata === 'object')
    ? row.metadata as EmailTemplateMetadata
    : {};

  return {
    id: row.id,
    name: row.name,
    subject: row.subject,
    recipients: row.recipients,
    cc: Array.isArray(row.cc) ? row.cc : [],
    bcc: Array.isArray(row.bcc) ? row.bcc : [],
    body: row.body,
    signature: row.signature,
    isActive: Boolean(row.is_active),
    metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function toDbEmailTemplate(template: EmailTemplateInput) {
  return {
    name: template.name,
    subject: template.subject,
    recipients: template.recipients,
    cc: template.cc ?? [],
    bcc: template.bcc ?? [],
    body: template.body,
    signature: template.signature,
    is_active: template.isActive,
    metadata: template.metadata ?? {}
  };
}

export async function fetchEmailTemplates(): Promise<EmailTemplate[]> {
  await ensureEmailTemplatesTable();

  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .order('name', { ascending: true });

  if (error) {
    console.error('Erreur chargement templates emails:', error);
    throw error;
  }

  if (!data) {
    return [];
  }

  return data.map(mapEmailTemplateRow);
}

export async function createEmailTemplate(template: EmailTemplateInput): Promise<EmailTemplate> {
  await ensureEmailTemplatesTable();

  const payload = toDbEmailTemplate(template);

  const { data, error } = await supabase
    .from('email_templates')
    .insert(payload)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Aucune donnée retournée lors de la création du template email');
  }

  return mapEmailTemplateRow(data);
}

export async function updateEmailTemplate(id: string, template: EmailTemplateInput): Promise<EmailTemplate> {
  await ensureEmailTemplatesTable();

  const payload = toDbEmailTemplate(template);

  const { data, error } = await supabase
    .from('email_templates')
    .update(payload)
    .eq('id', id)
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error('Template email introuvable lors de la mise à jour');
  }

  return mapEmailTemplateRow(data);
}

export async function deleteEmailTemplate(id: string): Promise<void> {
  await ensureEmailTemplatesTable();

  const { error } = await supabase
    .from('email_templates')
    .delete()
    .eq('id', id);

  if (error) {
    throw error;
  }
}

export async function fetchPublicPaymentSettings(): Promise<PaymentSettings> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('key, value')
    .eq('key', 'payment_method_settings');

  if (error) {
    throw error;
  }

  if (!data || data.length === 0) {
    return DEFAULT_PAYMENT_SETTINGS;
  }

  return mapPaymentSettings(data);
}
