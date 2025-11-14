import { createSupabaseAdmin } from './database-functions.ts';

// Interface pour les réponses d'authentification
export interface AuthResponse {
  success: boolean;
  user?: any;
  access?: any;
  alerts?: any[];
  error?: string;
  redirect_to_pricing?: boolean;
}

// Interface pour les utilisateurs Misan
export interface MisanUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'pro' | 'premium';
  subscription_type: 'admin' | 'pro' | 'premium';
  subscription_status: 'active' | 'inactive' | 'expired';
  subscription_start: string;
  subscription_end: string;
  tokens_balance: number;
  trial_used: boolean;
  created_at: string;
}

// Fonction pour créer un utilisateur dans les tables PostgreSQL
export const createUserInDatabase = async (supabase: any, user: MisanUser): Promise<{ success: boolean; error?: string }> => {
  try {
    console.log('💾 Création utilisateur en base:', user.email);

    // Insérer dans user_profiles
    const { error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        subscription_type: user.subscription_type,
        subscription_status: user.subscription_status,
        subscription_end: user.subscription_end,
        tokens_balance: user.tokens_balance,
        trial_used: user.trial_used
      });

    if (profileError) {
      throw new Error(`Erreur profil: ${profileError.message}`);
    }

    // Créer l'abonnement correspondant
    const { error: subscriptionError } = await supabase
      .from('subscriptions')
      .insert({
        user_id: user.id,
        type: user.subscription_type,
        status: user.subscription_status,
        start_date: user.subscription_start,
        end_date: user.subscription_end,
        tokens_included: user.subscription_type === 'premium' ? 100000 : 0,
        is_trial: user.subscription_type === 'premium' && user.trial_used,
        payment_method: user.subscription_type === 'premium' ? 'free' : 'admin'
      });

    if (subscriptionError) {
      console.error('⚠️ Erreur abonnement:', subscriptionError.message);
      // Ne pas faire échouer la création pour cette erreur
    }

    console.log('✅ Utilisateur créé en base avec succès');
    return { success: true };

  } catch (error) {
    console.error('❌ Erreur création utilisateur base:', error);
    return { success: false, error: error.message };
  }
};

// Fonction pour récupérer un utilisateur depuis la base
export const getUserFromDatabase = async (supabase: any, userId: string): Promise<MisanUser | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      console.log('❌ Utilisateur non trouvé en base:', userId);
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      subscription_type: data.subscription_type,
      subscription_status: data.subscription_status,
      subscription_start: data.created_at,
      subscription_end: data.subscription_end,
      tokens_balance: data.tokens_balance,
      trial_used: data.trial_used,
      created_at: data.created_at
    };

  } catch (error) {
    console.error('❌ Erreur récupération utilisateur:', error);
    return null;
  }
};

// Fonction pour récupérer un utilisateur par email
export const getUserByEmailFromDatabase = async (supabase: any, email: string): Promise<MisanUser | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      subscription_type: data.subscription_type,
      subscription_status: data.subscription_status,
      subscription_start: data.created_at,
      subscription_end: data.subscription_end,
      tokens_balance: data.tokens_balance,
      trial_used: data.trial_used,
      created_at: data.created_at
    };

  } catch (error) {
    console.error('❌ Erreur récupération par email:', error);
    return null;
  }
};

// Fonction pour générer les alertes utilisateur
export const generateUserAlerts = (user: MisanUser): any[] => {
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

  // Alertes pour les utilisateurs Pro
  if (user.subscription_type === 'pro' && daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    alerts.push({
      type: 'subscription',
      level: 'info',
      message: `Votre abonnement Pro expire dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}. Pensez à le renouveler.`
    });
  }

  // Alertes pour les jetons faibles
  if (user.tokens_balance < 10000 && user.role !== 'admin') {
    alerts.push({
      type: 'tokens',
      level: 'warning',
      message: `Il vous reste ${user.tokens_balance.toLocaleString()} jetons. Rechargez votre compte pour continuer.`
    });
  }

  return alerts;
};

