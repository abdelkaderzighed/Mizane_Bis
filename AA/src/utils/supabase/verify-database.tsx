import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './edge';

export interface DatabaseVerificationResult {
  success: boolean;
  isEmpty: boolean;
  userCount: number;
  tableStatus: {
    [tableName: string]: {
      exists: boolean;
      rowCount: number;
    };
  };
  error?: string;
  details: string[];
}

export async function verifyDatabaseEmpty(): Promise<DatabaseVerificationResult> {
  try {
    const { publicAnonKey } = await getSupabaseEdgeCredentials();
    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/verify-empty');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        isEmpty: false,
        userCount: -1,
        tableStatus: {},
        error: `Erreur HTTP ${response.status}: ${errorText}`,
        details: [`Échec de la vérification: ${response.status}`]
      };
    }

    const result = await response.json();
    return result;

  } catch (error) {
    console.error('Erreur lors de la vérification:', error);
    return {
      success: false,
      isEmpty: false,
      userCount: -1,
      tableStatus: {},
      error: error.message || 'Erreur de connexion',
      details: ['Impossible de se connecter au serveur de vérification']
    };
  }
}

export async function checkDatabaseHealth(): Promise<{success: boolean, message: string, details: string[]}> {
  try {
    const { publicAnonKey } = await getSupabaseEdgeCredentials();
    const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/health');
    
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`
      }
    });

    if (response.ok) {
      const data = await response.json();
      return {
        success: true,
        message: 'Serveur accessible',
        details: [
          `Statut: ${response.status}`,
          `Réponse: ${JSON.stringify(data)}`,
          `Timestamp: ${new Date().toLocaleTimeString()}`
        ]
      };
    } else {
      return {
        success: false,
        message: `Erreur serveur: ${response.status}`,
        details: [`HTTP ${response.status}: ${await response.text()}`]
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Serveur inaccessible',
      details: [`Erreur: ${error.message}`]
    };
  }
}
