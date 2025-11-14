import { createClient } from 'npm:@supabase/supabase-js@2';
import { sendTemplateEmail } from '../_shared/email-templates.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE',
};

interface AuthRequest {
  action: 'register' | 'login' | 'init_database' | 'create_admin' | 'consume_tokens';
  email?: string;
  password?: string;
  name?: string;
  tokens?: number;
  user_id?: string;
  action_type?: string;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { action, email, password, name, tokens, user_id, action_type }: AuthRequest = await req.json();

    switch (action) {
      case 'init_database':
        return await initializeDatabase(supabaseClient);
      
      case 'create_admin':
        return await createAdminUser(supabaseClient);
      
      case 'register':
        if (!email || !password || !name) {
          throw new Error('Email, password et nom requis');
        }
        return await registerUser(supabaseClient, email, password, name);
      
      case 'login':
        if (!email || !password) {
          throw new Error('Email et password requis');
        }
        return await loginUser(supabaseClient, email, password);
      
      case 'consume_tokens':
        if (!user_id || !tokens || !action_type) {
          throw new Error('user_id, tokens et action_type requis');
        }
        return await consumeTokens(supabaseClient, user_id, tokens, action_type);
      
      default:
        throw new Error('Action non supportée');
    }
  } catch (error) {
    console.error('Erreur:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 400, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});

async function initializeDatabase(supabase: any) {
  try {
    // Créer les tables principales
    const { error: profilesError } = await supabase.rpc('create_user_profiles_table');
    if (profilesError) throw profilesError;

    const { error: subscriptionsError } = await supabase.rpc('create_subscriptions_table');
    if (subscriptionsError) throw subscriptionsError;

    const { error: transactionsError } = await supabase.rpc('create_transactions_table');
    if (transactionsError) throw transactionsError;

    const { error: alertsError } = await supabase.rpc('create_alerts_table');
    if (alertsError) throw alertsError;

    const { error: settingsError } = await supabase.rpc('create_settings_table');
    if (settingsError) throw settingsError;

    const { error: alertRulesError } = await supabase.rpc('create_alert_rules_table');
    if (alertRulesError) throw alertRulesError;

    const { error: aiLogsError } = await supabase.rpc('create_ai_usage_logs_table');
    if (aiLogsError) throw aiLogsError;

    const { error: triggersError } = await supabase.rpc('create_updated_at_triggers');
    if (triggersError) throw triggersError;

    // Insérer les paramètres par défaut
    const defaultSettings = [
      { key: 'alert_pro_subscription_20d', value: 'true', description: 'Alerte Pro 20 jours avant expiration' },
      { key: 'alert_pro_subscription_7d', value: 'true', description: 'Alerte Pro 7 jours avant expiration' },
      { key: 'alert_pro_subscription_2d', value: 'true', description: 'Alerte Pro 2 jours avant expiration' },
      { key: 'alert_pro_tokens_low', value: 'true', description: 'Alerte Pro jetons faibles' },
      { key: 'alert_premium_subscription_5d', value: 'true', description: 'Alerte Premium 5 jours avant expiration' },
      { key: 'alert_premium_subscription_2d', value: 'true', description: 'Alerte Premium 2 jours avant expiration' },
      { key: 'alert_premium_subscription_0d', value: 'true', description: 'Alerte Premium expiration' },
      { key: 'tokens_per_chat', value: '10', description: 'Jetons consommés par chat' },
      { key: 'tokens_per_document', value: '50', description: 'Jetons consommés par génération de document' },
      { key: 'trial_duration_days', value: '7', description: 'Durée essai gratuit en jours' },
      { key: 'trial_tokens', value: '100000', description: 'Jetons inclus dans l\'essai gratuit' }
    ];

    for (const setting of defaultSettings) {
      await supabase
        .from('system_settings')
        .upsert(setting, { onConflict: 'key' });
    }

    const defaultAlertRules = [
      {
        name: 'Abonnement Pro - 20 jours',
        description: "Alerte lorsque la fin d'abonnement pro approche (20 jours).",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 20,
        severity: 'info',
        message_template: 'Votre abonnement Pro expire dans {{days}} jours.',
        applies_to_role: 'pro',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Abonnement Pro - 7 jours',
        description: "Alerte lorsque la fin d'abonnement pro approche (7 jours).",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 7,
        severity: 'warning',
        message_template: 'Votre abonnement Pro expire dans {{days}} jours.',
        applies_to_role: 'pro',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Abonnement Pro - 2 jours',
        description: "Alerte lorsque la fin d'abonnement pro approche (2 jours).",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 2,
        severity: 'error',
        message_template: 'Votre abonnement Pro expire dans {{days}} jours !',
        applies_to_role: 'pro',
        is_blocking: true,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Abonnement Premium - 5 jours',
        description: "Alerte lorsque la fin de l'essai premium approche (5 jours).",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 5,
        severity: 'info',
        message_template: 'Votre essai gratuit se termine dans {{days}} jours.',
        applies_to_role: 'premium',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Abonnement Premium - 3 jours',
        description: "Alerte lorsque la fin de l'essai premium approche (3 jours).",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 3,
        severity: 'warning',
        message_template: 'Votre essai gratuit se termine dans {{days}} jours.',
        applies_to_role: 'premium',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Abonnement Premium - 2 jours',
        description: "Alerte lorsque la fin de l'essai premium approche (2 jours).",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 2,
        severity: 'warning',
        message_template: 'Votre essai gratuit se termine dans {{days}} jours.',
        applies_to_role: 'premium',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Abonnement Premium - 0 jour',
        description: "Alerte lorsque l'essai premium se termine.",
        trigger_type: 'scheduled',
        target: 'subscription',
        comparator: '=',
        threshold: 0,
        severity: 'error',
        message_template: 'Votre essai gratuit a expiré. Passez à un abonnement Pro.',
        applies_to_role: 'premium',
        is_blocking: true,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Jetons Pro - 100k',
        description: 'Alerte lorsque le solde de jetons Pro passe sous 100 000.',
        trigger_type: 'scheduled',
        target: 'tokens',
        comparator: '<=',
        threshold: 100000,
        severity: 'info',
        message_template: 'Il vous reste {{tokens}} jetons.',
        applies_to_role: 'pro',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Jetons Pro - 50k',
        description: 'Alerte lorsque le solde de jetons Pro passe sous 50 000.',
        trigger_type: 'scheduled',
        target: 'tokens',
        comparator: '<=',
        threshold: 50000,
        severity: 'warning',
        message_template: 'Il vous reste {{tokens}} jetons. Pensez à recharger.',
        applies_to_role: 'pro',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Jetons Pro - 0',
        description: 'Alerte lorsque le solde de jetons Pro est épuisé.',
        trigger_type: 'scheduled',
        target: 'tokens',
        comparator: '<=',
        threshold: 0,
        severity: 'error',
        message_template: 'Votre solde de jetons est épuisé.',
        applies_to_role: 'pro',
        is_blocking: true,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Jetons Premium - 50k',
        description: 'Alerte lorsque le solde de jetons Premium passe sous 50 000.',
        trigger_type: 'scheduled',
        target: 'tokens',
        comparator: '<=',
        threshold: 50000,
        severity: 'info',
        message_template: 'Il vous reste {{tokens}} jetons d\'essai.',
        applies_to_role: 'premium',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Jetons Premium - 25k',
        description: 'Alerte lorsque le solde de jetons Premium passe sous 25 000.',
        trigger_type: 'scheduled',
        target: 'tokens',
        comparator: '<=',
        threshold: 25000,
        severity: 'warning',
        message_template: 'Il vous reste {{tokens}} jetons d\'essai. Pensez à recharger.',
        applies_to_role: 'premium',
        is_blocking: false,
        is_active: true,
        metadata: {}
      },
      {
        name: 'Jetons Premium - 0',
        description: 'Alerte lorsque le solde de jetons Premium est épuisé.',
        trigger_type: 'scheduled',
        target: 'tokens',
        comparator: '<=',
        threshold: 0,
        severity: 'error',
        message_template: 'Votre solde de jetons d\'essai est épuisé.',
        applies_to_role: 'premium',
        is_blocking: true,
        is_active: true,
        metadata: {}
      }
    ];

    for (const rule of defaultAlertRules) {
      await supabase
        .from('alert_rules')
        .upsert(rule, { onConflict: 'name' });
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Base de données initialisée avec succès' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erreur initialisation DB: ${error.message}`);
  }
}

async function createAdminUser(supabase: any) {
  try {
    // Créer l'utilisateur admin
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'a@a.a',
      password: 'admin',
      email_confirm: true
    });

    if (authError) throw authError;

    // Créer le profil admin
    const { error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        email: 'a@a.a',
        name: 'Administrateur',
        role: 'admin',
        subscription_type: 'admin',
        subscription_status: 'active',
        tokens_balance: 999999,
        trial_used: false
      });

    if (profileError) throw profileError;

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Compte admin créé: a@a.a / admin' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erreur création admin: ${error.message}`);
  }
}

