import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './edge';

const isDev = typeof import.meta !== 'undefined' ? import.meta.env.DEV : false;
const debugLog = (...args: unknown[]) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
};

// Fonction pour réinitialiser complètement la base de données
export async function resetMisanDatabase(): Promise<{ success: boolean; message: string; error?: string }> {
  try {
    debugLog('🔥 RÉINITIALISATION COMPLÈTE DE LA BASE DE DONNÉES MISAN...');
    debugLog('⚠️ ATTENTION : Toutes les données vont être supprimées !');

    const { projectId, publicAnonKey } = await getSupabaseEdgeCredentials();
    debugLog('📡 Project ID:', projectId);

    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/reset-database');
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
    debugLog('📊 Données reçues:', data);

    if (data.success) {
      debugLog('🔥 RÉINITIALISATION COMPLÈTE TERMINÉE');
      debugLog('📋 Opérations effectuées:', data.operations_performed);
      
      if (data.warning) {
        debugLog('⚠️ Avertissement:', data.warning);
      }
    } else {
      console.error('❌ Erreur réinitialisation:', data.error);
    }

    return {
      success: data.success,
      message: data.message || 'Réinitialisation terminée',
      error: data.error,
      ...data
    };

  } catch (error) {
    console.error('❌ Erreur réinitialisation base de données:', error);
    
    return {
      success: false,
      message: 'Erreur lors de la réinitialisation',
      error: error instanceof Error ? error.message : 'Erreur inconnue'
    };
  }
}
