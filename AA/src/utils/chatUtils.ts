import { toast } from 'sonner';
import { invokeAssistant, type AssistantInvocationUsage } from './assistantApi';
import { ChatMessage, AIAgentType, LLMType, LLMModel, PublicAssistantFunctionConfig, LanguageCode } from '../types';
import { checkUserAccess, checkAgentAccess, checkLLMAccess, getAccessErrorMessage } from './accessControl';

export interface ChatSendCallbacks {
  onBeforeResponse?: () => void;
  onAfterResponse?: () => void;
}

export interface ChatSendParams {
  chatInput: string;
  setChatInput: React.Dispatch<React.SetStateAction<string>>;
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  assistantConfig?: PublicAssistantFunctionConfig | null;
  agentId: AIAgentType;
  llmModels: Record<LLMType, LLMModel>;
  t: any;
  userInfo?: any;
  callbacks?: ChatSendCallbacks;
  conversationHistory?: ChatMessage[];
  setTokenUsage?: (usage: AssistantInvocationUsage | null) => void;
  threadId?: string | null;
  setThreadId?: (threadId: string | null) => void;
  shouldAbortResponse?: () => boolean;
  addTokensToTotal?: (tokens: number) => void;
  language?: LanguageCode;
}

// Fonction pour envoyer un message via l'assistant IA
export const handleSendMessage = async ({
  chatInput,
  setChatInput,
  setChatMessages,
  assistantConfig,
  agentId,
  llmModels,
  t,
  userInfo,
  callbacks,
  conversationHistory = [],
  setTokenUsage,
  threadId,
  setThreadId,
  shouldAbortResponse,
  addTokensToTotal,
  language,
}: ChatSendParams): Promise<void> => {
  const trimmedInput = chatInput.trim();
  if (!trimmedInput) {
    return;
  }

  if (!assistantConfig) {
    toast.error(t?.assistantUnavailable ?? "Aucun assistant configuré pour cette action.");
    return;
  }

  const llmId = assistantConfig.modelConfigId as LLMType;
  const llmMeta = llmModels[llmId];

  if (userInfo) {
    const accessCheck = checkUserAccess(userInfo, 10);
    if (!accessCheck.canAccessAI && userInfo.role !== 'admin') {
      toast.error(getAccessErrorMessage(accessCheck, t));
      return;
    }

    const agentCheck = checkAgentAccess(userInfo, agentId);
    if (!agentCheck.canUseAgent) {
      toast.error(getAccessErrorMessage(agentCheck, t));
      return;
    }

    if (llmMeta) {
      const llmCheck = checkLLMAccess(userInfo, llmId);
      if (!llmCheck.canUseLLM && userInfo.role !== 'admin') {
        toast.error(`${llmMeta.name}: ${getAccessErrorMessage(llmCheck, t)}`);
        return;
      }
    }
  }

  const messageLanguage: LanguageCode = language ?? 'fr';

  const userMessage: ChatMessage = {
    id: Date.now().toString(),
    role: 'user',
    content: trimmedInput,
    timestamp: new Date(),
    metadata: { language: messageLanguage },
  };

  callbacks?.onBeforeResponse?.();
  setTokenUsage?.(null);
  setChatMessages(prev => [...prev, userMessage]);
  setChatInput('');

  try {
    const result = await invokeAssistant({
      assistantId: assistantConfig.id,
      message: trimmedInput,
      history: conversationHistory,
      threadId,
      language,
    });

    if (shouldAbortResponse?.()) {
      callbacks?.onAfterResponse?.();
      return;
    }

    if (setThreadId) {
      setThreadId(result.threadId ?? threadId ?? null);
    }

    const totalTokensUsed = result.usage?.totalTokens ?? result.usage?.total ?? null;
    if (typeof totalTokensUsed === 'number' && addTokensToTotal) {
      addTokensToTotal(totalTokensUsed);
    }

    const llmDisplayName = llmMeta?.name ?? llmId;

    const aiResponse: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: result.message,
      timestamp: new Date(),
      llmUsed: llmMeta ? [llmDisplayName] : undefined,
      metadata: { language: messageLanguage },
    };

    setChatMessages(prev => [...prev, aiResponse]);
    setTokenUsage?.(result.usage ?? null);
    callbacks?.onAfterResponse?.();
  } catch (error) {
    console.error('Erreur assistant IA:', error);
    const message = error instanceof Error ? error.message : 'Erreur inconnue lors de l\'appel IA';
    toast.error(message);

    setChatMessages(prev => [
      ...prev,
      {
        id: (Date.now() + 2).toString(),
        role: 'assistant',
        content: t?.assistantErrorFallback ?? 'Une erreur est survenue lors de la génération de la réponse.',
        timestamp: new Date(),
        metadata: { language: messageLanguage },
      },
    ]);
    setTokenUsage?.(null);
    callbacks?.onAfterResponse?.();
  }
};

// Fonction pour changer d'agent
export const handleAgentChange = (
  newAgent: AIAgentType,
  setCurrentAgent: React.Dispatch<React.SetStateAction<AIAgentType>>,
  aiAgents: any,
  t: any
) => {
  setCurrentAgent(newAgent);
  const agentName = aiAgents?.[newAgent]?.name ?? newAgent;
  toast.success(`${t.agentChanged}: ${agentName}`);
};

// Fonction pour toggler un LLM
export const handleLLMToggle = (
  llmId: LLMType,
  selectedLLMs: LLMType[],
  setSelectedLLMs: React.Dispatch<React.SetStateAction<LLMType[]>>,
  llmModels: Record<LLMType, LLMModel>,
  t: any
) => {
  const newSelection = selectedLLMs.includes(llmId)
    ? selectedLLMs.filter(id => id !== llmId)
    : [...selectedLLMs, llmId];
  
  setSelectedLLMs(newSelection);
  
  if (newSelection.length > 0) {
    const llmNames = newSelection
      .map(id => llmModels[id]?.name ?? id)
      .join(', ');
    toast.success(`${t.llmChanged}: ${llmNames}`);
  }
};

// Fonction pour effacer le chat
export const handleClearChat = (
  setChatMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>,
  t: any
) => {
  setChatMessages([]);
  toast.success(t.chatCleared);
};
