import { useState, useEffect, useCallback } from 'react';
import {
  ChatMessageApp,
  ConversationSession,
  ConversationHistory,
  ConversationFilter,
  AIAgentType,
  LLMType
} from '../types';

const STORAGE_KEY = 'misan_conversation_history';
const MAX_SESSIONS = 100; // Limite pour éviter un localStorage trop volumineux

// Fonction utilitaire pour générer un titre de conversation
export const generateConversationTitle = (messages: ChatMessageApp[]): string => {
  if (messages.length === 0) return 'Nouvelle conversation';
  
  const firstUserMessage = messages.find(m => m.sender === 'user');
  if (!firstUserMessage) return 'Conversation sans message utilisateur';
  
  // Prendre les premiers 50 caractères du premier message utilisateur
  const title = firstUserMessage.content.trim().slice(0, 50);
  return title.length < firstUserMessage.content.trim().length ? `${title}...` : title;
};

// Fonction utilitaire pour calculer un résumé de conversation
export const generateConversationSummary = (messages: ChatMessageApp[]): string => {
  const userMessages = messages.filter(m => m.sender === 'user').length;
  const aiMessages = messages.filter(m => m.sender === 'ai').length;
  const agents = [...new Set(messages.filter(m => m.agent).map(m => m.agent))];
  const llms = [...new Set(messages.flatMap(m => m.llms || []))];
  
  return `${userMessages} messages utilisateur, ${aiMessages} réponses IA. Agents: ${agents.join(', ')}. Modèles: ${llms.join(', ')}.`;
};

// Fonction utilitaire pour sauvegarder l'historique
const saveHistoryToStorage = (history: ConversationHistory): void => {
  try {
    // Garder seulement les dernières sessions si on dépasse la limite
    if (history.sessions.length > MAX_SESSIONS) {
      const sortedSessions = [...history.sessions].sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      );
      
      const keptSessions = sortedSessions.slice(0, MAX_SESSIONS);
      const removedSessionIds = sortedSessions.slice(MAX_SESSIONS).map(s => s.id);
      
      // Supprimer les messages des sessions supprimées
      const filteredMessages: Record<string, ChatMessageApp[]> = {};
      Object.keys(history.messages).forEach(sessionId => {
        if (!removedSessionIds.includes(sessionId)) {
          filteredMessages[sessionId] = history.messages[sessionId];
        }
      });
      
      history = {
        sessions: keptSessions,
        messages: filteredMessages,
        lastUpdated: new Date()
      };
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...history,
      lastUpdated: new Date().toISOString()
    }));
  } catch (error) {
    console.error('Erreur lors de la sauvegarde de l\'historique:', error);
  }
};

// Fonction utilitaire pour charger l'historique
const loadHistoryFromStorage = (): ConversationHistory => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return {
        sessions: [],
        messages: {},
        lastUpdated: new Date()
      };
    }
    
    const parsed = JSON.parse(stored);
    return {
      ...parsed,
      lastUpdated: new Date(parsed.lastUpdated),
      sessions: parsed.sessions.map((session: any) => ({
        ...session,
        startTime: new Date(session.startTime),
        endTime: session.endTime ? new Date(session.endTime) : undefined
      })),
      messages: Object.fromEntries(
        Object.entries(parsed.messages).map(([sessionId, messages]) => [
          sessionId,
          (messages as any[]).map(msg => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        ])
      )
    };
  } catch (error) {
    console.error('Erreur lors du chargement de l\'historique:', error);
    return {
      sessions: [],
      messages: {},
      lastUpdated: new Date()
    };
  }
};

// Fonction utilitaire pour filtrer les sessions
export const filterSessions = (
  sessions: ConversationSession[],
  filter: ConversationFilter
): ConversationSession[] => {
  let filtered = [...sessions];
  
  // Filtrage par date
  if (filter.dateRange) {
    filtered = filtered.filter(session => {
      const sessionDate = new Date(session.startTime);
      return sessionDate >= filter.dateRange!.start && sessionDate <= filter.dateRange!.end;
    });
  }
  
  // Filtrage par agents
  if (filter.agents && filter.agents.length > 0) {
    filtered = filtered.filter(session => 
      filter.agents!.includes(session.primaryAgent)
    );
  }
  
  // Filtrage par LLMs
  if (filter.llms && filter.llms.length > 0) {
    filtered = filtered.filter(session => 
      session.llmsUsed.some(llm => filter.llms!.includes(llm))
    );
  }
  
  // Filtrage par texte de recherche
  if (filter.searchText) {
    const searchLower = filter.searchText.toLowerCase();
    filtered = filtered.filter(session => 
      session.title.toLowerCase().includes(searchLower) ||
      (session.summary && session.summary.toLowerCase().includes(searchLower))
    );
  }
  
  // Tri
  filtered.sort((a, b) => {
    switch (filter.sortBy) {
      case 'newest':
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      case 'oldest':
        return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
      case 'messageCount':
        return b.messageCount - a.messageCount;
      case 'agent':
        return a.primaryAgent.localeCompare(b.primaryAgent);
      default:
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
    }
  });
  
  return filtered;
};

