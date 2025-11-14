import { createClient } from 'npm:@supabase/supabase-js@2';

// Fonctions utilitaires pour la gestion de la base de données

export const createSupabaseAdmin = () => {
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

// Fonction pour exécuter les fonctions SQL d'initialisation
export const executeDatabaseFunctions = async (supabase: any): Promise<{ success: boolean; results: string[]; errors: string[] }> => {
  const results: string[] = [];
  const errors: string[] = [];

  try {
    console.log('🏗️ Exécution des fonctions de création de tables...');

    // Liste des fonctions SQL à exécuter
    const functions = [
      'create_user_profiles_table',
      'create_subscriptions_table', 
      'create_transactions_table',
      'create_alerts_table',
      'create_settings_table',
      'create_alert_rules_table',
      'create_email_templates_table',
      'create_ai_usage_logs_table',
      'create_updated_at_triggers'
    ];

    for (const functionName of functions) {
      try {
        console.log(`📋 Exécution de ${functionName}...`);
        
        const { data, error } = await supabase.rpc(functionName);
        
        if (error) {
          console.error(`❌ Erreur ${functionName}:`, error.message);
          errors.push(`${functionName}: ${error.message}`);
        } else {
          console.log(`✅ ${functionName} réussie:`, data);
          results.push(`${functionName}: ${data || 'Succès'}`);
        }
      } catch (funcError) {
        console.error(`❌ Exception ${functionName}:`, funcError);
        errors.push(`${functionName}: ${funcError.message}`);
      }
    }

    return {
      success: errors.length === 0,
      results,
      errors
    };

  } catch (error) {
    console.error('❌ Erreur générale exécution fonctions:', error);
    return {
      success: false,
      results,
      errors: [...errors, `Erreur générale: ${error.message}`]
    };
  }
};

// Fonction pour initialiser les paramètres système
export const initializeSystemSettings = async (supabase: any): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('⚙️ Initialisation des paramètres système...');

    const settings = [
      // Paramètres d'essai gratuit
      { key: 'trial_duration_days', value: '7', description: 'Durée essai gratuit en jours' },
      { key: 'trial_tokens_amount', value: '100000', description: 'Jetons pour essai gratuit' },
      { key: 'trial_tokens', value: '100000', description: 'Jetons pour essai gratuit (nouvelle clé)' },
      { key: 'trial_enabled', value: 'true', description: 'Activation de l\'essai gratuit' },

      // Paramètres de tarification
      { key: 'monthly_subscription_price', value: '4000', description: 'Prix abonnement mensuel DA HT' },
      { key: 'tokens_pack_1m_price', value: '1000', description: 'Prix pack 1M jetons DA HT' },
      { key: 'pricing_subscription_monthly_price', value: '4000', description: 'Prix abonnement mensuel (DA HT)' },
      { key: 'pricing_subscription_monthly_tokens', value: '1000000', description: 'Jetons inclus par mois' },
      { key: 'pricing_subscription_currency', value: 'DA', description: 'Devise abonnement' },
      { key: 'pricing_tokens_price_per_million', value: '1000', description: 'Prix du million de jetons (DA HT)' },
      { key: 'pricing_tokens_currency', value: 'DA', description: 'Devise pour l\'achat de jetons' },
      {
        key: 'pricing_discounts',
        value: JSON.stringify([
          { threshold: 6, percentage: 7 },
          { threshold: 12, percentage: 20 },
          { threshold: 10000000, percentage: 10 },
          { threshold: 20000000, percentage: 20 }
        ]),
        description: 'Paliers de remise (durée en mois / quantité de jetons)'
      },
      { key: 'pricing_vat_enabled', value: 'true', description: 'TVA activée' },
      { key: 'pricing_vat_rate', value: '20', description: 'Taux de TVA en pourcentage' },

      // Paramètres d'alertes Pro
      { key: 'alert_pro_subscription_20d', value: 'true', description: 'Alerte abonnement Pro 20 jours' },
      { key: 'alert_pro_subscription_7d', value: 'true', description: 'Alerte abonnement Pro 7 jours' },
      { key: 'alert_pro_subscription_2d', value: 'true', description: 'Alerte abonnement Pro 2 jours' },
      { key: 'alert_pro_subscription_0d', value: 'true', description: 'Alerte abonnement Pro jour J' },
      
      // Paramètres d'alertes jetons Pro
      { key: 'alert_pro_tokens_100k', value: 'true', description: 'Alerte tokens Pro 100k' },
      { key: 'alert_pro_tokens_50k', value: 'true', description: 'Alerte tokens Pro 50k' },
      { key: 'alert_pro_tokens_10k', value: 'true', description: 'Alerte tokens Pro 10k' },
      { key: 'alert_pro_tokens_0', value: 'true', description: 'Alerte tokens Pro 0' },
      
      // Paramètres d'alertes Premium
      { key: 'alert_premium_subscription_5d', value: 'true', description: 'Alerte essai gratuit 5 jours' },
      { key: 'alert_premium_subscription_3d', value: 'true', description: 'Alerte essai gratuit 3 jours' },
      { key: 'alert_premium_subscription_2d', value: 'true', description: 'Alerte essai gratuit 2 jours' },
      { key: 'alert_premium_subscription_0d', value: 'true', description: 'Alerte essai gratuit dernier jour' },
      
      // Paramètres d'alertes jetons Premium
      { key: 'alert_premium_tokens_50k', value: 'true', description: 'Alerte tokens Premium 50k' },
      { key: 'alert_premium_tokens_25k', value: 'true', description: 'Alerte tokens Premium 25k' },
      { key: 'alert_premium_tokens_10k', value: 'true', description: 'Alerte tokens Premium 10k' },
      { key: 'alert_premium_tokens_0', value: 'true', description: 'Alerte tokens Premium 0' },
      
      // Paramètres généraux
      { key: 'app_version', value: '1.0.0', description: 'Version de l\'application' },
      { key: 'support_email', value: 'support@misan.dz', description: 'Email de support' },
      { key: 'company_name', value: 'Misan Technologies', description: 'Nom de l\'entreprise' },
      { key: 'maintenance_mode', value: 'false', description: 'Mode maintenance' }
    ];

    let successCount = 0;
    let errorCount = 0;

    for (const setting of settings) {
      try {
        const { error } = await supabase
          .from('system_settings')
          .upsert({
            key: setting.key,
            value: setting.value,
            description: setting.description
          });

        if (error) {
          console.error(`❌ Erreur paramètre ${setting.key}:`, error.message);
          errorCount++;
        } else {
          console.log(`✅ Paramètre configuré: ${setting.key}`);
          successCount++;
        }
      } catch (settingError) {
        console.error(`❌ Exception paramètre ${setting.key}:`, settingError);
        errorCount++;
      }
    }

    console.log(`📊 Paramètres: ${successCount} réussis, ${errorCount} erreurs`);

    return {
      success: errorCount === 0,
      message: `Paramètres système initialisés: ${successCount} réussis, ${errorCount} erreurs`
    };

  } catch (error) {
    console.error('❌ Erreur initialisation paramètres:', error);
    return {
      success: false,
      message: `Erreur initialisation paramètres: ${error.message}`
    };
  }
};