// Handler pour l'inscription
export const handleSignup = async (req: Request): Promise<Response> => {
  try {
    const { email, password, name, grant_free_trial } = await req.json();

    console.log('📝 Inscription:', email, 'Essai gratuit:', grant_free_trial);

    const supabaseAdmin = createSupabaseAdmin();

    // Vérifier si l'utilisateur existe déjà
    const existingUser = await getUserByEmailFromDatabase(supabaseAdmin, email);
    if (existingUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Un compte existe déjà avec cette adresse email',
        redirect_to_pricing: true
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Créer l'utilisateur avec essai gratuit
    const result = await createUserWithFreeTrial(supabaseAdmin, email, password, name);
    
    if (!result.success) {
      return new Response(JSON.stringify({
        success: false,
        error: result.error
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Compte créé avec succès',
      user: result.user
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erreur handler signup:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handler pour la vérification du statut utilisateur
export const handleCheckUserStatus = async (req: Request): Promise<Response> => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token d\'authentification manquant'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createSupabaseAdmin();

    // Vérifier le token
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token invalide ou expiré'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Récupérer le profil utilisateur
    const userProfile = await getUserFromDatabase(supabaseAdmin, user.id);
    if (!userProfile) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Profil utilisateur introuvable'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier l'expiration
    const now = new Date();
    const subscriptionEnd = new Date(userProfile.subscription_end);
    const isExpired = subscriptionEnd < now;

    if (isExpired && userProfile.role !== 'admin') {
      // Mettre à jour le statut
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ subscription_status: 'expired' })
        .eq('id', user.id);

      if (!updateError) {
        userProfile.subscription_status = 'expired';
      }
    }

    // Générer les alertes
    const alerts = generateUserAlerts(userProfile);

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
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erreur check user status:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Handler pour la consommation de jetons
export const handleConsumeTokens = async (req: Request): Promise<Response> => {
  try {
    const { amount } = await req.json();
    const authHeader = req.headers.get('Authorization');
    
    if (!authHeader) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token d\'authentification manquant'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAdmin = createSupabaseAdmin();

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Token invalide'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const userProfile = await getUserFromDatabase(supabaseAdmin, user.id);
    if (!userProfile) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Profil utilisateur introuvable'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Vérifier les jetons (sauf admin)
    if (userProfile.role !== 'admin' && userProfile.tokens_balance < amount) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Jetons insuffisants',
        remaining_balance: userProfile.tokens_balance
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Déduire les jetons (sauf admin)
    if (userProfile.role !== 'admin') {
      const newBalance = userProfile.tokens_balance - amount;
      
      const { error: updateError } = await supabaseAdmin
        .from('user_profiles')
        .update({ tokens_balance: newBalance })
        .eq('id', user.id);

      if (updateError) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Erreur mise à jour solde'
        }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      userProfile.tokens_balance = newBalance;
    }

    // Logger l'utilisation
    const { error: logError } = await supabaseAdmin
      .from('ai_usage_logs')
      .insert({
        user_id: user.id,
        action_type: 'chat',
        tokens_consumed: amount,
        success: true,
        metadata: { timestamp: new Date().toISOString() }
      });

    if (logError) {
      console.error('⚠️ Erreur log usage:', logError.message);
    }

    return new Response(JSON.stringify({
      success: true,
      remaining_balance: userProfile.tokens_balance,
      consumed: amount
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ Erreur consommation jetons:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// Fonction utilitaire pour récupérer un utilisateur depuis la base
const getUserFromDatabase = async (supabase: any, userId: string): Promise<MisanUser | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      subscription_type: data.subscription_type,
      subscription_status: data.subscription_status,
      subscription_start: data.created_at,
      subscription_end: data.subscription_end,
      tokens_balance: data.tokens_balance,
      trial_used: data.trial_used,
      created_at: data.created_at
    };

  } catch {
    return null;
  }
};

// Fonction utilitaire pour récupérer un utilisateur par email
const getUserByEmailFromDatabase = async (supabase: any, email: string): Promise<MisanUser | null> => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) {
      return null;
    }

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      subscription_type: data.subscription_type,
      subscription_status: data.subscription_status,
      subscription_start: data.created_at,
      subscription_end: data.subscription_end,
      tokens_balance: data.tokens_balance,
      trial_used: data.trial_used,
      created_at: data.created_at
    };

  } catch {
    return null;
  }
};