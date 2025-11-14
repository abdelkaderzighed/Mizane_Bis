import { Dispatch, SetStateAction, useMemo, useState, useCallback } from 'react';

import { Edit, Eye, Info, Loader2, Save, Sparkles, Trash2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Switch } from './ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Textarea } from './ui/textarea';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Badge } from './ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';

import type { AssistantFunctionConfig, LLMSettings, LLMType, PromptSourceType, LanguageCode } from '../types';
import { invokeAssistant } from '../utils/assistantApi';

interface AIModelsManagementProps {
  llmSettings: LLMSettings;
  setLlmSettings: Dispatch<SetStateAction<LLMSettings>>;
  onSave: (settings?: LLMSettings) => Promise<void> | void;
  isSaving?: boolean;
  isLoading?: boolean;
}

interface AssistantFunctionEditorState {
  open: boolean;
  mode: 'create' | 'edit';
  initialId: string | null;
  draft: AssistantFunctionConfig | null;
}

const createEmptyAssistantFunction = (modelId?: LLMType): AssistantFunctionConfig => ({
  id: `assistant-${Date.now()}`,
  name: 'Nouvelle fonction IA',
  description: '',
  provider: 'openai',
  modelConfigId: (modelId ?? 'gpt35') as LLMType,
  apiKeyName: 'OPENAI_API_KEY',
  prompt: {
    type: 'local',
    localPromptId: ''
  },
  temperature: 0.7,
  topP: 1,
  maxTokens: 1500,
  responseFormat: 'text',
  isEnabled: true,
  tags: [],
  invitationMessage: '',
});

const cloneAssistantFunction = (config: AssistantFunctionConfig): AssistantFunctionConfig =>
  JSON.parse(JSON.stringify(config));

const parseTagsInput = (value: string): string[] =>
  value
    .split(',')
    .map(tag => tag.trim())
    .filter(Boolean);

const TRANSLATION_LANGUAGES: LanguageCode[] = ['en', 'ar'];
const LANGUAGE_LABELS: Record<LanguageCode, string> = {
  fr: 'Français',
  en: 'English',
  ar: 'العربية',
};

