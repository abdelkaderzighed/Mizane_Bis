import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables. support-contact function will not work correctly.");
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

type SupportPayload = {
  email?: string;
  subject?: string;
  message?: string;
  cc?: string[];
  bcc?: string[];
};

function validatePayload(payload: SupportPayload) {
  if (!payload.email || !payload.subject || !payload.message) {
    return "Tous les champs sont requis.";
  }

  const emailRegex = /[^\s@]+@[^\s@]+\.[^\s@]+/;
  if (!emailRegex.test(payload.email)) {
    return "Adresse email invalide.";
  }

  if (payload.subject.trim().length < 3) {
    return "Le sujet doit contenir au moins 3 caractères.";
  }

  if (payload.message.trim().length < 10) {
    return "Le message doit contenir au moins 10 caractères.";
  }

  if (payload.message.trim().length > 5000) {
    return "Le message est trop long (5000 caractères max).";
  }

  const lists: Array<[string[] | undefined, string]> = [
    [payload.cc, 'cc'],
    [payload.bcc, 'bcc']
  ];

  for (const [list, label] of lists) {
    if (!list) continue;
    for (const address of list) {
      if (!emailRegex.test(address)) {
        return `Adresse ${label.toUpperCase()} invalide : ${address}`;
      }
    }
  }

  return null;
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

  try {
    const payload = (await request.json()) as SupportPayload;
    const validationError = validatePayload(payload);

    if (validationError) {
      return new Response(JSON.stringify({ success: false, error: validationError }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const ccList = Array.isArray(payload.cc) ? payload.cc.map(email => email.trim()).filter(Boolean) : [];
    const bccList = Array.isArray(payload.bcc) ? payload.bcc.map(email => email.trim()).filter(Boolean) : [];

    const storedMessage = [
      payload.message?.trim() ?? '',
      ccList.length ? `CC: ${ccList.join(', ')}` : '',
      bccList.length ? `BCC: ${bccList.join(', ')}` : ''
    ].filter(Boolean).join('\n\n');

    const { error } = await supabase.from("support_messages").insert({
      user_email: payload.email?.trim(),
      subject: payload.subject?.trim(),
      message: storedMessage
    });

    if (error) {
      console.error("Error inserting support message", error);
      return new Response(JSON.stringify({
        success: false,
        error: error.message || 'Erreur lors de l\'enregistrement du message.',
        details: error.details,
        hint: error.hint
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const forwardingWebhook = Deno.env.get("SUPPORT_FORWARDING_WEBHOOK");

    if (forwardingWebhook) {
      try {
        const forwardResponse = await fetch(forwardingWebhook, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            to: "assistant-misan@parene.org",
            from: payload.email?.trim(),
            subject: payload.subject?.trim(),
            message: storedMessage
          })
        });

        if (!forwardResponse.ok) {
          console.error("Support forward webhook returned non-OK status", forwardResponse.status);
        }
      } catch (forwardError) {
        console.error("Support forward webhook error", forwardError);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } catch (error) {
    console.error("Unexpected error in support-contact", error);
    return new Response(JSON.stringify({ success: false, error: "Erreur inattendue." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
