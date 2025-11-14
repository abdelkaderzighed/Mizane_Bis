import type { SupabaseClient } from 'npm:@supabase/supabase-js@2';

type EmailTemplateRecipient = 'user' | 'admin' | 'both';

interface DbEmailTemplate {
  id: string;
  name: string;
  subject: string;
  recipients: EmailTemplateRecipient;
  cc: string[];
  bcc: string[];
  body: string;
  signature: string;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
}

interface EmailTemplateMetadata {
  allowAttachments?: boolean;
  plainBody?: string;
  headline?: string;
  intro?: string;
  summary?: string;
  ctaLabel?: string;
  ctaUrl?: string;
  footerLinks?: string;
  [key: string]: unknown;
}

export interface TemplateVariables {
  [key: string]: string | number | boolean | null | undefined;
}

export interface EmailAttachment {
  name: string;
  content: string;
  type?: string;
}

export interface SendCustomEmailOptions {
  to: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string | null;
  subject: string;
  htmlContent: string;
  textContent?: string;
  attachments?: EmailAttachment[];
}

export interface SendTemplateEmailOptions {
  to?: string | null;
  adminEmails?: string[];
  cc?: string[];
  bcc?: string[];
  replyTo?: string;
  variables?: TemplateVariables;
  attachments?: EmailAttachment[];
}

const PLACEHOLDER_REGEX = /{{\s*([\w.-]+)\s*}}/g;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeEmail(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }

  if (!EMAIL_REGEX.test(trimmed)) {
    console.warn(`[EmailTemplates] Adresse email invalide ignorée: ${trimmed}`);
    return null;
  }

  const domain = trimmed.split('@')[1];
  if (!domain) {
    console.warn(`[EmailTemplates] Adresse email invalide (domaine manquant): ${trimmed}`);
    return null;
  }

  const domainParts = domain.split('.');
  const tld = domainParts[domainParts.length - 1];
  if (!tld || tld.length < 2) {
    console.warn(`[EmailTemplates] Adresse email invalide (TLD trop court): ${trimmed}`);
    return null;
  }

  return trimmed;
}

function coerceString(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'boolean') {
    return value ? 'true' : 'false';
  }
  return String(value);
}

function renderTemplate(template: string, variables: TemplateVariables | undefined): string {
  if (!template) {
    return '';
  }

  return template.replace(PLACEHOLDER_REGEX, (_, key: string) => {
    if (!variables) {
      return '';
    }
    const value = variables[key];
    return value === undefined ? '' : coerceString(value);
  });
}

function stripHtml(html: string): string {
  if (!html) {
    return '';
  }

  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeEmailList(list: string[] | undefined): string[] {
  if (!Array.isArray(list) || list.length === 0) {
    return [];
  }

  const normalized: string[] = [];
  const seen = new Set<string>();

  for (const item of list) {
    const sanitized = sanitizeEmail(item);
    if (sanitized && !seen.has(sanitized)) {
      normalized.push(sanitized);
      seen.add(sanitized);
    }
  }

  return normalized;
}

function getSenderConfig() {
  const supportEmail = Deno.env.get('SUPPORT_EMAIL')?.trim() || null;
  const senderEmail = Deno.env.get('EMAIL_SENDER')?.trim()
    || Deno.env.get('SUPPORT_EMAIL')?.trim()
    || 'contact.misan@parene.org';
  const senderName = Deno.env.get('EMAIL_SENDER_NAME')?.trim() || 'Misan';
  const brevoKey = Deno.env.get('BREVO_API_KEY')?.trim();

  if (!brevoKey) {
    console.error('[EmailTemplates] BREVO_API_KEY manquant, envoi impossible.');
    return null;
  }

  return { supportEmail, senderEmail, senderName, brevoKey };
}

async function dispatchBrevoEmail(payload: Record<string, unknown>, brevoKey: string) {
  const response = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': brevoKey,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[EmailTemplates] Erreur Brevo (${response.status}):`, errorText);
    return { success: false as const, error: `Brevo error: ${response.status}` };
  }

  return { success: true as const };
}

