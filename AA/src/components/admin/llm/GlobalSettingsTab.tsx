import { Dispatch, SetStateAction } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../ui/card';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Switch } from '../../ui/switch';
import type { LLMSettings } from '../../../types';

interface GlobalSettingsTabProps {
  llmSettings: LLMSettings;
  setLlmSettings: Dispatch<SetStateAction<LLMSettings>>;
}

export function GlobalSettingsTab({ llmSettings, setLlmSettings }: GlobalSettingsTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Paramètres Globaux</CardTitle>
        <CardDescription>Configuration générale pour tous les modèles LLM</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label>Limite simultanée par utilisateur</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={llmSettings.maxSimultaneousModels}
                onChange={event =>
                  setLlmSettings(prev => ({
                    ...prev,
                    maxSimultaneousModels: parseInt(event.target.value, 10) || 1
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Permettre aux utilisateurs de modifier les paramètres</Label>
              <Switch
                checked={llmSettings.globalSettings.allowUserOverrides}
                onCheckedChange={checked =>
                  setLlmSettings(prev => ({
                    ...prev,
                    globalSettings: {
                      ...prev.globalSettings,
                      allowUserOverrides: checked
                    }
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between">
              <Label>Activer la mise en cache</Label>
              <Switch
                checked={llmSettings.globalSettings.enableCaching}
                onCheckedChange={checked =>
                  setLlmSettings(prev => ({
                    ...prev,
                    globalSettings: {
                      ...prev.globalSettings,
                      enableCaching: checked
                    }
                  }))
                }
              />
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <Label>Timeout par défaut (ms)</Label>
              <Input
                type="number"
                value={llmSettings.globalSettings.defaultTimeout}
                onChange={event =>
                  setLlmSettings(prev => ({
                    ...prev,
                    globalSettings: {
                      ...prev.globalSettings,
                      defaultTimeout: parseInt(event.target.value, 10) || 30000
                    }
                  }))
                }
              />
            </div>
            <div>
              <Label>Nombre de tentatives en cas d'échec</Label>
              <Input
                type="number"
                min="1"
                max="5"
                value={llmSettings.globalSettings.maxRetries}
                onChange={event =>
                  setLlmSettings(prev => ({
                    ...prev,
                    globalSettings: {
                      ...prev.globalSettings,
                      maxRetries: parseInt(event.target.value, 10) || 3
                    }
                  }))
                }
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