export function AIModelsManagement({ llmSettings, setLlmSettings, onSave, isSaving = false, isLoading = false }: AIModelsManagementProps) {
  const [assistantEditorState, setAssistantEditorState] = useState<AssistantFunctionEditorState>({ open: false, mode: 'create', initialId: null, draft: null });
  const [pendingDeleteAssistant, setPendingDeleteAssistant] = useState<AssistantFunctionConfig | null>(null);
  const [previewContent, setPreviewContent] = useState<{ title: string; content: string } | null>(null);
  const switchClassName = 'data-[state=unchecked]:bg-muted data-[state=unchecked]:border data-[state=unchecked]:border-border';
  const [translationLoading, setTranslationLoading] = useState<
    null | 'name' | 'description' | 'invitation'
  >(null);
  const [bulkTranslationLoading, setBulkTranslationLoading] = useState(false);
  const [bulkTranslationProgress, setBulkTranslationProgress] = useState<
    null | {
      processed: number;
      total: number;
      currentFunction: string;
      currentLanguage: LanguageCode;
    }
  >(null);

  const modelsList = useMemo(
    () => Object.values(llmSettings.models || {}).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [llmSettings.models]
  );

  const assistantFunctionsList = useMemo(
    () =>
      Object.values(llmSettings.assistantFunctions || {})
        .sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' })),
    [llmSettings.assistantFunctions]
  );

  const translationAssistantId = useMemo(() => {
    const functions = llmSettings.assistantFunctions ?? {};
    if (functions['conversation']) {
      return 'conversation';
    }
    const ids = Object.keys(functions);
    return ids.length > 0 ? ids[0] : null;
  }, [llmSettings.assistantFunctions]);

  const availableApiKeyNames = useMemo(
    () => Object.keys(llmSettings.apiKeys || {}).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' })),
    [llmSettings.apiKeys]
  );

  const handleGlobalSettingChange = <K extends keyof LLMSettings['globalSettings']>(key: K, value: LLMSettings['globalSettings'][K]) => {
    setLlmSettings(prev => ({
      ...prev,
      globalSettings: {
        ...prev.globalSettings,
        [key]: value
      }
    }));
  };

  const handleDefaultModelChange = (modelId: string | null) => {
    setLlmSettings(prev => {
      const nextDefaultModels = modelId ? [modelId as LLMType] : [];
      return {
        ...prev,
        defaultModels: nextDefaultModels,
        globalSettings: {
          ...prev.globalSettings,
          defaultModelId: modelId as LLMType | null
        }
      };
    });
  };

  const openAssistantCreateDialog = () => {
    const fallbackModelId = llmSettings.globalSettings.defaultModelId && llmSettings.models[llmSettings.globalSettings.defaultModelId]
      ? llmSettings.globalSettings.defaultModelId
      : modelsList[0]?.id;

    const draft = cloneAssistantFunction(createEmptyAssistantFunction(fallbackModelId));

    if (fallbackModelId && llmSettings.models[fallbackModelId]) {
      const model = llmSettings.models[fallbackModelId];
      draft.provider = model.provider || draft.provider;
      draft.apiKeyName = draft.apiKeyName ?? model.apiKeyName ?? draft.apiKeyName;
    }

    if (!fallbackModelId) {
      draft.modelConfigId = '' as LLMType;
    }

    setAssistantEditorState({ open: true, mode: 'create', initialId: null, draft });
  };

  const openAssistantEditDialog = (functionId: string) => {
    const target = llmSettings.assistantFunctions?.[functionId];
    if (!target) {
      toast.error('Fonction introuvable');
      return;
    }

    setAssistantEditorState({
      open: true,
      mode: 'edit',
      initialId: functionId,
      draft: cloneAssistantFunction(target)
    });
  };

  const closeAssistantEditor = () => {
    setAssistantEditorState({ open: false, mode: 'create', initialId: null, draft: null });
  };

  const handleAssistantFieldChange = <K extends keyof AssistantFunctionConfig>(key: K, value: AssistantFunctionConfig[K]) => {
    setAssistantEditorState(prev => {
      if (!prev.draft) return prev;
      return {
        ...prev,
        draft: {
          ...prev.draft,
          [key]: value
        }
      };
    });
  };

  const handleAssistantTranslationChange = (
    field: 'nameTranslations' | 'descriptionTranslations' | 'invitationTranslations',
    locale: LanguageCode,
    value: string
  ) => {
    setAssistantEditorState(prev => {
      if (!prev.draft) return prev;

      const existingMetadata = (prev.draft.metadata && typeof prev.draft.metadata === 'object') ? { ...(prev.draft.metadata as Record<string, unknown>) } : {};
    const translations = existingMetadata[field] && typeof existingMetadata[field] === 'object'
        ? { ...(existingMetadata[field] as Record<string, string>) }
        : {};

      const trimmed = value.trim();
      if (trimmed) {
        translations[locale] = trimmed;
      } else {
        delete translations[locale];
      }

      if (Object.keys(translations).length > 0) {
        existingMetadata[field] = translations;
      } else {
        delete existingMetadata[field];
      }

      const normalizedMetadata = Object.keys(existingMetadata).length > 0 ? existingMetadata : undefined;

      return {
        ...prev,
        draft: {
          ...prev.draft,
          metadata: normalizedMetadata,
        }
      };
    });
  };

  const getTranslationValue = (
    field: 'nameTranslations' | 'descriptionTranslations' | 'invitationTranslations',
    locale: LanguageCode
  ): string => {
    const draft = assistantEditorState.draft;
    if (!draft || !draft.metadata || typeof draft.metadata !== 'object') {
      return '';
    }
    const metadata = draft.metadata as Record<string, any>;
      const translations = metadata[field];
    if (translations && typeof translations === 'object' && translations !== null) {
      const value = translations[locale];
      return typeof value === 'string' ? value : '';
    }
    return '';
  };

  const translateWithAssistant = useCallback(
    async (text: string, targetLanguage: LanguageCode) => {
      if (!translationAssistantId) {
        throw new Error("Aucun assistant disponible pour la traduction.");
      }

      const trimmed = text.trim();
      if (!trimmed) {
        throw new Error('Le texte source est vide.');
      }

      const languageLabels: Record<LanguageCode, string> = {
        fr: 'français',
        en: 'anglais',
        ar: 'arabe',
      };

      const instructions = targetLanguage === 'ar'
        ? `ترجم النص التالي إلى اللغة العربية الفصحى. أعد الجملة مترجمة فقط دون أي تعليق إضافي.`
        : targetLanguage === 'en'
          ? `Translate the following text into natural professional English. Reply with the translated text only.`
          : `Traduisez le texte suivant en ${languageLabels[targetLanguage]}. Répondez uniquement avec la traduction.`;

      const result = await invokeAssistant({
        assistantId: translationAssistantId,
        message: `${instructions}\n\n${trimmed}`,
        language: targetLanguage,
      });

      const output = typeof result.message === 'string' ? result.message.trim() : '';
      if (!output) {
        throw new Error('Traduction vide retournée par l’assistant.');
      }
      return output;
    },
    [translationAssistantId]
  );

  const handleAutoTranslateField = useCallback(
    async (field: 'name' | 'description' | 'invitation') => {
      const draft = assistantEditorState.draft;
      if (!draft) {
        toast.error('Aucune fonction en cours d’édition.');
        return;
      }

      const sourceMap = {
        name: { metadataKey: 'nameTranslations' as const, value: draft.name ?? '' },
        description: { metadataKey: 'descriptionTranslations' as const, value: draft.description ?? '' },
        invitation: { metadataKey: 'invitationTranslations' as const, value: draft.invitationMessage ?? '' },
      };

      const { metadataKey, value } = sourceMap[field];
      const trimmed = value.trim();
      if (!trimmed) {
        toast.error("Renseignez d'abord le champ principal en français.");
        return;
      }

      if (!translationAssistantId) {
        toast.error('Aucun assistant IA disponible pour la traduction.');
        return;
      }

      setTranslationLoading(field);
      try {
        for (const locale of TRANSLATION_LANGUAGES) {
          // Si une traduction existe déjà, on ne l’écrase pas automatiquement
          if (getTranslationValue(metadataKey, locale)) {
            continue;
          }

          try {
            const translated = await translateWithAssistant(trimmed, locale);
            handleAssistantTranslationChange(metadataKey, locale, translated);
          } catch (error) {
            console.warn('Erreur traduction', error);
            toast.error(`Traduction échouée pour ${LANGUAGE_LABELS[locale]}.`);
          }
        }
        toast.success('Traductions générées automatiquement.');
      } catch (error) {
        console.error('Auto-translation error', error);
        toast.error('Impossible de générer les traductions.');
      } finally {
        setTranslationLoading(null);
      }
    },
    [assistantEditorState.draft, handleAssistantTranslationChange, getTranslationValue, translateWithAssistant]
  );

  const handleAssistantPromptTypeChange = (type: PromptSourceType) => {
    setAssistantEditorState(prev => {
      if (!prev.draft) return prev;
      const previousPrompt = prev.draft.prompt ?? { type: 'local' };
      const nextPrompt: AssistantFunctionConfig['prompt'] = { type };

      if (type === 'local') {
        nextPrompt.localPromptId = previousPrompt.localPromptId ?? '';
      } else if (type === 'openai_prompt') {
        nextPrompt.openAiPromptId = previousPrompt.openAiPromptId ?? '';
      } else {
        nextPrompt.openAiAssistantId = previousPrompt.openAiAssistantId ?? '';
        if (previousPrompt.versionTag) {
          nextPrompt.versionTag = previousPrompt.versionTag;
        }
      }

      return {
        ...prev,
        draft: {
          ...prev.draft,
          prompt: nextPrompt
        }
      };
    });
  };

  const handleBulkAutoTranslateAll = useCallback(async () => {
    const assistantFunctions = llmSettings.assistantFunctions ?? {};

    if (Object.keys(assistantFunctions).length === 0) {
      toast.info('Aucune fonction IA à traduire.');
      return;
    }

    if (!translationAssistantId) {
      toast.error('Aucun assistant IA disponible pour la traduction.');
      return;
    }

    const tasks: Array<{
      functionId: string;
      functionName: string;
      field: 'nameTranslations' | 'descriptionTranslations' | 'invitationTranslations';
      sourceText: string;
      locale: LanguageCode;
    }> = [];

    const translationFields: Array<{
      metadataKey: 'nameTranslations' | 'descriptionTranslations' | 'invitationTranslations';
      extractor: (config: AssistantFunctionConfig) => string | undefined;
    }> = [
      { metadataKey: 'nameTranslations', extractor: (config) => config.name },
      { metadataKey: 'descriptionTranslations', extractor: (config) => config.description },
      { metadataKey: 'invitationTranslations', extractor: (config) => config.invitationMessage },
    ];

    for (const [functionId, functionConfig] of Object.entries(assistantFunctions)) {
      for (const { metadataKey, extractor } of translationFields) {
        const sourceValue = extractor(functionConfig)?.trim();
        if (!sourceValue) {
          continue;
        }

        const existingTranslations =
          functionConfig.metadata && typeof functionConfig.metadata === 'object'
            ? ((functionConfig.metadata as Record<string, any>)[metadataKey] as Record<string, string> | undefined)
            : undefined;

        for (const locale of TRANSLATION_LANGUAGES) {
          if (existingTranslations && typeof existingTranslations[locale] === 'string' && existingTranslations[locale]?.trim()) {
            continue;
          }

          tasks.push({
            functionId,
            functionName: functionConfig.name || functionId,
            field: metadataKey,
            sourceText: sourceValue,
            locale,
          });
        }
      }
    }

    if (tasks.length === 0) {
      toast.info('Toutes les traductions nécessaires sont déjà renseignées.');
      return;
    }

    setBulkTranslationLoading(true);
    setBulkTranslationProgress({ processed: 0, total: tasks.length, currentFunction: tasks[0].functionName, currentLanguage: tasks[0].locale });
    try {
      const updatedFunctions: Record<string, AssistantFunctionConfig> = { ...assistantFunctions };
      let hasChanges = false;
      let totalNewTranslations = 0;
      const failedTranslations: string[] = [];

      const perFunctionMetadata = new Map<string, Record<string, unknown>>();

      for (let index = 0; index < tasks.length; index += 1) {
        const task = tasks[index];
        setBulkTranslationProgress({
          processed: index,
          total: tasks.length,
          currentFunction: task.functionName,
          currentLanguage: task.locale,
        });

        const baseConfig = updatedFunctions[task.functionId];
        const metadataSource = perFunctionMetadata.get(task.functionId)
          || (baseConfig.metadata && typeof baseConfig.metadata === 'object'
            ? { ...(baseConfig.metadata as Record<string, unknown>) }
            : {});

        const existingTranslations = metadataSource[task.field] && typeof metadataSource[task.field] === 'object'
          ? { ...(metadataSource[task.field] as Record<string, string>) }
          : {};

        try {
          const translated = await translateWithAssistant(task.sourceText, task.locale);
          existingTranslations[task.locale] = translated;
          metadataSource[task.field] = existingTranslations;
          perFunctionMetadata.set(task.functionId, metadataSource);
          totalNewTranslations += 1;
        } catch (error) {
          console.warn('Erreur de traduction groupée', error);
          failedTranslations.push(`${task.functionName} → ${LANGUAGE_LABELS[task.locale]}`);
        }
      }

      perFunctionMetadata.forEach((metadata, functionId) => {
        const nextMetadata = Object.keys(metadata).length > 0 ? metadata : undefined;
        const previousConfig = assistantFunctions[functionId];
        if (!previousConfig) {
          return;
        }
        updatedFunctions[functionId] = {
          ...previousConfig,
          metadata: nextMetadata,
        };
        hasChanges = true;
      });

      if (!hasChanges) {
        if (failedTranslations.length > 0) {
          toast.error(`Traduction échouée pour : ${failedTranslations.join(', ')}`);
        } else {
          toast.info('Toutes les traductions nécessaires sont déjà présentes.');
        }
        return;
      }

      const nextSettings: LLMSettings = {
        ...llmSettings,
        assistantFunctions: updatedFunctions,
      };

      setLlmSettings(nextSettings);

      try {
        await onSave(nextSettings);
      } catch (error) {
        console.error('Erreur lors de la sauvegarde après traduction groupée', error);
        toast.error('Impossible de sauvegarder les traductions générées automatiquement.');
        return;
      }

      toast.success(
        totalNewTranslations > 1
          ? `${totalNewTranslations} nouvelles traductions générées. Vérifiez-les si nécessaire.`
          : 'Une nouvelle traduction a été générée. Vérifiez-la si nécessaire.'
      );

      if (failedTranslations.length > 0) {
        toast.error(`Traduction échouée pour : ${failedTranslations.join(', ')}`);
      }
    } finally {
      setBulkTranslationLoading(false);
      setBulkTranslationProgress(null);
    }
  }, [llmSettings, onSave, setLlmSettings, translateWithAssistant, translationAssistantId]);

  const handleAssistantPromptFieldChange = <K extends keyof AssistantFunctionConfig['prompt']>(
    key: K,
    value: AssistantFunctionConfig['prompt'][K]
  ) => {
    setAssistantEditorState(prev => {
      if (!prev.draft) return prev;
      return {
        ...prev,
        draft: {
          ...prev.draft,
          prompt: {
            ...prev.draft.prompt,
            [key]: value
          }
        }
      };
    });
  };

  const handleAssistantTagsChange = (value: string) => {
    const tags = parseTagsInput(value);
    handleAssistantFieldChange('tags', tags);
  };

  const handleAssistantEnabledToggle = async (functionId: string, checked: boolean) => {
    const target = llmSettings.assistantFunctions?.[functionId];
    if (!target) {
      toast.error('Fonction introuvable');
      return;
    }

    const updated = {
      ...llmSettings,
      assistantFunctions: {
        ...llmSettings.assistantFunctions,
        [functionId]: {
          ...target,
          isEnabled: checked
        }
      }
    };

    try {
      setLlmSettings(updated);
      await onSave(updated);
      toast.success(checked ? 'Fonction activée' : 'Fonction désactivée');
    } catch (error) {
      console.error('Erreur lors de la mise à jour de la fonction IA:', error);
      toast.error(error instanceof Error ? error.message : 'Impossible de mettre à jour la fonction IA');
    }
  };

  const commitAssistantEditorChanges = async () => {
    if (!assistantEditorState.draft) {
      closeAssistantEditor();
      return;
    }

    const draft = assistantEditorState.draft;
    const sanitizedId = draft.id.trim();

    if (!sanitizedId) {
      toast.error('Identifiant requis pour la fonction.');
      return;
    }

    const existing = llmSettings.assistantFunctions?.[sanitizedId];
    const isRenaming = assistantEditorState.mode === 'edit' && assistantEditorState.initialId !== sanitizedId;

    if ((assistantEditorState.mode === 'create' || isRenaming) && existing) {
      toast.error('Un assistant avec cet identifiant existe déjà.');
      return;
    }

    const modelId = (draft.modelConfigId && draft.modelConfigId.trim().length > 0
      ? draft.modelConfigId
      : (llmSettings.globalSettings.defaultModelId ?? 'gpt35')) as LLMType;

    const promptType = draft.prompt?.type ?? 'local';
    if (promptType === 'local' && !draft.prompt?.localPromptId?.trim()) {
      toast.error('Renseignez l\'identifiant du prompt local.');
      return;
    }
    if (promptType === 'openai_prompt' && !draft.prompt?.openAiPromptId?.trim()) {
      toast.error('Renseignez l\'identifiant du prompt OpenAI.');
      return;
    }
    if (promptType === 'openai_assistant' && !draft.prompt?.openAiAssistantId?.trim()) {
      toast.error('Renseignez l\'identifiant de l\'assistant OpenAI.');
      return;
    }

    const sanitizedTags = draft.tags?.map(tag => tag.trim()).filter(Boolean) ?? [];

    const sanitizedPrompt: AssistantFunctionConfig['prompt'] = {
      type: promptType,
      localPromptId: draft.prompt?.localPromptId?.trim() || undefined,
      openAiPromptId: draft.prompt?.openAiPromptId?.trim() || undefined,
      openAiAssistantId: draft.prompt?.openAiAssistantId?.trim() || undefined,
      versionTag: draft.prompt?.versionTag?.trim() || undefined
    };

    const sanitized: AssistantFunctionConfig = {
      ...draft,
      id: sanitizedId,
      name: draft.name.trim() || sanitizedId,
      description: draft.description?.trim() ?? '',
      provider: draft.provider?.trim() || llmSettings.models?.[modelId]?.provider || 'openai',
      modelConfigId: modelId,
      apiKeyName: draft.apiKeyName?.trim() || undefined,
      prompt: sanitizedPrompt,
      temperature: draft.temperature ?? null,
      topP: draft.topP ?? null,
      maxTokens: draft.maxTokens ?? null,
      responseFormat: draft.responseFormat ?? 'text',
      isEnabled: draft.isEnabled !== false,
      tags: sanitizedTags.length ? sanitizedTags : undefined,
      metadata: draft.metadata && typeof draft.metadata === 'object' ? draft.metadata : undefined,
      invitationMessage: draft.invitationMessage ?? null,
    };

    const nextAssistantFunctions = { ...llmSettings.assistantFunctions };
    if (assistantEditorState.mode === 'edit' && assistantEditorState.initialId && assistantEditorState.initialId !== sanitized.id) {
      delete nextAssistantFunctions[assistantEditorState.initialId];
    }
    nextAssistantFunctions[sanitized.id] = sanitized;

    const nextSettings: LLMSettings = {
      ...llmSettings,
      assistantFunctions: nextAssistantFunctions
    };

    try {
      await onSave(nextSettings);
      setLlmSettings(nextSettings);
      toast.success('Fonction IA enregistrée');
      closeAssistantEditor();
    } catch (error) {
      console.error('Erreur lors de la sauvegarde de la fonction IA:', error);
      toast.error(error instanceof Error ? error.message : 'Échec de la sauvegarde de la fonction IA');
    }
  };

  const confirmDeleteAssistant = (config: AssistantFunctionConfig) => {
    setPendingDeleteAssistant(config);
  };

  const handleDeleteAssistant = async () => {
    if (!pendingDeleteAssistant) return;

    const nextAssistantFunctions = { ...llmSettings.assistantFunctions };
    delete nextAssistantFunctions[pendingDeleteAssistant.id];

    const nextSettings: LLMSettings = {
      ...llmSettings,
      assistantFunctions: nextAssistantFunctions
    };

    try {
      setLlmSettings(nextSettings);
      await onSave(nextSettings);
      toast.success('Fonction IA supprimée');
    } catch (error) {
      console.error('Erreur lors de la suppression de la fonction IA:', error);
      toast.error(error instanceof Error ? error.message : 'Échec de la suppression');
      return;
    } finally {
      setPendingDeleteAssistant(null);
    }
  };

  const handleOpenPreview = (title: string, content?: string | null) => {
    if (!content) {
      toast.info('Aucun contenu à afficher');
      return;
    }
    setPreviewContent({ title, content });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        Chargement des paramètres IA...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Paramètres communs</CardTitle>
          <CardDescription>Configuration par défaut appliquée aux appels LLM.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label>Timeout par défaut (ms)</Label>
                <Input
                  type="number"
                  min="0"
                  value={llmSettings.globalSettings.defaultTimeout}
                  onChange={(event) => handleGlobalSettingChange('defaultTimeout', parseInt(event.target.value, 10) || 0)}
                />
              </div>
              <div>
                <Label>Nombre de tentatives en cas d'échec</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={llmSettings.globalSettings.maxRetries}
                  onChange={(event) => handleGlobalSettingChange('maxRetries', parseInt(event.target.value, 10) || 1)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Activer la mise en cache</Label>
                  <p className="text-xs text-muted-foreground">Réutilise les réponses déjà obtenues pour des requêtes similaires.</p>
                </div>
                <Switch
                  className={switchClassName}
                  checked={llmSettings.globalSettings.enableCaching}
                  onCheckedChange={(checked) => handleGlobalSettingChange('enableCaching', checked)}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Autoriser le choix du modèle par l'utilisateur</Label>
                  <p className="text-xs text-muted-foreground">Si désactivé, toutes les requêtes utiliseront le modèle par défaut.</p>
                </div>
                <Switch
                  className={switchClassName}
                  checked={llmSettings.globalSettings.allowModelSelection}
                  onCheckedChange={(checked) => handleGlobalSettingChange('allowModelSelection', checked)}
                />
              </div>
              <div>
                <Label>Modèle par défaut</Label>
                <Select
                  value={llmSettings.globalSettings.defaultModelId ?? 'none'}
                  onValueChange={(value) => handleDefaultModelChange(value === 'none' ? null : value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={modelsList.length ? 'Sélectionnez un modèle' : 'Aucun modèle disponible'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Aucun</SelectItem>
                    {modelsList.map(model => (
                      <SelectItem key={model.id} value={model.id}>
                        {model.name} ({model.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Autoriser les réglages avancés</Label>
                  <p className="text-xs text-muted-foreground">Permettre aux utilisateurs de personnaliser certains paramètres (température, etc.).</p>
                </div>
                <Switch
                  className={switchClassName}
                  checked={llmSettings.globalSettings.allowUserOverrides}
                  onCheckedChange={(checked) => handleGlobalSettingChange('allowUserOverrides', checked)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Fonctions d'assistant IA</CardTitle>
            <CardDescription>Associez chaque capacité métier à un assistant et aux prompts correspondants.</CardDescription>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={handleBulkAutoTranslateAll}
              disabled={
                bulkTranslationLoading ||
                translationLoading !== null ||
                assistantFunctionsList.length === 0 ||
                !translationAssistantId
              }
            >
              {bulkTranslationLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Wand2 className="w-4 h-4 mr-2" />
              )}
              {bulkTranslationLoading && bulkTranslationProgress
                ? `Auto-traduire (${bulkTranslationProgress.processed + 1}/${bulkTranslationProgress.total})`
                : 'Auto-traduire tout'}
            </Button>
            <Button onClick={openAssistantCreateDialog} disabled={bulkTranslationLoading}>
              <Sparkles className="w-4 h-4 mr-2" />
              Ajouter une fonction
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bulkTranslationLoading && bulkTranslationProgress && (
            <Alert variant="default" className="border-primary/30 text-primary">
              <Loader2 className="w-4 h-4 animate-spin" />
              <AlertTitle>Traduction en cours…</AlertTitle>
              <AlertDescription className="space-y-1 text-xs">
                <p>
                  {`Fonction : ${bulkTranslationProgress.currentFunction}`}
                </p>
                <p>
                  {`Langue ciblée : ${LANGUAGE_LABELS[bulkTranslationProgress.currentLanguage]}`}
                </p>
                <p>
                  {`Progression : ${bulkTranslationProgress.processed}/${bulkTranslationProgress.total}`}
                </p>
              </AlertDescription>
            </Alert>
          )}
          {assistantFunctionsList.length === 0 ? (
            <Alert>
              <Info className="w-4 h-4" />
              <AlertTitle>Aucune fonction configurée</AlertTitle>
              <AlertDescription>
                Créez une première fonction pour orchestrer les appels aux modèles IA.
              </AlertDescription>
            </Alert>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Assistant</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assistantFunctionsList.map(func => {
                  const description = func.description?.trim();
                  const isDescriptionTruncated = description ? description.length > 220 : false;
                  const descriptionPreview = description
                    ? isDescriptionTruncated
                      ? `${description.slice(0, 220)}…`
                      : description
                    : 'Aucune description fournie.';

                  return (
                    <TableRow key={func.id}>
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-primary" />
                            <div>
                              <div className="font-medium">{func.name}</div>
                              <div className="text-xs text-muted-foreground">{func.id}</div>
                            </div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Fournisseur&nbsp;: {func.provider ? func.provider : 'Non spécifié'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                            {descriptionPreview}
                          </p>
                          {isDescriptionTruncated && (
                            <Button
                              variant="ghost"
                              size="xs"
                              className="self-start h-6 px-2 text-xs"
                              onClick={() => handleOpenPreview(`Description – ${func.name}`, description)}
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Aperçu
                            </Button>
                          )}
                          {func.tags && func.tags.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {func.tags.map(tag => (
                                <Badge key={`${func.id}-${tag}`} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            className={switchClassName}
                            checked={func.isEnabled !== false}
                            onCheckedChange={(checked) => handleAssistantEnabledToggle(func.id, checked)}
                          />
                          <span className="text-xs text-muted-foreground">
                            {func.isEnabled !== false ? 'Actif' : 'Inactif'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        <Button variant="outline" size="sm" onClick={() => openAssistantEditDialog(func.id)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => confirmDeleteAssistant(func)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          <p className="text-xs text-muted-foreground">
            Les changements sont enregistrés immédiatement lorsque vous validez une fonction.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => onSave()} disabled={isSaving}>
          {isSaving ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          {isSaving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
        </Button>
      </div>

      <Dialog open={assistantEditorState.open} onOpenChange={(open) => (!open ? closeAssistantEditor() : null)}>
        <DialogContent className="max-w-[1600px] w-[95vw] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>
              {assistantEditorState.mode === 'create' ? 'Ajouter une fonction IA' : 'Modifier la fonction IA'}
            </DialogTitle>
            <DialogDescription>
              Configurez les paramètres utilisés lorsque cette fonction invoque un modèle d'IA.
            </DialogDescription>
          </DialogHeader>

          {assistantEditorState.draft && (
            <div className="flex-1 overflow-y-auto pr-2">
              <div className="space-y-6 pb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Identifiant</Label>
                    <Input
                      value={assistantEditorState.draft.id}
                      onChange={(event) => handleAssistantFieldChange('id', event.target.value)}
                      placeholder="ex: conversation"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Utilisé pour référencer la fonction dans les paramètres et le code.
                    </p>
                  </div>
                  <div>
                    <Label>Nom d'affichage</Label>
                    <Input
                      value={assistantEditorState.draft.name}
                      onChange={(event) => handleAssistantFieldChange('name', event.target.value)}
                      placeholder="Assistant conversationnel"
                    />
                  </div>
                  <div>
                    <Label>Fournisseur</Label>
                    <Input
                      value={assistantEditorState.draft.provider ?? ''}
                      onChange={(event) => handleAssistantFieldChange('provider', event.target.value)}
                      placeholder="OpenAI, Anthropic..."
                    />
                  </div>
                  <div>
                    <Label>Clé API dédiée (optionnel)</Label>
                    <Input
                      value={assistantEditorState.draft.apiKeyName ?? ''}
                      onChange={(event) => handleAssistantFieldChange('apiKeyName', event.target.value || undefined)}
                      placeholder="OPENAI_API_KEY"
                    />
                    {availableApiKeyNames.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Clés disponibles : {availableApiKeyNames.join(', ')}
                      </p>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Textarea
                      value={assistantEditorState.draft.description}
                      onChange={(event) => handleAssistantFieldChange('description', event.target.value)}
                      rows={4}
                      className="min-h-[140px]"
                      placeholder="Décrivez le rôle précis de cette fonction IA."
                    />
                  </div>

                  <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Label>Traductions du nom</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoTranslateField('name')}
                        disabled={translationLoading !== null}
                        className="inline-flex items-center gap-2"
                      >
                        {translationLoading === 'name' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        Auto-traduire
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {TRANSLATION_LANGUAGES.map((locale) => (
                        <div key={locale} className="space-y-2">
                          <Label className="text-xs text-muted-foreground">{LANGUAGE_LABELS[locale]}</Label>
                          <Input
                            dir={locale === 'ar' ? 'rtl' : 'ltr'}
                            className={`w-full ${locale === 'ar' ? 'text-right' : ''}`}
                            value={getTranslationValue('nameTranslations', locale)}
                            onChange={(event) => handleAssistantTranslationChange('nameTranslations', locale, event.target.value)}
                            placeholder={`Nom (${LANGUAGE_LABELS[locale]})`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Label>Traductions de la description</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoTranslateField('description')}
                        disabled={translationLoading !== null}
                        className="inline-flex items-center gap-2"
                      >
                        {translationLoading === 'description' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        Auto-traduire
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {TRANSLATION_LANGUAGES.map((locale) => (
                        <div key={locale} className="space-y-2">
                          <Label className="text-xs text-muted-foreground">{LANGUAGE_LABELS[locale]}</Label>
                          <Textarea
                            dir={locale === 'ar' ? 'rtl' : 'ltr'}
                            className={`w-full min-h-[150px] resize-y ${locale === 'ar' ? 'text-right leading-relaxed' : ''}`}
                            value={getTranslationValue('descriptionTranslations', locale)}
                            onChange={(event) => handleAssistantTranslationChange('descriptionTranslations', locale, event.target.value)}
                            placeholder={`Description (${LANGUAGE_LABELS[locale]})`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <Label>Message d'invitation</Label>
                    <Textarea
                      value={assistantEditorState.draft.invitationMessage ?? ''}
                      onChange={(event) => handleAssistantFieldChange('invitationMessage', event.target.value)}
                      rows={4}
                      className="min-h-[140px]"
                      placeholder="Ex.: Bonjour, je suis l'assistant Explication. Posez-moi vos questions pour clarifier un texte."
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Affiché automatiquement dans le chat lorsque cette fonction est sélectionnée pour inviter l'utilisateur à interagir.
                    </p>
                  </div>

                  <div className="md:col-span-2 space-y-3 rounded-lg border bg-muted/30 p-4">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <Label>Traductions du message d'invitation</Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAutoTranslateField('invitation')}
                        disabled={translationLoading !== null}
                        className="inline-flex items-center gap-2"
                      >
                        {translationLoading === 'invitation' ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Wand2 className="w-4 h-4" />
                        )}
                        Auto-traduire
                      </Button>
                    </div>
                    <div className="space-y-4">
                      {TRANSLATION_LANGUAGES.map((locale) => (
                        <div key={locale} className="space-y-2">
                          <Label className="text-xs text-muted-foreground">{LANGUAGE_LABELS[locale]}</Label>
                          <Textarea
                            dir={locale === 'ar' ? 'rtl' : 'ltr'}
                            className={`w-full min-h-[150px] resize-y ${locale === 'ar' ? 'text-right leading-relaxed' : ''}`}
                            value={getTranslationValue('invitationTranslations', locale)}
                            onChange={(event) => handleAssistantTranslationChange('invitationTranslations', locale, event.target.value)}
                            placeholder={`Invitation (${LANGUAGE_LABELS[locale]})`}
                          />
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between rounded-md border px-3 py-3 bg-background">
                    <div>
                      <p className="text-sm font-medium">Fonction active</p>
                      <p className="text-xs text-muted-foreground">Les fonctions inactives ne seront pas proposées dans l'assistant.</p>
                    </div>
                    <Switch
                      className={switchClassName}
                      checked={assistantEditorState.draft.isEnabled !== false}
                      onCheckedChange={(checked) => handleAssistantFieldChange('isEnabled', checked)}
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <Label>Format de réponse</Label>
                    <Select
                      value={assistantEditorState.draft.responseFormat ?? 'text'}
                      onValueChange={(value) => handleAssistantFieldChange('responseFormat', value as AssistantFunctionConfig['responseFormat'])}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choisissez un format" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Texte</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="auto">Automatique</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tags (séparés par des virgules)</Label>
                    <Input
                      value={(assistantEditorState.draft.tags ?? []).join(', ')}
                      onChange={(event) => handleAssistantTagsChange(event.target.value)}
                      placeholder="conversation, résumé, juridique..."
                    />
                  </div>
                </div>

                <div className="space-y-4 rounded-md border p-4">
                  <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                    <div>
                      <Label>Source du prompt système</Label>
                      <p className="text-xs text-muted-foreground">
                        Détermine comment le prompt système est injecté avant l'appel au modèle.
                      </p>
                    </div>
                    <Select
                      value={assistantEditorState.draft.prompt?.type ?? 'local'}
                      onValueChange={(value) => handleAssistantPromptTypeChange(value as PromptSourceType)}
                    >
                      <SelectTrigger className="md:w-[220px]">
                        <SelectValue placeholder="Type de prompt" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="local">Prompt local</SelectItem>
                        <SelectItem value="openai_prompt">Prompt OpenAI</SelectItem>
                        <SelectItem value="openai_assistant">Assistant OpenAI</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {assistantEditorState.draft.prompt?.type === 'local' && (
                    <div>
                      <Label>Identifiant du prompt local</Label>
                      <Input
                        value={assistantEditorState.draft.prompt?.localPromptId ?? ''}
                        onChange={(event) => handleAssistantPromptFieldChange('localPromptId', event.target.value)}
                        placeholder="ex: conversation_default"
                      />
                    </div>
                  )}

                  {assistantEditorState.draft.prompt?.type === 'openai_prompt' && (
                    <div>
                      <Label>ID du prompt OpenAI</Label>
                      <Input
                        value={assistantEditorState.draft.prompt?.openAiPromptId ?? ''}
                        onChange={(event) => handleAssistantPromptFieldChange('openAiPromptId', event.target.value)}
                        placeholder="prompt_xxx"
                      />
                    </div>
                  )}

                  {assistantEditorState.draft.prompt?.type === 'openai_assistant' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label>ID de l'assistant OpenAI</Label>
                        <Input
                          value={assistantEditorState.draft.prompt?.openAiAssistantId ?? ''}
                          onChange={(event) => handleAssistantPromptFieldChange('openAiAssistantId', event.target.value)}
                          placeholder="asst_xxx"
                        />
                      </div>
                      <div>
                        <Label>Version (optionnel)</Label>
                        <Input
                          value={assistantEditorState.draft.prompt?.versionTag ?? ''}
                          onChange={(event) => handleAssistantPromptFieldChange('versionTag', event.target.value)}
                          placeholder="latest"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="ghost" onClick={closeAssistantEditor}>Annuler</Button>
            <Button onClick={commitAssistantEditorChanges} disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {isSaving ? 'Sauvegarde...' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={Boolean(pendingDeleteAssistant)} onOpenChange={(open) => (!open ? setPendingDeleteAssistant(null) : null)}>
        {pendingDeleteAssistant && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la fonction IA&nbsp;?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera «&nbsp;{pendingDeleteAssistant.name}&nbsp;». Elle ne sera plus proposée aux utilisateurs.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteAssistant} className="bg-destructive text-white hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <Dialog open={Boolean(previewContent)} onOpenChange={(open) => (!open ? setPreviewContent(null) : null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{previewContent?.title}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[420px] overflow-auto whitespace-pre-wrap text-sm text-muted-foreground">
            {previewContent?.content}
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setPreviewContent(null)}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
