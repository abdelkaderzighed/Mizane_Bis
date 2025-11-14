import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/email-templates.ts';
import { initializeEmailTemplates } from './database-functions.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

// Interface pour les réponses standardisées
interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  data?: any;
}

// Interface pour les utilisateurs Misan
interface MisanUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'pro' | 'premium';
  subscription_type: 'admin' | 'pro' | 'premium';
  subscription_status: 'active' | 'inactive' | 'pending' | 'expired';
  subscription_start: string;
  subscription_end: string;
  tokens_balance: number;
  trial_used: boolean;
  created_at: string;
  updated_at?: string;
  avatar?: string;
  avatar_url?: string | null;
  secondary_email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  postal_code?: string | null;
  country?: string | null;
  billing_address?: string | null;
  billing_city?: string | null;
  billing_postal_code?: string | null;
  billing_country?: string | null;
}

const normalizeRole = (role: string, fallback: MisanUser['role']): MisanUser['role'] => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'collaborateur':
    case 'pro':
      return 'pro';
    case 'user':
    case 'premium':
    case 'free':
    case 'trial':
      return 'premium';
    default:
      return fallback;
  }
};

const normalizeSubscriptionType = (subscriptionType: string, fallback: MisanUser['subscription_type']): MisanUser['subscription_type'] => {
  switch (subscriptionType) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'pro';
    case 'premium':
    case 'free':
    case 'trial':
    case 'user':
      return 'premium';
    default:
      return fallback;
  }
};

const normalizeStatus = (status: string, fallback: MisanUser['subscription_status']): MisanUser['subscription_status'] => {
  switch (status) {
    case 'active':
    case 'en cours':
      return 'active';
    case 'expired':
      return 'expired';
    case 'pending':
    case 'en attente':
    case 'awaiting':
      return 'inactive';
    case 'inactive':
    case 'suspended':
      return 'inactive';
    default:
      return fallback;
  }
};

const toIsoDate = (date: string | undefined, fallback?: string): string | undefined => {
  if (!date || date.trim() === '') {
    return fallback;
  }

  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) {
    return fallback;
  }
  return parsed.toISOString();
};

const PAYMENT_METHOD_DB_MAP: Record<string, string> = {
  card_cib: 'card_cib',
  card_international: 'card_visa',
  card_visa: 'card_visa',
  bank_transfer: 'bank_transfer',
  mobile_payment: 'edahabia',
  edahabia: 'edahabia',
  paypal: 'paypal',
  other: 'bank_transfer'
};

const PAYMENT_LABELS: Record<string, string> = {
  card_cib: 'Carte CIB',
  card_international: 'Carte internationale',
  card_visa: 'Carte internationale',
  bank_transfer: 'Virement bancaire',
  mobile_payment: 'Paiement mobile',
  edahabia: 'Paiement mobile',
  paypal: 'PayPal',
  other: 'Autre'
};

const formatCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(value);

const formatDate = (value?: string | null) => (value ? new Date(value).toLocaleDateString('fr-FR') : '');

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const encodeHtmlToBase64 = (value: string): string => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(value);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary);
};

function generateInvoiceHtmlForEmail(options: {
  invoiceNumber: string;
  orderNumber: string;
  createdAt?: string | null;
  dueDate?: string | null;
  status: string;
  paymentMethod: string;
  paymentDate?: string | null;
  paymentReference?: string | null;
  description?: string | null;
  currency: string;
  total: number;
  subtotal: number;
  vat: number;
  lines: Array<{ label: string; quantity: number; unitPrice: number; total: number; description?: string | null }>;
  billing: {
    name: string;
    email: string;
    phone?: string | null;
    street: string;
    city: string;
    postalCode: string;
    country: string;
  };
}): string {
  const {
    invoiceNumber,
    orderNumber,
    createdAt,
    dueDate,
    status,
    paymentMethod,
    paymentDate,
    paymentReference,
    description,
    currency,
    total,
    subtotal,
    vat,
    lines,
    billing
  } = options;

  const lineRows = lines
    .map((line, index) => {
      const details = `${escapeHtml(line.label)}${line.description ? `<br/><small>${escapeHtml(line.description)}</small>` : ''}`;
      return `
        <tr>
          <td>${details}</td>
          <td class="text-center">${line.quantity}</td>
          <td class="text-center">${formatCurrency(line.unitPrice, currency)}</td>
          <td class="text-right">${formatCurrency(line.total, currency)}</td>
        </tr>`;
    })
    .join('');

  const acquittedBadge = status === 'paid'
    ? '<p class="acquitted">Facture acquittée</p>'
    : '';

  return `<!DOCTYPE html>
  <html lang="fr">
    <head>
      <meta charset="utf-8" />
      <title>Facture ${escapeHtml(invoiceNumber)}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 32px; background: #f3f4f6; color: #102a24; }
        .invoice { max-width: 840px; margin: 0 auto; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.12); overflow: hidden; border: 1px solid rgba(12, 83, 52, 0.2); }
        .header { background: linear-gradient(135deg, #0b3d2e 0%, #0f5132 60%, #b91c1c 100%); color: white; padding: 36px; }
        .header h1 { margin: 0; font-size: 32px; letter-spacing: 2px; text-transform: uppercase; }
        .header p { margin: 6px 0 0 0; font-size: 15px; opacity: 0.9; }
        .section { padding: 32px; }
        .section + .section { border-top: 1px solid #e2e8f0; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 24px; }
        .box { background: #f8faf7; border: 1px solid rgba(12, 83, 52, 0.15); border-radius: 12px; padding: 20px; }
        .box h3 { margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.08em; color: #0f5132; }
        table { width: 100%; border-collapse: collapse; margin-top: 16px; }
        th { text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #0f5132; padding: 12px; background: rgba(12, 83, 52, 0.05); border-bottom: 1px solid rgba(12, 83, 52, 0.2); }
        td { padding: 12px; border-bottom: 1px solid rgba(17, 24, 39, 0.08); vertical-align: top; font-size: 14px; }
        td.text-center { text-align: center; }
        td.text-right { text-align: right; }
        .totals { margin-top: 24px; display: grid; gap: 12px; }
        .totals div { display: flex; justify-content: space-between; font-size: 14px; }
        .totals div.total { font-size: 18px; font-weight: 600; color: #0b3d2e; }
        .footer { padding: 24px 32px 32px; font-size: 12px; color: #374151; background: #f8faf7; border-top: 1px solid rgba(12, 83, 52, 0.2); }
        .status { display: inline-flex; align-items: center; gap: 8px; padding: 6px 14px; border-radius: 999px; background: rgba(15, 81, 50, 0.1); color: #0b3d2e; font-weight: 600; font-size: 13px; border: 1px solid rgba(12, 83, 52, 0.3); }
        .acquitted { margin-top: 12px; padding: 8px 14px; background: rgba(12, 83, 52, 0.08); border: 1px solid rgba(12, 83, 52, 0.4); border-radius: 10px; font-weight: 600; color: #0b3d2e; display: inline-block; text-transform: uppercase; letter-spacing: 0.08em; font-size: 12px; }
        .contact { margin-top: 16px; font-size: 13px; line-height: 1.6; }
        .contact span { display: block; }
      </style>
    </head>
    <body>
      <div class="invoice">
        <div class="header">
          <h1>Misan</h1>
          <p>Gestionnaire intelligent de documents</p>
          <div class="contact">
            <span>Dz Dakaa Ilmy ; 82 lot GERIC, cité Zouaghi Ain El Bey 25000 Constantine, Algérie</span>
            <span>contact-misan@parene.org • +213 563 83 96 27</span>
          </div>
        </div>
        <div class="section">
          <div class="grid">
            <div class="box">
              <h3>Facture</h3>
              <p><strong>Numéro :</strong> ${escapeHtml(invoiceNumber)}</p>
              <p><strong>Commande :</strong> ${escapeHtml(orderNumber)}</p>
              <p><strong>Date :</strong> ${formatDate(createdAt)}</p>
              ${dueDate ? `<p><strong>Échéance :</strong> ${formatDate(dueDate)}</p>` : ''}
              <p><span class="status">${status === 'paid' ? 'Payée' : status === 'overdue' ? 'En retard' : status}</span></p>
              ${acquittedBadge}
            </div>
            <div class="box">
              <h3>Facturé à</h3>
              <p><strong>${escapeHtml(billing.name)}</strong><br/>${escapeHtml(billing.email)}${billing.phone ? `<br/>${escapeHtml(billing.phone)}` : ''}<br/>${escapeHtml(billing.street)}<br/>${escapeHtml(billing.postalCode)} ${escapeHtml(billing.city)}<br/>${escapeHtml(billing.country)}</p>
            </div>
            <div class="box">
              <h3>Paiement</h3>
              <p><strong>Mode de paiement :</strong> ${escapeHtml(paymentMethod)}</p>
              ${paymentDate ? `<p><strong>Date de paiement :</strong> ${formatDate(paymentDate)}</p>` : ''}
              ${paymentReference ? `<p><strong>Référence :</strong> ${escapeHtml(paymentReference)}</p>` : ''}
            </div>
          </div>
        </div>
        <div class="section">
          <h2>Détail</h2>
          <table>
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-center">Quantité</th>
                <th class="text-center">Prix unitaire</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${lineRows}
            </tbody>
          </table>
          <div class="totals">
            <div><span>Sous-total</span><span>${formatCurrency(subtotal, currency)}</span></div>
            <div><span>TVA</span><span>${formatCurrency(vat, currency)}</span></div>
            <div class="total"><span>Total TTC</span><span>${formatCurrency(total, currency)}</span></div>
          </div>
        </div>
        <div class="section">
          <h2>Notes</h2>
          <p>${escapeHtml(description ?? 'Merci pour votre confiance. Conservez cette facture pour vos dossiers.')}</p>
        </div>
        <div class="footer">
          Misan • Dz Dakaa Ilmy ; 82 lot GERIC, cité Zouaghi Ain El Bey 25000 Constantine, Algérie • contact-misan@parene.org • +213 563 83 96 27
        </div>
      </div>
    </body>
  </html>`;
}

