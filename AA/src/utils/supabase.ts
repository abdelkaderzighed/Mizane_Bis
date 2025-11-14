import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Variables d\'environnement Supabase manquantes');
}

let supabaseProjectId = '';
try {
  const [projectId] = new URL(supabaseUrl).hostname.split('.');
  supabaseProjectId = projectId || '';
} catch {
  supabaseProjectId = '';
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
export const SUPABASE_PROJECT_ID = supabaseProjectId;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Types pour l'authentification
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'pro' | 'premium';
  subscription_type: 'admin' | 'pro' | 'premium';
  subscription_status: 'active' | 'inactive' | 'expired' | 'pending';
  subscription_end?: string;
  tokens_balance: number;
  trial_used: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  error?: string;
  user?: AuthUser;
  session?: any;
}

// Fonctions d'authentification
export class AuthService {
  private static readonly EDGE_FUNCTION_URL = `${supabaseUrl}/functions/v1/auth-handler`;

  private static async callEdgeFunction(data: any): Promise<AuthResponse> {
    try {
      const response = await fetch(this.EDGE_FUNCTION_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseAnonKey}`,
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Erreur réseau');
      }

      return result;
    } catch (error) {
      console.error('Erreur Edge Function:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  static async initializeDatabase(): Promise<AuthResponse> {
    return this.callEdgeFunction({ action: 'init_database' });
  }

  static async createAdmin(): Promise<AuthResponse> {
    return this.callEdgeFunction({ action: 'create_admin' });
  }

  static async register(email: string, password: string, name: string): Promise<AuthResponse> {
    return this.callEdgeFunction({
      action: 'register',
      email,
      password,
      name
    });
  }

  static async login(email: string, password: string): Promise<AuthResponse> {
    const result = await this.callEdgeFunction({
      action: 'login',
      email,
      password
    });

    // Si la connexion réussit, stocker la session
    if (result.success && result.session) {
      await supabase.auth.setSession(result.session);
    }

    return result;
  }

  static async logout(): Promise<void> {
    await supabase.auth.signOut();
  }

  static async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Erreur récupération profil:', error);
        return null;
      }

      return profile;
    } catch (error) {
      console.error('Erreur getCurrentUser:', error);
      return null;
    }
  }

  static async consumeTokens(tokens: number, actionType: string): Promise<{ success: boolean; tokens_remaining?: number; error?: string }> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Utilisateur non connecté');
      }

      const result = await this.callEdgeFunction({
        action: 'consume_tokens',
        user_id: user.id,
        tokens,
        action_type: actionType
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      };
    }
  }

  static async getUserAlerts(): Promise<any[]> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return [];

      const { data: alerts, error } = await supabase
        .from('user_alerts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_read', false)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erreur récupération alertes:', error);
        return [];
      }

      return alerts || [];
    } catch (error) {
      console.error('Erreur getUserAlerts:', error);
      return [];
    }
  }

  static async markAlertAsRead(alertId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_alerts')
        .update({ is_read: true })
        .eq('id', alertId);

      return !error;
    } catch (error) {
      console.error('Erreur markAlertAsRead:', error);
      return false;
    }
  }
}
