import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './edge';

const isDev = typeof import.meta !== 'undefined' ? import.meta.env.DEV : false;
const debugLog = (...args: unknown[]) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

// Fonction pour initialiser la base de données Misan
export async function initializeMisanDatabase(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    debugLog('🚀 Initialisation de la base de données Misan...');
    const { projectId, publicAnonKey } = await getSupabaseEdgeCredentials();
    debugLog('📡 Project ID:', projectId);
    debugLog('🔑 Anon Key présente:', publicAnonKey ? 'Oui' : 'Non');

    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/init-database');
    debugLog('🌐 URL appelée:', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    debugLog('📡 Statut de la réponse:', response.status);
    debugLog('📡 Headers de la réponse:', Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur HTTP:', response.status, errorText);
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    debugLog('📊 Données reçues:', data);

    if (data.success) {
      debugLog('✅ Base de données initialisée avec succès');
      debugLog('📋 Stockage:', data.storage);
      debugLog('👤 Utilisateur admin:', data.admin_user);
      debugLog('🎯 Fonctionnalités:', data.features);
      
      if (data.next_steps) {
        debugLog('📋 Prochaines étapes:', data.next_steps);
      }
    } else {
      console.error('❌ Erreur initialisation:', data.error);
    }

    return {
      success: data.success,
      message: data.message || 'Initialisation terminée',
      error: data.error,
      ...data
    };

  } catch (error) {
    console.error('❌ Erreur initialisation base de données:', error);
    
    // Analyse plus détaillée de l'erreur
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return {
        success: false,
        message: 'Erreur de connexion - Edge Functions probablement non déployées',
        error: 'Les Supabase Edge Functions ne semblent pas être disponibles. Veuillez vérifier le déploiement.'
      };
    }
    
    return {
      success: false,
      message: 'Erreur lors de l\'initialisation',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Fonction pour vérifier l'état du serveur
export async function checkServerHealth(): Promise<{ success: boolean; message: string }> {
  try {
    const { publicAnonKey } = await getSupabaseEdgeCredentials();
    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/health');
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('❌ Erreur vérification serveur:', error);
    return {
      success: false,
      message: 'Serveur inaccessible'
    };
  }
}

// Fonction pour créer/réactiver l'utilisateur admin
export async function createAdminUser(): Promise<{ success: boolean; message: string; error?: string; admin_user?: any }> {
  try {
    debugLog('👑 Création/Réactivation du compte administrateur...');

    const { projectId, publicAnonKey } = await getSupabaseEdgeCredentials();
    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/create-admin-user');
    debugLog('🌐 URL appelée:', url);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    debugLog('📡 Statut de la réponse:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Erreur HTTP:', response.status, errorText);
      throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    debugLog('📊 Données reçues:', data);

    if (data.success) {
      debugLog('✅ Compte administrateur créé/réactivé avec succès');
      debugLog('👤 Admin:', data.admin_user);
      debugLog('🔍 Vérification:', data.verification);
    } else {
      console.error('❌ Erreur création admin:', data.error);
    }

    return {
      success: data.success,
      message: data.message || 'Opération terminée',
      error: data.error,
      admin_user: data.admin_user,
      ...data
    };

  } catch (error) {
    console.error('❌ Erreur création admin:', error);
    
    return {
      success: false,
      message: 'Erreur lors de la création/réactivation',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}
