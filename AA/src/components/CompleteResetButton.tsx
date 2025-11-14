import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  Trash2, 
  AlertTriangle, 
  CheckCircle, 
  Loader2, 
  Database,
  RefreshCw,
  Shield,
  Users,
  Settings,
  Zap
} from 'lucide-react';
import { performCompleteReset, verifyResetSuccess, CompleteResetResult } from '../utils/supabase/complete-reset';
import { toast } from 'sonner';

interface CompleteResetButtonProps {
  onResetComplete?: () => void;
  className?: string;
}

export function CompleteResetButton({ onResetComplete, className = "" }: CompleteResetButtonProps) {
  const [isResetting, setIsResetting] = useState(false);
  const [resetResult, setResetResult] = useState<CompleteResetResult | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);

  const handleReset = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsResetting(true);
    setResetResult(null);

    try {
      console.log('🔥 Démarrage de la réinitialisation complète...');
      
      const result = await performCompleteReset();
      setResetResult(result);

      if (result.success) {
        toast.success('🎉 Base de données réinitialisée avec succès !');
        
        // Vérifier que tout fonctionne
        const verification = await verifyResetSuccess();
        if (verification.success) {
          toast.success('✅ Vérification post-réinitialisation réussie');
          
          // Attendre 2 secondes puis notifier la completion
          setTimeout(() => {
            if (onResetComplete) {
              onResetComplete();
            }
          }, 2000);
        } else {
          toast.warning('⚠️ Réinitialisation terminée mais vérification échouée');
        }
      } else {
        toast.error(`❌ Erreur lors de la réinitialisation: ${result.error}`);
      }
    } catch (error) {
      console.error('💥 Erreur critique:', error);
      toast.error('💥 Erreur critique lors de la réinitialisation');
      setResetResult({
        success: false,
        message: 'Erreur critique',
        operations_performed: ['Erreur de connexion'],
        error: error instanceof Error ? error.message : 'Erreur inconnue'
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleCancel = () => {
    setShowConfirmation(false);
    setResetResult(null);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-red-600">
          <Trash2 className="w-5 h-5" />
          Réinitialisation Complète de la Base de Données
        </CardTitle>
        <CardDescription>
          Supprime TOUTES les données et recrée une base de données vierge avec l'utilisateur admin.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {!showConfirmation && !resetResult && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>⚠️ ATTENTION - Action irréversible</AlertTitle>
            <AlertDescription>
              <div className="space-y-2 mt-2">
                <p><strong>Cette action va supprimer :</strong></p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Tous les utilisateurs (Auth + Profils)</li>
                  <li>• Toutes les tables personnalisées</li>
                  <li>• Tous les paramètres système</li>
                  <li>• Toutes les sessions actives</li>
                  <li>• Tout l'historique des données</li>
                </ul>
                <p className="mt-2"><strong>Cette action va recréer :</strong></p>
                <ul className="text-sm space-y-1 ml-4">
                  <li>• Table KV store vierge</li>
                  <li>• Utilisateur admin (a@a.a / admin)</li>
                  <li>• Paramètres système par défaut</li>
                  <li>• Politiques de sécurité RLS</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {showConfirmation && !isResetting && !resetResult && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>🔥 CONFIRMATION FINALE</AlertTitle>
            <AlertDescription>
              <div className="space-y-3">
                <p className="font-semibold">ÊTES-VOUS ABSOLUMENT CERTAIN ?</p>
                <p>Cette action est <strong>IRRÉVERSIBLE</strong> et va :</p>
                <div className="bg-red-100 p-3 rounded border border-red-300">
                  <p className="text-red-800 font-medium">
                    🗑️ SUPPRIMER DÉFINITIVEMENT toutes vos données<br/>
                    🔄 RECRÉER une base de données complètement vierge<br/>
                    👤 CRÉER un nouvel utilisateur admin
                  </p>
                </div>
                <p className="text-sm">
                  Tapez <code className="bg-red-200 px-1 rounded">SUPPRIMER</code> dans votre tête pour confirmer.
                </p>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Résultats de la réinitialisation */}
        {resetResult && (
          <div className="space-y-4">
            <Alert variant={resetResult.success ? "default" : "destructive"}>
              {resetResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600" />
              )}
              <AlertTitle>
                {resetResult.success ? '🎉 Réinitialisation Réussie' : '❌ Erreur de Réinitialisation'}
              </AlertTitle>
              <AlertDescription>
                {resetResult.message}
                {resetResult.warning && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-yellow-800 text-sm">⚠️ {resetResult.warning}</p>
                  </div>
                )}
              </AlertDescription>
            </Alert>

            {/* Détails des opérations */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Opérations effectuées</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1 text-sm">
                  {(resetResult.operations_performed || []).map((operation, index) => (
                    <div key={index} className="flex items-start gap-2">
                      {operation.includes('Erreur') ? (
                        <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      ) : (
                        <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      )}
                      <span className={operation.includes('Erreur') ? 'text-red-700' : 'text-green-700'}>
                        {operation}
                      </span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Informations utilisateur admin */}
            {resetResult.admin_user && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="w-4 h-4 text-green-600" />
                    Utilisateur Administrateur Créé
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Email:</span>
                      <code className="bg-green-100 px-2 py-1 rounded">{resetResult.admin_user.email}</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Mot de passe:</span>
                      <code className="bg-green-100 px-2 py-1 rounded">admin</code>
                    </div>
                    <div className="flex justify-between">
                      <span>Rôle:</span>
                      <Badge className="bg-red-500 text-white">{resetResult.admin_user.role}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Jetons:</span>
                      <span className="font-mono">{resetResult.admin_user.tokens.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vérification finale */}
            {resetResult.verification && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Vérification Finale</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      {resetResult.verification.table_accessible ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span>Table KV accessible</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {resetResult.verification.admin_exists ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span>Admin KV créé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {resetResult.verification.auth_user_exists ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-red-600" />
                      )}
                      <span>Admin Auth créé</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Database className="w-4 h-4 text-blue-600" />
                      <span>{resetResult.verification.record_count} enregistrements</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Boutons d'action */}
        <div className="flex gap-2">
          {!showConfirmation && !resetResult && (
            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="destructive"
              className="flex-1"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              🔥 RÉINITIALISER COMPLÈTEMENT
            </Button>
          )}

          {showConfirmation && !isResetting && !resetResult && (
            <>
              <Button
                onClick={handleReset}
                disabled={isResetting}
                variant="destructive"
                className="flex-1"
              >
                {isResetting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Réinitialisation...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    🔥 OUI, SUPPRIMER TOUT
                  </>
                )}
              </Button>
              <Button
                onClick={handleCancel}
                variant="outline"
                disabled={isResetting}
              >
                Annuler
              </Button>
            </>
          )}

          {resetResult && (
            <Button
              onClick={() => {
                setResetResult(null);
                setShowConfirmation(false);
              }}
              variant="outline"
              className="flex-1"
            >
              Fermer
            </Button>
          )}
        </div>

        {/* Instructions post-réinitialisation */}
        {resetResult?.success && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-medium text-green-800 mb-2">🎯 Prochaines étapes</h4>
            <ol className="text-sm text-green-700 space-y-1">
              <li>1. ✅ Base de données complètement réinitialisée</li>
              <li>2. 🔑 Connectez-vous avec <strong>a@a.a</strong> / <strong>admin</strong></li>
              <li>3. 🔧 Testez toutes les fonctionnalités</li>
              <li>4. 👥 Créez de nouveaux utilisateurs si nécessaire</li>
              <li>5. ⚙️ Configurez les paramètres selon vos besoins</li>
            </ol>
          </div>
        )}

        {/* Avertissement de sécurité */}
        <div className="text-xs text-muted-foreground bg-muted p-3 rounded border">
          <p><strong>Note de sécurité :</strong> Cette fonction est destinée au développement uniquement. 
          En production, utilisez des sauvegardes et des migrations contrôlées.</p>
        </div>
      </CardContent>
    </Card>
  );
}