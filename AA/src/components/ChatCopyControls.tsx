import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Checkbox } from './ui/checkbox';
import { Card } from './ui/card';
import {
  Copy,
  CheckSquare,
  Square,
  FileText,
  Bot,
} from 'lucide-react';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

type ChatCopySender = 'user' | 'ai';

interface ChatCopyMessage {
  id: string;
  content: string;
  sender?: ChatCopySender;
  role?: 'user' | 'assistant';
  timestamp: Date | string;
  agent?: string;
  llms?: string[];
  llmUsed?: string[];
  metadata?: Record<string, unknown>;
}

interface ChatCopyControlsProps {
  messages: ChatCopyMessage[];
  onCopyToEditor: (content: string) => void;
  language: 'fr' | 'en' | 'ar';
  userAvatarUrl?: string;
}

interface NormalizedMessage {
  id: string;
  content: string;
  sender: ChatCopySender;
  timestamp: Date;
  agent?: string;
  llms?: string[];
  metadata?: Record<string, unknown>;
  language: 'fr' | 'en' | 'ar';
}

const normalizeMessage = (message: ChatCopyMessage, fallbackLanguage: 'fr' | 'en' | 'ar'): NormalizedMessage => {
  const sender: ChatCopySender = message.sender
    ? message.sender
    : message.role === 'assistant'
      ? 'ai'
      : 'user';

  const timestamp = message.timestamp instanceof Date
    ? message.timestamp
    : new Date(message.timestamp);

  const llms = message.llmUsed && message.llmUsed.length > 0 ? message.llmUsed : message.llms;
  const metadata = message.metadata && typeof message.metadata === 'object' ? message.metadata : undefined;
  const rawLanguage = (metadata?.language as string) ?? fallbackLanguage;
  const normalizedLanguage: 'fr' | 'en' | 'ar' = rawLanguage === 'ar' ? 'ar' : rawLanguage === 'en' ? 'en' : 'fr';

  return {
    id: message.id,
    content: message.content,
    sender,
    timestamp,
    agent: message.agent,
    llms,
    metadata,
    language: normalizedLanguage,
  };
};

