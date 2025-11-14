import {
  MessageSquare,
  PenTool,
  CheckCircle,
  BookOpen,
  Sparkles,
  BrainCircuit
} from 'lucide-react';
import { AIAgentType, AIAgent, LLMType, LLMModel } from '../types';

// Configuration des agents IA
export const createAIAgents = (t: any): Record<AIAgentType, AIAgent> => ({
  conversation: {
    id: 'conversation',
    name: t.agents.conversation.name,
    description: t.agents.conversation.description,
    icon: MessageSquare,
    color: 'text-blue-600'
  },
  writing: {
    id: 'writing',
    name: t.agents.writing.name,
    description: t.agents.writing.description,
    icon: PenTool,
    color: 'text-green-600'
  },
  correction: {
    id: 'correction',
    name: t.agents.correction.name,
    description: t.agents.correction.description,
    icon: CheckCircle,
    color: 'text-red-600'
  },
  analysis: {
    id: 'analysis',
    name: t.agents.analysis.name,
    description: t.agents.analysis.description,
    icon: BookOpen,
    color: 'text-purple-600'
  },
  creative: {
    id: 'creative',
    name: t.agents.creative.name,
    description: t.agents.creative.description,
    icon: Sparkles,
    color: 'text-pink-600'
  },
  technical: {
    id: 'technical',
    name: t.agents.technical.name,
    description: t.agents.technical.description,
    icon: BrainCircuit,
    color: 'text-orange-600'
  }
});

// Configuration des modèles LLM
export const createLLMModels = (t: any): Record<LLMType, LLMModel> => ({
  gpt4: {
    id: 'gpt4',
    name: t.llms.gpt4.name,
    provider: t.llms.gpt4.provider,
    description: t.llms.gpt4.description,
    color: 'text-green-600',
    isPremium: true
  },
  claude35sonnet: {
    id: 'claude35sonnet',
    name: t.llms.claude35sonnet.name,
    provider: t.llms.claude35sonnet.provider,
    description: t.llms.claude35sonnet.description,
    color: 'text-purple-600',
    isPremium: true
  },
  claude3haiku: {
    id: 'claude3haiku',
    name: t.llms.claude3haiku.name,
    provider: t.llms.claude3haiku.provider,
    description: t.llms.claude3haiku.description,
    color: 'text-indigo-600',
    isPremium: false
  },
  gemini: {
    id: 'gemini',
    name: t.llms.gemini.name,
    provider: t.llms.gemini.provider,
    description: t.llms.gemini.description,
    color: 'text-yellow-600',
    isPremium: false
  },
  llama2: {
    id: 'llama2',
    name: t.llms.llama2.name,
    provider: t.llms.llama2.provider,
    description: t.llms.llama2.description,
    color: 'text-orange-600',
    isPremium: false
  },
  mistral: {
    id: 'mistral',
    name: t.llms.mistral.name,
    provider: t.llms.mistral.provider,
    description: t.llms.mistral.description,
    color: 'text-red-600',
    isPremium: false
  },
  palm2: {
    id: 'palm2',
    name: t.llms.palm2.name,
    provider: t.llms.palm2.provider,
    description: t.llms.palm2.description,
    color: 'text-gray-600',
    isPremium: false
  }
});