export const initializeAlertRules = async (supabase: any): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🔔 Initialisation des règles d\'alertes...');

    const defaultRules = [
      {
        name: 'Abonnement Pro - 20 jours',
        description: 'Alerte lorsque la fin d\'abonnement pro approche (20 jours).',
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
        description: 'Alerte lorsque la fin d\'abonnement pro approche (7 jours).',
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
        description: 'Alerte lorsque la fin d\'abonnement pro approche (2 jours).',
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
        description: 'Alerte lorsque la fin de l\'essai premium approche (5 jours).',
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
        description: 'Alerte lorsque la fin de l\'essai premium approche (3 jours).',
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
        description: 'Alerte lorsque la fin de l\'essai premium approche (2 jours).',
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
        description: 'Alerte lorsque l\'essai premium se termine.',
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

    const { error } = await supabase
      .from('alert_rules')
      .upsert(defaultRules, { onConflict: 'name' });

    if (error) {
      console.error('❌ Erreur initialisation alert rules:', error.message);
      return {
        success: false,
        message: error.message
      };
    }

    return {
      success: true,
      message: 'Règles d\'alertes initialisées'
    };
  } catch (error) {
    console.error('❌ Erreur générale initialisation alert rules:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

export const initializeEmailTemplates = async (supabase: any): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('✉️ Initialisation des templates emails...');

    const defaultTemplates = [
      {
        name: 'Inscription',
        subject: 'Bienvenue sur Misan',
        recipients: 'both',
        cc: [] as string[],
        bcc: [] as string[],
        body: 'Bonjour {{user_name}},\n\nMerci pour votre inscription sur Misan. Nous avons bien reçu vos informations ({{user_email}}) et notre équipe validera votre accès dans les plus brefs délais.\n\nVous recevrez un email de confirmation dès que votre compte sera activé. En attendant, vous pouvez consulter nos offres depuis la page tarifs.\n\nÀ très vite !',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Confirmation inscription',
        subject: 'Votre compte Misan est validé',
        recipients: 'user',
        cc: [] as string[],
        bcc: [] as string[],
        body: 'Bonjour {{user_name}},\n\nVotre inscription vient d\'être validée par notre équipe.\n\nVous disposez maintenant d\'un accès complet à la plateforme.\n\nBonne utilisation !',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Confirmation achat',
        subject: 'Nous avons bien reçu votre commande',
        recipients: 'user',
        cc: [] as string[],
        bcc: [] as string[],
        body: 'Bonjour {{user_name}},\n\nVotre commande a bien été enregistrée.\n\nPour finaliser le paiement par virement, merci de suivre les instructions indiquées dans votre espace client.\n\nNous vous confirmerons la réception du règlement dans les plus brefs délais.',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Confirmation paiement en ligne',
        subject: 'Paiement confirmé',
        recipients: 'user',
        cc: [] as string[],
        bcc: [] as string[],
        body: 'Bonjour {{user_name}},\n\nNous confirmons la réception de votre paiement.\n\nVotre abonnement ou votre pack de jetons est désormais actif.\n\nMerci de votre confiance !',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Réception virement',
        subject: 'Nous avons reçu votre virement',
        recipients: 'user',
        cc: [] as string[],
        bcc: [] as string[],
        body: 'Bonjour {{user_name}},\n\nNous vous informons que votre virement a bien été réceptionné.\n\nVotre accès est maintenant pleinement actif.\n\nMerci pour votre paiement.',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Avertissement suspension',
        subject: 'Important : votre compte Misan',
        recipients: 'user',
        cc: [] as string[],
        bcc: ['admin.misan@parene.org'],
        body: 'Bonjour {{user_name}},\n\nNous constatons que votre compte présente un incident.\n\nMerci de régulariser votre situation afin d\'éviter la suspension ou la suppression de votre accès.\n\nContactez-nous si vous avez besoin d\'assistance.',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Confirmation suppression compte',
        subject: 'Confirmation de suppression de votre compte Misan',
        recipients: 'user',
        cc: [] as string[],
        bcc: [] as string[],
        body: 'Bonjour {{user_name}},\n\nNous vous confirmons que votre compte Misan a été supprimé et que vous n\'avez plus accès à la plateforme.\n\nSi vous pensez qu\'il s\'agit d\'une erreur ou souhaitez rouvrir un compte, contactez-nous à {{support_email}}.\n\nMerci d\'avoir utilisé nos services.',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'Relance paiement',
        subject: 'Relance : paiement en attente',
        recipients: 'user',
        cc: [] as string[],
        bcc: ['admin.misan@parene.org'],
        body: 'Bonjour {{user_name}},\n\nNous revenons vers vous concernant le paiement de votre commande toujours en attente.\n\nSans règlement sous 48h, nous serons contraints de suspendre l\'accès au service.\n\nMerci de votre rapidité.',
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {}
      },
      {
        name: 'modèle-de-sortie-email',
        subject: 'Modèle d\'email Misan',
        recipients: 'user',
        cc: [] as string[],
        bcc: [] as string[],
        body: `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{{subject}}</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      padding: 0;
      background-color: #f4f6fb;
      font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
    }
    a {
      color: #2563eb;
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:#f4f6fb;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f6fb; padding:32px 0;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow:0 8px 24px rgba(15,23,42,0.08);">
          <tr>
            <td style="padding:28px 32px; background:linear-gradient(135deg, #1e3a8a, #2563eb); color:#f8fafc;">
              <span style="text-transform:uppercase; letter-spacing:0.08em; font-size:12px; color:#c7d2fe;">Misan</span>
              <h1 style="margin:12px 0 0; font-size:26px; line-height:1.2; font-weight:600; color:#f8fafc;">{{headline}}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 16px; font-size:16px; line-height:1.6;">Bonjour {{user_name}},</p>
              <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#475569;">{{intro}}</p>
              <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1f2937;">{{body_text}}</p>
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 32px;">
                <tr>
                  <td style="background-color:#2563eb; border-radius:999px;">
                    <a href="{{cta_url}}" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:600; color:#ffffff; text-decoration:none;">{{cta_label}}</a>
                  </td>
                </tr>
              </table>
              <table role="presentation" cellpadding="0" cellspacing="0" style="width:100%; margin:0 0 24px;">
                <tr>
                  <td style="padding:18px 20px; border:1px solid #e2e8f0; border-radius:12px; background-color:#f8fafc;">
                    <p style="margin:0; font-size:14px; font-weight:600; color:#0f172a;">Points clés</p>
                    <p style="margin:8px 0 0; font-size:14px; line-height:1.6; color:#475569;">{{summary}}</p>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 16px; font-size:14px; line-height:1.6; color:#64748b;">Besoin d'assistance ? Contactez-nous sur <a href="mailto:support.misan@parene.org" style="color:#2563eb; text-decoration:none;">support.misan@parene.org</a>.</p>
              <p style="margin:0; font-size:14px; line-height:1.6; color:#0f172a;">Bien cordialement,<br />{{signature}}</p>
            </td>
          </tr>
          <tr>
            <td style="background-color:#0f172a; padding:24px 32px; text-align:center; color:#cbd5f5;">
              <p style="margin:0 0 8px; font-size:12px; letter-spacing:0.06em; text-transform:uppercase;">Misan</p>
              <p style="margin:0; font-size:12px; line-height:1.6;">{{footer_links}}</p>
            </td>
          </tr>
        </table>
        <p style="margin:24px 0 0; font-size:11px; color:#94a3b8;">Vous recevez cet email car votre adresse est enregistrée sur Misan.</p>
      </td>
    </tr>
  </table>
</body>
</html>`,
        signature: 'L\'équipe Misan\nVous accompagne dans votre réussite',
        is_active: true,
        metadata: {
          category: 'layout',
          description: 'Template HTML stylisé servant de base à dupliquer pour les communications Misan',
          placeholders: ['headline', 'intro', 'body_text', 'cta_label', 'cta_url', 'summary', 'footer_links', 'signature']
        }
      }
    ];

    for (const template of defaultTemplates) {
      await supabase
        .from('email_templates')
        .upsert(template, { onConflict: 'name' });
    }

    return {
      success: true,
      message: 'Templates emails initialisés'
    };
  } catch (error) {
    console.error('❌ Erreur initialisation templates email:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
};

// Fonction pour vérifier l'état de la base de données
export const checkDatabaseStatus = async (supabase: any): Promise<{
  tablesExist: boolean;
  userCount: number;
  adminExists: boolean;
  settingsCount: number;
  details: string[];
}> => {
  const details: string[] = [];
  let tablesExist = false;
  let userCount = 0;
  let adminExists = false;
  let settingsCount = 0;

  try {
    // Vérifier la table user_profiles
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, email, role')
      .limit(10);

    if (!profilesError) {
      tablesExist = true;
      userCount = profiles?.length || 0;
      adminExists = profiles?.some((p: any) => p.role === 'admin') || false;
      details.push(`✅ Table user_profiles: ${userCount} utilisateur(s)`);
      details.push(`👑 Admin existe: ${adminExists ? 'Oui' : 'Non'}`);
    } else {
      details.push(`❌ Table user_profiles: ${profilesError.message}`);
    }

    // Vérifier la table system_settings
    const { data: settings, error: settingsError } = await supabase
      .from('system_settings')
      .select('key')
      .limit(50);

    if (!settingsError) {
      settingsCount = settings?.length || 0;
      details.push(`✅ Table system_settings: ${settingsCount} paramètre(s)`);
    } else {
      details.push(`❌ Table system_settings: ${settingsError.message}`);
    }

    // Vérifier les autres tables
    const tablesToCheck = ['subscriptions', 'transactions', 'user_alerts', 'ai_usage_logs'];
    
    for (const tableName of tablesToCheck) {
      const { data, error } = await supabase
        .from(tableName)
        .select('id')
        .limit(1);

      if (!error) {
        details.push(`✅ Table ${tableName}: Accessible`);
      } else {
        details.push(`❌ Table ${tableName}: ${error.message}`);
      }
    }

  } catch (error) {
    details.push(`❌ Erreur vérification: ${error.message}`);
  }

  return {
    tablesExist,
    userCount,
    adminExists,
    settingsCount,
    details
  };
};

// Fonction pour créer un utilisateur avec essai gratuit
export const createUserWithFreeTrial = async (
  supabase: any,
  email: string,
  password: string,
  name: string
): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    console.log('👤 Création utilisateur avec essai gratuit:', email);

    // Créer l'utilisateur Auth
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      user_metadata: { name },
      email_confirm: true
    });

    if (authError || !authUser.user) {
      throw new Error(`Erreur Auth: ${authError?.message}`);
    }

    // Calculer la date de fin d'essai
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    // Créer le profil utilisateur
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email,
        name,
        role: 'premium',
        subscription_type: 'premium',
        subscription_status: 'active',
        subscription_end: trialEndDate.toISOString(),
        tokens_balance: 100000,
        trial_used: true
      });

    if (profileError) {
      // Supprimer l'utilisateur Auth en cas d'erreur
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Erreur profil: ${profileError.message}`);
    }

    console.log('✅ Utilisateur créé avec essai gratuit');

    return {
      success: true,
      user: {
        id: authUser.user.id,
        email,
        name,
        role: 'premium',
        subscription_type: 'premium',
        subscription_status: 'active',
        subscription_end: trialEndDate.toISOString(),
        tokens_balance: 100000,
        trial_used: true
      }
    };

  } catch (error) {
    console.error('❌ Erreur création utilisateur:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fonction pour créer l'utilisateur admin
export const createAdminUser = async (supabase: any): Promise<{ success: boolean; user?: any; error?: string }> => {
  try {
    console.log('👑 Création utilisateur admin...');

    // Créer l'utilisateur Auth admin
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: 'a@a.a',
      password: 'admin',
      user_metadata: {
        name: 'Administrateur Misan',
        role: 'admin'
      },
      email_confirm: true
    });

    if (authError || !authUser.user) {
      throw new Error(`Erreur Auth admin: ${authError?.message}`);
    }

    // Créer le profil admin
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email: 'a@a.a',
        name: 'Administrateur Misan',
        role: 'admin',
        subscription_type: 'admin',
        subscription_status: 'active',
        subscription_end: '2030-12-31T23:59:59Z',
        tokens_balance: 999999999,
        trial_used: false
      });

    if (profileError) {
      // Supprimer l'utilisateur Auth en cas d'erreur
      await supabase.auth.admin.deleteUser(authUser.user.id);
      throw new Error(`Erreur profil admin: ${profileError.message}`);
    }

    console.log('✅ Utilisateur admin créé');

    return {
      success: true,
      user: {
        id: authUser.user.id,
        email: 'a@a.a',
        name: 'Administrateur Misan',
        role: 'admin',
        subscription_type: 'admin',
        subscription_status: 'active',
        subscription_end: '2030-12-31T23:59:59Z',
        tokens_balance: 999999999,
        trial_used: false
      }
    };

  } catch (error) {
    console.error('❌ Erreur création admin:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Fonction pour vérifier et mettre à jour les abonnements expirés
export const checkExpiredSubscriptions = async (supabase: any): Promise<{ success: boolean; updated: number; message: string }> => {
  try {
    console.log('🔍 Vérification des abonnements expirés...');

    const { data, error } = await supabase.rpc('check_and_update_expired_subscriptions');

    if (error) {
      throw new Error(`Erreur vérification: ${error.message}`);
    }

    console.log('✅ Vérification terminée:', data);

    return {
      success: true,
      updated: 0, // Le nombre sera dans le message retourné par la fonction
      message: data || 'Vérification terminée'
    };

  } catch (error) {
    console.error('❌ Erreur vérification abonnements:', error);
    return {
      success: false,
      updated: 0,
      message: `Erreur: ${error.message}`
    };
  }
};

// Fonction pour générer les alertes automatiques
export const generateAutomaticAlerts = async (supabase: any): Promise<{ success: boolean; generated: number; message: string }> => {
  try {
    console.log('🔔 Génération des alertes automatiques...');

    const { data, error } = await supabase.rpc('generate_automatic_alerts');

    if (error) {
      throw new Error(`Erreur génération alertes: ${error.message}`);
    }

    console.log('✅ Alertes générées:', data);

    return {
      success: true,
      generated: 0, // Le nombre sera dans le message retourné par la fonction
      message: data || 'Alertes générées'
    };

  } catch (error) {
    console.error('❌ Erreur génération alertes:', error);
    return {
      success: false,
      generated: 0,
      message: `Erreur: ${error.message}`
    };
  }
};

// Fonction pour nettoyer les données expirées
export const cleanupExpiredData = async (supabase: any): Promise<{ success: boolean; message: string }> => {
  try {
    console.log('🧹 Nettoyage des données expirées...');

    // Supprimer les alertes expirées
    const { error: alertsError } = await supabase
      .from('user_alerts')
      .delete()
      .lt('expires_at', new Date().toISOString());

    if (alertsError) {
      console.error('⚠️ Erreur nettoyage alertes:', alertsError.message);
    } else {
      console.log('✅ Alertes expirées supprimées');
    }

    // Supprimer les logs d'utilisation IA anciens (plus de 90 jours)
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error: logsError } = await supabase
      .from('ai_usage_logs')
      .delete()
      .lt('created_at', ninetyDaysAgo.toISOString());

    if (logsError) {
      console.error('⚠️ Erreur nettoyage logs:', logsError.message);
    } else {
      console.log('✅ Logs anciens supprimés');
    }

    return {
      success: true,
      message: 'Nettoyage des données expirées terminé'
    };

  } catch (error) {
    console.error('❌ Erreur nettoyage:', error);
    return {
      success: false,
      message: `Erreur nettoyage: ${error.message}`
    };
  }
};
