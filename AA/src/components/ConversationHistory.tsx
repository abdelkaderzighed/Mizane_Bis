import React, { useState, useMemo } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { Checkbox } from './ui/checkbox';
import {
  ConversationSession,
  ConversationFilter,
  AIAgentType,
  LLMType,
  ChatMessageApp,
  LanguageCode
} from '../types';
import { filterSessions } from '../utils/conversationHistory';
import {
  Search,
  Calendar as CalendarIcon,
  MessageSquare,
  Clock,
  Filter,
  Trash2,
  Download,
  RefreshCw,
  Bot,
  Brain,
  ChevronDown,
  Eye,
  User
} from 'lucide-react';
import { toast } from 'sonner';

interface ConversationHistoryProps {
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

export default function ConversationHistory({
  sessions,
  onLoadSession,
  onDeleteSession,
  onClearAll,
  onExport,
  currentSessionId,
  language,
  agentConfigs,
  llmConfigs
}: ConversationHistoryProps) {
  const [filter, setFilter] = useState<ConversationFilter>({
    sortBy: 'newest'
  });
  const [searchText, setSearchText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [dateRange, setDateRange] = useState<{ start?: Date; end?: Date }>({});

  const translations = {
    fr: {
      title: 'Historique des conversations',
      search: 'Rechercher...',
      filters: 'Filtres',
      sortBy: 'Trier par',
      newest: 'Plus récent',
      oldest: 'Plus ancien',
      messageCount: 'Nombre de messages',
      agent: 'Agent',
      dateRange: 'Période',
      selectAgents: 'Sélectionner les agents',
      selectLLMs: 'Sélectionner les modèles',
      noSessions: 'Aucune conversation trouvée',
      noSessionsDesc: 'Commencez une nouvelle conversation dans le chat.',
      messages: 'messages',
      started: 'Démarrée',
      ended: 'Terminée',
      active: 'Active',
      loadSession: 'Charger',
      deleteSession: 'Supprimer',
      clearAll: 'Tout effacer',
      export: 'Exporter',
      confirmDelete: 'Êtes-vous sûr de vouloir supprimer cette conversation ?',
      confirmClearAll: 'Êtes-vous sûr de vouloir supprimer tout l\'historique ?',
      sessionDeleted: 'Conversation supprimée',
      allSessionsDeleted: 'Tout l\'historique a été supprimé',
      exportCompleted: 'Historique exporté',
      today: 'Aujourd\'hui',
      yesterday: 'Hier',
      thisWeek: 'Cette semaine',
      thisMonth: 'Ce mois'
    },
    en: {
      title: 'Conversation History',
      search: 'Search...',
      filters: 'Filters',
      sortBy: 'Sort by',
      newest: 'Newest',
      oldest: 'Oldest',
      messageCount: 'Message count',
      agent: 'Agent',
      dateRange: 'Date range',
      selectAgents: 'Select agents',
      selectLLMs: 'Select models',
      noSessions: 'No conversations found',
      noSessionsDesc: 'Start a new conversation in the chat.',
      messages: 'messages',
      started: 'Started',
      ended: 'Ended',
      active: 'Active',
      loadSession: 'Load',
      deleteSession: 'Delete',
      clearAll: 'Clear all',
      export: 'Export',
      confirmDelete: 'Are you sure you want to delete this conversation?',
      confirmClearAll: 'Are you sure you want to delete all history?',
      sessionDeleted: 'Conversation deleted',
      allSessionsDeleted: 'All history has been deleted',
      exportCompleted: 'History exported',
      today: 'Today',
      yesterday: 'Yesterday',
      thisWeek: 'This week',
      thisMonth: 'This month'
    },
    ar: {
      title: 'تاريخ المحادثات',
      search: 'البحث...',
      filters: 'المرشحات',
      sortBy: 'ترتيب حسب',
      newest: 'الأحدث',
      oldest: 'الأقدم',
      messageCount: 'عدد الرسائل',
      agent: 'الوكيل',
      dateRange: 'نطاق التاريخ',
      selectAgents: 'اختيار الوكلاء',
      selectLLMs: 'اختيار النماذج',
      noSessions: 'لم يتم العثور على محادثات',
      noSessionsDesc: 'ابدأ محادثة جديدة في الدردشة.',
      messages: 'رسائل',
      started: 'بدأت',
      ended: 'انتهت',
      active: 'نشطة',
      loadSession: 'تحميل',
      deleteSession: 'حذف',
      clearAll: 'مسح الكل',
      export: 'تصدير',
      confirmDelete: 'هل أنت متأكد من حذف هذه المحادثة؟',
      confirmClearAll: 'هل أنت متأكد من حذف كامل التاريخ؟',
      sessionDeleted: 'تم حذف المحادثة',
      allSessionsDeleted: 'تم حذف كامل التاريخ',
      exportCompleted: 'تم تصدير التاريخ',
      today: 'اليوم',
      yesterday: 'أمس',
      thisWeek: 'هذا الأسبوع',
      thisMonth: 'هذا الشهر'
    }
  };

  const t = translations[language];

  // Appliquer les filtres
  const filteredSessions = useMemo(() => {
    const currentFilter: ConversationFilter = {
      ...filter,
      searchText: searchText.trim() || undefined,
      dateRange: dateRange.start && dateRange.end ? {
        start: dateRange.start,
        end: dateRange.end
      } : undefined
    };

    return filterSessions(sessions, currentFilter);
  }, [sessions, filter, searchText, dateRange]);

  // Fonctions de gestion des actions
  const handleDeleteSession = (sessionId: string) => {
    if (window.confirm(t.confirmDelete)) {
      onDeleteSession(sessionId);
      toast.success(t.sessionDeleted);
    }
  };

  const handleClearAll = () => {
    if (window.confirm(t.confirmClearAll)) {
      onClearAll();
      toast.success(t.allSessionsDeleted);
    }
  };

  const handleExport = () => {
    onExport();
    toast.success(t.exportCompleted);
  };

  // Formatage des dates
  const formatRelativeDate = (date: Date): string => {
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffInDays === 0) return t.today;
    if (diffInDays === 1) return t.yesterday;
    if (diffInDays <= 7) return t.thisWeek;
    if (diffInDays <= 30) return t.thisMonth;
    
    return date.toLocaleDateString(language === 'ar' ? 'ar-DZ' : language === 'en' ? 'en-US' : 'fr-FR');
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString(language === 'ar' ? 'ar-DZ' : language === 'en' ? 'en-US' : 'fr-FR', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Rendu d'une session
  const renderSession = (session: ConversationSession) => {
    const AgentIcon = agentConfigs[session.primaryAgent]?.icon || Bot;
    const isCurrentSession = session.id === currentSessionId;

    return (
      <Card
        key={session.id}
        className={`p-4 cursor-pointer transition-all hover:shadow-md ${
          isCurrentSession ? 'ring-2 ring-primary ring-offset-2 bg-primary/5' : ''
        }`}
        onClick={() => onLoadSession(session.id)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Titre et statut */}
            <div className="flex items-center gap-2 mb-2">
              <AgentIcon className={`w-4 h-4 ${agentConfigs[session.primaryAgent]?.color || 'text-gray-500'}`} />
              <h3 className="font-medium text-sm truncate">{session.title}</h3>
              {session.isActive && (
                <Badge variant="secondary" className="text-xs">
                  {t.active}
                </Badge>
              )}
            </div>

            {/* Métadonnées */}
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <MessageSquare className="w-3 h-3" />
                <span>{session.messageCount} {t.messages}</span>
                <Clock className="w-3 h-3 ml-2" />
                <span>{formatRelativeDate(session.startTime)} à {formatTime(session.startTime)}</span>
              </div>

              {/* Modèles LLM utilisés */}
              {session.llmsUsed.length > 0 && (
                <div className="flex items-center gap-1 flex-wrap">
                  <Brain className="w-3 h-3 text-muted-foreground" />
                  {session.llmsUsed.slice(0, 3).map(llm => (
                    <Badge
                      key={llm}
                      variant="outline"
                      className={`text-xs ${llmConfigs[llm]?.color || 'text-gray-500'}`}
                    >
                      {llmConfigs[llm]?.name || llm}
                    </Badge>
                  ))}
                  {session.llmsUsed.length > 3 && (
                    <Badge variant="outline" className="text-xs">
                      +{session.llmsUsed.length - 3}
                    </Badge>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onLoadSession(session.id);
              }}
              className="h-7 px-2"
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteSession(session.id);
              }}
              className="h-7 px-2 text-destructive hover:text-destructive"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* En-tête avec titre et actions */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-medium">{t.title}</h2>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleExport}
              className="h-7 px-2"
            >
              <Download className="w-3 h-3 mr-1" />
              {t.export}
            </Button>
            
            {sessions.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={handleClearAll}
                className="h-7 px-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="w-3 h-3 mr-1" />
                {t.clearAll}
              </Button>
            )}
          </div>
        </div>

        {/* Barre de recherche */}
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder={t.search}
            className="pl-10"
          />
        </div>

        {/* Contrôles de tri et filtres */}
        <div className="flex items-center gap-2">
          <Select
            value={filter.sortBy}
            onValueChange={(value) => setFilter(prev => ({ ...prev, sortBy: value as any }))}
          >
            <SelectTrigger className="w-40 h-8">
              <SelectValue placeholder={t.sortBy} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">{t.newest}</SelectItem>
              <SelectItem value="oldest">{t.oldest}</SelectItem>
              <SelectItem value="messageCount">{t.messageCount}</SelectItem>
              <SelectItem value="agent">{t.agent}</SelectItem>
            </SelectContent>
          </Select>

          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 px-2"
          >
            <Filter className="w-3 h-3 mr-1" />
            {t.filters}
            <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </Button>
        </div>

        {/* Filtres avancés */}
        {showFilters && (
          <div className="mt-4 p-3 bg-muted/30 rounded-lg space-y-3">
            {/* Sélecteur de dates */}
            <div>
              <label className="text-sm font-medium mb-2 block">{t.dateRange}</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full justify-start h-8">
                    <CalendarIcon className="w-3 h-3 mr-2" />
                    {dateRange.start && dateRange.end
                      ? `${dateRange.start.toLocaleDateString()} - ${dateRange.end.toLocaleDateString()}`
                      : t.dateRange
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={{ from: dateRange.start, to: dateRange.end }}
                    onSelect={(range) => {
                      setDateRange({
                        start: range?.from,
                        end: range?.to
                      });
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}
      </div>

      {/* Liste des sessions */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3">
          {filteredSessions.length > 0 ? (
            filteredSessions.map(renderSession)
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <h3 className="font-medium mb-2">{t.noSessions}</h3>
              <p className="text-sm">{t.noSessionsDesc}</p>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Statistiques en bas */}
      {sessions.length > 0 && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              {filteredSessions.length} / {sessions.length} conversations
            </span>
            <span>
              {sessions.reduce((total, session) => total + session.messageCount, 0)} {t.messages} au total
            </span>
          </div>
        </div>
      )}
    </div>
  );
}