export async function sendCustomEmail(options: SendCustomEmailOptions): Promise<{ success: boolean; error?: string }> {
  const config = getSenderConfig();
  if (!config) {
    return { success: false, error: 'BREVO_API_KEY manquant' };
  }

  const to = normalizeEmailList(options.to);
  const cc = normalizeEmailList(options.cc);
  const bcc = normalizeEmailList(options.bcc);
  const replyTo = sanitizeEmail(options.replyTo) ?? undefined;

  if (to.length === 0) {
    console.warn('[EmailTemplates] Aucun destinataire principal valide pour envoi direct.');
    return { success: false, error: 'Destinataires invalides' };
  }

  const htmlContent = options.htmlContent?.trim();
  if (!htmlContent) {
    console.warn('[EmailTemplates] Contenu HTML vide pour envoi direct.');
    return { success: false, error: 'htmlContent manquant' };
  }

  const textContent = options.textContent?.trim() || stripHtml(htmlContent);

  const payload: Record<string, unknown> = {
    sender: { name: config.senderName, email: config.senderEmail },
    to: to.map(email => ({ email })),
    subject: options.subject,
    htmlContent,
    textContent,
  };

  if (cc.length > 0) {
    payload.cc = cc.map(email => ({ email }));
  }
  if (bcc.length > 0) {
    payload.bcc = bcc.map(email => ({ email }));
  }
  if (replyTo) {
    payload.replyTo = { email: replyTo };
  }
  if (options.attachments && options.attachments.length > 0) {
    payload.attachment = options.attachments
      .filter(attachment => Boolean(attachment?.name) && Boolean(attachment?.content))
      .map(attachment => ({
        name: attachment.name,
        content: attachment.content,
        type: attachment.type ?? undefined,
      }));
  }

  return await dispatchBrevoEmail(payload, config.brevoKey);
}

async function fetchTemplate(
  supabase: SupabaseClient,
  name: string
): Promise<DbEmailTemplate | null> {
  const { data, error } = await supabase
    .from('email_templates')
    .select('*')
    .eq('name', name)
    .maybeSingle();

  if (error) {
    console.error(`[EmailTemplates] Erreur chargement template "${name}":`, error.message);
    return null;
  }

  if (!data) {
    console.warn(`[EmailTemplates] Template "${name}" introuvable.`);
    return null;
  }

  if (!data.is_active) {
    console.warn(`[EmailTemplates] Template "${name}" désactivé, envoi ignoré.`);
    return null;
  }

  return data as DbEmailTemplate;
}

