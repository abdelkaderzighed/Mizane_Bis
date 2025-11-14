import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import ConversationHistory from './ConversationHistory';
import {
  ConversationSession,
  AIAgentType,
  LLMType,
  LanguageCode
} from '../types';

interface ConversationHistoryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessions: ConversationSession[];
  onLoadSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  onClearAll: () => void;
  onExport: () => void;
  currentSessionId: string | null;
  language: LanguageCode;
  agentConfigs: Record<AIAgentType, { name: string; color: string; icon: any }>;
  llmConfigs: Record<LLMType, { name: string; color: string }>;
}

export default function ConversationHistoryModal({
  open,
  onOpenChange,
  sessions,
  onLoadSession,
  onDeleteSession,
  onClearAll,
  onExport,
  currentSessionId,
  language,
  agentConfigs,
  llmConfigs
}: ConversationHistoryModalProps) {
  const handleLoadSession = (sessionId: string) => {
    onLoadSession(sessionId);
    onOpenChange(false); // Fermer la modal après avoir chargé une session
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] p-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle className="flex items-center gap-2">
            <span>Historique des conversations</span>
            {sessions.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({sessions.length} conversation{sessions.length > 1 ? 's' : ''})
              </span>
            )}
          </DialogTitle>
          <DialogDescription>
            Retrouvez toutes vos conversations précédentes et rechargez-les à tout moment.
          </DialogDescription>
        </DialogHeader>
        
        <div className="h-[60vh]">
          <ConversationHistory
            sessions={sessions}
            onLoadSession={handleLoadSession}
            onDeleteSession={onDeleteSession}
            onClearAll={onClearAll}
            onExport={onExport}
            currentSessionId={currentSessionId}
            language={language}
            agentConfigs={agentConfigs}
            llmConfigs={llmConfigs}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}