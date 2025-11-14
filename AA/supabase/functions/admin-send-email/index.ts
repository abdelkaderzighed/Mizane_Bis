import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { sendCustomEmail, type EmailAttachment } from "../_shared/email-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

function ensureEnv() {
  if (!supabaseUrl || !serviceRoleKey || !anonKey) {
    console.error("[admin-send-email] Variables d'environnement Supabase manquantes.");
  }
}

ensureEnv();

function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter(item => typeof item === 'string')
    .map(item => (item as string).trim())
    .filter(item => item.length > 0);
}

function sanitizeAttachments(value: unknown): EmailAttachment[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [];
  }

  const normalized: EmailAttachment[] = [];

  for (const item of value) {
    if (!item || typeof item !== 'object') {
      continue;
    }

    const { name, content, type } = item as { name?: unknown; content?: unknown; type?: unknown };

    if (typeof name !== 'string' || !name.trim()) {
      continue;
    }

    if (typeof content !== 'string' || !content.trim()) {
      continue;
    }

    normalized.push({
      name: name.trim(),
      content: content.trim(),
      type: typeof type === 'string' && type.trim() ? type.trim() : undefined,
    });
  }

  return normalized;
}

async function getAuthenticatedUser(request: Request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader) {
    return null;
  }

  const supabaseClient = createClient(supabaseUrl, anonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });

  const { data, error } = await supabaseClient.auth.getUser();
  if (error || !data?.user) {
    return null;
  }

  return data.user;
}

async function isAdminUser(userId: string) {
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await serviceClient
    .from('user_profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('[admin-send-email] Erreur vérification rôle:', error.message);
    return false;
  }

  return data?.role === 'admin';
}

interface AdminSendEmailRequest {
  to: unknown;
  cc?: unknown;
  bcc?: unknown;
  subject?: unknown;
  htmlContent?: unknown;
  textContent?: unknown;
  replyTo?: unknown;
  attachments?: unknown;
  templateId?: unknown;
}

serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Méthode non autorisée' }), {
      status: 405,
      headers: corsHeaders,
    });
  }

  let payload: AdminSendEmailRequest;
  try {
    payload = await request.json();
  } catch (error) {
    console.error('[admin-send-email] Corps JSON invalide:', error);
    return new Response(JSON.stringify({ error: 'Requête invalide' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return new Response(JSON.stringify({ error: 'Non authentifié' }), {
      status: 401,
      headers: corsHeaders,
    });
  }

  const isAdmin = await isAdminUser(user.id);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Accès refusé' }), {
      status: 403,
      headers: corsHeaders,
    });
  }

  const to = normalizeStringArray(payload.to);
  const cc = normalizeStringArray(payload.cc);
  const bcc = normalizeStringArray(payload.bcc);
  const subject = typeof payload.subject === 'string' ? payload.subject.trim() : '';
  const htmlContent = typeof payload.htmlContent === 'string' ? payload.htmlContent : '';
  const textContent = typeof payload.textContent === 'string' ? payload.textContent : undefined;
  const replyTo = typeof payload.replyTo === 'string' ? payload.replyTo.trim() : null;
  const attachments = sanitizeAttachments(payload.attachments);
  const templateId = typeof payload.templateId === 'string' ? payload.templateId : null;

  if (to.length === 0) {
    return new Response(JSON.stringify({ error: 'Aucun destinataire fourni' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!subject) {
    return new Response(JSON.stringify({ error: 'Sujet manquant' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (!htmlContent.trim()) {
    return new Response(JSON.stringify({ error: 'Contenu HTML manquant' }), {
      status: 400,
      headers: corsHeaders,
    });
  }

  if (templateId && attachments.length > 0) {
    const serviceClient = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await serviceClient
      .from('email_templates')
      .select('metadata')
      .eq('id', templateId)
      .maybeSingle();

    if (error) {
      console.error('[admin-send-email] Erreur lecture metadata template:', error.message);
      return new Response(JSON.stringify({ error: 'Erreur lecture template' }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const metadata = (data?.metadata ?? {}) as { allowAttachments?: boolean };
    if (!metadata.allowAttachments) {
      return new Response(JSON.stringify({ error: 'Ce template interdit les pièces jointes' }), {
        status: 400,
        headers: corsHeaders,
      });
    }
  }

  const result = await sendCustomEmail({
    to,
    cc,
    bcc,
    subject,
    htmlContent,
    textContent,
    replyTo,
    attachments,
  });

  if (!result.success) {
    return new Response(JSON.stringify({ error: result.error ?? 'Envoi impossible' }), {
      status: 500,
      headers: corsHeaders,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: corsHeaders,
  });
});
