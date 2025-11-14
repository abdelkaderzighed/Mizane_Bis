import { supabase } from './supabase';
import type { ChatMessage, LanguageCode } from '../types';

export interface AssistantInvocationUsage {
  totalTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
}

export interface AssistantInvocationResponse {
  message: string;
  usage?: AssistantInvocationUsage;
  threadId?: string | null;
}

export interface InvokeAssistantOptions {
  assistantId: string;
  message: string;
  history?: ChatMessage[];
  threadId?: string | null;
  language?: LanguageCode;
}

export const invokeAssistant = async ({ assistantId, message, history, threadId, language }: InvokeAssistantOptions): Promise<AssistantInvocationResponse> => {
  const payload: Record<string, unknown> = {
    assistantId,
    message: message.trim(),
  };

  if (Array.isArray(history) && history.length > 0) {
    payload.history = history.map(({ role, content }) => ({
      role,
      content,
    }));
  }

  if (threadId) {
    payload.threadId = threadId;
  }

  if (language) {
    payload.language = language;
  }

  const { data, error } = await supabase.functions.invoke('call-ai-assistant', {
    body: payload,
  });

  if (error) {
    const serverMessage = (() => {
      if (data && typeof data === 'object') {
        const body = data as { error?: unknown; message?: unknown };
        if (typeof body.error === 'string' && body.error.trim().length > 0) {
          return body.error;
        }
        if (typeof body.message === 'string' && body.message.trim().length > 0) {
          return body.message;
        }
      }
      return null;
    })();

    throw new Error(serverMessage ?? error.message ?? 'Erreur lors de l\'appel de l\'assistant IA');
  }

  if (!data?.success) {
    const errMsg = data?.error || data?.message || 'Réponse invalide de l\'assistant IA';
    throw new Error(errMsg as string);
  }

  return {
    message: data.message as string,
    usage: {
      totalTokens: data.usage?.totalTokens ?? data.usage?.total_tokens,
      promptTokens: data.usage?.promptTokens ?? data.usage?.prompt_tokens,
      completionTokens: data.usage?.completionTokens ?? data.usage?.completion_tokens,
      model: data.model as string | undefined,
    },
    threadId: typeof data.threadId === 'string' ? data.threadId : undefined,
  };
};
