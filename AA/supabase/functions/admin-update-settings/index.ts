import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function ensureEnv() {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Missing Supabase environment variables for admin-update-settings function.");
  }
}

ensureEnv();

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader }
    }
  });

  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

interface UpdatePayload {
  settings?: {
    siteName: string;
    siteDescription: string;
    supportEmail: string;
    brevoApiKey: string;
    maintenanceMode: boolean;
    registrationEnabled: boolean;
    freeTrialDays: number;
    freeTrialTokens: number;
  };
  pricing?: {
    subscription: {
      monthlyPrice: number;
      monthlyTokens: number;
      currency: string;
    };
    tokens: {
      pricePerMillion: number;
      currency: string;
    };
    discounts: Array<{ threshold: number; percentage: number }>;
    vat: {
      enabled: boolean;
      rate: number;
    };
  };
  payment?: {
    methods: Record<string, {
      enabled: unknown;
      label: unknown;
      description?: unknown;
      instructions?: unknown;
      bankAccounts?: unknown;
    }>;
  };
  llm?: {
    models: Record<string, unknown>;
    defaultModels: string[];
    maxSimultaneousModels: number;
    apiKeys: Record<string, {
      value: string;
      isConfigured: boolean;
      lastTested: string | null;
      status: 'valid' | 'invalid' | 'untested';
    }>;
    globalSettings: {
      allowUserOverrides: boolean;
      defaultTimeout: number;
      maxRetries: number;
      enableCaching: boolean;
      allowModelSelection: boolean;
      defaultModelId?: string | null;
    };
  };
}

type NormalizedBankAccount = {
  id?: string;
  label: string;
  bankName?: string;
  accountNumber?: string;
  iban?: string;
  swift?: string;
  notes?: string;
};

type NormalizedPaymentSettings = {
  methods: Record<string, {
    enabled: boolean;
    label: string;
    description?: string;
    instructions?: string;
    bankAccounts?: NormalizedBankAccount[];
  }>;
  exchangeRates?: {
    eur: number;
    usd: number;
  };
};

