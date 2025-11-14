import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

if (!supabaseUrl || !serviceRoleKey || !anonKey) {
  console.error("Missing Supabase environment variables for update-trial-config function.");
}

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return null;

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } }
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

  let payload: any;
  try {
    payload = await request.json();
  } catch {
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

  const { duration_days, tokens_amount, enabled } = payload;

  if (typeof duration_days !== 'number' || typeof tokens_amount !== 'number' || typeof enabled !== 'boolean') {
    return new Response(JSON.stringify({ success: false, error: "Paramètres invalides" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  const records = [
    { key: 'trial_duration_days', value: String(duration_days), description: 'Durée essai gratuit en jours', category: 'general' },
    { key: 'trial_tokens', value: String(tokens_amount), description: 'Jetons inclus dans l\'essai gratuit', category: 'general' },
    { key: 'trial_tokens_amount', value: String(tokens_amount), description: 'Jetons pour essai gratuit (legacy)', category: 'general' },
    { key: 'trial_enabled', value: enabled ? 'true' : 'false', description: 'Essai gratuit activé', category: 'general' }
  ];

  const { error } = await supabaseAdmin
    .from('system_settings')
    .upsert(records, { onConflict: 'key' });

  if (error) {
    console.error('Erreur mise à jour essai gratuit:', error.message);
    return new Response(JSON.stringify({ success: false, error: "Erreur lors de la sauvegarde" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" }
  });
});