async function registerUser(supabase: any, email: string, password: string, name: string) {
  try {
    // Créer l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (authError) throw authError;

    // Calculer la date de fin d'essai (7 jours)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 7);

    // Créer le profil utilisateur avec essai gratuit
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authData.user.id,
        email,
        name,
        role: 'premium',
        subscription_type: 'premium',
        subscription_status: 'inactive',
        subscription_end: trialEnd.toISOString(),
        tokens_balance: 100000, // 100k jetons pour l'essai
        trial_used: true,
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
      });

    if (profileError) throw profileError;

    // Créer l'abonnement d'essai
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: authData.user.id,
        type: 'premium',
        status: 'inactive',
        start_date: new Date().toISOString(),
        end_date: trialEnd.toISOString(),
        tokens_included: 100000,
        is_trial: true,
        payment_method: 'free',
        payment_status: 'paid',
        amount_da: 0
      });

    if (subscriptionError) throw subscriptionError;

    // Créer une alerte de bienvenue
    const { error: alertError } = await supabase
      .from('user_alerts')
      .insert({
        user_id: authData.user.id,
        type: 'system',
        level: 'info',
        title: 'Compte en cours d\'approbation',
        message: 'Votre compte est en cours d\'approbation par notre équipe. Vous recevrez un email dès son activation.'
      });

    if (alertError) console.warn('Erreur création alerte:', alertError);

    try {
      const { data: adminRows } = await supabase
        .from('user_profiles')
        .select('email')
        .eq('role', 'admin')
        .not('email', 'is', null);

      const adminEmails = Array.isArray(adminRows)
        ? adminRows.map(row => String(row.email)).filter(Boolean)
        : [];

      await sendTemplateEmail(supabase, 'Inscription', {
        to: email,
        adminEmails,
        variables: {
          user_name: name || email,
          user_email: email
        }
      });
    } catch (emailError) {
      console.error('❌ Erreur envoi email inscription (auth-handler):', emailError);
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Votre inscription est enregistrée. Vous recevrez un email dès la validation de votre compte.'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erreur inscription: ${error.message}`);
  }
}

