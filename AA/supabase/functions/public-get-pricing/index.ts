import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing Supabase environment variables for public-get-pricing function.");
}

const PRICING_KEYS = [
  "pricing_subscription_monthly_price",
  "pricing_subscription_monthly_tokens",
  "pricing_subscription_currency",
  "pricing_tokens_price_per_million",
  "pricing_tokens_currency",
  "pricing_discounts",
  "pricing_vat_enabled",
  "pricing_vat_rate"
];

const TRIAL_KEYS = [
  "trial_duration_days",
  "trial_tokens",
  "trial_tokens_amount",
  "trial_enabled"
];

type SettingRow = { key: string; value: string | null };

const parseNumber = (value: string | null | undefined, fallback: number) => {
  if (value === undefined || value === null || value === "") return fallback;
  const parsed = Number(value);
  return Number.isNaN(parsed) ? fallback : parsed;
};

const parseBoolean = (value: string | null | undefined, fallback: boolean) => {
  if (value === undefined || value === null || value === "") return fallback;
  if (value === "true" || value === "1") return true;
  if (value === "false" || value === "0") return false;
  return fallback;
};

const mapPricing = (rows: SettingRow[]) => {
  const map = new Map(rows.map(row => [row.key, row.value ?? null]));

  let discounts = [
    { threshold: 6, percentage: 7 },
    { threshold: 12, percentage: 20 },
    { threshold: 10000000, percentage: 10 },
    { threshold: 20000000, percentage: 20 }
  ];

  const discountsRaw = map.get("pricing_discounts");
  if (discountsRaw) {
    try {
      const parsed = JSON.parse(discountsRaw);
      if (Array.isArray(parsed)) {
        const normalized = parsed
          .filter(item => typeof item === "object" && item)
          .map(item => ({
            threshold: Number((item as Record<string, unknown>).threshold) || 0,
            percentage: Number((item as Record<string, unknown>).percentage) || 0
          }))
          .filter(item => item.threshold > 0 && item.percentage >= 0);
        if (normalized.length) {
          discounts = normalized;
        }
      }
    } catch (error) {
      console.warn("Unable to parse pricing discounts", error);
    }
  }

  return {
    subscription: {
      monthlyPrice: parseNumber(map.get("pricing_subscription_monthly_price"), 4000),
      monthlyTokens: parseNumber(map.get("pricing_subscription_monthly_tokens"), 1000000),
      currency: map.get("pricing_subscription_currency") ?? "DA"
    },
    tokens: {
      pricePerMillion: parseNumber(map.get("pricing_tokens_price_per_million"), 1000),
      currency: map.get("pricing_tokens_currency") ?? "DA"
    },
    discounts,
    vat: {
      enabled: parseBoolean(map.get("pricing_vat_enabled"), true),
      rate: parseNumber(map.get("pricing_vat_rate"), 20)
    }
  };
};

const mapTrial = (rows: SettingRow[]) => {
  const map = new Map(rows.map(row => [row.key, row.value ?? null]));
  const tokensValue = map.get("trial_tokens") ?? map.get("trial_tokens_amount");
  return {
    durationDays: parseNumber(map.get("trial_duration_days"), 7),
    tokens: parseNumber(tokensValue, 100000),
    enabled: parseBoolean(map.get("trial_enabled"), true)
  };
};

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

  const supabaseService = createClient(supabaseUrl, serviceRoleKey);

  const { data: pricingRows, error: pricingError } = await supabaseService
    .from("system_settings")
    .select("key, value")
    .in("key", PRICING_KEYS);

  if (pricingError) {
    console.error("Failed to fetch pricing settings", pricingError.message);
    return new Response(JSON.stringify({ success: false, error: "Erreur lecture paramètres tarifaires" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const { data: trialRows, error: trialError } = await supabaseService
    .from("system_settings")
    .select("key, value")
    .in("key", TRIAL_KEYS);

  if (trialError) {
    console.error("Failed to fetch trial settings", trialError.message);
  }

  const pricing = mapPricing(pricingRows ?? []);
  const trial = mapTrial(trialRows ?? []);

  return new Response(JSON.stringify({ success: true, pricing, trial }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
