import React from 'react';
import { supabase } from '../supabase';
import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './edge';

const EDGE_BASE_PATH = '/functions/v1/make-server-810b4099';

async function fetchEdge(
  path: string,
  options: RequestInit = {},
  authToken?: string
) {
  const [{ publicAnonKey }, url] = await Promise.all([
    getSupabaseEdgeCredentials(),
    buildEdgeFunctionUrl(`${EDGE_BASE_PATH}${path}`)
  ]);

  const headers = new Headers({
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${authToken || publicAnonKey}`,
  });

  if (options.headers) {
    const incoming = new Headers(options.headers as HeadersInit);
    incoming.forEach((value, key) => {
      headers.set(key, value);
    });
  }

  const { headers: _ignored, ...rest } = options;

  return fetch(url, {
    ...rest,
    headers,
  });
}

// Types pour l'application Misan
export interface MisanUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'pro' | 'premium';
  subscription_type: 'admin' | 'pro' | 'premium';
  subscription_status: 'active' | 'inactive' | 'expired' | 'pending';
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

export interface UserAccess {
  can_access_ai: boolean;
  needs_upgrade: boolean;
  message: string;
}

export interface UserAlert {
  type: 'subscription' | 'tokens' | 'payment' | 'system';
  level: 'info' | 'warning' | 'error';
  message: string;
}

export interface AuthResponse {
  success: boolean;
  user?: MisanUser;
  access?: UserAccess;
  alerts?: UserAlert[];
  error?: string;
  redirect_to_pricing?: boolean;
  message?: string;
}

// Classe pour gérer l'authentification Misan
export class MisanAuth {
  private static instance: MisanAuth;
  private currentUser: MisanUser | null = null;
  private accessInfo: UserAccess | null = null;
  private alerts: UserAlert[] = [];

  static getInstance(): MisanAuth {
    if (!MisanAuth.instance) {
      MisanAuth.instance = new MisanAuth();
    }
    return MisanAuth.instance;
  }

  // Inscription avec gestion de l'essai gratuit
  async signUp(email: string, password: string, name: string): Promise<AuthResponse> {
    try {
      console.log('📝 Tentative d\'inscription:', email);

      const response = await fetchEdge('/signup', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          name,
          grant_free_trial: true // Indiquer que l'utilisateur doit recevoir l'essai gratuit
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur HTTP inscription:', response.status, errorText);
        
        if (response.status === 404) {
          return {
            success: false,
            error: 'Service d\'inscription non disponible. Veuillez contacter l\'administrateur.'
          };
        }
        
        return {
          success: false,
          error: `Erreur serveur: ${response.status}`
        };
      }

      const data = await response.json();

      if (!data.success) {
        console.log('❌ Erreur inscription:', data.error);
        return {
          success: false,
          error: data.error,
          redirect_to_pricing: data.redirect_to_pricing
        };
      }

      console.log('✅ Inscription enregistrée, en attente de validation admin');

      return {
        success: true,
        message: data.message || 'Votre inscription est enregistrée. Vous recevrez un email dès la validation de votre compte.'
      };

    } catch (error) {
      console.error('❌ Erreur réseau inscription:', error);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  // Vérifier si le serveur est disponible
  private async checkServerAvailability(): Promise<boolean> {
    try {
      const response = await fetchEdge('/health', {
        method: 'GET'
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  // Connexion utilisateur
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      console.log('🔑 Tentative de connexion:', email);

      // Authentification via Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (authError) {
        console.log('❌ Erreur auth Supabase:', authError.message);
        return {
          success: false,
          error: 'Email ou mot de passe incorrect'
        };
      }

      if (!authData.session?.access_token) {
        console.log('❌ Token d\'accès manquant');
        return {
          success: false,
          error: 'Impossible d\'obtenir le token d\'accès'
        };
      }

      console.log('✅ Auth Supabase réussie, vérification du statut utilisateur...');

      // Vérifier le statut utilisateur via le serveur
      const statusResponse = await fetchEdge('/check-user-status', {
        method: 'POST'
      }, authData.session.access_token);

      if (!statusResponse.ok) {
        const errorText = await statusResponse.text();
        console.error('❌ Erreur vérification statut:', statusResponse.status, errorText);
        return {
          success: false,
          error: 'Erreur lors de la vérification du profil utilisateur'
        };
      }

      const statusData = await statusResponse.json();

      if (!statusData.success) {
        console.log('❌ Erreur vérification statut serveur:', statusData.error);
        return {
          success: false,
          error: statusData.error || 'Erreur de vérification du profil utilisateur'
        };
      }

      const userProfile = statusData.user as MisanUser | null;

      if (!userProfile) {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Profil utilisateur introuvable.'
        };
      }

      if (userProfile.subscription_status === 'inactive') {
        await supabase.auth.signOut();
        return {
          success: false,
          error: 'Votre compte est en cours d\'approbation. Vous recevrez un email dès son activation.'
        };
      }

      // Stocker les informations utilisateur, même si l'accès IA est restreint
      this.currentUser = userProfile;
      this.accessInfo = statusData.access ?? null;
      this.alerts = statusData.alerts || [];

      console.log('✅ Connexion réussie:', this.currentUser.name);
      console.log('🔐 Accès IA:', this.accessInfo?.can_access_ai);

      return {
        success: true,
        user: this.currentUser,
        access: this.accessInfo,
        alerts: this.alerts
      };

    } catch (error) {
      console.error('❌ Erreur connexion (catch):', error);
      console.error('❌ Stack trace:', error.stack);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  // Déconnexion
  async signOut(): Promise<void> {
    try {
      await supabase.auth.signOut();
      this.currentUser = null;
      this.accessInfo = null;
      this.alerts = [];
      console.log('✅ Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
    }
  }

  // Vérifier la session active
  async checkSession(): Promise<AuthResponse | null> {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.access_token) {
        return null;
      }

      // Vérifier le statut utilisateur
      const statusResponse = await fetchEdge('/check-user-status', {
        method: 'POST'
      }, session.session.access_token);

      if (!statusResponse.ok) {
        console.log('❌ Erreur vérification session:', statusResponse.status);
        return null;
      }

      const statusData = await statusResponse.json();

      if (!statusData.success) {
        return null;
      }

      const userProfile = statusData.user as MisanUser | null;

      if (!userProfile) {
        await supabase.auth.signOut();
        return null;
      }

      if (userProfile.subscription_status === 'inactive') {
        await supabase.auth.signOut();
        return null;
      }

      this.currentUser = userProfile;
      this.accessInfo = statusData.access ?? null;
      this.alerts = statusData.alerts || [];

      return {
        success: true,
        user: this.currentUser,
        access: this.accessInfo,
        alerts: this.alerts
      };

    } catch (error) {
      console.error('❌ Erreur vérification session:', error);
      return null;
    }
  }

  // Consommer des jetons pour l'utilisation de l'IA
  async consumeTokens(amount: number): Promise<{ success: boolean; remaining?: number; error?: string }> {
    try {
      const { data: session } = await supabase.auth.getSession();
      
      if (!session.session?.access_token) {
        return { success: false, error: 'Session expirée' };
      }

      const response = await fetchEdge('/consume-tokens', {
        method: 'POST',
        body: JSON.stringify({ amount })
      }, session.session.access_token);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Erreur consommation jetons:', response.status, errorText);
        return { success: false, error: 'Erreur serveur' };
      }

      const data = await response.json();

      if (data.success && this.currentUser) {
        // Mettre à jour le solde local
        this.currentUser.tokens_balance = data.remaining_balance;
      }

      return data;

    } catch (error) {
      console.error('❌ Erreur consommation jetons:', error);
      return { success: false, error: 'Erreur serveur' };
    }
  }

  async validateCart(items: Array<{ type: string; planType?: string; quantity?: number }>): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        return {
          success: false,
          error: 'Session expirée, veuillez vous reconnecter'
        };
      }

      const response = await fetchEdge('/validate-order', {
        method: 'POST',
        body: JSON.stringify({ cart: items })
      }, token);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        return {
          success: false,
          error: data?.error || 'Validation du panier impossible. Merci de contacter le support.'
        };
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur validation panier:', error);
      return {
        success: false,
        error: 'Impossible de valider le panier pour le moment.'
      };
    }
  }

  async updateProfile(updates: Record<string, unknown>): Promise<AuthResponse> {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        return {
          success: false,
          error: 'Session expirée, veuillez vous reconnecter'
        };
      }

      const response = await fetchEdge('/update-profile', {
        method: 'POST',
        body: JSON.stringify(updates)
      }, token);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        return {
          success: false,
          error: data?.error || `Erreur serveur (${response.status})`
        };
      }

      // Mettre à jour l'utilisateur courant avec les nouvelles informations
      this.currentUser = {
        ...(this.currentUser || ({} as MisanUser)),
        ...data.user
      };

      return {
        success: true,
        user: this.currentUser
      };

    } catch (error) {
      console.error('❌ Erreur mise à jour profil:', error);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  async adminUpdateUser(
    userId: string,
    updates: {
      name?: string;
      role?: string;
      status?: string;
      subscriptionType?: string;
      subscriptionStart?: string;
      subscriptionEnd?: string;
      tokens?: number;
    }
  ): Promise<{ success: boolean; user?: MisanUser; error?: string }> {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        return {
          success: false,
          error: 'Session expirée, veuillez vous reconnecter'
        };
      }

      const response = await fetchEdge('/admin/update-user', {
        method: 'POST',
        body: JSON.stringify({
          user_id: userId,
          ...updates
        })
      }, token);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        return {
          success: false,
          error: data?.error || `Erreur serveur (${response.status})`
        };
      }

      if (this.currentUser?.id === userId && data.user) {
        this.currentUser = {
          ...this.currentUser,
          ...data.user
        };
      }

      return {
        success: true,
        user: data.user
      };
    } catch (error) {
      console.error('❌ Erreur mise à jour admin utilisateur:', error);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  async adminDeleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAccessToken();

      if (!token) {
        return {
          success: false,
          error: 'Session expirée, veuillez vous reconnecter'
        };
      }

      const response = await fetchEdge('/admin/delete-user', {
        method: 'POST',
        body: JSON.stringify({ user_id: userId })
      }, token);

      const data = await response.json().catch(() => null);

      if (!response.ok || !data?.success) {
        return {
          success: false,
          error: data?.error || `Erreur serveur (${response.status})`
        };
      }

      if (this.currentUser?.id === userId) {
        await this.signOut();
      }

      return { success: true };
    } catch (error) {
      console.error('❌ Erreur suppression utilisateur:', error);
      return {
        success: false,
        error: 'Erreur de connexion au serveur'
      };
    }
  }

  // Getters pour l'état actuel
  getCurrentUser(): MisanUser | null {
    return this.currentUser;
  }

  getAccessInfo(): UserAccess | null {
    return this.accessInfo;
  }

  getAlerts(): UserAlert[] {
    return this.alerts;
  }

  // Vérifier si l'utilisateur peut accéder à l'IA
  canAccessAI(): boolean {
    return this.accessInfo?.can_access_ai || false;
  }

  // Vérifier si l'utilisateur a besoin d'un upgrade
  needsUpgrade(): boolean {
    return this.accessInfo?.needs_upgrade || false;
  }

  // Obtenir le token d'accès actuel
  async getAccessToken(): Promise<string | null> {
    try {
      const { data: session } = await supabase.auth.getSession();
      return session.session?.access_token || null;
    } catch {
      return null;
    }
  }
}

// Instance singleton
export const misanAuth = MisanAuth.getInstance();

// Hooks React pour utiliser l'authentification
export function useMisanAuth() {
  const [user, setUser] = React.useState<MisanUser | null>(null);
  const [access, setAccess] = React.useState<UserAccess | null>(null);
  const [alerts, setAlerts] = React.useState<UserAlert[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    // Vérifier la session au chargement
    checkInitialSession();

    // Écouter les changements d'authentification
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAccess(null);
        setAlerts([]);
      } else if (event === 'SIGNED_IN' && session) {
        await refreshUserStatus();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkInitialSession = async () => {
    setLoading(true);
    const result = await misanAuth.checkSession();
    if (result) {
      setUser(result.user || null);
      setAccess(result.access || null);
      setAlerts(result.alerts || []);
    }
    setLoading(false);
  };

  const refreshUserStatus = async () => {
    const result = await misanAuth.checkSession();
    if (result) {
      setUser(result.user || null);
      setAccess(result.access || null);
      setAlerts(result.alerts || []);
    }
  };

  return {
    user,
    access,
    alerts,
    loading,
    signIn: misanAuth.signIn.bind(misanAuth),
    signUp: misanAuth.signUp.bind(misanAuth),
    signOut: misanAuth.signOut.bind(misanAuth),
    consumeTokens: misanAuth.consumeTokens.bind(misanAuth),
    refreshUserStatus
  };
}
