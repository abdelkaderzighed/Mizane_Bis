import { AlertCircle, Brain, RefreshCw, TestTube } from 'lucide-react';

import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import type { LLMSettings } from '../../../types';

interface TestingTabProps {
  llmSettings: LLMSettings;
  testingKey: string | null;
  onTestApiKey: (apiKeyName: string) => Promise<void> | void;
}

export function TestingTab({ llmSettings, testingKey, onTestApiKey }: TestingTabProps) {
  const models = Object.values(llmSettings.models || {}).filter(model => model && model.isEnabled);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TestTube className="w-5 h-5" />
          Tests et Diagnostics
        </CardTitle>
        <CardDescription>
          Vérifiez le bon fonctionnement de vos modèles LLM
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Tests de connectivité</AlertTitle>
          <AlertDescription>
            Ces tests vérifient la connectivité et la validité de vos clés API.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {models.map(model => (
              <Card key={model.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Brain className={`w-4 h-4 ${model.color}`} />
                      <span className="font-medium">{model.name}</span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onTestApiKey(model.apiKeyName || '')}
                      disabled={testingKey === (model.apiKeyName || '') || !model.requiresApiKey}
                    >
                      {testingKey === (model.apiKeyName || '') ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <TestTube className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                  <div className="mt-2 text-sm text-muted-foreground">
                    {model.provider} • {model.requiresApiKey ? 'Clé API requise' : 'Aucune clé requise'}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