// Hook principal pour gérer l'historique des conversations
export const useConversationHistory = (userId?: string) => {
  const [history, setHistory] = useState<ConversationHistory>(() => loadHistoryFromStorage());
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  // Sauvegarder automatiquement l'historique à chaque changement
  useEffect(() => {
    saveHistoryToStorage(history);
  }, [history]);
  
  // Créer une nouvelle session
  const createNewSession = useCallback((
    agent: AIAgentType,
    llms: LLMType[]
  ): string => {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newSession: ConversationSession = {
      id: sessionId,
      title: 'Nouvelle conversation',
      startTime: new Date(),
      messageCount: 0,
      primaryAgent: agent,
      llmsUsed: llms,
      userId,
      isActive: true
    };
    
    setHistory(prev => ({
      ...prev,
      sessions: [newSession, ...prev.sessions],
      messages: {
        ...prev.messages,
        [sessionId]: []
      },
      lastUpdated: new Date()
    }));
    
    setCurrentSessionId(sessionId);
    return sessionId;
  }, [userId]);
  
  // Ajouter un message à la session courante
  const addMessageToCurrentSession = useCallback((message: ChatMessageApp) => {
    if (!currentSessionId) {
      console.log('Aucune session active pour ajouter le message - création automatique d\'une nouvelle session');
      return;
    }
    
    setHistory(prev => {
      const currentMessages = prev.messages[currentSessionId] || [];
      const updatedMessages = [...currentMessages, message];
      
      // Mettre à jour la session
      const updatedSessions = prev.sessions.map(session => {
        if (session.id === currentSessionId) {
          const title = currentMessages.length === 0 ? 
            generateConversationTitle([message]) : 
            session.title;
          
          return {
            ...session,
            title,
            messageCount: updatedMessages.length,
            summary: generateConversationSummary(updatedMessages),
            llmsUsed: message.llms ? 
              [...new Set([...session.llmsUsed, ...message.llms])] : 
              session.llmsUsed
          };
        }
        return session;
      });
      
      return {
        sessions: updatedSessions,
        messages: {
          ...prev.messages,
          [currentSessionId]: updatedMessages
        },
        lastUpdated: new Date()
      };
    });
  }, [currentSessionId]);
  
  // Terminer la session courante
  const endCurrentSession = useCallback(() => {
    if (!currentSessionId) return;
    
    setHistory(prev => ({
      ...prev,
      sessions: prev.sessions.map(session => 
        session.id === currentSessionId
          ? { ...session, endTime: new Date(), isActive: false }
          : session
      ),
      lastUpdated: new Date()
    }));
    
    setCurrentSessionId(null);
  }, [currentSessionId]);
  
  // Charger une session existante
  const loadSession = useCallback((sessionId: string): ChatMessageApp[] => {
    const messages = history.messages[sessionId] || [];
    setCurrentSessionId(sessionId);
    
    // Marquer la session comme active
    setHistory(prev => ({
      ...prev,
      sessions: prev.sessions.map(session => ({
        ...session,
        isActive: session.id === sessionId
      })),
      lastUpdated: new Date()
    }));
    
    return messages;
  }, [history.messages]);
  
  // Supprimer une session
  const deleteSession = useCallback((sessionId: string) => {
    setHistory(prev => {
      const { [sessionId]: deletedMessages, ...remainingMessages } = prev.messages;
      return {
        sessions: prev.sessions.filter(session => session.id !== sessionId),
        messages: remainingMessages,
        lastUpdated: new Date()
      };
    });
    
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);
  
  // Supprimer toutes les sessions
  const clearAllSessions = useCallback(() => {
    setHistory({
      sessions: [],
      messages: {},
      lastUpdated: new Date()
    });
    setCurrentSessionId(null);
  }, []);
  
  // Exporter l'historique
  const exportHistory = useCallback(() => {
    const dataStr = JSON.stringify(history, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `misan_conversations_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }, [history]);
  
  return {
    history,
    currentSessionId,
    createNewSession,
    addMessageToCurrentSession,
    endCurrentSession,
    loadSession,
    deleteSession,
    clearAllSessions,
    exportHistory,
    getCurrentMessages: () => currentSessionId ? history.messages[currentSessionId] || [] : [],
    getSession: (sessionId: string) => history.sessions.find(s => s.id === sessionId),
    hasActiveSession: () => currentSessionId !== null
  };
};