// Créer le client Supabase admin
const createSupabaseAdmin = () => {
  return createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
};

const fetchAdminEmails = async (supabase: any): Promise<string[]> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('email')
      .eq('role', 'admin')
      .not('email', 'is', null)
      .order('email', { ascending: true });

    if (error) {
      console.warn('[Notifications] Impossible de récupérer les emails admin:', error.message);
      return [];
    }

    const emails = Array.isArray(data)
      ? data
          .map((row: any) => typeof row.email === 'string' ? row.email.trim() : '')
          .filter((email: string) => email.length > 0)
      : [];

    return Array.from(new Set(emails));
  } catch (err) {
    console.warn('[Notifications] Erreur inattendue fetchAdminEmails:', err);
    return [];
  }
};

// Fonction pour créer un utilisateur dans le KV store
const createUserInKVStore = async (supabase: any, user: MisanUser) => {
  try {
    // Sauvegarder le profil utilisateur
    const { error: profileError } = await supabase
      .from('kv_store_810b4099')
      .upsert({
        key: `user:${user.id}`,
        value: user
      });

    if (profileError) {
      throw new Error(`Erreur sauvegarde profil: ${profileError.message}`);
    }

    // Créer le mapping email -> user_id
    const { error: mappingError } = await supabase
      .from('kv_store_810b4099')
      .upsert({
        key: `user_by_email:${user.email}`,
        value: { user_id: user.id }
      });

    if (mappingError) {
      throw new Error(`Erreur mapping email: ${mappingError.message}`);
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
};

// Fonction pour récupérer un utilisateur depuis le KV store
const getUserFromKVStore = async (supabase: any, userId: string): Promise<MisanUser | null> => {
  try {
    const { data, error } = await supabase
      .from('kv_store_810b4099')
      .select('value')
      .eq('key', `user:${userId}`)
      .single();

    if (error || !data) {
      return null;
    }

    return data.value as MisanUser;
  } catch {
    return null;
  }
};

// Fonction pour récupérer un utilisateur par email
const getUserByEmail = async (supabase: any, email: string): Promise<MisanUser | null> => {
  try {
    // Récupérer le mapping email -> user_id
    const { data: mapping, error: mappingError } = await supabase
      .from('kv_store_810b4099')
      .select('value')
      .eq('key', `user_by_email:${email}`)
      .single();

    if (mappingError || !mapping) {
      return null;
    }

    const userId = mapping.value.user_id;
    return await getUserFromKVStore(supabase, userId);
  } catch {
    return null;
  }
};

// Fonction pour générer les alertes utilisateur
const generateUserAlerts = (user: MisanUser): any[] => {
  const alerts: any[] = [];
  const now = new Date();
  const subscriptionEnd = new Date(user.subscription_end);
  const daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Alertes pour les utilisateurs Premium (essai gratuit)
  if (user.subscription_type === 'premium' && daysUntilExpiry <= 5 && daysUntilExpiry > 0) {
    alerts.push({
      type: 'subscription',
      level: 'warning',
      message: `Votre essai gratuit se termine dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}. Souscrivez à un abonnement Pro pour continuer.`
    });
  }

  if (user.subscription_type === 'premium' && daysUntilExpiry <= 0) {
    alerts.push({
      type: 'subscription',
      level: 'error',
      message: 'Votre essai gratuit a expiré. Souscrivez à un abonnement Pro pour retrouver l\'accès complet.'
    });
  }

  // Alertes pour les jetons faibles
  if (user.tokens_balance < 10000) {
    alerts.push({
      type: 'tokens',
      level: 'warning',
      message: `Il vous reste ${user.tokens_balance.toLocaleString()} jetons. Rechargez votre compte pour continuer.`
    });
  }

  return alerts;
};

// Fonction principale du serveur
Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const functionIndex = pathSegments.indexOf('make-server-810b4099');
    const path = functionIndex >= 0
      ? pathSegments.slice(functionIndex + 1).join('/')
      : pathSegments[pathSegments.length - 1] || '';

    console.log(`📡 Requête reçue: ${req.method} ${path}`);

    const supabaseAdmin = createSupabaseAdmin();

    // Route: Initialiser les templates email (HTML + texte)
    if (path === 'init-email-templates' && req.method === 'POST') {
      const result = await initializeEmailTemplates(supabaseAdmin);
      return new Response(JSON.stringify(result), {
        status: result.success ? 200 : 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Health check
    if (path === 'health' && req.method === 'GET') {
      return new Response(JSON.stringify({
        success: true,
        message: 'Serveur Misan opérationnel',
        timestamp: new Date().toISOString(),
        features: ['auth', 'kv_store', 'user_management']
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Inscription
    if (path === 'signup' && req.method === 'POST') {
      const { email, password, name, grant_free_trial } = await req.json();

      console.log('📝 Tentative d\'inscription:', email);

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await getUserByEmail(supabaseAdmin, email);
      if (existingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Un compte existe déjà avec cette adresse email',
          redirect_to_pricing: true
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Créer l'utilisateur via Supabase Auth
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        user_metadata: { name },
        email_confirm: true
      });

      if (authError || !authUser.user) {
        console.error('❌ Erreur création Auth:', authError?.message);
        return new Response(JSON.stringify({
          success: false,
          error: authError?.message || 'Erreur lors de la création du compte'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Créer le profil utilisateur avec essai gratuit
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + 7); // 7 jours d'essai

      const newUser: MisanUser = {
        id: authUser.user.id,
        email,
        name,
        role: 'premium',
        subscription_type: 'premium',
        subscription_status: 'inactive',
        subscription_start: new Date().toISOString(),
        subscription_end: trialEndDate.toISOString(),
        tokens_balance: grant_free_trial ? 100000 : 0,
        trial_used: grant_free_trial,
        created_at: new Date().toISOString(),
        avatar_url: null,
        secondary_email: null,
        phone: null,
        address: null,
        city: null,
        postal_code: null,
        country: null,
        billing_address: null,
        billing_city: null,
        billing_postal_code: null,
        billing_country: null
      };

      const kvResult = await createUserInKVStore(supabaseAdmin, newUser);
      if (!kvResult.success) {
        console.error('❌ Erreur KV store:', kvResult.error);
        return new Response(JSON.stringify({
          success: false,
          error: 'Erreur lors de la création du profil utilisateur'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      console.log('✅ Inscription réussie:', email);

      try {
        const { data: adminRows } = await supabaseAdmin
          .from('user_profiles')
          .select('email')
          .eq('role', 'admin')
          .not('email', 'is', null);

        const adminEmails = Array.isArray(adminRows)
          ? adminRows.map(row => String(row.email)).filter(Boolean)
          : [];

        await supabaseAdmin
          .from('user_alerts')
          .insert({
            user_id: newUser.id,
            type: 'system',
            level: 'info',
            title: 'Compte en cours d\'approbation',
            message: 'Votre compte est en cours d\'approbation par notre équipe. Vous recevrez un email de confirmation dès son activation.'
          });

        await sendTemplateEmail(supabaseAdmin, 'Inscription', {
          to: email,
          adminEmails,
          variables: {
            user_name: name || email,
            user_email: email
          }
        });
      } catch (emailError) {
        console.error('❌ Erreur envoi email inscription:', emailError);
      }

      return new Response(JSON.stringify({
        success: true,
        message: 'Votre inscription est enregistrée. Vous recevrez un email dès la validation de votre compte.'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Route: Connexion (vérification du statut utilisateur)
    if (path === 'check-user-status' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');

      // Vérifier le token avec Supabase
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Récupérer le profil utilisateur depuis le KV store
      const userProfile = await getUserFromKVStore(supabaseAdmin, user.id);
      if (!userProfile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Profil utilisateur introuvable'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier l'expiration de l'abonnement
      const now = new Date();
      const subscriptionEnd = new Date(userProfile.subscription_end);
      const isExpired = subscriptionEnd < now;

      if (isExpired && userProfile.role !== 'admin') {
        // Mettre à jour le statut si expiré
        userProfile.subscription_status = 'expired';
        await createUserInKVStore(supabaseAdmin, userProfile);
      }

      const { data: dbAlerts, error: dbAlertsError } = await supabaseAdmin
        .from('user_alerts')
        .select('id, type, level, title, message, is_read, is_dismissed, created_at')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (dbAlertsError) {
        console.error('❌ Erreur récupération user_alerts:', dbAlertsError);
      }

      const alertsFromDatabase = Array.isArray(dbAlerts)
        ? dbAlerts.map(alert => ({
            id: alert.id,
            type: alert.type,
            level: alert.level,
            title: alert.title,
            message: alert.message,
            isBlocking: false
          }))
        : [];

      const alerts = [...alertsFromDatabase, ...generateUserAlerts(userProfile)];

      // Déterminer l'accès
      const canAccessAI = userProfile.role === 'admin' || 
                         (userProfile.subscription_status === 'active' && userProfile.tokens_balance > 0);

      const needsUpgrade = userProfile.subscription_status === 'expired' || 
                          userProfile.tokens_balance === 0;

      return new Response(JSON.stringify({
        success: true,
        user: userProfile,
        access: {
          can_access_ai: canAccessAI,
          needs_upgrade: needsUpgrade,
          message: canAccessAI ? 'Accès complet autorisé' : 'Abonnement ou jetons requis'
        },
        alerts
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'validate-order' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const payload = await req.json().catch(() => null);
      const rawCart = Array.isArray(payload?.cart) ? payload.cart : [];

      if (rawCart.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Panier invalide.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let profile: any = null;

      try {
        const { data: pgProfile } = await supabaseAdmin
          .from('user_profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (pgProfile) {
          profile = pgProfile;
        }
      } catch (pgError) {
        console.log('⚠️ Impossible de récupérer le profil via PostgreSQL:', pgError?.message);
      }

      if (!profile) {
        profile = await getUserFromKVStore(supabaseAdmin, user.id);
      }

      if (!profile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Profil utilisateur introuvable'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const cartItems = rawCart.map((item: any) => ({
        type: typeof item?.type === 'string' ? String(item.type).toLowerCase() : '',
        planType: typeof item?.planType === 'string' ? String(item.planType).toLowerCase() : null
      }));

      if (cartItems.some(item => item.type !== 'subscription' && item.type !== 'tokens')) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Type d\'article inconnu dans le panier.'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (profile.trial_used && profile.subscription_type === 'premium') {
        const hasSubscription = cartItems.some(item => item.type === 'subscription');
        const invalidPlan = cartItems.some(item => item.type === 'subscription' && item.planType && item.planType !== 'pro');

        if (!hasSubscription) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Votre période d\'essai est terminée. Un seul abonnement gratuit est autorisé par compte. Souscrivez à l\'abonnement Pro pour continuer à utiliser l\'IA.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (invalidPlan) {
          return new Response(JSON.stringify({
            success: false,
            error: 'L\'abonnement Premium gratuit ne peut pas être renouvelé. Un seul abonnement gratuit est autorisé par compte. Choisissez plutôt l\'abonnement Pro.'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'update-profile' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const payload = await req.json();

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const normalizeString = (value: unknown) => {
        if (value === null || value === undefined) return null;
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed.length === 0 ? null : trimmed;
      };

      const sanitizedUpdates: Partial<MisanUser> & {
        email?: string;
        avatar_url?: string | null;
        secondary_email?: string | null;
        phone?: string | null;
        address?: string | null;
        city?: string | null;
        postal_code?: string | null;
        country?: string | null;
        billing_address?: string | null;
        billing_city?: string | null;
        billing_postal_code?: string | null;
        billing_country?: string | null;
        tokens_balance?: number;
      } = {};

      if (typeof payload.name === 'string') {
        const trimmed = payload.name.trim();
        if (trimmed.length > 0) {
          sanitizedUpdates.name = trimmed;
        }
      }

      if (typeof payload.email === 'string') {
        const trimmedEmail = payload.email.trim().toLowerCase();
        if (!emailRegex.test(trimmedEmail)) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Adresse email invalide'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        sanitizedUpdates.email = trimmedEmail;
      }

      if (typeof payload.avatar === 'string') {
        const trimmedAvatar = payload.avatar.trim();
        sanitizedUpdates.avatar_url = trimmedAvatar.length > 0 ? trimmedAvatar : null;
      }

      if (payload.secondary_email !== undefined) {
        if (payload.secondary_email === null || payload.secondary_email === '') {
          sanitizedUpdates.secondary_email = null;
        } else if (typeof payload.secondary_email === 'string') {
          const trimmed = payload.secondary_email.trim().toLowerCase();
          if (!emailRegex.test(trimmed)) {
            return new Response(JSON.stringify({
              success: false,
              error: 'Adresse email secondaire invalide'
            }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
          sanitizedUpdates.secondary_email = trimmed;
        }
      }

      if (payload.phone !== undefined) {
        sanitizedUpdates.phone = normalizeString(payload.phone);
      }

      sanitizedUpdates.address = normalizeString(payload.address);
      sanitizedUpdates.city = normalizeString(payload.city);
      sanitizedUpdates.postal_code = normalizeString(payload.postal_code);
      sanitizedUpdates.country = normalizeString(payload.country);

      sanitizedUpdates.billing_address = normalizeString(payload.billing_address);
      sanitizedUpdates.billing_city = normalizeString(payload.billing_city);
      sanitizedUpdates.billing_postal_code = normalizeString(payload.billing_postal_code);
      sanitizedUpdates.billing_country = normalizeString(payload.billing_country);

      if (typeof payload.tokens_balance === 'number' && Number.isFinite(payload.tokens_balance)) {
        sanitizedUpdates.tokens_balance = Math.max(0, Math.round(payload.tokens_balance));
      }

      if (Object.keys(sanitizedUpdates).length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Aucune donnée à mettre à jour'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existingProfile = await getUserFromKVStore(supabaseAdmin, user.id);
      if (!existingProfile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Profil utilisateur introuvable'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const updatedProfile: MisanUser = {
        ...existingProfile,
        ...sanitizedUpdates,
        updated_at: new Date().toISOString(),
        email: sanitizedUpdates.email || existingProfile.email,
        name: sanitizedUpdates.name || existingProfile.name,
        avatar: sanitizedUpdates.avatar_url ?? existingProfile.avatar ?? null,
        avatar_url: sanitizedUpdates.avatar_url ?? existingProfile.avatar_url ?? null,
        tokens_balance: sanitizedUpdates.tokens_balance ?? existingProfile.tokens_balance
      };

      try {
        if (sanitizedUpdates.email && sanitizedUpdates.email !== existingProfile.email) {
          await supabaseAdmin
            .from('kv_store_810b4099')
            .delete()
            .eq('key', `user_by_email:${existingProfile.email}`);
        }

        const kvResult = await createUserInKVStore(supabaseAdmin, updatedProfile);
        if (!kvResult.success) {
          throw new Error(kvResult.error || 'Erreur lors de la mise à jour du profil');
        }

        const profileUpdate: Record<string, unknown> = {
          name: updatedProfile.name,
          email: updatedProfile.email,
          phone: updatedProfile.phone ?? null,
          secondary_email: updatedProfile.secondary_email ?? null,
          address: updatedProfile.address ?? null,
          city: updatedProfile.city ?? null,
          postal_code: updatedProfile.postal_code ?? null,
          country: updatedProfile.country ?? null,
          billing_address: updatedProfile.billing_address ?? null,
          billing_city: updatedProfile.billing_city ?? null,
          billing_postal_code: updatedProfile.billing_postal_code ?? null,
          billing_country: updatedProfile.billing_country ?? null,
          tokens_balance: updatedProfile.tokens_balance ?? 0,
          avatar_url: updatedProfile.avatar_url ?? null,
          updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update(profileUpdate)
          .eq('id', user.id);

        if (profileError) {
          throw new Error(`Erreur mise à jour user_profiles: ${profileError.message}`);
        }

        if (sanitizedUpdates.name || sanitizedUpdates.email) {
          const { error: authUpdateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
            email: updatedProfile.email,
            user_metadata: {
              ...(user.user_metadata || {}),
              name: updatedProfile.name
            }
          });

          if (authUpdateError) {
            throw new Error(`Erreur mise à jour Auth: ${authUpdateError.message}`);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Profil mis à jour',
          user: updatedProfile
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Erreur mise à jour profil:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message || 'Erreur lors de la mise à jour du profil'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }
    if (path === 'admin/update-user' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: actingUser }, error: actingUserError } = await supabaseAdmin.auth.getUser(token);

      if (actingUserError || !actingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const actingProfile = await getUserFromKVStore(supabaseAdmin, actingUser.id);
      if (!actingProfile || actingProfile.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Accès refusé'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }

    const payload = await req.json();
    const userId = payload?.user_id;

      if (!userId || typeof userId !== 'string') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Identifiant utilisateur manquant'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existingProfile = await getUserFromKVStore(supabaseAdmin, userId);
      if (!existingProfile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Profil utilisateur introuvable'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const updatedProfile: MisanUser = {
        ...existingProfile,
        updated_at: new Date().toISOString()
      };

      if (typeof payload.name === 'string' && payload.name.trim().length > 0) {
        updatedProfile.name = payload.name.trim();
      }

      if (typeof payload.role === 'string') {
        updatedProfile.role = normalizeRole(payload.role, existingProfile.role);
      }

      if (typeof payload.status === 'string') {
        updatedProfile.subscription_status = normalizeStatus(payload.status, existingProfile.subscription_status);
      }

      if (typeof payload.subscriptionType === 'string') {
        updatedProfile.subscription_type = normalizeSubscriptionType(payload.subscriptionType, existingProfile.subscription_type);
      }

      if (typeof payload.tokens === 'number' && Number.isFinite(payload.tokens)) {
        const sanitizedTokens = Math.max(0, Math.round(payload.tokens));
        updatedProfile.tokens_balance = sanitizedTokens;
      }

      if (typeof payload.subscriptionStart === 'string') {
        const isoStart = toIsoDate(payload.subscriptionStart, existingProfile.subscription_start);
        if (isoStart) {
          updatedProfile.subscription_start = isoStart;
        }
      }

      if (typeof payload.subscriptionEnd === 'string') {
        const isoEnd = toIsoDate(payload.subscriptionEnd, existingProfile.subscription_end);
        if (isoEnd) {
          updatedProfile.subscription_end = isoEnd;
        }
      }

      const previousStatus = existingProfile.subscription_status;

      try {
        const kvResult = await createUserInKVStore(supabaseAdmin, updatedProfile);
        if (!kvResult.success) {
          throw new Error(kvResult.error || 'Erreur lors de la mise à jour du profil');
        }

        const dbRole = normalizeRole(updatedProfile.role, updatedProfile.role);
        const dbSubscriptionType = normalizeSubscriptionType(updatedProfile.subscription_type, updatedProfile.subscription_type);
        const dbStatus = normalizeStatus(updatedProfile.subscription_status, updatedProfile.subscription_status);

        const profileUpdate: Record<string, unknown> = {
          name: updatedProfile.name,
          role: dbRole,
          subscription_type: dbSubscriptionType,
          subscription_status: dbStatus,
          tokens_balance: updatedProfile.tokens_balance,
          avatar_url: updatedProfile.avatar_url ?? existingProfile.avatar_url ?? null,
          secondary_email: updatedProfile.secondary_email ?? null,
          phone: updatedProfile.phone ?? null,
          address: updatedProfile.address ?? null,
          city: updatedProfile.city ?? null,
          postal_code: updatedProfile.postal_code ?? null,
          country: updatedProfile.country ?? null,
          billing_address: updatedProfile.billing_address ?? null,
          billing_city: updatedProfile.billing_city ?? null,
          billing_postal_code: updatedProfile.billing_postal_code ?? null,
          billing_country: updatedProfile.billing_country ?? null,
          subscription_start: updatedProfile.subscription_start,
          subscription_end: updatedProfile.subscription_end,
          updated_at: new Date().toISOString()
        };

        const { error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update(profileUpdate)
          .eq('id', userId);

        if (profileError) {
          console.error('❌ Erreur mise à jour user_profiles:', profileError);
        }

        const primaryEmail = updatedProfile.email || existingProfile.email || null;
        const displayName = updatedProfile.name || existingProfile.name || primaryEmail || 'utilisateur';
        const statusChanged = previousStatus !== dbStatus;

        if (primaryEmail && statusChanged) {
          try {
            if (dbStatus === 'active' && previousStatus !== 'active') {
              await sendTemplateEmail(supabaseAdmin, 'Confirmation inscription', {
                to: primaryEmail,
                variables: { user_name: displayName }
              });

              await supabaseAdmin
                .from('user_alerts')
                .update({ is_read: true, is_dismissed: true })
                .eq('user_id', userId)
                .eq('type', 'system');
            } else if (previousStatus === 'active' && dbStatus !== 'active') {
              await sendTemplateEmail(supabaseAdmin, 'Avertissement suspension', {
                to: primaryEmail,
                variables: { user_name: displayName }
              });

              await supabaseAdmin
                .from('user_alerts')
                .insert({
                  user_id: userId,
                  type: 'system',
                  level: 'warning',
                  title: dbStatus === 'inactive' ? 'Compte temporairement désactivé' : 'Compte en cours d\'approbation',
                  message: dbStatus === 'inactive'
                    ? 'Votre compte est temporairement désactivé par l\'administrateur. Contactez le support pour plus d\'informations.'
                    : 'Votre compte est en cours d\'approbation. Vous serez averti dès sa réactivation.'
                });
            }
          } catch (emailError) {
            console.error('❌ Erreur envoi email statut utilisateur:', emailError);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Utilisateur mis à jour',
          user: updatedProfile
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Erreur mise à jour admin utilisateur:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur lors de la mise à jour de l\'utilisateur'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    if (path === 'admin/update-order' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: actingUser }, error: actingUserError } = await supabaseAdmin.auth.getUser(token);

      if (actingUserError || !actingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const actingProfile = await getUserFromKVStore(supabaseAdmin, actingUser.id);
      if (!actingProfile || actingProfile.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Accès refusé'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let payload: any;
      try {
        payload = await req.json();
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Corps de requête invalide'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orderId = typeof payload?.orderId === 'string' ? payload.orderId.trim() : '';
      const targetStatus = payload?.status;

      if (!orderId) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Identifiant de commande manquant'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const allowedStatuses = ['paid', 'pending', 'overdue', 'cancelled'];
      if (!allowedStatuses.includes(targetStatus)) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Statut de commande invalide'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const payment = payload?.payment ?? {};
      const summary = payload?.summary ?? {};
      const billingInfo = payload?.billingInfo;
      const userUpdate = payload?.user ?? null;

      const { data: invoiceRow, error: invoiceError } = await supabaseAdmin
        .from('invoices')
        .select('id, user_id, transaction_id, status, subtotal_da, tax_amount_da, total_da, billing_address, line_items, issue_date, due_date, notes, currency')
        .eq('invoice_number', orderId)
        .maybeSingle();

      if (invoiceError || !invoiceRow) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Commande introuvable'
        }), {
          status: invoiceError ? 500 : 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const previousInvoiceStatus: string = invoiceRow.status;

      const resolveInvoiceStatus = (status: string, method: string | undefined): string => {
        switch (status) {
          case 'paid':
            return 'paid';
          case 'cancelled':
            return 'cancelled';
          case 'overdue':
            return 'overdue';
          default:
            return method === 'bank_transfer' ? 'bank_pending' : 'pending';
        }
      };

      const resolveTransactionStatus = (status: string): string => {
        switch (status) {
          case 'paid':
            return 'paid';
          case 'cancelled':
            return 'cancelled';
          case 'overdue':
            return 'pending';
          default:
            return 'pending';
        }
      };

      const paymentMethod = typeof payment?.method === 'string' ? payment.method : 'bank_transfer';
      const invoiceStatus = resolveInvoiceStatus(targetStatus, paymentMethod);
      const transactionStatus = resolveTransactionStatus(targetStatus);

      let normalizedPaymentDate: string | null = null;
      if (typeof payment?.paymentDate === 'string' && payment.paymentDate.trim().length > 0) {
        const parsed = new Date(payment.paymentDate);
        if (!Number.isNaN(parsed.getTime())) {
          normalizedPaymentDate = parsed.toISOString();
        }
      }

      const nowIso = new Date().toISOString();

      const invoiceUpdate: Record<string, unknown> = {
        status: invoiceStatus,
        subtotal_da: typeof summary?.subtotalHT === 'number'
          ? Math.round(summary.subtotalHT)
          : invoiceRow.subtotal_da,
        tax_amount_da: typeof summary?.vat === 'number'
          ? Math.round(summary.vat)
          : invoiceRow.tax_amount_da,
        total_da: typeof summary?.totalTTC === 'number'
          ? Math.round(summary.totalTTC)
          : invoiceRow.total_da,
        updated_at: nowIso,
        paid_at: invoiceStatus === 'paid' ? (normalizedPaymentDate ?? nowIso) : null
      };

      if (billingInfo && typeof billingInfo === 'object') {
        invoiceUpdate.billing_address = billingInfo;
      }

      const { error: invoiceUpdateError } = await supabaseAdmin
        .from('invoices')
        .update(invoiceUpdate)
        .eq('invoice_number', orderId);

      if (invoiceUpdateError) {
        return new Response(JSON.stringify({
          success: false,
          error: `Erreur lors de la mise à jour de la commande: ${invoiceUpdateError.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const transactionUpdate: Record<string, unknown> = {
        payment_method: PAYMENT_METHOD_DB_MAP[paymentMethod] ?? 'bank_transfer',
        status: transactionStatus,
        payment_date: transactionStatus === 'paid' ? (normalizedPaymentDate ?? nowIso) : null,
        reference_id: typeof payment?.reference === 'string' && payment.reference.trim().length > 0
          ? payment.reference.trim()
          : null,
        updated_at: nowIso
      };

      const transactionId = invoiceRow.transaction_id;

      if (transactionId) {
        const { error: transactionError } = await supabaseAdmin
          .from('transactions')
          .update(transactionUpdate)
          .eq('id', transactionId);

        if (transactionError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Erreur mise à jour transaction: ${transactionError.message}`
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      } else {
        const { error: transactionError } = await supabaseAdmin
          .from('transactions')
          .update(transactionUpdate)
          .eq('invoice_number', orderId);

        if (transactionError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Erreur mise à jour transaction: ${transactionError.message}`
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      if (userUpdate && invoiceRow.user_id) {
        const existingProfile = await getUserFromKVStore(supabaseAdmin, invoiceRow.user_id);

        const normalizedStatus = typeof userUpdate?.status === 'string'
          ? normalizeStatus(userUpdate.status, existingProfile?.subscription_status ?? 'inactive')
          : existingProfile?.subscription_status ?? 'inactive';

        const subscriptionStart = typeof userUpdate?.subscriptionStart === 'string'
          ? userUpdate.subscriptionStart
          : (existingProfile?.subscription_start ?? null);

        const subscriptionEnd = typeof userUpdate?.subscriptionEnd === 'string'
          ? userUpdate.subscriptionEnd
          : (existingProfile?.subscription_end ?? null);

        const profileUpdate: Record<string, unknown> = {
          subscription_status: normalizedStatus,
          subscription_start: subscriptionStart,
          subscription_end: subscriptionEnd,
          updated_at: nowIso
        };

        const { data: profileRow, error: profileError } = await supabaseAdmin
          .from('user_profiles')
          .update(profileUpdate)
          .eq('id', invoiceRow.user_id)
          .select('*')
          .maybeSingle();

        if (profileError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Erreur mise à jour profil utilisateur: ${profileError.message}`
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        if (profileRow && existingProfile) {
          const updatedProfile: MisanUser = {
            ...existingProfile,
            subscription_status: normalizeStatus(String(profileRow.subscription_status), existingProfile.subscription_status),
            subscription_type: normalizeSubscriptionType(String(profileRow.subscription_type ?? existingProfile.subscription_type), existingProfile.subscription_type),
            subscription_start: profileRow.subscription_start ?? existingProfile.subscription_start,
            subscription_end: profileRow.subscription_end ?? existingProfile.subscription_end,
            tokens_balance: profileRow.tokens_balance ?? existingProfile.tokens_balance,
            name: profileRow.name ?? existingProfile.name,
            email: profileRow.email ?? existingProfile.email,
            updated_at: nowIso
          };

          const kvResult = await createUserInKVStore(supabaseAdmin, updatedProfile);
          if (!kvResult.success) {
            console.warn('[admin/update-order] Impossible de synchroniser le profil KV:', kvResult.error);
          }
        }
      }

      if (invoiceStatus === 'paid' && previousInvoiceStatus !== 'paid') {
        try {
          const profile = await (async () => {
            const kvProfile = await getUserFromKVStore(supabaseAdmin, invoiceRow.user_id);
            if (kvProfile) {
              return kvProfile;
            }
            const { data, error } = await supabaseAdmin
              .from('user_profiles')
              .select('email, name, phone')
              .eq('id', invoiceRow.user_id)
              .maybeSingle();
            if (error || !data) {
              return null;
            }
            return {
              email: data.email ?? null,
              name: data.name ?? null,
              phone: data.phone ?? null
            } as Partial<MisanUser>;
          })();

          const userEmail = profile?.email ? String(profile.email) : null;
          if (userEmail) {
            const methodLabel = PAYMENT_LABELS[paymentMethod] ?? paymentMethod;
            const amountValue = Number(invoiceUpdate.total_da ?? invoiceRow.total_da ?? 0);
            const formattedAmount = formatCurrency(amountValue, invoiceRow.currency ?? 'DZD');
            const paymentReference = (typeof transactionUpdate.reference_id === 'string' && transactionUpdate.reference_id.trim().length > 0)
              ? transactionUpdate.reference_id.trim()
              : (typeof payment?.reference === 'string' ? payment.reference.trim() : undefined);

            const billingAddress = (() => {
              const source = (invoiceUpdate.billing_address ?? invoiceRow.billing_address ?? {}) as Record<string, unknown>;
              return {
                street: typeof source.street === 'string' ? source.street : '',
                city: typeof source.city === 'string' ? source.city : '',
                postalCode: typeof source.postalCode === 'string'
                  ? source.postalCode
                  : (typeof source.postal_code === 'string' ? source.postal_code : ''),
                country: typeof source.country === 'string' ? source.country : ''
              };
            })();

            const lines = Array.isArray(invoiceRow.line_items)
              ? invoiceRow.line_items.map((item: any, index: number) => ({
                  label: typeof item.label === 'string' ? item.label : `Article ${index + 1}`,
                  quantity: Number(item.quantity) || 1,
                  unitPrice: Number(item.unit_price_ht ?? item.unit_price ?? item.total_ht ?? 0) || 0,
                  total: Number(item.total_ht ?? item.total ?? item.unit_price_ht ?? 0) || 0,
                  description: typeof item.description === 'string' ? item.description : null
                }))
              : [{
                  label: 'Commande Misan',
                  quantity: 1,
                  unitPrice: Number(invoiceRow.subtotal_da ?? amountValue),
                  total: amountValue,
                  description: typeof invoiceRow.notes === 'string' ? invoiceRow.notes : null
                }];

            const invoiceHtml = generateInvoiceHtmlForEmail({
              invoiceNumber: orderId,
              orderNumber: orderId,
              createdAt: invoiceRow.issue_date ?? null,
              dueDate: invoiceRow.due_date ?? null,
              status: 'paid',
              paymentMethod: methodLabel,
              paymentDate: normalizedPaymentDate,
              paymentReference,
              description: invoiceRow.notes ?? null,
              currency: invoiceRow.currency ?? 'DZD',
              total: amountValue,
              subtotal: Number(invoiceUpdate.subtotal_da ?? invoiceRow.subtotal_da ?? amountValue),
              vat: Number(invoiceUpdate.tax_amount_da ?? invoiceRow.tax_amount_da ?? 0),
              lines,
              billing: {
                name: profile?.name ? String(profile.name) : userEmail,
                email: userEmail,
                phone: profile?.phone ? String(profile.phone) : null,
                street: billingAddress.street,
                city: billingAddress.city,
                postalCode: billingAddress.postalCode,
                country: billingAddress.country
              }
            });

            const encodedInvoice = encodeHtmlToBase64(invoiceHtml);

            const variables = {
              payment_status: 'Payé',
              payment_method: methodLabel,
              payment_reference: paymentReference,
              payment_message: undefined,
              instructions: typeof payment?.instructions === 'string' ? payment.instructions : undefined,
              amount: formattedAmount,
              order_reference: orderId,
              invoice_id: orderId
            } as Record<string, string | undefined>;

            const notifyAdmin = paymentMethod === 'bank_transfer';
            let adminCopies: string[] = [];
            if (notifyAdmin) {
              adminCopies = await fetchAdminEmails(supabaseAdmin);
              adminCopies = adminCopies.filter(email => email && email !== userEmail);
            }

            const emailResult = await sendTemplateEmail(supabaseAdmin, 'Confirmation paiement en ligne', {
              to: userEmail,
              cc: adminCopies.length > 0 ? adminCopies : undefined,
              variables,
              attachments: [
                {
                  name: `${orderId}.html`,
                  content: encodedInvoice,
                  type: 'text/html'
                }
              ]
            });

            if (!emailResult.success) {
              console.error('[admin/update-order] Échec envoi email confirmation paiement:', emailResult.error);
            }
          }
        } catch (emailError) {
          console.error('[admin/update-order] Impossible d\'envoyer l\'email de confirmation paiement:', emailError);
        }
      }

      return new Response(JSON.stringify({
        success: true
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'admin/delete-orders' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: actingUser }, error: actingUserError } = await supabaseAdmin.auth.getUser(token);

      if (actingUserError || !actingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const actingProfile = await getUserFromKVStore(supabaseAdmin, actingUser.id);
      if (!actingProfile || actingProfile.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Accès refusé'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      let payload: any;
      try {
        payload = await req.json();
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Corps de requête invalide'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const orderIds = Array.isArray(payload?.orderIds)
        ? payload.orderIds
            .filter((value: unknown) => typeof value === 'string' && value.trim().length > 0)
            .map((value: string) => value.trim())
        : [];

      if (orderIds.length === 0) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Aucune commande à supprimer'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const { data: invoices, error: invoicesError } = await supabaseAdmin
        .from('invoices')
        .select('id, invoice_number, transaction_id')
        .in('invoice_number', orderIds);

      if (invoicesError) {
        return new Response(JSON.stringify({
          success: false,
          error: `Erreur lecture commandes: ${invoicesError.message}`
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (!invoices || invoices.length === 0) {
        return new Response(JSON.stringify({ success: true, deleted: 0 }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const invoiceNumbers = Array.from(new Set(invoices.map((row: any) => String(row.invoice_number))));

      if (invoiceNumbers.length > 0) {
        const invoiceIds = invoices.map((row: any) => row.id).filter((id: any) => typeof id === 'string');
        const transactionIds = invoices
          .map((row: any) => row.transaction_id)
          .filter((value: any) => typeof value === 'string' && value.length > 0);

        if (transactionIds.length > 0 && invoiceIds.length > 0) {
          const { error: unlinkError } = await supabaseAdmin
            .from('invoices')
            .update({ transaction_id: null })
            .in('id', invoiceIds);

          if (unlinkError) {
            return new Response(JSON.stringify({
              success: false,
              error: `Erreur dissociation transactions: ${unlinkError.message}`
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        if (transactionIds.length > 0) {
          const { error: transactionDeleteError } = await supabaseAdmin
            .from('transactions')
            .delete()
            .in('id', transactionIds);

          if (transactionDeleteError) {
            return new Response(JSON.stringify({
              success: false,
              error: `Erreur suppression transactions: ${transactionDeleteError.message}`
            }), {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
          }
        }

        const { error: invoiceDeleteError } = await supabaseAdmin
          .from('invoices')
          .delete()
          .in('invoice_number', invoiceNumbers);

        if (invoiceDeleteError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Erreur suppression commandes: ${invoiceDeleteError.message}`
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({ success: true, deleted: invoiceNumbers.length }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'admin/delete-user' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user: actingUser }, error: actingUserError } = await supabaseAdmin.auth.getUser(token);

      if (actingUserError || !actingUser) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide ou expiré'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const actingProfile = await getUserFromKVStore(supabaseAdmin, actingUser.id);
      if (!actingProfile || actingProfile.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Accès refusé'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const deletePayload = await req.json();
      const deleteUserId = deletePayload?.user_id;

      if (!deleteUserId || typeof deleteUserId !== 'string') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Identifiant utilisateur manquant'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      if (deleteUserId === actingUser.id) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Impossible de supprimer votre propre compte'
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const existingProfile = await getUserFromKVStore(supabaseAdmin, deleteUserId);
      if (!existingProfile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Profil utilisateur introuvable'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        if (existingProfile.email) {
          await supabaseAdmin
            .from('kv_store_810b4099')
            .delete()
            .eq('key', `user_by_email:${existingProfile.email}`);
        }

        await supabaseAdmin
          .from('kv_store_810b4099')
          .delete()
          .eq('key', `user:${deleteUserId}`);

        const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(deleteUserId);
        if (authDeleteError) {
          throw authDeleteError;
        }

        try {
          const { data: adminRows } = await supabaseAdmin
            .from('user_profiles')
            .select('email')
            .eq('role', 'admin')
            .not('email', 'is', null);

          const { data: deletedProfileRow } = await supabaseAdmin
            .from('user_profiles')
            .select('email,name')
            .eq('id', deleteUserId)
            .maybeSingle();

          const adminEmails = Array.isArray(adminRows)
            ? adminRows.map(row => String(row.email)).filter(Boolean)
            : [];

          const primaryEmail = existingProfile.email
            ? String(existingProfile.email)
            : deletedProfileRow?.email
              ? String(deletedProfileRow.email)
              : null;

          const displayName = existingProfile.name
            || deletedProfileRow?.name
            || primaryEmail
            || 'utilisateur';

          const supportEmail = Deno.env.get('SUPPORT_EMAIL')?.trim() || 'contact.misan@parene.org';

          const emailResult = primaryEmail
            ? await sendTemplateEmail(supabaseAdmin, 'Confirmation suppression compte', {
                to: primaryEmail,
                bcc: adminEmails,
                variables: { user_name: displayName, support_email: supportEmail },
              })
            : adminEmails.length > 0
              ? await sendTemplateEmail(supabaseAdmin, 'Confirmation suppression compte', {
                  to: adminEmails[0],
                  cc: adminEmails.slice(1),
                  variables: { user_name: displayName, support_email: supportEmail },
                })
              : { success: false, error: 'Aucun destinataire pour l\'email de suppression.' };

          if (!emailResult.success) {
            console.error('❌ Envoi email suppression utilisateur échoué:', emailResult.error);
          }
        } catch (emailError) {
          console.error('❌ Erreur envoi email suppression utilisateur:', emailError);
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Utilisateur supprimé'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Erreur suppression utilisateur:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : 'Erreur lors de la suppression de l\'utilisateur'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Consommer des jetons
    if (path === 'consume-tokens' && req.method === 'POST') {
      const { amount } = await req.json();
      const authHeader = req.headers.get('Authorization');
      
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const userProfile = await getUserFromKVStore(supabaseAdmin, user.id);
      if (!userProfile) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Profil utilisateur introuvable'
        }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier si l'utilisateur a assez de jetons (sauf admin)
      if (userProfile.role !== 'admin' && userProfile.tokens_balance < amount) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Jetons insuffisants',
          remaining_balance: userProfile.tokens_balance
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Déduire les jetons (sauf pour admin)
      if (userProfile.role !== 'admin') {
        userProfile.tokens_balance -= amount;
        const updateResult = await createUserInKVStore(supabaseAdmin, userProfile);
        
        if (!updateResult.success) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Erreur lors de la mise à jour du solde'
          }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
      }

      return new Response(JSON.stringify({
        success: true,
        remaining_balance: userProfile.tokens_balance,
        consumed: amount
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (path === 'notifications/payment-event' && req.method === 'POST') {
      try {
        const payload = await req.json();
        console.log('✉️ Notification paiement', payload?.event, payload?.user_email);
        const event: string | undefined = payload?.event;
        const userEmail: string | undefined = payload?.user_email;
        const userName: string | undefined = payload?.user_name;
        const amount: string | undefined = payload?.amount;
        const orderReference: string | undefined = payload?.order_reference;
        const variablesExtra: Record<string, string | number | boolean | null | undefined> = payload?.variables ?? {};

        if (!userEmail || typeof userEmail !== 'string') {
          return new Response(JSON.stringify({ success: false, error: 'Adresse email manquante' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        let templateName: string;
        switch (event) {
          case 'order_pending':
          case 'order_created':
            templateName = 'Confirmation achat';
            break;
          case 'payment_confirmed':
            templateName = 'Confirmation paiement en ligne';
            break;
          case 'bank_transfer_received':
            templateName = 'Réception virement';
            break;
          default:
            return new Response(JSON.stringify({ success: false, error: 'Type d\'évènement inconnu' }), {
              status: 400,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const attachments = Array.isArray(payload?.attachments)
          ? payload.attachments
              .filter((item: any) => item && typeof item.name === 'string' && typeof item.content === 'string')
              .map((item: any) => ({
                name: item.name,
                content: item.content,
                type: typeof item.type === 'string' ? item.type : undefined,
              }))
          : undefined;

        const variables = {
          user_name: userName || userEmail,
          amount,
          order_reference: orderReference,
          ...variablesExtra,
        };

        let adminCopies: string[] = [];
        if (payload?.notify_admin) {
          adminCopies = await fetchAdminEmails(supabaseAdmin);
          if (adminCopies.length === 0) {
            const fallback = Deno.env.get('SUPPORT_EMAIL')?.trim();
            if (fallback) {
              adminCopies = [fallback];
            }
          }
          adminCopies = adminCopies.filter(email => email && email !== userEmail);
        }

        const result = await sendTemplateEmail(supabaseAdmin, templateName, {
          to: userEmail,
          cc: adminCopies.length > 0 ? adminCopies : undefined,
          variables,
          attachments,
        });

        if (!result.success) {
          return new Response(JSON.stringify({ success: false, error: result.error || 'Envoi impossible' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        return new Response(JSON.stringify({ success: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        console.error('❌ Erreur notification email paiement:', error);
        return new Response(JSON.stringify({ success: false, error: 'Erreur serveur' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Récupérer la configuration d'essai gratuit
    if (path === 'free-trial-config' && req.method === 'GET') {
      try {
        // Récupérer les paramètres d'essai gratuit depuis le KV store
        const { data: durationData } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('value')
          .eq('key', 'system_setting:trial_duration_days')
          .single();

        const { data: tokensData } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('value')
          .eq('key', 'system_setting:trial_tokens_amount')
          .single();

        const { data: enabledData } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('value')
          .eq('key', 'system_setting:trial_enabled')
          .single();

        const config = {
          duration_days: parseInt(durationData?.value?.value || '7'),
          tokens_amount: parseInt(tokensData?.value?.value || '100000'),
          enabled: enabledData?.value?.value === 'true' || true
        };

        return new Response(JSON.stringify({
          success: true,
          config
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Mettre à jour la configuration d'essai gratuit (admin seulement)
    if (path === 'admin/update-trial-config' && req.method === 'POST') {
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token d\'authentification manquant'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

      if (userError || !user) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Token invalide'
        }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Vérifier que l'utilisateur est admin
      const userProfile = await getUserFromKVStore(supabaseAdmin, user.id);
      if (!userProfile || userProfile.role !== 'admin') {
        return new Response(JSON.stringify({
          success: false,
          error: 'Accès refusé - Privilèges administrateur requis'
        }), {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      try {
        const { duration_days, tokens_amount, enabled } = await req.json();

        // Valider les données
        if (duration_days < 1 || duration_days > 365) {
          throw new Error('La durée doit être entre 1 et 365 jours');
        }
        if (tokens_amount < 0 || tokens_amount > 10000000) {
          throw new Error('Le nombre de jetons doit être entre 0 et 10,000,000');
        }

        // Mettre à jour les paramètres dans le KV store
        const updates = [
          {
            key: 'system_setting:trial_duration_days',
            value: { value: duration_days.toString(), description: 'Durée de l\'essai gratuit en jours' }
          },
          {
            key: 'system_setting:trial_tokens_amount',
            value: { value: tokens_amount.toString(), description: 'Nombre de jetons accordés lors de l\'essai gratuit' }
          },
          {
            key: 'system_setting:trial_enabled',
            value: { value: enabled.toString(), description: 'Essai gratuit activé ou désactivé' }
          }
        ];

        for (const update of updates) {
          const { error } = await supabaseAdmin
            .from('kv_store_810b4099')
            .upsert(update);

          if (error) {
            throw new Error(`Erreur mise à jour ${update.key}: ${error.message}`);
          }
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Configuration mise à jour avec succès'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Initialiser la base de données
    if (path === 'init-database' && req.method === 'GET') {
      console.log('🚀 Initialisation de la base de données Misan...');

      try {
        // Vérifier si la table KV store existe
        const { data: tableCheck, error: tableError } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('key')
          .limit(1);

        if (tableError && tableError.message.includes('does not exist')) {
          return new Response(JSON.stringify({
            success: false,
            error: 'Table kv_store_810b4099 non trouvée. Veuillez exécuter les migrations Supabase d\'abord.',
            message: 'Exécutez le script SQL de migration dans Supabase Dashboard → SQL Editor'
          }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Vérifier si l'admin existe déjà
        const existingAdmin = await getUserByEmail(supabaseAdmin, 'a@a.a');
        if (existingAdmin) {
          return new Response(JSON.stringify({
            success: true,
            message: 'Base de données déjà initialisée',
            admin_user: existingAdmin,
            storage: 'kv_store',
            features: ['auth', 'user_management', 'token_system']
          }), {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }

        // Créer l'utilisateur admin
        const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
          email: 'a@a.a',
          password: 'admin',
          user_metadata: {
            name: 'Administrateur Misan',
            role: 'admin'
          },
          email_confirm: true
        });

        if (adminAuthError || !adminAuth.user) {
          throw new Error(`Erreur création admin Auth: ${adminAuthError?.message}`);
        }

        // Créer le profil admin
        const adminUser: MisanUser = {
          id: adminAuth.user.id,
          email: 'a@a.a',
          name: 'Administrateur Misan',
          role: 'admin',
          subscription_type: 'admin',
          subscription_status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_end: '2030-12-31T23:59:59Z',
          tokens_balance: 999999999,
          trial_used: false,
          created_at: new Date().toISOString()
        };

        const kvResult = await createUserInKVStore(supabaseAdmin, adminUser);
        if (!kvResult.success) {
          throw new Error(`Erreur création profil admin: ${kvResult.error}`);
        }

        // Initialiser les paramètres système
        const systemSettings = {
          'trial_duration_days': '7',
          'trial_tokens_amount': '100000',
          'trial_enabled': 'true',
          'monthly_subscription_price': '4000',
          'app_version': '1.0.0',
          'support_email': 'support@misan.dz'
        };

        for (const [key, value] of Object.entries(systemSettings)) {
          await supabaseAdmin
            .from('kv_store_810b4099')
            .upsert({
              key: `system_setting:${key}`,
              value: { value, description: `Paramètre: ${key}` }
            });
        }

        console.log('✅ Base de données initialisée avec succès');

        return new Response(JSON.stringify({
          success: true,
          message: 'Base de données initialisée avec succès',
          admin_user: adminUser,
          storage: 'kv_store',
          features: ['auth', 'user_management', 'token_system'],
          next_steps: [
            'Connectez-vous avec a@a.a / admin',
            'Testez les fonctionnalités',
            'Configurez les paramètres selon vos besoins'
          ]
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('❌ Erreur initialisation:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
          message: 'Erreur lors de l\'initialisation'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Créer/réactiver l'utilisateur admin
    if (path === 'create-admin-user' && req.method === 'POST') {
      console.log('👑 Création/Réactivation de l\'utilisateur admin...');

      try {
        // Vérifier si l'admin existe déjà dans Auth
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingAdmin = existingUsers?.users?.find(u => u.email === 'a@a.a');

        let adminUserId: string;

        if (existingAdmin) {
          console.log('👤 Admin Auth existant trouvé:', existingAdmin.id);
          adminUserId = existingAdmin.id;
        } else {
          // Créer l'utilisateur admin
          const { data: adminAuth, error: adminAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: 'a@a.a',
            password: 'admin',
            user_metadata: {
              name: 'Administrateur Misan',
              role: 'admin'
            },
            email_confirm: true
          });

          if (adminAuthError || !adminAuth.user) {
            throw new Error(`Erreur création admin Auth: ${adminAuthError?.message}`);
          }

          adminUserId = adminAuth.user.id;
          console.log('✅ Nouvel admin Auth créé:', adminUserId);
        }

        // Créer/mettre à jour le profil admin dans KV store
        const adminUser: MisanUser = {
          id: adminUserId,
          email: 'a@a.a',
          name: 'Administrateur Misan',
          role: 'admin',
          subscription_type: 'admin',
          subscription_status: 'active',
          subscription_start: new Date().toISOString(),
          subscription_end: '2030-12-31T23:59:59Z',
          tokens_balance: 999999999,
          trial_used: false,
          created_at: new Date().toISOString()
        };

        const kvResult = await createUserInKVStore(supabaseAdmin, adminUser);
        if (!kvResult.success) {
          throw new Error(`Erreur KV store: ${kvResult.error}`);
        }

        console.log('✅ Profil admin créé/mis à jour dans KV store');

        // Vérification finale
        const verification = await getUserByEmail(supabaseAdmin, 'a@a.a');

        return new Response(JSON.stringify({
          success: true,
          message: 'Compte administrateur créé/réactivé avec succès',
          admin_user: adminUser,
          verification: {
            auth_exists: !!existingAdmin,
            kv_profile_exists: !!verification,
            can_login: true
          }
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('❌ Erreur création admin:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
          message: 'Erreur lors de la création/réactivation de l\'admin'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Lister les utilisateurs (pour debug)
    if (path === 'list-users' && req.method === 'GET') {
      try {
        // Récupérer tous les utilisateurs Auth
        const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers();
        
        if (authError) {
          throw new Error(`Erreur récupération Auth users: ${authError.message}`);
        }

        // Récupérer tous les profils KV
        const { data: kvProfiles, error: kvError } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('key, value')
          .like('key', 'user:%');

        if (kvError) {
          throw new Error(`Erreur récupération KV profiles: ${kvError.message}`);
        }

        // Récupérer tous les mappings email
        const { data: emailMappings, error: emailError } = await supabaseAdmin
          .from('kv_store_810b4099')
          .select('key, value')
          .like('key', 'user_by_email:%');

        const users = [];
        const orphanedProfiles = [];

        // Croiser les données Auth et KV
        for (const authUser of authUsers?.users || []) {
          const kvProfile = kvProfiles?.find(kv => kv.key === `user:${authUser.id}`);
          const emailMapping = emailMappings?.find(em => em.value.user_id === authUser.id);

          users.push({
            auth_user: authUser,
            kv_profile: kvProfile?.value || null,
            has_email_mapping: !!emailMapping,
            is_complete: !!(kvProfile && emailMapping)
          });
        }

        // Trouver les profils orphelins (KV sans Auth)
        for (const kvProfile of kvProfiles || []) {
          const userId = kvProfile.key.replace('user:', '');
          const hasAuthUser = authUsers?.users?.some(u => u.id === userId);
          
          if (!hasAuthUser) {
            orphanedProfiles.push(kvProfile.value);
          }
        }

        const summary = {
          total_auth_users: authUsers?.users?.length || 0,
          total_kv_profiles: kvProfiles?.length || 0,
          total_email_mappings: emailMappings?.length || 0,
          complete_users: users.filter(u => u.is_complete).length,
          orphaned_profiles: orphanedProfiles.length
        };

        return new Response(JSON.stringify({
          success: true,
          users,
          summary,
          orphaned_profiles: orphanedProfiles,
          email_mappings: emailMappings
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('❌ Erreur liste utilisateurs:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route: Réinitialiser la base de données
    if (path === 'reset-database' && req.method === 'GET') {
      console.log('🔥 RÉINITIALISATION DE LA BASE DE DONNÉES...');

      try {
        const operations = [];

        // Supprimer tous les utilisateurs Auth
        const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (!listError && users?.users) {
          for (const user of users.users) {
            await supabaseAdmin.auth.admin.deleteUser(user.id);
          }
          operations.push(`Suppression de ${users.users.length} utilisateur(s) Auth`);
        }

        // Vider la table KV store
        const { error: deleteError } = await supabaseAdmin
          .from('kv_store_810b4099')
          .delete()
          .neq('key', 'impossible_key_that_does_not_exist');

        if (deleteError) {
          operations.push(`Erreur vidage KV store: ${deleteError.message}`);
        } else {
          operations.push('Vidage complet de la table kv_store_810b4099');
        }

        console.log('🔥 Réinitialisation terminée');

        return new Response(JSON.stringify({
          success: true,
          message: 'Base de données réinitialisée avec succès',
          operations_performed: operations,
          warning: 'Toutes les données ont été supprimées. Vous pouvez maintenant réinitialiser.'
        }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } catch (error) {
        console.error('❌ Erreur réinitialisation:', error);
        return new Response(JSON.stringify({
          success: false,
          error: error.message,
          message: 'Erreur lors de la réinitialisation'
        }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

    // Route non trouvée
    return new Response(JSON.stringify({
      success: false,
      error: 'Route non trouvée',
      available_routes: ['health', 'signup', 'check-user-status', 'validate-order', 'update-profile', 'admin/update-user', 'admin/update-order', 'admin/delete-orders', 'admin/delete-user', 'consume-tokens', 'init-database', 'create-admin-user', 'list-users', 'reset-database']
    }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erreur serveur:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message || 'Erreur interne du serveur'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
