import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type TriggerType = 'login' | 'assistant_access' | 'scheduled';
type TargetType = 'subscription' | 'tokens';
type ComparatorType = '<' | '<=' | '=' | '>=' | '>';
type SeverityType = 'info' | 'warning' | 'error';
type AppliesRole = 'pro' | 'premium' | 'any';

type AlertRulePayload = {
  id?: string;
  name?: string;
  description?: string | null;
  triggerType?: TriggerType;
  target?: TargetType;
  comparator?: ComparatorType;
  threshold?: number;
  severity?: SeverityType;
  messageTemplate?: string;
  appliesToRole?: AppliesRole;
  isBlocking?: boolean;
  isActive?: boolean;
  metadata?: Record<string, unknown> | null;
};

type InvokePayload =
  | { action: 'list' }
  | { action: 'create'; rule: AlertRulePayload }
  | { action: 'update'; id: string; rule: AlertRulePayload }
  | { action: 'delete'; id: string };

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
    console.error("Missing Supabase environment variables for admin-alert-rules function.");
  }
}

ensureEnv();

const allowedTriggerTypes = new Set<TriggerType>(['login', 'assistant_access', 'scheduled']);
const allowedTargets = new Set<TargetType>(['subscription', 'tokens']);
const allowedComparators = new Set<ComparatorType>(['<', '<=', '=', '>=', '>']);
const allowedSeverities = new Set<SeverityType>(['info', 'warning', 'error']);
const allowedRoles = new Set<AppliesRole>(['pro', 'premium', 'any']);

function mapRow(row: any) {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | null,
    triggerType: row.trigger_type as TriggerType,
    target: row.target as TargetType,
    comparator: row.comparator as ComparatorType,
    threshold: row.threshold as number,
    severity: row.severity as SeverityType,
    messageTemplate: row.message_template as string,
    appliesToRole: row.applies_to_role as AppliesRole,
    isBlocking: row.is_blocking as boolean,
    isActive: row.is_active as boolean,
    metadata: row.metadata ?? {},
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

function normalizeRulePayload(input: AlertRulePayload) {
  if (!input.name || !input.triggerType || !input.target || !input.comparator || input.threshold === undefined || input.threshold === null || !input.severity || !input.messageTemplate || !input.appliesToRole) {
    return { valid: false, error: "Champs obligatoires manquants." } as const;
  }

  if (!allowedTriggerTypes.has(input.triggerType)) {
    return { valid: false, error: "Type de déclenchement invalide." } as const;
  }
  if (!allowedTargets.has(input.target)) {
    return { valid: false, error: "Cible d'alerte invalide." } as const;
  }
  if (!allowedComparators.has(input.comparator)) {
    return { valid: false, error: "Comparateur invalide." } as const;
  }
  if (!allowedSeverities.has(input.severity)) {
    return { valid: false, error: "Sévérité invalide." } as const;
  }
  if (!allowedRoles.has(input.appliesToRole)) {
    return { valid: false, error: "Rôle ciblé invalide." } as const;
  }

  return {
    valid: true,
    data: {
      name: input.name.trim(),
      description: input.description ?? null,
      trigger_type: input.triggerType,
      target: input.target,
      comparator: input.comparator,
      threshold: Number(input.threshold),
      severity: input.severity,
      message_template: input.messageTemplate,
      applies_to_role: input.appliesToRole,
      is_blocking: Boolean(input.isBlocking),
      is_active: input.isActive === undefined ? true : Boolean(input.isActive),
      metadata: input.metadata ?? {}
    }
  } as const;
}

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

  let payload: InvokePayload;
  try {
    payload = await request.json();
  } catch (_error) {
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

  if (payload.action === 'list') {
    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .select('*')
      .order('target', { ascending: true })
      .order('threshold', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Erreur récupération alert rules:', error.message);
      return new Response(JSON.stringify({ success: false, error: "Erreur lors de la récupération des alertes" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      rules: Array.isArray(data) ? data.map(mapRow) : []
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (payload.action === 'create') {
    const validation = normalizeRulePayload(payload.rule ?? {});
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .insert(validation.data)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Erreur création alert rule:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, rule: mapRow(data) }), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (payload.action === 'update') {
    if (!payload.id) {
      return new Response(JSON.stringify({ success: false, error: "Identifiant requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const mergedRule = { ...payload.rule, name: payload.rule?.name ?? '' };
    const validation = normalizeRulePayload(mergedRule);
    if (!validation.valid) {
      return new Response(JSON.stringify({ success: false, error: validation.error }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { data, error } = await supabaseAdmin
      .from('alert_rules')
      .update(validation.data)
      .eq('id', payload.id)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Erreur mise à jour alert rule:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (!data) {
      return new Response(JSON.stringify({ success: false, error: "Règle introuvable" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true, rule: mapRow(data) }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  if (payload.action === 'delete') {
    if (!payload.id) {
      return new Response(JSON.stringify({ success: false, error: "Identifiant requis" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const { error } = await supabaseAdmin
      .from('alert_rules')
      .delete()
      .eq('id', payload.id);

    if (error) {
      console.error('Erreur suppression alert rule:', error.message);
      return new Response(JSON.stringify({ success: false, error: error.message }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ success: false, error: "Action inconnue" }), {
    status: 400,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
