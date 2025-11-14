import { Copy, Info, Key, RefreshCw, TestTube } from 'lucide-react';

import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import type { LLMSettings } from '../../../types';

interface ApiKeysTabProps {
  llmSettings: LLMSettings;
  uniqueApiKeys: string[];
  testingKey: string | null;
  onCopyApiKeyVariable: (apiKeyName: string) => void;
  onTestApiKey: (apiKeyName: string) => Promise<void> | void;
  onUpdateApiKey: (apiKeyName: string, value: string) => void;
}

export function ApiKeysTab({
  llmSettings,
  uniqueApiKeys,
  testingKey,
  onCopyApiKeyVariable,
  onTestApiKey,
  onUpdateApiKey
}: ApiKeysTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="w-5 h-5" />
          Gestion des Clés API
        </CardTitle>
        <CardDescription>
          Configurez les clés API pour chaque fournisseur de modèles LLM
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Information importante</AlertTitle>
          <AlertDescription>
            Les clés API sont stockées comme variables d'environnement serveur. Redémarrez le serveur après modification.
          </AlertDescription>
        </Alert>

        <div className="space-y-6">
          {uniqueApiKeys.map(apiKeyName => {
            const modelsUsingKey = Object.values(llmSettings.models || {})
              .filter(model => model && model.isEnabled && model.apiKeyName === apiKeyName);
            const keyConfig = llmSettings.apiKeys?.[apiKeyName];

            return (
              <Card key={apiKeyName}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{apiKeyName}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onCopyApiKeyVariable(apiKeyName)}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Copier
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onTestApiKey(apiKeyName)}
                        disabled={testingKey === apiKeyName}
                      >
                        {testingKey === apiKeyName ? (
                          <>
                            <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                            Test en cours...
                          </>
                        ) : (
                          <>
                            <TestTube className="w-4 h-4 mr-2" />
                            Tester
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-sm text-muted-foreground">
                      Utilisé par {modelsUsingKey.length} modèle{modelsUsingKey.length > 1 ? 's' : ''}
                    </div>
                    {keyConfig && (
                      <Badge
                        variant={
                          keyConfig.status === 'valid'
                            ? 'default'
                            : keyConfig.status === 'invalid'
                            ? 'destructive'
                            : 'secondary'
                        }
                        className="text-xs"
                      >
                        {keyConfig.status === 'valid'
                          ? 'Valide'
                          : keyConfig.status === 'invalid'
                          ? 'Invalide'
                          : 'Non testé'}
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label>Clé API</Label>
                      <Input
                        type="password"
                        value={keyConfig?.value || ''}
                        onChange={event => onUpdateApiKey(apiKeyName, event.target.value)}
                        placeholder="Saisissez votre clé API..."
                      />
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {modelsUsingKey[0]?.apiKeyDescription || 'Clé API requise pour ce fournisseur'}
                    </div>
                    {keyConfig?.lastTested && (
                      <div className="text-xs text-muted-foreground">
                        Dernière vérification: {new Date(keyConfig.lastTested).toLocaleString('fr-FR')}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
