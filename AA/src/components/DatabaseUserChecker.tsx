import React, { useState } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { 
  Users, 
  Database, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle, 
  User,
  Mail,
  Calendar,
  Shield,
  Coins,
  Eye,
  EyeOff,
  Info,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface DatabaseUser {
  auth_user: {
    id: string;
    email: string;
    created_at: string;
    last_sign_in_at?: string;
    email_confirmed_at?: string;
    user_metadata?: any;
  };
  kv_profile: {
    id: string;
    email: string;
    name: string;
    role: string;
    subscription_type: string;
    subscription_status: string;
    subscription_end: string;
    tokens_balance: number;
    trial_used: boolean;
    created_at: string;
  } | null;
  has_email_mapping: boolean;
  is_complete: boolean;
}

interface DatabaseSummary {
  total_auth_users: number;
  total_kv_profiles: number;
  total_email_mappings: number;
  complete_users: number;
  orphaned_profiles: number;
}

interface DatabaseUserCheckerProps {
  className?: string;
}

export function DatabaseUserChecker({ className = "" }: DatabaseUserCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState<DatabaseUser[]>([]);
  const [summary, setSummary] = useState<DatabaseSummary | null>(null);
  const [orphanedProfiles, setOrphanedProfiles] = useState<any[]>([]);
  const [emailMappings, setEmailMappings] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastCheck, setLastCheck] = useState<Date | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const checkDatabaseUsers = async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('🔍 Vérification des utilisateurs dans la base de données...');
      
      const { projectId, publicAnonKey } = await import('../utils/supabase/info');
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-810b4099/list-users`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', response.status, errorText);
        
        if (response.status === 404) {
          throw new Error('Edge Function non trouvée. Veuillez déployer les Edge Functions sur Supabase.');
        } else if (response.status === 500) {
          // Check if it's a missing table error
          if (errorText.includes('relation "kv_store_810b4099" does not exist') || 
              errorText.includes('table "kv_store_810b4099" does not exist') ||
              errorText.includes('kv_store_810b4099') ||
              errorText.includes('relation') ||
              errorText.includes('does not exist')) {
            throw new Error('TABLE_MISSING: La table kv_store_810b4099 n\'existe pas dans votre base de données.');
          } else {
            throw new Error(`Erreur serveur (500): ${errorText || 'Erreur interne du serveur'}`);
          }
        } else {
          throw new Error(`Erreur HTTP ${response.status}: ${errorText}`);
        }
      }

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Réponse invalide du serveur. Vérifiez que l\'Edge Function est correctement déployée.');
      }
      
      if (data.success) {
        setUsers(data.users || []);
        setSummary(data.summary);
        setOrphanedProfiles(data.orphaned_profiles || []);
        setEmailMappings(data.email_mappings || []);
        setLastCheck(new Date());
        
        console.log('✅ Utilisateurs récupérés:', data.summary);
        toast.success(`${data.summary.total_auth_users} utilisateur(s) trouvé(s)`);
      } else {
        console.error('❌ Server returned error:', data.error);
        throw new Error(data.error || 'Erreur inconnue du serveur');
      }

    } catch (error) {
      console.error('❌ Erreur vérification utilisateurs:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
      
      // Special handling for missing table error
      if (errorMessage.startsWith('TABLE_MISSING:')) {
        setError(errorMessage.replace('TABLE_MISSING: ', ''));
      } else {
        setError(errorMessage);
      }
      
      toast.error('Erreur lors de la vérification des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'pro': return 'bg-blue-500 text-white';
      case 'premium': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'inactive': return 'text-red-600 bg-red-50 border-red-200';
      case 'expired': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-600" />
          Utilisateurs dans la base de données
        </CardTitle>
        <CardDescription>
          Vérifiez quels utilisateurs sont actuellement stockés dans votre base de données Supabase
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        
        {/* Bouton de vérification */}
        <div className="flex items-center justify-between">
          <Button 
            onClick={checkDatabaseUsers}
            disabled={loading}
            className="flex items-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Vérification...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Vérifier les utilisateurs
              </>
            )}
          </Button>
          
          {lastCheck && (
            <div className="text-sm text-muted-foreground">
              Dernière vérification : {lastCheck.toLocaleTimeString()}
            </div>
          )}
        </div>

        {/* Affichage des erreurs */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <div><strong>Erreur :</strong> {error}</div>
                {error.includes('kv_store_810b4099') && (
                  <div className="text-sm">
                    <strong>Solution :</strong> La table principale est manquante. Suivez ces étapes :
                    <br />1. Ouvrez votre <strong>Dashboard Supabase</strong>
                    <br />2. Allez dans <strong>SQL Editor</strong>
                    <br />3. Copiez tout le contenu du fichier <code>src/misan-database-init-script.sql</code>
                    <br />4. Collez et exécutez le script complet
                    <br />5. Attendez que toutes les tables soient créées
                    <br />6. Revenez ici et cliquez à nouveau sur "Vérifier les utilisateurs"
                  </div>
                )}
                {error.includes('Edge Function') && (
                  <div className="text-sm">
                    <strong>Solution :</strong> Déployez l'Edge Function <code>make-server-810b4099</code> sur votre projet Supabase.
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Résumé */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.total_auth_users}</div>
                <div className="text-xs text-muted-foreground">Auth Users</div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.total_kv_profiles}</div>
                <div className="text-xs text-muted-foreground">KV Profiles</div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{summary.total_email_mappings}</div>
                <div className="text-xs text-muted-foreground">Email Maps</div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-emerald-600">{summary.complete_users}</div>
                <div className="text-xs text-muted-foreground">Complets</div>
              </div>
            </Card>
            <Card className="p-3">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.orphaned_profiles}</div>
                <div className="text-xs text-muted-foreground">Orphelins</div>
              </div>
            </Card>
          </div>
        )}

        {/* Toggle pour afficher les détails */}
        {users.length > 0 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDetails(!showDetails)}
            >
              {showDetails ? (
                <>
                  <EyeOff className="w-4 h-4 mr-2" />
                  Masquer les détails
                </>
              ) : (
                <>
                  <Eye className="w-4 h-4 mr-2" />
                  Afficher les détails
                </>
              )}
            </Button>
            
            <div className="text-sm text-muted-foreground">
              {users.length} utilisateur(s) trouvé(s)
            </div>
          </div>
        )}

        {/* Liste détaillée des utilisateurs */}
        {showDetails && users.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Détails des utilisateurs</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-80">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utilisateur</TableHead>
                      <TableHead>Rôle</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Jetons</TableHead>
                      <TableHead>Abonnement</TableHead>
                      <TableHead>Complet</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {user.kv_profile?.name?.charAt(0) || user.auth_user.email.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium text-sm">
                                {user.kv_profile?.name || 'Nom non défini'}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {user.auth_user.email}
                              </div>
                              <div className="text-xs text-muted-foreground font-mono">
                                ID: {user.auth_user.id.substring(0, 8)}...
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {user.kv_profile ? (
                            <Badge className={`text-xs ${getRoleColor(user.kv_profile.role)}`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {user.kv_profile.role}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              Non défini
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.kv_profile ? (
                            <Badge className={`text-xs border ${getStatusColor(user.kv_profile.subscription_status)}`}>
                              {user.kv_profile.subscription_status}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              N/A
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.kv_profile ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Coins className="w-3 h-3 text-yellow-600" />
                              <span>{user.kv_profile.tokens_balance.toLocaleString()}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.kv_profile ? (
                            <div className="text-xs">
                              <div>Type: {user.kv_profile.subscription_type}</div>
                              <div>Fin: {user.kv_profile.subscription_end}</div>
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">N/A</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {user.is_complete ? (
                            <CheckCircle className="w-4 h-4 text-green-600" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        )}

        {/* Profils orphelins */}
        {showDetails && orphanedProfiles.length > 0 && (
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Attention :</strong> {orphanedProfiles.length} profil(s) orphelin(s) détecté(s) 
              (profils KV sans utilisateur Auth correspondant)
            </AlertDescription>
          </Alert>
        )}

        {/* Informations sur la base de données */}
        {summary && (
          <div className="text-sm text-muted-foreground space-y-1">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4" />
              <span>Base de données : <strong>aycqqlxjuczgewyuzrqb</strong></span>
            </div>
            <div>• Table principale : <code>kv_store_810b4099</code></div>
            <div>• Système d'authentification : <code>auth.users</code></div>
            <div>• Utilisateurs complets : {summary.complete_users}/{summary.total_auth_users}</div>
          </div>
        )}

        {/* Message si aucun utilisateur */}
        {!loading && users.length === 0 && summary && (
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription>
              Aucun utilisateur trouvé dans la base de données. 
              Utilisez le bouton "Initialiser la base de données" pour créer l'utilisateur admin.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
