import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Save, Info } from 'lucide-react';
import { useMisanAuth } from '../../utils/supabase/auth';
import { supabase } from '../../utils/supabase';
import { fetchFreeTrialConfig } from '../../utils/freeTrial';

interface FreeTrialConfig {
  duration_days: number;
  tokens_amount: number;
  enabled: boolean;
}

interface FreeTrialSettingsProps {
  onConfigUpdate?: (config: FreeTrialConfig) => void;
}

export function FreeTrialSettings({ onConfigUpdate }: FreeTrialSettingsProps) {
  const { user } = useMisanAuth();
  const [config, setConfig] = useState<FreeTrialConfig>({
    duration_days: 7,
    tokens_amount: 100000,
    enabled: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Vérifier si l'utilisateur est admin
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadCurrentConfig();
    }
  }, [isAdmin]);

  const loadCurrentConfig = async () => {
    try {
      setLoading(true);
      const cfg = await fetchFreeTrialConfig();
      setConfig({
        duration_days: cfg.durationDays,
        tokens_amount: cfg.tokens,
        enabled: cfg.enabled
      });
    } catch (error) {
      console.error('Erreur chargement configuration:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    if (!isAdmin) return;
    
    try {
      setSaving(true);
      setMessage(null);

      const accessToken = await getAccessToken();
      if (!accessToken) {
        setMessage({ type: 'error', text: 'Session expirée, veuillez vous reconnecter' });
        return;
      }

      const supabaseClient = supabase;
      if (!supabaseClient) {
        setMessage({ type: 'error', text: 'Client Supabase non initialisé' });
        return;
      }

      const { data, error } = await supabaseClient.functions.invoke('update-trial-config', {
        body: config
      });

      if (error) {
        console.error('Erreur supabase functions:', error);
        setMessage({ type: 'error', text: error.message || 'Erreur lors de la sauvegarde' });
        return;
      }

      if (data?.success) {
        setMessage({ type: 'success', text: 'Configuration mise à jour avec succès !' });
        if (onConfigUpdate) {
          onConfigUpdate(config);
        }
      } else {
        setMessage({ type: 'error', text: data?.error || 'Erreur lors de la sauvegarde' });
      }
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      setMessage({ type: 'error', text: 'Erreur de connexion au serveur' });
    } finally {
      setSaving(false);
    }
  };

  const getAccessToken = async () => {
    try {
      // Récupérer le token d'accès de l'utilisateur connecté depuis Supabase
      const { data: { session } } = await supabase.auth.getSession();
      return session?.access_token || null;
    } catch {
      return null;
    }
  };

  const handleInputChange = (field: keyof FreeTrialConfig, value: number | boolean) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }));
    setMessage(null);
  };

  const validateInput = () => {
    if (config.duration_days < 1 || config.duration_days > 365) {
      setMessage({ type: 'error', text: 'La durée doit être entre 1 et 365 jours' });
      return false;
    }
    
    if (config.tokens_amount < 0 || config.tokens_amount > 10000000) {
      setMessage({ type: 'error', text: 'Le nombre de jetons doit être entre 0 et 10,000,000' });
      return false;
    }
    
    return true;
  };

  const handleSave = () => {
    if (validateInput()) {
      saveConfig();
    }
  };

  // Si l'utilisateur n'est pas admin, ne pas afficher le composant
  if (!isAdmin) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-6">
          <Loader2 className="size-6 animate-spin mr-2" />
          <span>Chargement de la configuration...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="size-5" />
          Configuration de l'Essai Gratuit
        </CardTitle>
        <CardDescription>
          Configurez les paramètres de l'essai gratuit accordé automatiquement aux nouveaux utilisateurs.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Activation/Désactivation */}
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="trial-enabled">Essai gratuit activé</Label>
            <p className="text-sm text-muted-foreground">
              Accorder automatiquement un essai gratuit aux nouveaux utilisateurs
            </p>
          </div>
          <Switch
            id="trial-enabled"
            checked={config.enabled}
            onCheckedChange={(enabled) => handleInputChange('enabled', enabled)}
          />
        </div>

        {/* Durée */}
        <div className="space-y-2">
          <Label htmlFor="duration">Durée de l'essai (en jours)</Label>
          <Input
            id="duration"
            type="number"
            min="1"
            max="365"
            value={config.duration_days}
            onChange={(e) => handleInputChange('duration_days', parseInt(e.target.value) || 7)}
            disabled={!config.enabled}
          />
          <p className="text-sm text-muted-foreground">
            Nombre de jours d'accès Premium gratuit (1-365 jours)
          </p>
        </div>

        {/* Jetons */}
        <div className="space-y-2">
          <Label htmlFor="tokens">Nombre de jetons offerts</Label>
          <Input
            id="tokens"
            type="number"
            min="0"
            max="10000000"
            step="1000"
            value={config.tokens_amount}
            onChange={(e) => handleInputChange('tokens_amount', parseInt(e.target.value) || 100000)}
            disabled={!config.enabled}
          />
          <p className="text-sm text-muted-foreground">
            Nombre de jetons accordés à l'inscription (0-10,000,000 jetons)
          </p>
        </div>

        {/* Aperçu */}
        <div className="p-4 bg-muted rounded-lg">
          <h4 className="font-medium mb-2">Aperçu de l'offre d'essai :</h4>
          {config.enabled ? (
            <p className="text-sm">
              🎁 <strong>{config.duration_days} jour{config.duration_days > 1 ? 's' : ''}</strong> d'accès Premium + <strong>{config.tokens_amount.toLocaleString()}</strong> jetons gratuits
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              ❌ Aucun essai gratuit accordé aux nouveaux utilisateurs
            </p>
          )}
        </div>

        {/* Message de retour */}
        {message && (
          <Alert variant={message.type === 'error' ? 'destructive' : 'default'}>
            <AlertDescription>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Bouton de sauvegarde */}
        <div className="flex justify-end">
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="min-w-[120px]"
          >
            {saving ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Save className="size-4 mr-2" />
                Sauvegarder
              </>
            )}
          </Button>
        </div>

        {/* Note d'information */}
        <div className="text-sm text-muted-foreground border-t pt-4">
          <p>
            <strong>Note :</strong> Ces paramètres s'appliquent uniquement aux nouveaux utilisateurs qui s'inscrivent en cliquant sur "Commencer Gratuitement". 
            Les modifications prennent effet immédiatement pour les prochaines inscriptions.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
