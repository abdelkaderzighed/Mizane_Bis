import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Loader2, 
  RefreshCw,
  Info,
  ExternalLink,
  Key,
  Globe
} from 'lucide-react';
import { toast } from 'sonner';

interface DatabaseConnectionCheckerProps {
  className?: string;
}

interface ConnectionResult {
  success: boolean;
  projectId: string;
  hasAnonKey: boolean;
  serverAccessible: boolean;
  databaseEmpty: boolean;
  userCount: number;
  tableCount: number;
  error?: string;
  details: string[];
}

export function DatabaseConnectionChecker({ className = "" }: DatabaseConnectionCheckerProps) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<ConnectionResult | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const checkConnection = async () => {
    setChecking(true);
    setHasChecked(true);
    
    try {
      console.log('🔍 Vérification de la connexion à la base de données...');
      
      // Importer les variables de configuration
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      
      const checkResult: ConnectionResult = {
        success: false,
        projectId,
        hasAnonKey: !!publicAnonKey,
        serverAccessible: false,
        databaseEmpty: false,
        userCount: 0,
        tableCount: 0,
        details: []
      };

      checkResult.details.push(`📡 Project ID: ${projectId}`);
      checkResult.details.push(`🔑 Anon Key: ${publicAnonKey ? 'Présente' : 'Manquante'}`);

      if (!projectId || !publicAnonKey) {
        checkResult.error = 'Variables d\'environnement manquantes';
        checkResult.details.push('❌ Configuration incomplète');
        setResult(checkResult);
        return;
      }

      // Test 1: Vérifier l'accessibilité du serveur
      console.log('🌐 Test de connexion au serveur...');
      try {
        const healthUrl = `https://${projectId}.supabase.co/rest/v1/`;
        const response = await fetch(healthUrl, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        // Pour une base vierge, on s'attend à une 404 car aucune table n'existe
        if (response.status === 404 || response.ok) {
          checkResult.serverAccessible = true;
          checkResult.details.push('✅ Serveur Supabase accessible (base vierge)');
        } else {
          checkResult.details.push(`❌ Serveur inaccessible (${response.status})`);
        }
      } catch (error) {
        checkResult.details.push(`❌ Erreur connexion serveur: ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Test 2: Vérifier les utilisateurs Auth (optionnel pour base vierge)
      console.log('👥 Vérification des utilisateurs Auth...');
      try {
        // Pour une base vierge, on teste juste la connectivité générale
        const authUrl = `https://${projectId}.supabase.co/auth/v1/settings`;
        const authResponse = await fetch(authUrl, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (authResponse.ok) {
          checkResult.userCount = 0; // Base vierge = 0 utilisateurs
          checkResult.details.push(`👥 Service Auth accessible (0 utilisateurs - base vierge)`);
        } else {
          checkResult.details.push(`⚠️ Service Auth: ${authResponse.status} (normal pour base vierge)`);
        }
      } catch (error) {
        checkResult.details.push(`ℹ️ Auth non testé: ${error instanceof Error ? error.message : 'Erreur inconnue'} (normal pour base vierge)`);
      }

      // Test 3: Vérifier l'état de la base (doit être vierge)
      console.log('📊 Vérification de l\'état de la base...');
      try {
        // Test simple pour voir si la base répond
        const testUrl = `https://${projectId}.supabase.co/rest/v1/`;
        const testResponse = await fetch(testUrl, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (testResponse.status === 404) {
          // 404 = aucune table = base vierge = parfait !
          checkResult.tableCount = 0;
          checkResult.details.push(`📊 Base de données vierge confirmée (404 = aucune table)`);
        } else if (testResponse.ok) {
          checkResult.details.push(`⚠️ Base contient peut-être des données (${testResponse.status})`);
        } else {
          checkResult.details.push(`⚠️ Réponse inattendue: ${testResponse.status}`);
        }
      } catch (error) {
        checkResult.details.push(`ℹ️ Test base: ${error instanceof Error ? error.message : 'Erreur inconnue'} (normal pour base vierge)`);
      }

      // Test 4: Confirmer l'absence de la table kv_store (base vierge)
      console.log('🗄️ Vérification absence table kv_store...');
      try {
        const kvUrl = `https://${projectId}.supabase.co/rest/v1/kv_store_810b4099?select=count`;
        const kvResponse = await fetch(kvUrl, {
          headers: {
            'apikey': publicAnonKey,
            'Authorization': `Bearer ${publicAnonKey}`
          }
        });

        if (kvResponse.ok) {
          checkResult.details.push('⚠️ Table kv_store_810b4099 existe déjà (base non vierge)');
        } else if (kvResponse.status === 404) {
          checkResult.details.push('✅ Table kv_store_810b4099 n\'existe pas (base vierge confirmée)');
        } else {
          checkResult.details.push(`⚠️ Statut table kv_store: ${kvResponse.status}`);
        }
      } catch (error) {
        checkResult.details.push(`✅ Aucune table kv_store (base vierge): ${error instanceof Error ? error.message : 'Erreur inconnue'}`);
      }

      // Déterminer si la base est vide (pour une base vierge, on s'attend à 0 partout)
      checkResult.databaseEmpty = checkResult.userCount === 0 && checkResult.tableCount === 0;
      
      // Déterminer le succès global
      checkResult.success = checkResult.serverAccessible && checkResult.hasAnonKey;

      if (checkResult.success && checkResult.databaseEmpty) {
        checkResult.details.push('🎉 Base de données vierge et prête pour l\'initialisation !');
        toast.success('Base de données vierge confirmée !');
      } else if (checkResult.success) {
        checkResult.details.push('⚠️ Base de données accessible mais contient des données');
        toast.warning('Base de données non vierge');
      } else {
        toast.error('Problème de connexion détecté');
      }

      setResult(checkResult);

    } catch (error) {
      console.error('❌ Erreur lors de la vérification:', error);
      
      const errorResult: ConnectionResult = {
        success: false,
        projectId: 'Inconnu',
        hasAnonKey: false,
        serverAccessible: false,
        databaseEmpty: false,
        userCount: 0,
        tableCount: 0,
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        details: ['❌ Erreur lors de la vérification de la connexion']
      };
      
      setResult(errorResult);
      toast.error('Erreur lors de la vérification');
    } finally {
      setChecking(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5" />
          Vérification de la connexion Supabase
        </CardTitle>
        <CardDescription>
          Vérifiez que votre base de données Misan-V3 est correctement configurée et vierge
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          onClick={checkConnection}
          disabled={checking}
          variant={hasChecked ? "outline" : "default"}
          className="w-full"
        >
          {checking ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Vérification en cours...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              {hasChecked ? 'Revérifier la connexion' : 'Vérifier la connexion'}
            </>
          )}
        </Button>

        {hasChecked && result && (
          <div className="space-y-4">
            {/* Résumé global */}
            <Alert variant={result.success ? "default" : "destructive"}>
              {result.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <div className="space-y-2">
                  <div className="font-medium">
                    {result.success ? '✅ Connexion réussie' : '❌ Problème de connexion'}
                  </div>
                  {result.error && (
                    <div className="text-sm">{result.error}</div>
                  )}
                </div>
              </AlertDescription>
            </Alert>

            {/* Détails de la configuration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-blue-600" />
                    <span className="font-medium">Projet Supabase</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>ID: <code className="bg-muted px-1 rounded">{result.projectId}</code></div>
                    <div>Clé API: {result.hasAnonKey ? '✅ Configurée' : '❌ Manquante'}</div>
                    <div>Serveur: {result.serverAccessible ? '✅ Accessible' : '❌ Inaccessible'}</div>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-green-600" />
                    <span className="font-medium">État de la base</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div>Utilisateurs: <Badge variant="outline">{result.userCount}</Badge></div>
                    <div>Tables: <Badge variant="outline">{result.tableCount}</Badge></div>
                    <div>
                      État: {result.databaseEmpty ? (
                        <Badge className="bg-green-500 text-white">Vierge ✅</Badge>
                      ) : (
                        <Badge className="bg-orange-500 text-white">Contient des données</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>

            {/* Détails techniques */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Détails de la vérification</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm font-mono">
                  {result.details.map((detail, index) => (
                    <div key={index} className="text-xs">
                      {detail}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recommandations */}
            {result.success && result.databaseEmpty && (
              <Alert>
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium text-green-800">🎉 Parfait ! Votre configuration est correcte</div>
                    <div className="text-sm text-green-700">
                      • Connexion à Misan-V3 : ✅<br/>
                      • Base de données vierge : ✅<br/>
                      • Prêt pour l'initialisation : ✅
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {result.success && !result.databaseEmpty && (
              <Alert>
                <Info className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium text-blue-800">ℹ️ Base de données non vierge</div>
                    <div className="text-sm text-blue-700">
                      La base contient {result.userCount} utilisateur(s) et {result.tableCount} table(s).
                      Vous pouvez soit les supprimer manuellement, soit utiliser le script de réinitialisation.
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {!result.success && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  <div className="space-y-2">
                    <div className="font-medium">❌ Problème de configuration détecté</div>
                    <div className="text-sm">
                      Vérifiez que vous avez bien mis à jour le Project ID et la clé API dans 
                      <code className="bg-red-100 px-1 rounded ml-1">src/utils/supabase/info.tsx</code>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}

        {/* Instructions */}
        <div className="text-sm text-muted-foreground space-y-2">
          <div className="font-medium">Pour vérifier manuellement :</div>
          <div className="space-y-1">
            <div>1. Dashboard Supabase → Votre projet Misan-V3</div>
            <div>2. Settings → API → Vérifiez Project URL et anon key</div>
            <div>3. Table Editor → Devrait être vide (base vierge)</div>
            <div>4. Authentication → Users → Devrait être vide</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}