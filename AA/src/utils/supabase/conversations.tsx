import { getSupabaseEdgeCredentials, buildEdgeFunctionUrl } from './edge';
import type { 
  ConversationSession, 
  ChatMessageApp, 
  ConversationHistory,
  ConversationFilter 
} from '../../types';

let cachedBaseUrl: string | null = null;

async function getApiBaseUrl(): Promise<string> {
  if (cachedBaseUrl) {
    return cachedBaseUrl;
  }

  const url = await buildEdgeFunctionUrl('/functions/v1/make-server-ea280960');
  cachedBaseUrl = url;
  return url;
}

// Classe pour gérer les conversations avec Supabase
export class MisanConversationService {
  private accessToken: string | null = null;

  constructor(accessToken?: string) {
    this.accessToken = accessToken || null;
  }

  setAccessToken(token: string) {
    this.accessToken = token;
  }

  private async makeRequest(endpoint: string, options: RequestInit = {}) {
    const [{ publicAnonKey }, baseUrl] = await Promise.all([
      getSupabaseEdgeCredentials(),
      getApiBaseUrl(),
    ]);

    const headers = new Headers({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.accessToken || publicAnonKey}`,
    });

    if (options.headers) {
      const incoming = new Headers(options.headers as HeadersInit);
      incoming.forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const { headers: _ignored, ...rest } = options;

    const response = await fetch(`${baseUrl}${endpoint}`, {
      ...rest,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
      throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
    }

    return response.json();
  }

  // Sauvegarder une conversation
  async saveConversation(session: ConversationSession, messages: ChatMessageApp[]): Promise<{ success: boolean; sessionId: string }> {
    return this.makeRequest('/conversations', {
      method: 'POST',
      body: JSON.stringify({ session, messages }),
    });
  }

  // Récupérer toutes les conversations
  async getConversations(includeMessages: boolean = false): Promise<ConversationHistory> {
    const queryParam = includeMessages ? '?includeMessages=true' : '';
    return this.makeRequest(`/conversations${queryParam}`);
  }

  // Récupérer une conversation spécifique
  async getConversation(sessionId: string): Promise<{ session: ConversationSession; messages: ChatMessageApp[] }> {
    return this.makeRequest(`/conversations/${sessionId}`);
  }

  // Supprimer une conversation
  async deleteConversation(sessionId: string): Promise<{ success: boolean; message: string }> {
    return this.makeRequest(`/conversations/${sessionId}`, {
      method: 'DELETE',
    });
  }

  // Supprimer toutes les conversations
  async deleteAllConversations(): Promise<{ success: boolean; message: string; deletedCount: number }> {
    return this.makeRequest('/conversations', {
      method: 'DELETE',
    });
  }

  // Rechercher dans les conversations
  async searchConversations(query: string, filters?: Partial<ConversationFilter>): Promise<{
    sessions: ConversationSession[];
    totalResults: number;
    query: string;
    filters?: Partial<ConversationFilter>;
  }> {
    return this.makeRequest('/conversations/search', {
      method: 'POST',
      body: JSON.stringify({ query, filters }),
    });
  }

  // Exporter l'historique
  async exportConversations(format: string = 'json'): Promise<any> {
    return this.makeRequest(`/conversations/export?format=${format}`);
  }

  // Tester la connexion au serveur
  async testConnection(): Promise<{ message: string; timestamp: string; features: string[] }> {
    return this.makeRequest('/test');
  }
}

// Instance singleton du service
let conversationService: MisanConversationService | null = null;

export const getMisanConversationService = (accessToken?: string): MisanConversationService => {
  if (!conversationService) {
    conversationService = new MisanConversationService(accessToken);
  } else if (accessToken) {
    conversationService.setAccessToken(accessToken);
  }
  return conversationService;
};

// Fonctions utilitaires pour l'historique des conversations avec synchronisation cloud
export const conversationHistoryUtils = {
  // Générer un titre de conversation intelligent
  generateConversationTitle: (messages: ChatMessageApp[]): string => {
    if (messages.length === 0) return 'Nouvelle conversation';
    
    const firstUserMessage = messages.find(m => m.sender === 'user');
    if (!firstUserMessage) return 'Conversation sans message utilisateur';
    
    // Prendre les premiers 50 caractères du premier message utilisateur
    const title = firstUserMessage.content.trim().slice(0, 50);
    return title.length < firstUserMessage.content.trim().length ? `${title}...` : title;
  },

  // Générer un résumé de conversation
  generateConversationSummary: (messages: ChatMessageApp[]): string => {
    const userMessages = messages.filter(m => m.sender === 'user').length;
    const aiMessages = messages.filter(m => m.sender === 'ai').length;
    const agents = [...new Set(messages.filter(m => m.agent).map(m => m.agent))];
    const llms = [...new Set(messages.flatMap(m => m.llms || []))];
    
    return `${userMessages} messages utilisateur, ${aiMessages} réponses IA. Agents: ${agents.join(', ')}. Modèles: ${llms.join(', ')}.`;
  },

  // Créer une session de conversation
  createConversationSession: (
    messages: ChatMessageApp[],
    primaryAgent: string,
    llmsUsed: string[],
    userId?: string
  ): ConversationSession => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date();
    
    return {
      id: sessionId,
      title: conversationHistoryUtils.generateConversationTitle(messages),
      summary: conversationHistoryUtils.generateConversationSummary(messages),
      startTime: now,
      endTime: undefined,
      messageCount: messages.length,
      primaryAgent: primaryAgent as any,
      llmsUsed: llmsUsed as any[],
      userId,
      isActive: true,
      tags: [],
      metadata: {}
    };
  },

  // Synchroniser avec le cloud
  syncToCloud: async (
    session: ConversationSession, 
    messages: ChatMessageApp[], 
    accessToken: string
  ): Promise<boolean> => {
    try {
      const service = getMisanConversationService(accessToken);
      const result = await service.saveConversation(session, messages);
      return result.success;
    } catch (error) {
      console.error('Erreur synchronisation cloud:', error);
      return false;
    }
  },

  // Récupérer depuis le cloud
  syncFromCloud: async (accessToken: string): Promise<ConversationHistory | null> => {
    try {
      const service = getMisanConversationService(accessToken);
      return await service.getConversations(true);
    } catch (error) {
      console.error('Erreur récupération cloud:', error);
      return null;
    }
  },

  // Nettoyer les données de conversation (enlever les éléments inutiles)
  cleanConversationData: (session: ConversationSession): ConversationSession => {
    return {
      ...session,
      startTime: new Date(session.startTime),
      endTime: session.endTime ? new Date(session.endTime) : undefined,
      isActive: session.isActive || false,
      tags: session.tags || [],
      metadata: session.metadata || {}
    };
  },

  // Valider les données de conversation
  validateConversationData: (session: ConversationSession, messages: ChatMessageApp[]): boolean => {
    // Vérifications de base
    if (!session.id || !session.title || !Array.isArray(messages)) {
      return false;
    }

    // Vérifier que les messages ont les champs requis
    for (const message of messages) {
      if (!message.id || !message.content || !message.sender || !message.timestamp) {
        return false;
      }
    }

    return true;
  }
};

export default getMisanConversationService;