function buildRecipients(
  template: DbEmailTemplate,
  options: SendTemplateEmailOptions,
  supportEmail: string | null
): { to: Array<{ email: string }>; cc?: Array<{ email: string }>; bcc?: Array<{ email: string }>; } | null {
  const to: Array<{ email: string }> = [];
  const cc: Set<string> = new Set();
  const bcc: Set<string> = new Set();

  const appendList = (target: Set<string>, items: string[] | undefined) => {
    if (!items) return;
    for (const item of items) {
      const sanitized = sanitizeEmail(item);
      if (sanitized) {
        target.add(sanitized);
      }
    }
  };

  const userEmail = sanitizeEmail(options.to);
  const adminEmails = options.adminEmails
    ?.map(email => sanitizeEmail(email))
    .filter((email): email is string => Boolean(email))
    ?? [];

  switch (template.recipients) {
    case 'user':
      if (!userEmail) {
        console.warn('[EmailTemplates] Adresse email utilisateur manquante.');
        return null;
      }
      to.push({ email: userEmail });
      break;
    case 'admin': {
      if (adminEmails.length > 0) {
        adminEmails.forEach(email => to.push({ email }));
      } else {
        const fallback = sanitizeEmail(supportEmail);
        if (fallback) {
          to.push({ email: fallback });
        } else {
          console.warn('[EmailTemplates] Aucun email administrateur disponible.');
          return null;
        }
      }
      break;
    }
    case 'both':
      if (userEmail) {
        to.push({ email: userEmail });
      }
      if (adminEmails.length > 0) {
        adminEmails.forEach(email => cc.add(email));
      }
      if (!userEmail) {
        const fallback = adminEmails.length > 0
          ? adminEmails[0]
          : sanitizeEmail(supportEmail);

        if (!fallback) {
          console.warn('[EmailTemplates] Impossible de déterminer les destinataires (user/admin).');
          return null;
        }

        to.push({ email: fallback });
        if (adminEmails.length > 1) {
          adminEmails.slice(1).forEach(email => cc.add(email));
        }
      }
      break;
  }

  appendList(cc, template.cc);
  appendList(cc, options.cc);
  appendList(bcc, template.bcc);
  appendList(bcc, options.bcc);

  // Filtrer les entrées invalides potentiellement injectées via template
  const toRecipients = to.filter(item => sanitizeEmail(item.email));
  const ccRecipients = cc.size > 0
    ? Array.from(cc)
        .map(email => sanitizeEmail(email))
        .filter((email): email is string => Boolean(email))
        .map(email => ({ email }))
    : undefined;
  const bccRecipients = bcc.size > 0
    ? Array.from(bcc)
        .map(email => sanitizeEmail(email))
        .filter((email): email is string => Boolean(email))
        .map(email => ({ email }))
    : undefined;

  if (toRecipients.length === 0) {
    console.warn('[EmailTemplates] Aucun destinataire principal valide.');
    return null;
  }

  return {
    to: toRecipients,
    cc: ccRecipients,
    bcc: bccRecipients,
  };
}

export async function sendTemplateEmail(
  supabase: SupabaseClient,
  templateName: string,
  options: SendTemplateEmailOptions = {}
): Promise<{ success: boolean; error?: string }> {
  try {
    const template = await fetchTemplate(supabase, templateName);
    if (!template) {
      return { success: false, error: 'Template introuvable ou inactif' };
    }

  const senderConfig = getSenderConfig();
  if (!senderConfig) {
    return { success: false, error: 'BREVO_API_KEY manquant' };
  }

  const recipients = buildRecipients(template, options, senderConfig.supportEmail);
  if (!recipients || recipients.to.length === 0) {
    return { success: false, error: 'Destinataires introuvables' };
  }

  console.log('[EmailTemplates] Destinataires calculés pour', templateName, JSON.stringify(recipients));

    const metadata = (template.metadata ?? {}) as EmailTemplateMetadata;
    const baseVariables = options.variables ?? {};
    const renderedSignature = renderTemplate(template.signature ?? '', baseVariables);

    const variables = {
      ...baseVariables,
      signature: renderedSignature,
    } as TemplateVariables;

    const subject = renderTemplate(template.subject, variables) || template.subject;
    const htmlContent = renderTemplate(template.body, variables);

    const plainTemplate = typeof metadata.plainBody === 'string' && metadata.plainBody.trim().length > 0
      ? metadata.plainBody
      : null;

    const textContent = plainTemplate
      ? renderTemplate(plainTemplate, variables)
      : stripHtml(htmlContent) || renderTemplate(template.signature ?? '', variables);

    return await sendCustomEmail({
      to: recipients.to.map(item => item.email),
      cc: recipients.cc?.map(item => item.email),
      bcc: recipients.bcc?.map(item => item.email),
      replyTo: options.replyTo ?? null,
      subject,
      htmlContent,
      textContent,
      attachments: options.attachments,
    });
  } catch (error) {
    console.error('[EmailTemplates] Erreur inattendue:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erreur inconnue' };
  }
}
