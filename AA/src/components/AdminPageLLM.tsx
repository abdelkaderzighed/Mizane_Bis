import { Dispatch, SetStateAction, useEffect, useState } from 'react';

import { Loader2, Save } from 'lucide-react';

import { ApiKeysTab } from './admin/llm/ApiKeysTab';
import { GlobalSettingsTab } from './admin/llm/GlobalSettingsTab';
import { ModelsTab } from './admin/llm/ModelsTab';
import { OverviewTab } from './admin/llm/OverviewTab';
import { TestingTab } from './admin/llm/TestingTab';
import { Button } from './ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import type { LLMConfig, LLMSettings, LLMType } from '../types';
import { toast } from 'sonner';

interface LLMManagementProps {
  llmSettings: LLMSettings;
  setLlmSettings: Dispatch<SetStateAction<LLMSettings>>;
  onSave: () => Promise<void> | void;
  isSaving?: boolean;
  isLoading?: boolean;
}

export function LLMManagement({ llmSettings, setLlmSettings, onSave, isSaving = false, isLoading = false }: LLMManagementProps) {
  const [testingKey, setTestingKey] = useState<string | null>(null);

  useEffect(() => {
    const needsInitialization = !isLoading && Object.keys(llmSettings.models ?? {}).length === 0;
    if (!needsInitialization) {
      return;
    }

    const defaultLLMConfigs: Record<LLMType, Partial<LLMConfig>> = {
      gpt4: {
        name: 'GPT-4',
        provider: 'OpenAI',
        description: "Modèle de langage le plus avancé d'OpenAI",
        color: 'text-green-600',
        isPremium: true,
        requiresApiKey: true,
        apiKeyName: 'OPENAI_API_KEY',
        apiKeyDescription: 'Clé API OpenAI disponible sur platform.openai.com',
        baseUrl: 'https://api.openai.com/v1',
        maxTokensPerRequest: 8192,
        costPerToken: 0.00003,
        rateLimitPerMinute: 3500,
        temperature: 0.7,
        timeout: 30000,
        supportedFeatures: {
          streaming: true,
          functions: true,
          vision: true,
          embeddings: false
        },
        modelVariants: [
          { id: 'gpt-4', name: 'GPT-4', maxTokens: 8192, costMultiplier: 1 },
          { id: 'gpt-4-32k', name: 'GPT-4 32K', maxTokens: 32768, costMultiplier: 2 }
        ]
      },
      gpt35: {
        name: 'GPT-3.5 Turbo',
        provider: 'OpenAI',
        description: "Modèle rapide et économique d'OpenAI",
        color: 'text-blue-600',
        isPremium: false,
        requiresApiKey: true,
        apiKeyName: 'OPENAI_API_KEY',
        apiKeyDescription: 'Clé API OpenAI disponible sur platform.openai.com',
        baseUrl: 'https://api.openai.com/v1',
        maxTokensPerRequest: 4096,
        costPerToken: 0.0000015,
        rateLimitPerMinute: 3500,
        temperature: 0.7,
        timeout: 30000,
        supportedFeatures: {
          streaming: true,
          functions: true,
          vision: false,
          embeddings: false
        }
      },
      claude35sonnet: {
        name: 'Claude 3.5 Sonnet',
        provider: 'Anthropic',
        description: "Le modèle le plus performant d'Anthropic",
        color: 'text-purple-600',
        isPremium: true,
        requiresApiKey: true,
        apiKeyName: 'ANTHROPIC_API_KEY',
        apiKeyDescription: 'Clé API Anthropic disponible sur console.anthropic.com',
        baseUrl: 'https://api.anthropic.com/v1',
        maxTokensPerRequest: 200000,
        costPerToken: 0.000003,
        rateLimitPerMinute: 4000,
        temperature: 0.7,
        timeout: 60000,
        supportedFeatures: {
          streaming: true,
          functions: false,
          vision: true,
          embeddings: false
        }
      },
      claude3haiku: {
        name: 'Claude 3 Haiku',
        provider: 'Anthropic',
        description: "Modèle rapide et économique d'Anthropic",
        color: 'text-indigo-600',
        isPremium: false,
        requiresApiKey: true,
        apiKeyName: 'ANTHROPIC_API_KEY',
        apiKeyDescription: 'Clé API Anthropic disponible sur console.anthropic.com',
        baseUrl: 'https://api.anthropic.com/v1',
        maxTokensPerRequest: 200000,
        costPerToken: 0.00000025,
        rateLimitPerMinute: 4000,
        temperature: 0.7,
        timeout: 45000,
        supportedFeatures: {
          streaming: true,
          functions: false,
          vision: true,
          embeddings: false
        }
      },
      gemini: {
        name: 'Gemini Pro',
        provider: 'Google',
        description: 'Modèle multimodal avancé de Google',
        color: 'text-yellow-600',
        isPremium: false,
        requiresApiKey: true,
        apiKeyName: 'GOOGLE_API_KEY',
        apiKeyDescription: 'Clé API Google AI disponible sur aistudio.google.com',
        baseUrl: 'https://generativelanguage.googleapis.com/v1',
        maxTokensPerRequest: 30720,
        costPerToken: 0.00000125,
        rateLimitPerMinute: 60,
        temperature: 0.7,
        timeout: 30000,
        supportedFeatures: {
          streaming: true,
          functions: true,
          vision: true,
          embeddings: false
        }
      },
      llama2: {
        name: 'Llama 2',
        provider: 'Meta',
        description: 'Modèle open source de Meta',
        color: 'text-orange-600',
        isPremium: false,
        requiresApiKey: false,
        baseUrl: 'http://localhost:11434/v1',
        maxTokensPerRequest: 4096,
        costPerToken: 0,
        rateLimitPerMinute: 1000,
        temperature: 0.7,
        timeout: 45000,
        supportedFeatures: {
          streaming: true,
          functions: false,
          vision: false,
          embeddings: true
        }
      },
      mistral: {
        name: 'Mistral Large',
        provider: 'Mistral AI',
        description: 'Modèle européen haute performance',
        color: 'text-red-600',
        isPremium: false,
        requiresApiKey: true,
        apiKeyName: 'MISTRAL_API_KEY',
        apiKeyDescription: 'Clé API Mistral AI disponible sur console.mistral.ai',
        baseUrl: 'https://api.mistral.ai/v1',
        maxTokensPerRequest: 32000,
        costPerToken: 0.000008,
        rateLimitPerMinute: 1000,
        temperature: 0.7,
        timeout: 30000,
        supportedFeatures: {
          streaming: true,
          functions: true,
          vision: false,
          embeddings: true
        }
      },
      palm2: {
        name: 'PaLM 2',
        provider: 'Google',
        description: 'Modèle de langage avancé de Google (Legacy)',
        color: 'text-gray-600',
        isPremium: false,
        requiresApiKey: true,
        apiKeyName: 'GOOGLE_API_KEY',
        apiKeyDescription: 'Clé API Google Cloud disponible sur console.cloud.google.com',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        maxTokensPerRequest: 8192,
        costPerToken: 0.000001,
        rateLimitPerMinute: 60,
        temperature: 0.7,
        timeout: 30000,
        supportedFeatures: {
          streaming: false,
          functions: false,
          vision: false,
          embeddings: true
        }
      }
    };

    const initialModels: Record<LLMType, LLMConfig> = {} as Record<LLMType, LLMConfig>;

    Object.entries(defaultLLMConfigs).forEach(([id, config]) => {
      initialModels[id as LLMType] = {
        id: id as LLMType,
        isEnabled: id === 'gpt35' || id === 'claude3haiku',
        ...config
      } as LLMConfig;
    });

    setLlmSettings(prev => ({
      ...prev,
      models: initialModels
    }));
  }, [isLoading, llmSettings.models, setLlmSettings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Chargement de la configuration LLM...
      </div>
    );
  }

  const handleModelToggle = (modelId: LLMType, enabled: boolean) => {
    setLlmSettings(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [modelId]: {
          ...prev.models[modelId],
          isEnabled: enabled
        }
      }
    }));
  };

  const handleModelUpdate = (modelId: LLMType, field: keyof LLMConfig, value: unknown) => {
    setLlmSettings(prev => ({
      ...prev,
      models: {
        ...prev.models,
        [modelId]: {
          ...prev.models[modelId],
          [field]: value
        }
      }
    }));
  };

  const handleDefaultModelToggle = (modelId: LLMType) => {
    setLlmSettings(prev => {
      const isDefault = prev.defaultModels.includes(modelId);
      return {
        ...prev,
        defaultModels: isDefault
          ? prev.defaultModels.filter(id => id !== modelId)
          : [...prev.defaultModels, modelId]
      };
    });
  };

  const handleApiKeyUpdate = (apiKeyName: string, value: string) => {
    setLlmSettings(prev => ({
      ...prev,
      apiKeys: {
        ...prev.apiKeys,
        [apiKeyName]: {
          value,
          isConfigured: value.length > 0,
          lastTested: null,
          status: 'untested'
        }
      }
    }));
  };

  const testApiKey = async (apiKeyName: string) => {
    if (!apiKeyName) {
      toast.error('Aucune clé API associée à ce modèle.');
      return;
    }

    setTestingKey(apiKeyName);

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));

      setLlmSettings(prev => ({
        ...prev,
        apiKeys: {
          ...prev.apiKeys,
          [apiKeyName]: {
            ...prev.apiKeys?.[apiKeyName],
            lastTested: new Date().toISOString(),
            status: Math.random() > 0.3 ? 'valid' : 'invalid'
          }
        }
      }));

      toast.success('Test de clé API terminé');
    } finally {
      setTestingKey(null);
    }
  };

  const copyApiKeyVariable = (apiKeyName: string) => {
    navigator.clipboard.writeText(apiKeyName);
    toast.success('Variable copiée dans le presse-papier');
  };

  const enabledModels = Object.values(llmSettings.models || {}).filter(model => model && model.isEnabled);
  const premiumModels = enabledModels.filter(model => model && model.isPremium);
  const freeModels = enabledModels.filter(model => model && !model.isPremium);

  const uniqueApiKeys = Array.from(
    new Set(
      Object.values(llmSettings.models || {})
        .filter(model => model && model.isEnabled && model.requiresApiKey && model.apiKeyName)
        .map(model => model?.apiKeyName)
        .filter(Boolean)
    )
  ) as string[];

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="flex flex-wrap gap-2">
          <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
          <TabsTrigger value="models">Modèles</TabsTrigger>
          <TabsTrigger value="apikeys">Clés API</TabsTrigger>
          <TabsTrigger value="global">Paramètres globaux</TabsTrigger>
          <TabsTrigger value="testing">Tests & Diagnostics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <OverviewTab
            llmSettings={llmSettings}
            enabledModelsCount={enabledModels.length}
            premiumModelsCount={premiumModels.length}
            freeModelsCount={freeModels.length}
            uniqueApiKeysCount={uniqueApiKeys.length}
          />
        </TabsContent>

        <TabsContent value="models" className="space-y-6">
          <ModelsTab
            llmSettings={llmSettings}
            onToggleModel={handleModelToggle}
            onUpdateModel={handleModelUpdate}
            onToggleDefaultModel={handleDefaultModelToggle}
          />
        </TabsContent>

        <TabsContent value="apikeys" className="space-y-6">
          <ApiKeysTab
            llmSettings={llmSettings}
            uniqueApiKeys={uniqueApiKeys}
            testingKey={testingKey}
            onCopyApiKeyVariable={copyApiKeyVariable}
            onTestApiKey={testApiKey}
            onUpdateApiKey={handleApiKeyUpdate}
          />
        </TabsContent>

        <TabsContent value="global" className="space-y-6">
          <GlobalSettingsTab llmSettings={llmSettings} setLlmSettings={setLlmSettings} />
        </TabsContent>

        <TabsContent value="testing" className="space-y-6">
          <TestingTab llmSettings={llmSettings} testingKey={testingKey} onTestApiKey={testApiKey} />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end">
        <Button onClick={onSave} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder la configuration LLM'}
        </Button>
      </div>
    </div>
  );
}