export default function ChatCopyControls({ messages, onCopyToEditor, language, userAvatarUrl }: ChatCopyControlsProps) {
  const [selectedMessages, setSelectedMessages] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

  const normalizedMessages = useMemo(
    () => messages.map((message) => normalizeMessage(message, language)),
    [messages, language]
  );

  const translations = {
    fr: {
      copyAll: 'Copier toute la conversation',
      selectMessages: 'Sélectionner des messages',
      copySelected: 'Copier la sélection',
      cancelSelection: 'Annuler',
      selectAll: 'Tout sélectionner',
      deselectAll: 'Tout déselectionner',
      conversationCopied: 'Conversation copiée vers l\'éditeur',
      selectedCopied: 'Messages sélectionnés copiés',
      noMessages: 'Aucun message à copier',
      messagesSelected: 'messages sélectionnés',
      conversation: 'Conversation',
      userMessage: 'Utilisateur',
      assistantMessage: 'Assistant IA'
    },
    en: {
      copyAll: 'Copy entire conversation',
      selectMessages: 'Select messages',
      copySelected: 'Copy selection',
      cancelSelection: 'Cancel',
      selectAll: 'Select all',
      deselectAll: 'Deselect all',
      conversationCopied: 'Conversation copied to editor',
      selectedCopied: 'Selected messages copied',
      noMessages: 'No messages to copy',
      messagesSelected: 'messages selected',
      conversation: 'Conversation',
      userMessage: 'User',
      assistantMessage: 'AI Assistant'
    },
    ar: {
      copyAll: 'نسخ المحادثة بالكامل',
      selectMessages: 'تحديد الرسائل',
      copySelected: 'نسخ المحدد',
      cancelSelection: 'إلغاء',
      selectAll: 'تحديد الكل',
      deselectAll: 'إلغاء تحديد الكل',
      conversationCopied: 'تم نسخ المحادثة إلى المحرر',
      selectedCopied: 'تم نسخ الرسائل المحددة',
      noMessages: 'لا توجد رسائل للنسخ',
      messagesSelected: 'رسائل محددة',
      conversation: 'المحادثة',
      userMessage: 'المستخدم',
      assistantMessage: 'المساعد الذكي'
    }
  };

  const t = translations[language];

  const formatConversationToMarkdown = (messagesToFormat: NormalizedMessage[]): string => {
    if (messagesToFormat.length === 0) return '';

    const formattedMessages = messagesToFormat.map(message => {
      const timestamp = message.timestamp.toLocaleString();
      const roleIcon = message.sender === 'user' ? '👤' : '🤖';
      const roleText = message.sender === 'user' ? t.userMessage : t.assistantMessage;
      
      return `## ${roleIcon} ${roleText} - ${timestamp}\n\n${message.content}\n\n---\n`;
    });

    const header = `# ${t.conversation}\n\n> ${t.conversation} ${messagesToFormat.length === normalizedMessages.length ? 'complète' : 'partielle'} - ${new Date().toLocaleString()}\n\n`;
    
    return header + formattedMessages.join('\n');
  };

  const handleCopyAllConversation = () => {
    if (normalizedMessages.length === 0) {
      toast.error(t.noMessages);
      return;
    }

    const formattedConversation = formatConversationToMarkdown(normalizedMessages);
    onCopyToEditor(formattedConversation);
    toast.success(t.conversationCopied);
  };

  const handleCopySelectedMessages = () => {
    const selectedMessagesList = normalizedMessages.filter(msg => selectedMessages.has(msg.id));
    
    if (selectedMessagesList.length === 0) {
      toast.error(t.noMessages);
      return;
    }

    const formattedConversation = formatConversationToMarkdown(selectedMessagesList);
    onCopyToEditor(formattedConversation);
    toast.success(t.selectedCopied);
    
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const handleToggleMessage = (messageId: string) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleSelectAll = () => {
    setSelectedMessages(new Set(normalizedMessages.map(msg => msg.id)));
  };

  const handleDeselectAll = () => {
    setSelectedMessages(new Set());
  };

  const handleEnterSelectionMode = () => {
    setIsSelectionMode(true);
    setSelectedMessages(new Set());
  };

  const handleExitSelectionMode = () => {
    setIsSelectionMode(false);
    setSelectedMessages(new Set());
  };

  const renderMessageWithSelection = (message: NormalizedMessage) => {
    const isSelected = selectedMessages.has(message.id);
    const isUser = message.sender === 'user';
    const isRTL = message.language === 'ar';
    
    return (
      <div key={message.id} className="flex flex-col gap-2">
        <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
          <div className={`flex items-start gap-3 max-w-[80%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
            {/* Avatar */}
            {isUser ? (
              <Avatar className="w-8 h-8 border border-blue-100 shadow-sm">
                {userAvatarUrl ? (
                  <AvatarImage src={userAvatarUrl} alt="Vous" />
                ) : (
                  <AvatarFallback className="bg-blue-500 text-white text-[10px] uppercase">VO</AvatarFallback>
                )}
              </Avatar>
            ) : (
              <Avatar className="w-8 h-8 bg-emerald-500 text-white border border-emerald-100 shadow-sm">
                <AvatarFallback className="bg-emerald-500 text-white">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
            )}
            
            {/* Checkbox en mode sélection */}
            {isSelectionMode && (
              <div className="mt-3">
                <Checkbox
                  checked={isSelected}
                  onCheckedChange={() => handleToggleMessage(message.id)}
                  className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                />
              </div>
            )}
            
            {/* Bulle de message */}
            <Card className={`p-4 transition-all duration-200 ${
              isUser 
                ? 'bg-blue-500 text-white border-blue-500' 
                : 'bg-white border-gray-200 shadow-sm'
            } ${isSelected ? 'ring-2 ring-primary ring-offset-2' : ''} ${
              isUser ? 'rounded-br-sm' : 'rounded-bl-sm'
            } rounded-2xl`}>
              <p
                dir={isRTL ? 'rtl' : 'ltr'}
                className={`text-sm whitespace-pre-wrap leading-relaxed ${
                  isUser ? 'text-white' : 'text-gray-800'
                } ${isRTL ? 'text-right' : ''}`}
              >
                {message.content}
              </p>

              <div className={`flex ${isUser ? 'justify-start' : 'justify-between'} items-center mt-3 gap-2`}>
                <Badge variant={isUser ? 'secondary' : 'outline'} className={`text-xs ${
                  isUser ? 'bg-blue-400/20 text-blue-100 border-blue-400/30' : 'bg-gray-100 text-gray-600'
                }`}>
                  {message.timestamp.toLocaleTimeString()}
                </Badge>
                
                {!isSelectionMode && !isUser && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => onCopyToEditor(message.content)}
                    className="h-6 px-2 hover:bg-gray-100"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                )}
              </div>
              
            </Card>
          </div>
        </div>
      </div>
    );
  };

  if (normalizedMessages.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3">
      {/* En-tête avec contrôles */}
      <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border border-border/60 bg-background/95 px-3 py-2 rounded-md shadow-sm backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4" />
          <span className="text-sm font-medium">
            {isSelectionMode ? `${selectedMessages.size} ${t.messagesSelected}` : `${normalizedMessages.length} messages`}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {!isSelectionMode ? (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleCopyAllConversation}
                className="h-7 px-2"
              >
                <Copy className="w-3 h-3 mr-1" />
                {t.copyAll}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleEnterSelectionMode}
                className="h-7 px-2"
              >
                <CheckSquare className="w-3 h-3 mr-1" />
                {t.selectMessages}
              </Button>
            </>
          ) : (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={selectedMessages.size === normalizedMessages.length ? handleDeselectAll : handleSelectAll}
                className="h-7 px-2"
              >
                {selectedMessages.size === normalizedMessages.length ? (
                  <Square className="w-3 h-3 mr-1" />
                ) : (
                  <CheckSquare className="w-3 h-3 mr-1" />
                )}
                {selectedMessages.size === normalizedMessages.length ? t.deselectAll : t.selectAll}
              </Button>
              
              <Button
                size="sm"
                variant="default"
                onClick={handleCopySelectedMessages}
                disabled={selectedMessages.size === 0}
                className="h-7 px-2"
              >
                <Copy className="w-3 h-3 mr-1" />
                {t.copySelected}
              </Button>
              
              <Button
                size="sm"
                variant="outline"
                onClick={handleExitSelectionMode}
                className="h-7 px-2"
              >
                {t.cancelSelection}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Messages avec sélection */}
      <div className="space-y-4 pt-2">
        {normalizedMessages.map(renderMessageWithSelection)}
      </div>

      {isSelectionMode && (
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-sm">
            <CheckSquare className="w-4 h-4" />
            <span>
              {selectedMessages.size} {t.messagesSelected}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="default"
              onClick={handleCopySelectedMessages}
              disabled={selectedMessages.size === 0}
              className="h-7 px-2"
            >
              <Copy className="w-3 h-3 mr-1" />
              {t.copySelected}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExitSelectionMode}
              className="h-7 px-2"
            >
              {t.cancelSelection}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