function sanitizePaymentPayload(payment?: UpdatePayload['payment']): NormalizedPaymentSettings | null {
  if (!payment || typeof payment !== 'object' || !payment.methods || typeof payment.methods !== 'object') {
    return null;
  }

  const normalizedMethods: NormalizedPaymentSettings['methods'] = {};

  for (const [methodKey, rawConfig] of Object.entries(payment.methods)) {
    if (!rawConfig || typeof rawConfig !== 'object') {
      continue;
    }

    const enabled = Boolean((rawConfig as { enabled?: unknown }).enabled);
    const rawLabel = (rawConfig as { label?: unknown }).label;
    const label = typeof rawLabel === 'string' ? rawLabel.trim() : '';
    if (!label) {
      continue;
    }

    const descriptionValue = (rawConfig as { description?: unknown }).description;
    const description = typeof descriptionValue === 'string' ? descriptionValue : undefined;

    const instructionsValue = (rawConfig as { instructions?: unknown }).instructions;
    const instructions = typeof instructionsValue === 'string' ? instructionsValue : undefined;

    let bankAccounts: NormalizedBankAccount[] | undefined;
    const rawBankAccounts = (rawConfig as { bankAccounts?: unknown }).bankAccounts;
    if (Array.isArray(rawBankAccounts)) {
      bankAccounts = rawBankAccounts
        .filter(account => account && typeof account === 'object')
        .map(account => {
          const typedAccount = account as Record<string, unknown>;
          const labelValue = typeof typedAccount.label === 'string' ? typedAccount.label.trim() : '';
          if (!labelValue) {
            return null;
          }

          const normalized: NormalizedBankAccount = {
            label: labelValue
          };

          if (typeof typedAccount.id === 'string' && typedAccount.id.trim()) {
            normalized.id = typedAccount.id.trim();
          }
          if (typeof typedAccount.bankName === 'string' && typedAccount.bankName.trim()) {
            normalized.bankName = typedAccount.bankName.trim();
          }
          if (typeof typedAccount.accountNumber === 'string' && typedAccount.accountNumber.trim()) {
            normalized.accountNumber = typedAccount.accountNumber.trim();
          }
          if (typeof typedAccount.iban === 'string' && typedAccount.iban.trim()) {
            normalized.iban = typedAccount.iban.trim();
          }
          if (typeof typedAccount.swift === 'string' && typedAccount.swift.trim()) {
            normalized.swift = typedAccount.swift.trim();
          }
          if (typeof typedAccount.notes === 'string' && typedAccount.notes.trim()) {
            normalized.notes = typedAccount.notes.trim();
          }

          return normalized;
        })
        .filter((account): account is NormalizedBankAccount => account !== null);

      if (bankAccounts.length === 0) {
        bankAccounts = undefined;
      }
    }

    normalizedMethods[methodKey] = {
      enabled,
      label,
      description,
      instructions,
      bankAccounts
    };
  }

  let exchangeRates: NormalizedPaymentSettings['exchangeRates'];
  const rawRates = (payment as { exchangeRates?: unknown }).exchangeRates;
  if (rawRates && typeof rawRates === 'object') {
    const typed = rawRates as Record<string, unknown>;
    const eur = Number(typed.eur);
    const usd = Number(typed.usd);
    if (Number.isFinite(eur) && eur > 0 && Number.isFinite(usd) && usd > 0) {
      exchangeRates = { eur, usd };
    } else if (Number.isFinite(eur) && eur > 0) {
      exchangeRates = { eur, usd: 135 };
    } else if (Number.isFinite(usd) && usd > 0) {
      exchangeRates = { eur: 147, usd };
    }
  }

  return exchangeRates
    ? { methods: normalizedMethods, exchangeRates }
    : { methods: normalizedMethods };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Méthode non autorisée" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  let payload: UpdatePayload;
  try {
    payload = await request.json();
  } catch (error) {
    return new Response(JSON.stringify({ success: false, error: "Corps de requête invalide" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ success: false, error: "Non authentifié" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profileError || !profile || profile.role !== 'admin') {
    return new Response(JSON.stringify({ success: false, error: "Accès refusé" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const records: Array<{ key: string; value: string }> = [];

  if (payload.settings) {
    const settings = payload.settings;
    records.push(
      { key: 'site_name', value: settings.siteName },
      { key: 'site_description', value: settings.siteDescription },
      { key: 'support_email', value: settings.supportEmail },
      { key: 'brevo_api_key', value: settings.brevoApiKey },
      { key: 'maintenance_mode', value: settings.maintenanceMode ? 'true' : 'false' },
      { key: 'registration_enabled', value: settings.registrationEnabled ? 'true' : 'false' },
      { key: 'trial_duration_days', value: String(settings.freeTrialDays) },
      { key: 'trial_tokens', value: String(settings.freeTrialTokens) }
    );
  }

  if (payload.pricing) {
    const pricing = payload.pricing;
    records.push(
      { key: 'pricing_subscription_monthly_price', value: String(pricing.subscription.monthlyPrice) },
      { key: 'pricing_subscription_monthly_tokens', value: String(pricing.subscription.monthlyTokens) },
      { key: 'pricing_subscription_currency', value: pricing.subscription.currency },
      { key: 'pricing_tokens_price_per_million', value: String(pricing.tokens.pricePerMillion) },
      { key: 'pricing_tokens_currency', value: pricing.tokens.currency },
      { key: 'pricing_discounts', value: JSON.stringify(pricing.discounts) },
      { key: 'pricing_vat_enabled', value: pricing.vat.enabled ? 'true' : 'false' },
      { key: 'pricing_vat_rate', value: String(pricing.vat.rate) }
    );
  }

  if (payload.payment) {
    const normalizedPayment = sanitizePaymentPayload(payload.payment);
    if (normalizedPayment) {
      records.push({
        key: 'payment_method_settings',
        value: JSON.stringify(normalizedPayment)
      });
    }
  }

  if (payload.llm) {
    records.push({
      key: 'llm_settings',
      value: JSON.stringify(payload.llm)
    });
  }

  if (records.length === 0) {
    return new Response(JSON.stringify({ success: false, error: "Aucun paramètre fourni" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert(records, { onConflict: 'key' });

  if (error) {
    console.error('Erreur mise à jour paramètres site:', error.message);
    return new Response(JSON.stringify({ success: false, error: "Erreur lors de la sauvegarde des paramètres" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