async function loginUser(supabase: any, email: string, password: string) {
  try {
    // Authentifier l'utilisateur
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) throw authError;

    // Récupérer le profil utilisateur
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (profileError) throw profileError;

    if (profile.subscription_status !== 'active' && profile.role !== 'admin') {
      await supabase.auth.signOut();
      return new Response(
        JSON.stringify({
          success: false,
          error: `Bonjour ${profile.name || profile.email}, votre compte est en cours d'approbation. Vous serez averti par email dès son activation.`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Vérifier si l'abonnement a expiré
    if (profile.subscription_end && new Date(profile.subscription_end) < new Date() && profile.role !== 'admin') {
      // Mettre à jour le statut
      await supabase
        .from('user_profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', authData.user.id);
      
      profile.subscription_status = 'expired';
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Connexion réussie',
        user: profile,
        session: authData.session
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erreur connexion: ${error.message}`);
  }
}

async function consumeTokens(supabase: any, user_id: string, tokens: number, action_type: string) {
  try {
    // Vérifier le solde actuel
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('tokens_balance, subscription_status')
      .eq('id', user_id)
      .single();

    if (profileError) throw profileError;

    if (profile.subscription_status !== 'active') {
      throw new Error('Abonnement inactif');
    }

    if (profile.tokens_balance < tokens) {
      throw new Error('Solde de jetons insuffisant');
    }

    // Déduire les jetons
    const { error: updateError } = await supabase
      .from('user_profiles')
      .update({ tokens_balance: profile.tokens_balance - tokens })
      .eq('id', user_id);

    if (updateError) throw updateError;

    // Enregistrer l'utilisation
    const { error: logError } = await supabase
      .from('ai_usage_logs')
      .insert({
        user_id,
        action_type,
        tokens_consumed: tokens,
        success: true
      });

    if (logError) console.warn('Erreur log usage:', logError);

    return new Response(
      JSON.stringify({ 
        success: true, 
        tokens_remaining: profile.tokens_balance - tokens
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    throw new Error(`Erreur consommation jetons: ${error.message}`);
  }
}
