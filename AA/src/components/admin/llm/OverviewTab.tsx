import { Brain, CheckCircle, Key, Settings } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import type { LLMSettings } from '../../../types';

interface OverviewTabProps {
  llmSettings: LLMSettings;
  enabledModelsCount: number;
  premiumModelsCount: number;
  freeModelsCount: number;
  uniqueApiKeysCount: number;
}

export function OverviewTab({
  llmSettings,
  enabledModelsCount,
  premiumModelsCount,
  freeModelsCount,
  uniqueApiKeysCount
}: OverviewTabProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Modèles Actifs</CardTitle>
          <Brain className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{enabledModelsCount}</div>
          <p className="text-xs text-muted-foreground">
            {premiumModelsCount} premium • {freeModelsCount} gratuits
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Clés API Requises</CardTitle>
          <Key className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{uniqueApiKeysCount}</div>
          <p className="text-xs text-muted-foreground">Variables d'environnement</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Modèles par Défaut</CardTitle>
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{llmSettings.defaultModels.length}</div>
          <p className="text-xs text-muted-foreground">Sélectionnés automatiquement</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Limite Simultanée</CardTitle>
          <Settings className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{llmSettings.maxSimultaneousModels}</div>
          <p className="text-xs text-muted-foreground">Modèles max par utilisateur</p>
        </CardContent>
      </Card>
    </div>
  );
}
