import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './edge';

const isDev = typeof import.meta !== 'undefined' ? import.meta.env.DEV : false;
const debugLog = (...args: unknown[]) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

export interface CompleteResetResult {
  success: boolean;
  message: string;
  operations_performed: string[];
  admin_user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    tokens: number;
  };
  verification?: {
    table_accessible: boolean;
    record_count: number;
    admin_exists: boolean;
    auth_user_exists: boolean;
  };
  error?: string;
  warning?: string;
}

// Fonction pour effectuer une réinitialisation complète de la base de données
export async function performCompleteReset(): Promise<CompleteResetResult> {
  try {
    debugLog('🔥 LANCEMENT DE LA RÉINITIALISATION COMPLÈTE...');
    debugLog('⚠️ ATTENTION : Toutes les données vont être supprimées !');
    const { projectId, publicAnonKey } = await getSupabaseEdgeCredentials();
    debugLog('📡 Project ID:', projectId);

    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/complete-reset');
    debugLog('🌐 URL appelée:', url);

    const response = await fetch(url, {
      method: 'GET',
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
    debugLog('📊 Résultat de la réinitialisation:', data);

    if (data.success) {
      debugLog('🎉 RÉINITIALISATION COMPLÈTE RÉUSSIE !');
      debugLog('📋 Opérations effectuées:', data.operations_performed);
      debugLog('👤 Utilisateur admin:', data.admin_user);
      debugLog('🔍 Vérification:', data.verification);
    } else {
      console.error('❌ Erreur lors de la réinitialisation:', data.error);
      if (data.warning) {
        debugLog('⚠️ Avertissement:', data.warning);
      }
    }

    return data;

  } catch (error) {
    console.error('💥 ERREUR CRITIQUE lors de la réinitialisation:', error);
    
    return {
      success: false,
      message: 'Erreur critique lors de la réinitialisation complète',
      operations_performed: ['Erreur de connexion au serveur'],
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}

// Fonction pour vérifier l'état de la base après réinitialisation
export async function verifyResetSuccess(): Promise<{
  success: boolean;
  details: string[];
  canProceed: boolean;
}> {
  try {
    debugLog('🔍 Vérification post-réinitialisation...');
    const { publicAnonKey } = await getSupabaseEdgeCredentials();

    // Test 1: Vérifier que le serveur répond
    const healthUrl = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/health');
    const healthResponse = await fetch(healthUrl, {
      headers: { 'Authorization': `Bearer ${publicAnonKey}` }
    });

    const details: string[] = [];
    let canProceed = true;

    if (healthResponse.ok) {
      details.push('✅ Serveur accessible');
    } else {
      details.push('❌ Serveur inaccessible');
      canProceed = false;
    }

    // Test 2: Vérifier la table KV store
    try {
      const listUrl = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/list-users');
      const listResponse = await fetch(listUrl, {
        headers: { 'Authorization': `Bearer ${publicAnonKey}` }
      });

      if (listResponse.ok) {
        const listData = await listResponse.json();
        details.push('✅ Table KV store accessible');
        details.push(`📊 Utilisateurs trouvés: ${listData.summary?.total_auth_users || 0}`);
      } else {
        details.push('❌ Table KV store inaccessible');
        canProceed = false;
      }
    } catch (error) {
      details.push('❌ Erreur test table KV store');
      canProceed = false;
    }

    return {
      success: canProceed,
      details,
      canProceed
    };

  } catch (error) {
    return {
      success: false,
      details: [`❌ Erreur vérification: ${error.message}`],
      canProceed: false
    };
  }
}
