import React from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Loader2, Database, CheckCircle, AlertCircle, Play } from 'lucide-react';
import { initializeMisanDatabase, checkServerHealth } from '../utils/supabase/init-database';

interface AdminInitializerProps {
  onInitComplete: () => void;
}

export function AdminInitializer({ onInitComplete }: AdminInitializerProps) {
  const [isInitializing, setIsInitializing] = React.useState(false);
  const [serverStatus, setServerStatus] = React.useState<'checking' | 'online' | 'offline'>('checking');
  const [initStatus, setInitStatus] = React.useState<'pending' | 'success' | 'error'>('pending');
  const [message, setMessage] = React.useState('');
  const [adminCredentials, setAdminCredentials] = React.useState<{email: string, password: string} | null>(null);

  React.useEffect(() => {
    checkServer();
  }, []);

  const checkServer = async () => {
    setServerStatus('checking');
    const result = await checkServerHealth();
    setServerStatus(result.success ? 'online' : 'offline');
  };

  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitStatus('pending');
    
    try {
      const result = await initializeMisanDatabase();
      
      if (result.success) {
        setInitStatus('success');
        setMessage(result.message);
        setAdminCredentials({
          email: 'zighed@zighed.com',
          password: 'admin'
        });
        
        // Attendre 3 secondes puis notifier la completion
        setTimeout(() => {
          onInitComplete();
        }, 3000);
      } else {
        setInitStatus('error');
        setMessage(result.error || 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      setInitStatus('error');
      setMessage('Erreur de connexion au serveur');
    } finally {
      setIsInitializing(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-slate-100 p-6">
      <Card className="w-full max-w-2xl p-8 shadow-xl">
        <div className="text-center mb-8">
          <Database className="w-16 h-16 mx-auto mb-4 text-emerald-600" />
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            Configuration Misan
          </h1>
          <p className="text-slate-600">
            Assistant IA Juridique - Initialisation de la base de données
          </p>
        </div>

        {/* Statut du serveur */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <span className="font-medium text-slate-700">Statut du serveur</span>
            <Badge 
              variant={serverStatus === 'online' ? 'default' : serverStatus === 'offline' ? 'destructive' : 'secondary'}
              className="gap-2"
            >
              {serverStatus === 'checking' && <Loader2 className="w-3 h-3 animate-spin" />}
              {serverStatus === 'online' && <CheckCircle className="w-3 h-3" />}
              {serverStatus === 'offline' && <AlertCircle className="w-3 h-3" />}
              {serverStatus === 'checking' ? 'Vérification...' : 
               serverStatus === 'online' ? 'En ligne' : 'Hors ligne'}
            </Badge>
          </div>
          
          {serverStatus === 'offline' && (
            <Alert className="border-red-200 bg-red-50">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Le serveur Supabase n'est pas accessible. Vérifiez votre connexion internet.
              </AlertDescription>
            </Alert>
          )}
        </div>

        {/* Configuration de la base de données */}
        {serverStatus === 'online' && (
          <div className="space-y-6">
            <div className="bg-slate-50 rounded-lg p-6 space-y-4">
              <h3 className="font-semibold text-slate-800 mb-3">Configuration initiale</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tables utilisateurs</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Système d'abonnements</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Gestion des jetons</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Système d'alertes</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Transactions</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Paramètres système</span>
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Utilisateur administrateur */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-6">
              <h3 className="font-semibold text-emerald-800 mb-3">Compte administrateur</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-emerald-700">Nom d'utilisateur:</span>
                  <span className="font-mono">zighed</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Email:</span>
                  <span className="font-mono">zighed@zighed.com</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Mot de passe initial:</span>
                  <span className="font-mono">admin</span>
                </div>
              </div>
              <p className="text-xs text-emerald-600 mt-3">
                ⚠️ Changez le mot de passe après la première connexion
              </p>
            </div>

            {/* Action d'initialisation */}
            <div className="text-center space-y-4">
              {initStatus === 'pending' && (
                <Button 
                  onClick={handleInitialize}
                  disabled={isInitializing}
                  size="lg"
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isInitializing ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Initialisation en cours...
                    </>
                  ) : (
                    <>
                      <Play className="w-5 h-5 mr-2" />
                      Initialiser la base de données
                    </>
                  )}
                </Button>
              )}

              {initStatus === 'success' && (
                <div className="space-y-4">
                  <Alert className="border-green-200 bg-green-50">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      {message}
                    </AlertDescription>
                  </Alert>
                  
                  {adminCredentials && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-800 mb-2">Identifiants administrateur</h4>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Email:</span>
                          <span className="font-mono">{adminCredentials.email}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mot de passe:</span>
                          <span className="font-mono">{adminCredentials.password}</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <p className="text-sm text-slate-600">
                    Redirection automatique vers l'application dans quelques secondes...
                  </p>
                </div>
              )}

              {initStatus === 'error' && (
                <div className="space-y-4">
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      {message}
                    </AlertDescription>
                  </Alert>
                  
                  <Button 
                    onClick={handleInitialize}
                    variant="outline"
                    className="border-emerald-600 text-emerald-600 hover:bg-emerald-50"
                  >
                    Réessayer
                  </Button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-slate-200 text-center">
          <p className="text-xs text-slate-500">
            Misan - Assistant IA Juridique pour le droit algérien
          </p>
        </div>
      </Card>
    </div>
  );
}