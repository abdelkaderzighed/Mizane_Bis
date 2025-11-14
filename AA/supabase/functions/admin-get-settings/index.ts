import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function ensureEnv() {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("Missing Supabase environment variables for admin-get-settings function.");
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

function mapSettings(rows: Array<{ key: string; value: string }>) {
  const defaults = {
    siteName: 'Misan',
    siteDescription: 'Assistant IA Juridique',
    supportEmail: 'support@misan.dz',
    brevoApiKey: '',
    maintenanceMode: false,
    registrationEnabled: true,
    freeTrialDays: 7,
    freeTrialTokens: 100000
  };

  const map = new Map(rows.map(row => [row.key, row.value]));

  const parseBool = (value: string | undefined, fallback: boolean) => {
    if (value === undefined) return fallback;
    return value === 'true';
  };

  const parseNumber = (value: string | undefined, fallback: number) => {
    if (value === undefined) return fallback;
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  return {
    siteName: map.get('site_name') ?? defaults.siteName,
    siteDescription: map.get('site_description') ?? defaults.siteDescription,
    supportEmail: map.get('support_email') ?? defaults.supportEmail,
    brevoApiKey: map.get('brevo_api_key') ?? defaults.brevoApiKey,
    maintenanceMode: parseBool(map.get('maintenance_mode'), defaults.maintenanceMode),
    registrationEnabled: parseBool(map.get('registration_enabled'), defaults.registrationEnabled),
    freeTrialDays: parseNumber(map.get('trial_duration_days'), defaults.freeTrialDays),
    freeTrialTokens: parseNumber(map.get('trial_tokens'), defaults.freeTrialTokens)
  };
}

function mapPricing(rows: Array<{ key: string; value: string }>) {
  const map = new Map(rows.map(row => [row.key, row.value]));

  const parseNumber = (value: string | undefined, fallback: number) => {
    if (value === undefined) return fallback;
    const parsed = parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  };

  const parseBool = (value: string | undefined, fallback: boolean) => {
    if (value === undefined) return fallback;
    return value === 'true';
  };

  let discounts: Array<{ threshold: number; percentage: number }> = [
    { threshold: 6, percentage: 7 },
    { threshold: 12, percentage: 20 },
    { threshold: 10000000, percentage: 10 },
    { threshold: 20000000, percentage: 20 }
  ];

  const discountsRaw = map.get('pricing_discounts');
  if (discountsRaw) {
    try {
      const parsed = JSON.parse(discountsRaw);
      if (Array.isArray(parsed)) {
        discounts = parsed
          .filter(item => typeof item === 'object' && item !== null)
          .map(item => ({
            threshold: Number(item.threshold) || 0,
            percentage: Number(item.percentage) || 0
          }));
      }
    } catch (_) {
      // ignore malformed JSON
    }
  }

  return {
    subscription: {
      monthlyPrice: parseNumber(map.get('pricing_subscription_monthly_price'), 4000),
      monthlyTokens: parseNumber(map.get('pricing_subscription_monthly_tokens'), 1000000),
      currency: map.get('pricing_subscription_currency') ?? 'DA'
    },
    tokens: {
      pricePerMillion: parseNumber(map.get('pricing_tokens_price_per_million'), 1000),
      currency: map.get('pricing_tokens_currency') ?? 'DA'
    },
    discounts,
    vat: {
      enabled: parseBool(map.get('pricing_vat_enabled'), true),
      rate: parseNumber(map.get('pricing_vat_rate'), 20)
    }
  };
}

function mapPaymentSettings(rows: Array<{ key: string; value: string }>) {
  const map = new Map(rows.map(row => [row.key, row.value]));
  const raw = map.get('payment_method_settings');
  if (!raw) {
    return null;
  }
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') {
      return null;
    }
    if (!parsed.methods || typeof parsed.methods !== 'object') {
      return { methods: {} };
    }

    let exchangeRates: { eur: number; usd: number } | undefined;
    const rawRates = (parsed as { exchangeRates?: unknown }).exchangeRates;
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

    return {
      methods: parsed.methods as Record<string, {
        enabled: boolean;
        label: string;
        description?: string;
        instructions?: string;
        bankAccounts?: Array<{
          id: string;
          label: string;
          bankName?: string;
          accountNumber?: string;
          iban?: string;
          swift?: string;
          notes?: string;
        }>;
      }>,
      exchangeRates
    };
  } catch (error) {
    console.warn('Impossible de parser les paramètres de paiement, renvoi d\'un objet vide', error);
    return { methods: {} };
  }
}

function mapLLMSettings(rows: Array<{ key: string; value: string }>) {
  const map = new Map(rows.map(row => [row.key, row.value]));
  const raw = map.get('llm_settings');
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Impossible de parser les paramètres LLM, utilisation des valeurs par défaut', error);
    return null;
  }
}

function mapAlertRuleRow(row: any) {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    triggerType: row.trigger_type,
    target: row.target,
    comparator: row.comparator,
    threshold: row.threshold,
    severity: row.severity,
    messageTemplate: row.message_template,
    appliesToRole: row.applies_to_role,
    isBlocking: row.is_blocking,
    isActive: row.is_active,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function mapEmailTemplateRow(row: any) {
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
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (request.method !== "GET" && request.method !== "POST") {
    return new Response(JSON.stringify({ success: false, error: "Méthode non autorisée" }), {
      status: 405,
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

  const keys = [
    'site_name',
    'site_description',
    'support_email',
    'brevo_api_key',
    'maintenance_mode',
    'registration_enabled',
    'trial_duration_days',
    'trial_tokens',
    'pricing_subscription_monthly_price',
    'pricing_subscription_monthly_tokens',
    'pricing_subscription_currency',
    'pricing_tokens_price_per_million',
    'pricing_tokens_currency',
    'pricing_discounts',
    'pricing_vat_enabled',
    'pricing_vat_rate',
    'payment_method_settings',
    'llm_settings'
  ];

  const { data, error } = await supabaseAdmin
    .from('system_settings')
    .select('key, value')
    .in('key', keys);

  if (error) {
    console.error('Erreur récupération paramètres site:', error.message);
    return new Response(JSON.stringify({ success: false, error: "Erreur lors de la récupération des paramètres" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const settings = mapSettings(data ?? []);
  const pricing = mapPricing(data ?? []);
  const payment = mapPaymentSettings(data ?? []);
  const llm = mapLLMSettings(data ?? []);
  const { data: alertRulesRows, error: alertRulesError } = await supabaseAdmin
    .from('alert_rules')
    .select('*')
    .order('target', { ascending: true })
    .order('threshold', { ascending: true })
    .order('name', { ascending: true });

  if (alertRulesError) {
    console.error('Erreur récupération alert rules:', alertRulesError.message);
  }

  const alertRules = Array.isArray(alertRulesRows)
    ? alertRulesRows.map(mapAlertRuleRow)
    : [];

  const { data: emailTemplateRows, error: emailTemplatesError } = await supabaseAdmin
    .from('email_templates')
    .select('*')
    .order('name', { ascending: true });

  if (emailTemplatesError) {
    console.error('Erreur récupération templates emails:', emailTemplatesError.message);
  }

  const emailTemplates = Array.isArray(emailTemplateRows)
    ? emailTemplateRows.map(mapEmailTemplateRow)
    : [];

  return new Response(JSON.stringify({ success: true, settings, pricing, payment, llm, alertRules, emailTemplates }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
