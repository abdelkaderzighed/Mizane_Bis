import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card } from './components/ui/card';
import { Separator } from './components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from './components/ui/popover';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import { MizaneHeader } from './components/MisanHeader';
import { UserAlerts } from './components/UserAlerts';
import { ClientWorkspacePanel } from './components/ClientWorkspacePanel';
import { CollapsibleFooter } from './components/CollapsibleFooter';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from './components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { EditorActions } from './components/EditorActions';

// Imports des utilitaires refactorisés
import { createAIAgents, createLLMModels } from './constants/aiConfig';
import { generateUserAlerts } from './utils/alertUtils';
import { getSubscriptionExpiryInfo } from './utils/subscriptionUtils';
import { checkUserAccess } from './utils/accessControl';
import {
  handleCopyToEditor,
  handleFileLoadedFromUrl as applyFileLoadedFromUrl,
  handleFileLoadedToChat,
  handleNewDocument as createNewDocumentState,
  handleOpenFile as openFileIntoEditor,
  handleInsertFile as insertFileIntoEditor,
  handleLanguageChange,
  handleFullPathChange,
  insertMarkdown
} from './utils/documentUtils';
import {
  handleSendMessage,
  handleAgentChange,
  handleClearChat
} from './utils/chatUtils';
import {
  createOrder,
  calculateOrderSummary,
  getFilenameFromPath,
} from './utils/orderUtils';
import { downloadInvoiceDocument } from './utils/invoiceUtils';
import { fetchUserInvoices, createTransactionAndInvoice } from './utils/invoiceService';
import { initializeMisanDatabase } from './utils/supabase/init-database';
import { resetMisanDatabase } from './utils/supabase/reset-database';
import type { MisanUser } from './utils/supabase/auth';
import { executePayment, type PaymentExecutionRequest, type PaymentExecutionResponse } from './utils/payments';
import { sendPaymentConfirmationEmail } from './utils/emailService';

import {
  ChatMessage,
  DocumentState,
  AIAgentType,
  LLMType,
  LLMModel,
  UserInfo,
  Invoice,
  CartItem,
  Order,
  PaymentMethod,
  Address,
  LanguageCode,
  PricingSettings,
  PaymentSettings,
  PublicAssistantFunctionConfig
} from './types';
import { languages } from './constants/config';
import { fetchPublicPricingSettings, fetchPublicPaymentSettings, fetchPublicLLMSettings } from './utils/settings';
import { useTranslations } from './locales/useTranslations';
import type { AssistantInvocationUsage } from './utils/assistantApi';
import {
  Languages,
  Download,
  Info,
  Sparkles,
  Eye,
  Edit,
  Trash2,
  Globe,
  File,
  Mic,
  Bot,
  MessageSquare,
  BookOpen,
  BrainCircuit,
  Zap,
  Settings,
  Cpu,
  Home,
  FolderOpen,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from './components/ui/utils';
import { toast } from 'sonner';
import { nanoid } from 'nanoid/non-secure';
import { useClientWorkspace } from './hooks/useClientWorkspace';
import { useWorkspaceGuards } from './hooks/useWorkspaceGuards';
import { ensureDocumentsDirectory, touchClient, ClientWorkspaceError } from './utils/clientWorkspace';
import { hasMarkdownFormatting, markdownToRtf } from './utils/markdownToRtf';
import { generateDocxBlob } from './utils/docxUtils';
import {
  ensureTemplatesDirectory,
  ensureTemplateFilename,
  buildTemplateFullPath,
  DEFAULT_WORKSPACE_NAME,
} from './utils/templateUtils';
import { ensureWorkspaceDirectories } from './utils/workspaceUtils';
import { isRtf, rtfToPlainText } from './utils/rtfUtils';

const LIBRARY_VIEWER_URL = import.meta.env.VITE_LIBRARY_URL ?? 'http://localhost:3000/?mode=library';
const LIBRARY_UNAVAILABLE_MESSAGE =
  import.meta.env.VITE_LIBRARY_UNAVAILABLE_MESSAGE ?? 'La bibliothèque est temporairement indisponible. Revenez dans quelques instants.';

interface LibraryViewerProps {
  src: string;
  title?: string;
}

function LibraryViewer({
  src,
  title = 'Bibliothèque juridique algérienne',
  unavailableMessage = LIBRARY_UNAVAILABLE_MESSAGE,
}: LibraryViewerProps & { unavailableMessage?: string }) {
  const [isUnavailable, setIsUnavailable] = React.useState(false);
  return (
    <section className="relative flex-1 h-full min-h-[520px] overflow-hidden rounded-none bg-transparent">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        onLoad={() => setIsUnavailable(false)}
        onError={() => setIsUnavailable(true)}
        className="absolute inset-0 h-full w-full border-0"
      />

      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-emerald-900/50 via-transparent to-transparent" />
      </div>

      {isUnavailable && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/90 p-6 text-center text-white">
          <p className="text-lg font-semibold">La bibliothèque est temporairement indisponible</p>
          <p className="text-sm text-white/70">{unavailableMessage}</p>
        </div>
      )}
    </section>
  );
}

const SPEECH_LANGUAGE_MAP: Record<LanguageCode, string> = {
  fr: 'fr-FR',
  en: 'en-US',
  ar: 'ar-SA',
};

const GENERIC_INVITATION_BY_LANGUAGE: Record<LanguageCode, (assistantName: string) => string> = {
  fr: (name) => `Bonjour ! Vous interagissez avec ${name}. Décrivez votre besoin pour commencer.`,
  en: (name) => `Hello! You are speaking with ${name}. Tell me what you need to get started.`,
  ar: (name) => `مرحباً! أنت تتحدث مع ${name}. صف احتياجك لنبدأ معاً.`,
};


const createEmptyAddress = (): Address => ({
  street: '',
  city: '',
  postalCode: '',
  country: ''
});

const createEmptyUserInfo = (): UserInfo => ({
  id: '',
  name: 'Utilisateur',
  email: '',
  avatar: '',
  subscriptionStart: '',
  subscriptionEnd: '',
  subscriptionType: 'free',
  subscriptionStatus: 'inactive',
  tokens: 0,
  trialUsed: false,
  role: 'user',
  secondaryEmail: null,
  phone: null,
  address: null,
  billingAddress: null
});

const normalizeRoleForUserInfo = (role?: MisanUser['role']): UserInfo['role'] => {
  if (!role) {
    return 'user';
  }

  const normalized = role.toLowerCase();

  if (['admin', 'administrator', 'super_admin', 'superadmin'].includes(normalized)) {
    return 'admin';
  }

  if (['pro', 'collaborateur', 'staff', 'manager'].includes(normalized)) {
    return 'collaborateur';
  }

  return 'user';
};

const normalizeSubscriptionType = (type: MisanUser['subscription_type']): UserInfo['subscriptionType'] => {
  switch (type) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'pro';
    case 'premium':
    default:
      return 'premium';
  }
};

const mapMisanUserToUserInfo = (user: MisanUser): UserInfo => {
  const address: Address | null = user.address || user.city || user.postal_code || user.country
    ? {
        street: user.address ?? '',
        city: user.city ?? '',
        postalCode: user.postal_code ?? '',
        country: user.country ?? ''
      }
    : null;

  const billingAddress: Address | null = user.billing_address || user.billing_city || user.billing_postal_code || user.billing_country
    ? {
        street: user.billing_address ?? '',
        city: user.billing_city ?? '',
        postalCode: user.billing_postal_code ?? '',
        country: user.billing_country ?? ''
      }
    : null;

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    avatar: user.avatar_url ?? user.avatar ?? '',
    subscriptionStart: user.subscription_start,
    subscriptionEnd: user.subscription_end,
    subscriptionType: normalizeSubscriptionType(user.subscription_type),
    subscriptionStatus: user.subscription_status,
    tokens: user.tokens_balance,
    trialUsed: Boolean(user.trial_used),
    role: normalizeRoleForUserInfo(user.role),
    secondaryEmail: user.secondary_email ?? null,
    phone: user.phone ?? null,
    address,
    billingAddress
  };
};

const PricingPage = React.lazy(() => import('./components/PricingPage'));

const AdminPage = React.lazy(() =>
  import('./components/AdminPage').then(module => ({ default: module.AdminPage }))
);

const HomePage = React.lazy(() =>
  import('./components/HomePage').then(module => ({ default: module.HomePage }))
);

const SimpleAuthPage = React.lazy(() =>
  import('./components/SimpleAuthPage').then(module => ({ default: module.SimpleAuthPage }))
);

const ModalsContainer = React.lazy(() =>
  import('./components/ModalsContainer').then(module => ({ default: module.ModalsContainer }))
);

const ChatInputControls = React.lazy(() => import('./components/ChatInputControls'));

const ChatCopyControls = React.lazy(() => import('./components/ChatCopyControls'));

const MarkdownToolbar = React.lazy(() => import('./components/MarkdownToolbar'));

const MarkdownPreview = React.lazy(() => import('./components/MarkdownPreview'));

const SaveFormatDialog = React.lazy(() => import('./components/SaveFormatDialog'));

const LoadFromUrlDialog = React.lazy(() => import('./components/LoadFromUrlDialog'));


const SuspenseFallback = ({ label }: { label: string }) => (
  <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
    {label}
  </div>
);

const InlineSuspenseFallback = ({ label }: { label: string }) => (
  <div className="flex items-center justify-center py-4 text-sm text-muted-foreground">
    {label}
  </div>
);

const ChatProcessingIndicator = () => (
  <div className="flex items-center gap-3 rounded-md border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary-700 dark:border-primary/20 dark:bg-primary/5">
    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
    <span className="sr-only">Réponse en cours…</span>
  </div>
);

export default function App() {
  // États d'authentification
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authAccess, setAuthAccess] = useState<any>(null);
  const [authAlerts, setAuthAlerts] = useState<any[]>([]);
  const [accessRestriction, setAccessRestriction] = useState<{ reason: string; type: 'subscription' | 'tokens' } | null>(null);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);

  // États du chat et de l'IA
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState<AIAgentType>('conversation');
  const [assistantMenuOpen, setAssistantMenuOpen] = useState(false);
  const [llmModels, setLlmModels] = useState<Record<LLMType, LLMModel>>({});
  const [assistantFunctions, setAssistantFunctions] = useState<Record<string, PublicAssistantFunctionConfig>>({});
  const [lastTokenUsage, setLastTokenUsage] = useState<AssistantInvocationUsage | null>(null);
  const [totalTokenUsage, setTotalTokenUsage] = useState<number>(0);
  const [speechOutputEnabled, setSpeechOutputEnabled] = useState(false);
  const [speechOutputSupported, setSpeechOutputSupported] = useState(false);
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
  const [invitationVersion, setInvitationVersion] = useState(0);

  // États du document
  const [document, setDocument] = useState<DocumentState>({
    content: '',
    filename: '',
    fullPath: '',
    language: 'fr',
    isModified: false
  });
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  const [editorMode, setEditorMode] = useState<'document' | 'template'>('document');

  // États de navigation
  const [currentPage, setCurrentPage] = useState<'home' | 'main' | 'pricing' | 'admin' | 'auth' | 'library'>('home');
  const [authDialogOpen, setAuthDialogOpen] = useState(false);

  // États des modales
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [saveAsFilename, setSaveAsFilename] = useState('');
  const [loadFromUrlDialogOpen, setLoadFromUrlDialogOpen] = useState(false);
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);

  // États du commerce
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [orderCompleteOpen, setOrderCompleteOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card_cib');
  const [footerCollapsed, setFooterCollapsed] = useState(true);

  const { state: workspaceState, actions: workspaceActions } = useClientWorkspace();
  const { chooseWorkspace: chooseWorkspaceRoot } = workspaceActions;

  const [workspacePanelOpen, setWorkspacePanelOpen] = useState(false);
  const canSaveConversation = Boolean(workspaceState.selectedClient && chatMessages.length > 0);

  useEffect(() => {
    if (!workspaceState.selectedClient) {
      return;
    }

    const mapped = workspaceState.conversation
      .map((entry) => {
        if (entry.role !== 'user' && entry.role !== 'assistant') {
          return null;
        }

        const timestamp = entry.timestamp ? new Date(entry.timestamp) : new Date();
        const metadata = entry.metadata && typeof entry.metadata === 'object'
          ? { ...entry.metadata }
          : undefined;

        return {
          id: entry.id || nanoid(10),
          role: entry.role,
          content: entry.content,
          timestamp,
          llmUsed: Array.isArray(entry.metadata?.llmUsed)
            ? (entry.metadata!.llmUsed as string[])
            : undefined,
          metadata,
        } as ChatMessage;
      })
      .filter(Boolean) as ChatMessage[];

    setChatMessages(mapped);
    setCurrentThreadId(null);
    setTotalTokenUsage(0);

    if (mapped.length === 0) {
      setInvitationVersion((value) => value + 1);
    }
  }, [workspaceState.selectedClient, workspaceState.conversation]);

  const handleSaveConversationToWorkspace = useCallback(async () => {
    if (!workspaceState.selectedClient) {
      toast.error('Sélectionnez un dossier client avant de sauvegarder.');
      return;
    }

    const entries = chatMessages.map((message) => ({
      id: message.id ?? nanoid(10),
      role: message.role,
      content: message.content,
      timestamp: message.timestamp?.toISOString?.() ?? new Date().toISOString(),
      metadata: (() => {
        const base: Record<string, unknown> = {};
        if (message.metadata && typeof message.metadata === 'object') {
          Object.assign(base, message.metadata);
        }
        if (message.llmUsed) {
          base.llmUsed = message.llmUsed;
        }
        return Object.keys(base).length > 0 ? base : undefined;
      })(),
    }));

    await workspaceActions.saveConversation(entries);
  }, [workspaceActions, workspaceState.selectedClient, chatMessages]);

  // Références
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertFileInputRef = useRef<HTMLInputElement>(null);
  const templateFileInputRef = useRef<HTMLInputElement>(null);
  const templateInsertInputRef = useRef<HTMLInputElement>(null);
  const llmSettingsLoadedRef = useRef(false);
  const usingFallbackLLMsRef = useRef(false);
  const stopRequestedRef = useRef(false);
  const workspaceStructureCheckedRef = useRef(false);
  const saveStatusResetTimeoutRef = useRef<number | null>(null);
  const lastInvitationKeyRef = useRef<string | null>(null);
  const lastSpokenMessageIdRef = useRef<string | null>(null);

  // Données utilisateur
  const [userInfo, setUserInfo] = useState<UserInfo>(createEmptyUserInfo());
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [personalAddress, setPersonalAddress] = useState<Address>(createEmptyAddress());
  const [billingAddress, setBillingAddress] = useState<Address>(createEmptyAddress());
  const [siteLanguage, setSiteLanguage] = useState<LanguageCode>('fr');
  const [chatLanguage, setChatLanguage] = useState<LanguageCode>('fr');
  const [isChatProcessing, setIsChatProcessing] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');

  useEffect(() => () => {
    if (saveStatusResetTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusResetTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const isSupported =
      'speechSynthesis' in window && typeof window.SpeechSynthesisUtterance === 'function';

    setSpeechOutputSupported(isSupported);

    return () => {
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const currentTranslations = useTranslations(siteLanguage);
  const chatLanguageTranslations = useTranslations(chatLanguage);

  if (!currentTranslations) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-muted-foreground">
        Chargement des traductions...
      </div>
    );
  }

  // Configuration dérivée
  const t = currentTranslations;
  const clientSelectionWarning = t.clientFolderRequired ?? 'Sélectionnez un dossier client avant de sauvegarder le document.';
  const workspaceSelectionWarning = t.workspaceRootRequired ?? 'Sélectionnez l\'espace de travail /Mizane avant de continuer.';
  const isTemplateMode = editorMode === 'template';
  const activeAssistantConfig = useMemo(() => assistantFunctions[currentAgent] ?? null, [assistantFunctions, currentAgent]);
  const lastRequestTokensText = useMemo(() => {
    const total = lastTokenUsage?.totalTokens ?? lastTokenUsage?.total ?? null;
    return `Tokens consommés par la dernière requête : ${total !== null ? total : '—'}`;
  }, [lastTokenUsage]);
  const totalCostDinars = useMemo(() => {
    const pricePerMillion = pricingSettings?.tokens?.pricePerMillion;
    if (!pricePerMillion) {
      return null;
    }

    if (totalTokenUsage <= 0) {
      return 0;
    }

    const cost = (totalTokenUsage * pricePerMillion) / 1_000_000;
    return Math.round(cost);
  }, [pricingSettings, totalTokenUsage]);

  const cumulativeTokensText = useMemo(() => {
    const base = `Consommation totale : ${totalTokenUsage}`;
    if (totalCostDinars === null) {
      return base;
    }
    return `${base} (~ ${totalCostDinars} DA)`;
  }, [totalCostDinars, totalTokenUsage]);

  const speakText = useCallback((rawText: string) => {
    if (!speechOutputSupported || typeof window === 'undefined') {
      return;
    }

    const text = rawText?.trim();
    if (!text) {
      return;
    }

    try {
      const synthesis = window.speechSynthesis;
      if (!synthesis || typeof window.SpeechSynthesisUtterance !== 'function') {
        return;
      }
      synthesis.cancel();
      const utterance = new window.SpeechSynthesisUtterance(text);
      utterance.lang = SPEECH_LANGUAGE_MAP[document.language] ?? SPEECH_LANGUAGE_MAP.fr;
      synthesis.speak(utterance);
    } catch (error) {
      console.error('Speech synthesis error', error);
    }
  }, [document.language, speechOutputSupported]);

  const handleToggleSpeechOutput = useCallback(() => {
    if (!speechOutputSupported) {
      toast.error('La lecture audio n’est pas supportée dans ce navigateur.');
      return;
    }

    setSpeechOutputEnabled((prev) => {
      const next = !prev;
      if (!next && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      } else if (next) {
        const lastAssistant = [...chatMessages].reverse().find((message) => message.role === 'assistant');
        lastSpokenMessageIdRef.current = lastAssistant?.id ?? null;
      }
      return next;
    });
  }, [chatMessages, speechOutputSupported]);

  useEffect(() => {
    if (!speechOutputEnabled || !speechOutputSupported) {
      return;
    }

    const lastAssistant = [...chatMessages].reverse().find((message) => message.role === 'assistant');
    if (!lastAssistant || !lastAssistant.content) {
      return;
    }

    if (lastSpokenMessageIdRef.current === lastAssistant.id) {
      return;
    }

    lastSpokenMessageIdRef.current = lastAssistant.id;

    const plainText = lastAssistant.content
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
      .replace(/[\*#_>~`]/g, '')
      .replace(/\s+/g, ' ')
      .trim();

    speakText(plainText || lastAssistant.content);
  }, [chatMessages, speakText, speechOutputEnabled, speechOutputSupported]);
  const editorBackgroundClass = isTemplateMode ? 'bg-purple-50' : 'bg-blue-50';
  const editorAccentTextClass = isTemplateMode ? 'text-purple-700' : 'text-blue-700';
  const editorAccentIconClass = isTemplateMode ? 'text-purple-600' : 'text-blue-600';
  const baseAgents = React.useMemo(() => {
    const source = chatLanguageTranslations ?? t;
    return createAIAgents(source);
  }, [chatLanguageTranslations, t]);

  const assistantEntries = React.useMemo(
    () =>
      Object.entries(assistantFunctions)
        .filter(([, config]) => config && config.isEnabled !== false)
        .sort((a, b) => {
          const nameA = (a[1].name || a[0]).toLocaleLowerCase('fr');
          const nameB = (b[1].name || b[0]).toLocaleLowerCase('fr');
          return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
        }),
    [assistantFunctions]
  );

  const aiAgents = React.useMemo(() => {
    const shouldPreferConfigLabels = chatLanguage === siteLanguage;
    return assistantEntries.reduce((acc, [id, config]) => {
      const base = baseAgents[id as keyof typeof baseAgents];
      const icon = base?.icon ?? MessageSquare;
      const color = base?.color ?? 'text-blue-600';

      const metadata = (config?.metadata && typeof config.metadata === 'object') ? config.metadata as Record<string, any> : undefined;
      const nameTranslations = metadata && typeof metadata.nameTranslations === 'object' ? metadata.nameTranslations as Record<string, string> : undefined;
      const descriptionTranslations = metadata && typeof metadata.descriptionTranslations === 'object' ? metadata.descriptionTranslations as Record<string, string> : undefined;
      const localeAgent = chatLanguageTranslations?.agents?.[id];

      const resolvedName = (
        nameTranslations?.[chatLanguage]?.trim()
        || (!shouldPreferConfigLabels ? localeAgent?.name?.trim() : undefined)
        || (shouldPreferConfigLabels ? config.name?.trim() : undefined)
        || localeAgent?.name?.trim()
        || config.name?.trim()
        || base?.name
        || id
      );

      const resolvedDescription = (
        descriptionTranslations?.[chatLanguage]?.trim()
        || (!shouldPreferConfigLabels ? localeAgent?.description?.trim() : undefined)
        || (shouldPreferConfigLabels ? config.description?.trim() : undefined)
        || localeAgent?.description?.trim()
        || config.description?.trim()
        || base?.description
        || ''
      );

      acc[id] = {
        id,
        name: resolvedName,
        description: resolvedDescription,
        icon,
        color,
      };

      return acc;
    }, {} as Record<AIAgentType, ReturnType<typeof createAIAgents>[keyof ReturnType<typeof createAIAgents>]>);
  }, [assistantEntries, baseAgents, chatLanguage, chatLanguageTranslations, siteLanguage]);

  const translateInvitation = useCallback(async (
    agentId: AIAgentType,
    baseText: string,
    targetLanguage: LanguageCode,
  ) => {
    const trimmedBase = baseText.trim();
    if (!trimmedBase) {
      return;
    }

    const key = `${agentId}::${targetLanguage}::${trimmedBase}`;
    if (invitationTranslationCacheRef.current.has(key) || invitationTranslationInFlightRef.current.has(key)) {
      return;
    }

    const assistantIds = Object.keys(assistantFunctions ?? {});
    const translationAssistantId = assistantFunctions['conversation'] ? 'conversation'
      : assistantIds.length > 0
        ? assistantIds[0]
        : null;

    if (!translationAssistantId) {
      return;
    }

    invitationTranslationInFlightRef.current.add(key);

    const targetLanguageLabel = LANGUAGE_LABELS[targetLanguage] ?? targetLanguage;
    const systemPrompt =
      targetLanguage === 'fr'
        ? `Traduis le texte suivant en ${targetLanguageLabel}. Réponds uniquement avec la traduction, sans commentaire.`
        : targetLanguage === 'ar'
          ? `ترجم النص التالي إلى اللغة العربية. أعد النص مترجماً فقط بدون أي تعليق إضافي.`
          : `Translate the following text into ${targetLanguageLabel}. Reply with the translated text only.`;

    const message = `${systemPrompt}\n\n${trimmedBase}`;

    try {
      const result = await invokeAssistant({
        assistantId: translationAssistantId,
        message,
        language: targetLanguage,
      });

      const translated = typeof result.message === 'string' ? result.message.trim() : '';
      if (translated) {
        invitationTranslationCacheRef.current.set(key, translated);
        setInvitationVersion((value) => value + 1);
      }
    } catch (error) {
      console.warn('Translation request failed for invitation', error);
    } finally {
      invitationTranslationInFlightRef.current.delete(key);
    }
  }, [assistantFunctions]);

  const computeInvitationForAgent = useCallback((agentId: AIAgentType | null) => {
    if (!agentId) {
      return '';
    }

    const config = assistantFunctions[agentId];
    const metadata = (config?.metadata && typeof config.metadata === 'object') ? config.metadata as Record<string, any> : undefined;

    const localizedMetadataInvitation = metadata && typeof metadata.invitationTranslations === 'object'
      ? metadata.invitationTranslations?.[chatLanguage]
      : undefined;
    if (typeof localizedMetadataInvitation === 'string') {
      const trimmed = localizedMetadataInvitation.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    if (typeof config?.invitationMessage === 'string') {
      const trimmed = config.invitationMessage.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }

    const localizedInvitations = chatLanguageTranslations?.chatInvitations as Record<string, string> | undefined;
    if (localizedInvitations && typeof localizedInvitations[agentId] === 'string') {
      const trimmedLocalized = localizedInvitations[agentId].trim();
      if (trimmedLocalized.length > 0) {
        return trimmedLocalized;
      }
    }

    if (typeof config?.description === 'string') {
      const trimmedDescription = config.description.trim();
      if (trimmedDescription.length > 0) {
        return trimmedDescription;
      }
    }

    const fallback = baseAgents[agentId as keyof typeof baseAgents];
    if (fallback?.description) {
      const trimmedFallback = fallback.description.trim();
      if (trimmedFallback.length > 0) {
        return trimmedFallback;
      }
    }

    const fallbackName = (config?.name ?? fallback?.name ?? 'assistant IA').trim();
    const genericBuilder = GENERIC_INVITATION_BY_LANGUAGE[chatLanguage] ?? GENERIC_INVITATION_BY_LANGUAGE.fr;
    return genericBuilder(fallbackName);
  }, [assistantFunctions, baseAgents, chatLanguage, chatLanguageTranslations]);

  const availableAgentIds = React.useMemo(
    () => assistantEntries.map(([id]) => id as AIAgentType),
    [assistantEntries]
  );

  React.useEffect(() => {
    if (availableAgentIds.length === 0) {
      return;
    }
    if (!aiAgents[currentAgent]) {
      setCurrentAgent(availableAgentIds[0]);
    }
  }, [aiAgents, availableAgentIds, currentAgent]);

  const activeAgent = aiAgents[currentAgent];
  const AgentIcon = activeAgent?.icon ?? MessageSquare;
  const activeAgentColor = activeAgent?.color ?? 'text-muted-foreground';
  const activeAgentName = activeAgent?.name ?? 'Assistant indisponible';
  useEffect(() => {
    const invitation = computeInvitationForAgent(currentAgent);
    const key = invitation ? `${currentAgent}::${invitation}` : null;

    if (key && key !== lastInvitationKeyRef.current) {
      lastInvitationKeyRef.current = key;
      setInvitationVersion((value) => value + 1);
    } else if (!key && lastInvitationKeyRef.current !== null) {
      lastInvitationKeyRef.current = null;
    }
  }, [computeInvitationForAgent, currentAgent, setInvitationVersion]);
  const subscriptionInfo = getSubscriptionExpiryInfo(userInfo);
  const vatRate = pricingSettings?.vat.enabled ? pricingSettings.vat.rate / 100 : 0;
  const vatPercent = pricingSettings?.vat.enabled ? pricingSettings.vat.rate : 0;

  const getSubscriptionDiscount = useCallback((months: number) =>
    (pricingSettings?.discounts ?? [])
      .filter(rule => rule.threshold <= 12 && months >= rule.threshold)
      .reduce((acc, rule) => Math.max(acc, rule.percentage), 0),
  [pricingSettings]);

  const getTokenDiscount = useCallback((millions: number) => {
    const tokens = millions * 1_000_000;
    return (pricingSettings?.discounts ?? [])
      .filter(rule => rule.threshold > 12 && tokens >= rule.threshold)
      .reduce((acc, rule) => Math.max(acc, rule.percentage), 0);
  }, [pricingSettings]);

  useEffect(() => {
    workspaceStructureCheckedRef.current = false;
  }, [workspaceState.root]);

  const resetSaveStatus = useCallback(() => {
    if (saveStatusResetTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusResetTimeoutRef.current);
      saveStatusResetTimeoutRef.current = null;
    }
    setSaveStatus('idle');
  }, []);

  const beginSaveOperation = useCallback(() => {
    if (saveStatusResetTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusResetTimeoutRef.current);
      saveStatusResetTimeoutRef.current = null;
    }
    setSaveStatus('saving');
  }, []);

  const concludeSaveOperation = useCallback((status: 'success' | 'error') => {
    setSaveStatus(status);
    if (saveStatusResetTimeoutRef.current !== null) {
      window.clearTimeout(saveStatusResetTimeoutRef.current);
    }
    const delay = status === 'success' ? 1400 : 2200;
    saveStatusResetTimeoutRef.current = window.setTimeout(() => {
      setSaveStatus('idle');
      saveStatusResetTimeoutRef.current = null;
    }, delay);
  }, []);
  const {
    showWorkspaceSelectionReminder,
    showClientSelectionReminder,
    ensureWorkspaceSelection,
    ensureClientSelectionForDocuments,
    triggerWorkspaceSelectionReminder,
    triggerClientSelectionReminder,
    clearWorkspaceSelectionReminder,
    clearClientSelectionReminder,
  } = useWorkspaceGuards({
    workspaceState,
    isTemplateMode,
    workspaceSelectionWarning,
    clientSelectionWarning,
  });

  const handleSelectWorkspace = useCallback(async () => {
    const handle = await chooseWorkspaceRoot();
    if (handle) {
      clearWorkspaceSelectionReminder();
    }
    return handle;
  }, [chooseWorkspaceRoot, clearWorkspaceSelectionReminder]);

  const ensureTemplateWorkspace = useCallback(async (): Promise<FileSystemDirectoryHandle | null> => {
    let rootHandle = workspaceState.root;

    if (!rootHandle) {
      triggerWorkspaceSelectionReminder();
      toast.warning(t.workspaceRootRequired ?? 'Sélectionnez un espace de travail pour accéder aux templates.');
      rootHandle = await chooseWorkspaceRoot();
      if (!rootHandle) {
        toast.info('Sélection du workspace annulée.');
        return null;
      }
    }

    clearWorkspaceSelectionReminder();

    if (!workspaceStructureCheckedRef.current) {
      try {
        const { created, missing } = await ensureWorkspaceDirectories(rootHandle);
        workspaceStructureCheckedRef.current = true;
        if (created.length > 0) {
          toast.success(`Dossier${created.length > 1 ? 's' : ''} ${created.join(', ')} créé${created.length > 1 ? 's' : ''}.`);
        }
        if (missing.length > 0) {
          toast.warning(`Dossier${missing.length > 1 ? 's' : ''} manquant${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`);
        }
      } catch (error) {
        console.error('[ensureTemplateWorkspace] Vérification structure échouée', error);
        toast.error('Impossible de vérifier les dossiers /Mizane.');
      }
    }

    return rootHandle;
  }, [
    workspaceState.root,
    chooseWorkspaceRoot,
    t,
    triggerWorkspaceSelectionReminder,
    clearWorkspaceSelectionReminder,
  ]);

  const loadTemplateFile = useCallback(async (file: File, explicitRoot?: FileSystemDirectoryHandle | null) => {
    const rawContent = await file.text();
    const filenameWithPrefix = ensureTemplateFilename(file.name);
    const resolvedRootName = explicitRoot?.name ?? workspaceState.root?.name ?? DEFAULT_WORKSPACE_NAME;
    const fullPath = buildTemplateFullPath(resolvedRootName, filenameWithPrefix);
    const content = isRtf(rawContent) ? rtfToPlainText(rawContent) : rawContent;

    setDocument(prev => ({
      ...prev,
      content,
      filename: filenameWithPrefix,
      fullPath,
      originalFilename: filenameWithPrefix,
      originalFullPath: fullPath,
      isModified: false,
    }));
    setViewMode('edit');

    if (!file.name.toLowerCase().startsWith('temp_')) {
      toast.info(t.templatePrefixApplied ?? 'Préfixe temp_ appliqué automatiquement');
    }

    toast.success(t.templateLoaded ?? 'Template chargé');
  }, [workspaceState.root?.name, setDocument, setViewMode, t]);

  useEffect(() => {
    let cancelled = false;

    const applyFallbackModels = () => {
      const fallbackModels = createLLMModels(t);
      usingFallbackLLMsRef.current = true;
      llmSettingsLoadedRef.current = true;
      setLlmModels(fallbackModels);
      setAssistantFunctions({});
    };

    const loadPublicLLMSettings = async () => {
      if (llmSettingsLoadedRef.current && !usingFallbackLLMsRef.current) {
        return;
      }

      if (llmSettingsLoadedRef.current && usingFallbackLLMsRef.current) {
        applyFallbackModels();
        return;
      }

      try {
        const settings = await fetchPublicLLMSettings();
        if (cancelled) {
          return;
        }

        if (settings && Object.keys(settings.models).length > 0) {
          llmSettingsLoadedRef.current = true;
          usingFallbackLLMsRef.current = false;

          setLlmModels(settings.models);
          setAssistantFunctions(settings.assistantFunctions ?? {});

          return;
        }

        console.warn('Paramètres LLM publics vides, fallback utilisé.');
      } catch (error) {
        console.error('Impossible de charger les paramètres LLM publics', error);
      }

      if (!cancelled) {
        applyFallbackModels();
      }
    };

    loadPublicLLMSettings();

    return () => {
      cancelled = true;
    };
  }, [t]);

  const buildCartItem = useCallback((type: 'subscription' | 'tokens', quantity: number): CartItem => {
    if (!pricingSettings) {
      throw new Error('Les paramètres tarifaires ne sont pas disponibles');
    }

    if (type === 'subscription') {
      const discount = getSubscriptionDiscount(quantity) / 100;
      const unitPriceHT = pricingSettings.subscription.monthlyPrice;
      const totalHT = unitPriceHT * quantity * (1 - discount);
      const tokensIncluded = quantity * (pricingSettings.subscription.monthlyTokens || 0);

      return {
        id: `${type}-${Date.now()}`,
        type,
        name: `Abonnement ${quantity} mois`,
        description: `${quantity} mois d'abonnement avec ${(tokensIncluded / 1_000_000).toLocaleString()} millions de jetons inclus`,
        quantity,
        unitPriceHT,
        totalHT,
        discount,
        tokensIncluded,
        planType: 'pro',
      };
    }

    const discount = getTokenDiscount(quantity) / 100;
    const unitPriceHT = pricingSettings.tokens.pricePerMillion;
    const totalHT = unitPriceHT * quantity * (1 - discount);
    const tokensIncluded = quantity * 1_000_000;

    return {
      id: `${type}-${Date.now()}`,
      type,
      name: `${quantity} million${quantity > 1 ? 's' : ''} de jetons`,
      description: `Pack de ${quantity} million${quantity > 1 ? 's' : ''} de jetons pour utilisation IA`,
      quantity,
      unitPriceHT,
      totalHT,
      discount,
      tokensIncluded,
    };
  }, [pricingSettings, getSubscriptionDiscount, getTokenDiscount]);

  React.useEffect(() => {
    setPersonalAddress(userInfo.address ?? createEmptyAddress());
  }, [userInfo.address?.street, userInfo.address?.city, userInfo.address?.postalCode, userInfo.address?.country]);

  React.useEffect(() => {
    setBillingAddress(userInfo.billingAddress ?? createEmptyAddress());
  }, [userInfo.billingAddress?.street, userInfo.billingAddress?.city, userInfo.billingAddress?.postalCode, userInfo.billingAddress?.country]);

  // Fonctions de gestion du panier
  const addToCart = useCallback((type: 'subscription' | 'tokens', quantity: number) => {
    if (!pricingSettings) {
      toast.error('Les tarifs ne sont pas encore disponibles. Veuillez réessayer dans quelques instants.');
      return;
    }

    if (type === 'tokens' && userInfo.subscriptionType === 'premium' && userInfo.subscriptionStatus === 'expired') {
      toast.error('Votre essai gratuit a expiré. Souscrivez à un abonnement Pro pour pouvoir acheter de nouveaux jetons.');
      return;
    }

    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.type === type);

      if (existingIndex >= 0) {
        const existing = prev[existingIndex];
        const nextQuantity = type === 'subscription'
          ? quantity
          : existing.quantity + quantity;

        if (nextQuantity <= 0) {
          return prev.filter(item => item.id !== existing.id);
        }

        const updatedItem = { ...buildCartItem(type, nextQuantity), id: existing.id };
        const updated = [...prev];
        updated[existingIndex] = updatedItem;
        toast.success(type === 'subscription'
          ? `Abonnement ${nextQuantity} mois mis à jour dans le panier`
          : `${quantity.toLocaleString()} million(s) de jetons ajouté(s) au panier`);
        return updated;
      }

      const newItem = buildCartItem(type, quantity);
      toast.success(type === 'subscription'
        ? `Abonnement ${quantity} mois ajouté au panier`
        : `${quantity.toLocaleString()} million(s) de jetons ajouté(s) au panier`);
      return [...prev, newItem];
    });
  }, [pricingSettings, userInfo.subscriptionStatus, userInfo.subscriptionType, buildCartItem, setCart]);

  const updateCartItemQuantity = useCallback((id: string, quantity: number) => {
    if (!pricingSettings) {
      toast.error('Les tarifs ne sont pas encore disponibles.');
      return;
    }

    setCart(prev => {
      if (quantity <= 0) {
        return prev.filter(item => item.id !== id);
      }

      return prev.map(item => {
        if (item.id !== id) {
          return item;
        }
        return { ...buildCartItem(item.type, quantity), id: item.id };
      });
    });
  }, [pricingSettings, buildCartItem, setCart]);

  const removeFromCart = useCallback((id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.success('Article retiré du panier');
  }, [setCart]);

  const processOrder = useCallback(async (
    paymentRequest: PaymentExecutionRequest
  ): Promise<PaymentExecutionResponse> => {
    if (!userInfo?.id) {
      toast.error('Utilisateur non authentifié');
      return {
        ok: false,
        errors: [{ field: 'general', message: 'Veuillez vous reconnecter pour finaliser la commande.' }]
      };
    }

    if (cart.length === 0) {
      toast.info('Votre panier est vide');
      return {
        ok: false,
        errors: [{ field: 'general', message: 'Aucun article dans le panier.' }]
      };
    }

    if (!pricingSettings) {
      toast.error('Les tarifs ne sont pas disponibles. Impossible de traiter la commande pour le moment.');
      return {
        ok: false,
        errors: [{ field: 'general', message: 'Tarification indisponible.' }]
      };
    }

    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      const validation = await misanAuth.validateCart(
        cart.map(item => ({
          type: item.type,
          planType: item.planType ?? (item.type === 'subscription' ? 'pro' : undefined),
          quantity: item.quantity
        }))
      );

      if (!validation.success) {
        const message = validation.error || 'Impossible de valider votre commande pour le moment.';
        toast.error(message);
        return {
          ok: false,
          errors: [{ field: 'general', message }]
        };
      }

      const paymentResponse = await executePayment(paymentRequest);

      if (!paymentResponse.ok || !paymentResponse.result) {
        if (!paymentResponse.errors || paymentResponse.errors.length === 0) {
          toast.error('Le paiement a été refusé. Merci de vérifier les informations fournies.');
        }
        return paymentResponse;
      }

      const { result } = paymentResponse;

      if (result.status === 'failed') {
        const failureMessage = result.failureReason || 'Le paiement a été refusé.';
        toast.error(failureMessage);
        return {
          ok: false,
          result,
          errors: [{ field: 'general', message: failureMessage }]
        };
      }
      const paymentStatus = result.status === 'success' ? 'paid' : 'pending';
      const methodConfig = paymentSettings?.methods?.[selectedPaymentMethod];
      const paymentInstructions = methodConfig?.instructions ?? null;
      const transactionId = result.transactionId ?? null;
      const bankReference = typeof result.metadata?.reference === 'string'
        ? String(result.metadata.reference)
        : null;
      const storedReference = bankReference || transactionId;

      const subscriptionStatus = userInfo.subscriptionStatus;

      const invoice = await createTransactionAndInvoice({
        userId: userInfo.id,
        userEmail: userInfo.email,
        userName: userInfo.name,
        userRole: userInfo.role,
        subscriptionType: userInfo.subscriptionType,
        subscriptionStatus,
        subscriptionEnd: userInfo.subscriptionEnd,
        subscriptionStart: userInfo.subscriptionStart,
        tokens: userInfo.tokens,
        cart,
        billingAddress,
        paymentMethod: selectedPaymentMethod,
        vatRate: vatPercent,
        notes: paymentInstructions,
        initialStatus: paymentStatus,
        transactionId
      });

      const order = createOrder(cart, selectedPaymentMethod, userInfo, billingAddress, vatRate, {
        status: paymentStatus,
        transactionId: transactionId ?? undefined,
        paymentReference: storedReference ?? undefined,
        paymentMessage: result.message,
        paymentDate: invoice?.paymentDate ?? (paymentStatus === 'paid' ? new Date().toISOString() : null),
        invoiceId: invoice?.id ?? null
      });

      setCurrentOrder(order);
      setCart([]);
      setCheckoutOpen(false);
      setPaymentOpen(false);
      setCartOpen(false);
      setStoreOpen(false);
      setOrderCompleteOpen(true);

      const toastMessage = result.message
        || (paymentStatus === 'paid'
          ? 'Paiement confirmé, merci pour votre commande !'
          : 'Paiement en attente. Nous vous informerons dès sa confirmation.');

      if (paymentStatus === 'paid') {
        toast.success(toastMessage);
      } else {
        toast.info(toastMessage);
      }

      if (invoice) {
        setInvoices(prev => [invoice, ...prev]);

        try {
          await sendPaymentConfirmationEmail({
            invoice,
            user: userInfo,
            billingAddress,
            paymentStatus,
            paymentMethod: selectedPaymentMethod,
            paymentMessage: result.message ?? null,
            paymentReference: storedReference ?? null,
            instructions: paymentInstructions,
            bankAccounts: methodConfig?.bankAccounts,
            translations: t
          });
        } catch (emailError) {
          console.error('Erreur envoi email confirmation paiement:', emailError);
          toast.warning('Commande enregistrée, mais l\'email de confirmation n\'a pas pu être envoyé.');
        }
      }

      if (paymentStatus === 'pending' && selectedPaymentMethod === 'bank_transfer') {
        setUserInfo(prev => ({
          ...prev,
          subscriptionStatus: 'pending',
          subscriptionStart: '',
          subscriptionEnd: ''
        }));
      } else if (paymentStatus === 'paid') {
        setUserInfo(prev => ({
          ...prev,
          subscriptionStatus: 'active'
        }));
      }

      return paymentResponse;
    } catch (error) {
      console.error('Erreur lors de la création de la commande:', error);
      toast.error('Impossible d\'enregistrer la commande. Merci de réessayer.');
      return {
        ok: false,
        errors: [{ field: 'general', message: 'Erreur inattendue lors du traitement du paiement.' }]
      };
    }
  }, [
    billingAddress,
    cart,
    createOrder,
    createTransactionAndInvoice,
    executePayment,
    paymentSettings,
    selectedPaymentMethod,
    sendPaymentConfirmationEmail,
    setCart,
    setCartOpen,
    setCheckoutOpen,
    setCurrentOrder,
    setInvoices,
    setOrderCompleteOpen,
    setPaymentOpen,
    setStoreOpen,
    setUserInfo,
    t,
    userInfo,
    vatPercent,
    vatRate,
    pricingSettings,
  ]);

  const handleProceedToCheckout = useCallback(() => {
    setStoreOpen(false);
    setCartOpen(false);
    setPaymentOpen(false);
    setCheckoutOpen(true);
  }, [setStoreOpen, setCartOpen, setPaymentOpen, setCheckoutOpen]);

  // Fonctions wrapper pour les handlers
  const copyContentToEditor = (content: string) =>
    handleCopyToEditor(textareaRef, document, setDocument, content, t);

  const openDocumentFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!ensureClientSelectionForDocuments()) {
      event.target.value = '';
      return;
    }
    void openFileIntoEditor(setDocument, setViewMode, event, t);
  };

  const insertFileFromInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    const allowed = isTemplateMode ? ensureWorkspaceSelection() : ensureClientSelectionForDocuments();
    if (!allowed) {
      event.target.value = '';
      return;
    }
    void insertFileIntoEditor(copyContentToEditor, event, t);
  };

  const handleStopResponse = useCallback(() => {
    if (!isChatProcessing) {
      toast.info('Aucun traitement en cours.');
      return;
    }

    stopRequestedRef.current = true;
    setIsChatProcessing(false);
    setChatMessages(prev => [
      ...prev,
      {
        id: nanoid(10),
        role: 'assistant',
        content: 'Processus arrêté.',
        timestamp: new Date(),
        metadata: { language: chatLanguage },
      },
    ]);
    toast.info('Processus arrêté.');
  }, [isChatProcessing, setChatMessages, setIsChatProcessing]);

  const sendMessage = useCallback(async () => {
    if (isChatProcessing) {
      toast.info('Un traitement est déjà en cours.');
      return;
    }

    try {
      stopRequestedRef.current = false;
      await handleSendMessage({
        chatInput,
        setChatInput,
        setChatMessages,
        assistantConfig: activeAssistantConfig,
        agentId: currentAgent,
        llmModels,
        t,
        userInfo,
        callbacks: {
          onBeforeResponse: () => {
            setIsChatProcessing(true);
          },
          onAfterResponse: () => {
            setIsChatProcessing(false);
          },
        },
        conversationHistory: chatMessages,
        setTokenUsage: setLastTokenUsage,
        addTokensToTotal: (tokens) => setTotalTokenUsage((prev) => prev + tokens),
        threadId: currentThreadId,
        setThreadId: setCurrentThreadId,
        shouldAbortResponse: () => stopRequestedRef.current,
        language: chatLanguage,
      });
    } catch (error) {
      setIsChatProcessing(false);
      throw error;
    }
  }, [
    activeAssistantConfig,
    chatMessages,
    chatInput,
    currentAgent,
    currentThreadId,
    isChatProcessing,
    llmModels,
    setChatInput,
    setChatMessages,
    setCurrentThreadId,
    setIsChatProcessing,
    setTotalTokenUsage,
    t,
    userInfo,
    chatLanguage,
  ]);

  const handleOpenClientPanel = useCallback(() => {
    if (!ensureWorkspaceSelection()) {
      return;
    }
    setWorkspacePanelOpen(true);
  }, [ensureWorkspaceSelection]);

  const wrappedHandlers = {
    // Document handlers
    handleCopyToEditor: copyContentToEditor,

    handleNewDocument: () => {
      if (!ensureClientSelectionForDocuments()) {
        return;
      }
      createNewDocumentState(setDocument, setViewMode, document, t);
    },

    handleOpenFile: openDocumentFile,

    handleInsertFile: insertFileFromInput,

    handleInsertTemplate: insertFileFromInput,

    handleFileLoadedFromUrl: (content: string, url: string) => {
      const allowed = isTemplateMode ? ensureWorkspaceSelection() : ensureClientSelectionForDocuments();
      if (!allowed) {
        return;
      }
      applyFileLoadedFromUrl(setDocument, setViewMode, content, url, t);
    },
    
    handleFileLoadedToChat: (content: string, filename: string) =>
      handleFileLoadedToChat(setChatMessages, content, filename),
    
    handleLanguageChange: (newLanguage: LanguageCode) => {
      handleLanguageChange(textareaRef, setDocument, newLanguage);
      setChatLanguage(newLanguage);
    },
    
    handleFullPathChange: (newPath: string) =>
      handleFullPathChange(setDocument, newPath),
    
    insertMarkdown: (markdown: string) =>
      insertMarkdown(textareaRef, document, setDocument, markdown, '', ''),

    // Chat handlers
    handleSendMessage: () => {
      void sendMessage();
    },

    handleAgentChange: (newAgent: AIAgentType) => {
      if (newAgent === currentAgent) {
        setInvitationVersion((value) => value + 1);
      }
      handleAgentChange(newAgent, setCurrentAgent, aiAgents, t);
    },

    handleClearChat: () => {
      const invitation = computeInvitationForAgent(currentAgent);
      handleClearChat(setChatMessages, t);
      setCurrentThreadId(null);
      setTotalTokenUsage(0);
      if (invitation) {
        setInvitationVersion((value) => value + 1);
      }
    },
    handleStopResponse,
    
    // Commerce handlers
    addToCart,
    
    updateCartItemQuantity,
    
    removeFromCart,
    
    processOrder
  };

  // Génération des alertes utilisateur
  useEffect(() => {
    let cancelled = false;

    fetchPublicPricingSettings()
      .then(config => {
        if (!cancelled) {
          setPricingSettings(config);
        }
      })
      .catch(error => {
        console.error('Impossible de charger les paramètres tarifaires', error);
        if (!cancelled) {
          setPricingSettings(null);
          toast.error('Impossible de charger les tarifs. Certaines actions sont indisponibles.');
        }
      });

    fetchPublicPaymentSettings()
      .then(config => {
        if (!cancelled) {
          setPaymentSettings(config);
        }
      })
      .catch(error => {
        console.error('Impossible de charger les paramètres de paiement', error);
        if (!cancelled) {
          setPaymentSettings(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (isAuthenticated && userInfo) {
      const backendAlerts = (authAlerts || []).map((alert: any, index: number) => {
        const severity = (alert.level ?? 'info') as 'info' | 'warning' | 'error';
        const mappedType = (() => {
          switch (alert.type) {
            case 'tokens':
              return 'low_tokens';
            case 'general':
              return 'general';
            default:
              return 'subscription_expired';
          }
        })();

        const id = `server_${mappedType}_${index}`;
        const isBlocking = Boolean(alert.isBlocking);
        const title = alert.title ||
          (alert.type === 'tokens'
            ? 'Alerte jetons'
            : alert.type === 'general'
              ? 'Notification'
              : 'Alerte abonnement');

        const action = (() => {
          if (isBlocking && alert.type === 'tokens') {
            return {
              label: 'Acheter des jetons',
              onClick: () => setStoreOpen(true)
            };
          }
          if (isBlocking && alert.type !== 'tokens' && alert.type !== 'general') {
            return {
              label: 'Renouveler',
              onClick: () => setCurrentPage('pricing')
            };
          }
          return undefined;
        })();

        return {
          id,
          type: mappedType,
          title,
          message: alert.message || '',
          action,
          dismissible: !isBlocking,
          severity
        };
      });

      const hasServerGeneral = backendAlerts.some(alert => alert.type === 'general');
      const generatedAlerts = generateUserAlerts(userInfo, setCurrentPage, setStoreOpen)
        .filter(alert => hasServerGeneral ? alert.type !== 'general' : true);

      const combined = [...backendAlerts, ...generatedAlerts];
      const uniqueAlerts = new Map<string, any>();
      combined.forEach(alert => {
        if (!uniqueAlerts.has(alert.id)) {
          uniqueAlerts.set(alert.id, alert);
        }
      });

      setUserAlerts(Array.from(uniqueAlerts.values()));
    } else {
      setUserAlerts([]);
    }
  }, [isAuthenticated, userInfo, authAlerts, setCurrentPage, setStoreOpen]);

  React.useEffect(() => {
    const loadInvoices = async () => {
      if (!isAuthenticated || !userInfo?.id) {
        setInvoices([]);
        return;
      }

      const fetched = await fetchUserInvoices(userInfo.id);
      setInvoices(fetched);
    };

    loadInvoices();
  }, [isAuthenticated, userInfo?.id]);

  // Vérifier l'accès utilisateur et afficher des alertes si nécessaire
  React.useEffect(() => {
    if (isAuthenticated && userInfo && userInfo.role !== 'admin') {
      const accessCheck = checkUserAccess(userInfo);
      
      if (!accessCheck.canAccessAI) {
        const accessAlert = {
          id: 'access_restricted',
          type: 'subscription_expired' as const,
          title: 'Accès IA restreint',
          message: accessCheck.reason || 'Votre accès aux fonctionnalités IA est actuellement restreint.',
          action: accessCheck.upgradeRequired ? {
            label: 'Voir les tarifs',
            onClick: () => setCurrentPage('pricing')
          } : undefined,
          dismissible: false
        };
        
        setUserAlerts(prev => {
          const hasAccessAlert = prev.some(alert => alert.id === 'access_restricted');
          return hasAccessAlert ? prev : [accessAlert, ...prev];
        });
      }
    }
  }, [isAuthenticated, userInfo, setCurrentPage]);

  React.useEffect(() => {
    if (currentPage === 'main' && isAuthenticated && userInfo && userInfo.role !== 'admin') {
      const accessCheck = checkUserAccess(userInfo);
      if (!accessCheck.canAccessAI) {
        setAccessRestriction({
          reason: accessCheck.reason || 'Votre accès aux fonctionnalités IA est actuellement restreint.',
          type: accessCheck.reason === 'Jetons insuffisants' ? 'tokens' : 'subscription'
        });
        setCurrentPage('home');
      }
    }
  }, [currentPage, isAuthenticated, userInfo, setCurrentPage]);

  React.useEffect(() => {
    if (!accessRestriction || !userInfo) {
      return;
    }
    const accessCheck = checkUserAccess(userInfo);
    if (accessCheck.canAccessAI) {
      setAccessRestriction(null);
    }
  }, [accessRestriction, userInfo]);
  // Fonction pour dismisser une alerte
  const dismissAlert = (alertId: string) => {
    setUserAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Fonction de gestion du menu profil
  const handleProfileMenuClick = (action: string) => {
    switch (action) {
      case 'accountInfo':
        setAccountInfoOpen(true);
        break;
      case 'billing':
        setBillingOpen(true);
        break;
      case 'preferences':
        setPreferencesOpen(true);
        break;
      case 'buySubscription':
        setCurrentPage('pricing');
        break;
      case 'buyTokens':
        setStoreOpen(true);
        break;
      case 'admin':
        setCurrentPage('admin');
        break;
      case 'logout':
        handleLogout();
        break;
      default:
        console.log('Action de menu profil inconnue:', action);
    }
  };

  // Fonctions d'authentification et de navigation
  const checkExistingSession = async () => {
    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      const result = await misanAuth.checkSession();

      if (result && result.success && result.user) {
        setAuthUser(result.user);
        setAuthAccess(result.access);
        setAuthAlerts(result.alerts || []);
        setUserInfo(mapMisanUserToUserInfo(result.user));
        setIsAuthenticated(true);
        setCurrentPage('home');
        toast.success(`Bienvenue ${result.user.name} !`);

        if (result.access?.message) {
          const notify = result.access.can_access_ai ? toast.info : toast.warning;
          notify(result.access.message);
        }
      }
    } catch (error) {
      console.log('Aucune session active, affichage de la page d\'authentification');
    }
  };

  const handleInitializeDatabase = async () => {
    setIsInitializingDB(true);
    try {
      const result = await initializeMisanDatabase();
      if (result.success) {
        toast.success('Base de données initialisée avec succès !');
      } else {
        toast.error(result.error || 'Erreur lors de l\'initialisation');
      }
    } catch (error) {
      console.error('Erreur initialisation:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsInitializingDB(false);
    }
  };

  const handleResetDatabase = async () => {
    setIsInitializingDB(true);
    try {
      const result = await resetMisanDatabase();
      if (result.success) {
        toast.success('🔥 Base de données complètement réinitialisée !');
      } else {
        toast.error(result.error || 'Erreur lors de la réinitialisation');
      }
    } catch (error) {
      console.error('❌ Erreur réinitialisation:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsInitializingDB(false);
    }
  };

  const handleAuthSuccess = (authResult: any) => {
    setAuthUser(authResult.user);
    setAuthAccess(authResult.access);
    setAuthAlerts(authResult.alerts || []);
    setUserInfo(mapMisanUserToUserInfo(authResult.user));
    setIsAuthenticated(true);
    setAuthDialogOpen(false);
    setCurrentPage('home');
    toast.success(`Bienvenue ${authResult.user.name} !`);

    if (authResult.access?.message) {
      const notify = authResult.access.can_access_ai ? toast.info : toast.warning;
      notify(authResult.access.message);
    }
  };

  const handleLogout = async () => {
    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      await misanAuth.signOut();
      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthAccess(null);
      setAuthAlerts([]);
      setUserInfo(createEmptyUserInfo());
      setPersonalAddress(createEmptyAddress());
      setBillingAddress(createEmptyAddress());
      setInvoices([]);
      setAuthDialogOpen(false);
      setCurrentPage('home');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleLogin = () => setAuthDialogOpen(true);
  const handleStartFreeAccess = () => {
    if (isAuthenticated) {
      setCurrentPage('main');
      toast.success('Accès à l\'Assistant IA accordé !');
    } else {
      setCurrentPage('home');
      setAuthDialogOpen(true);
      toast.info('Connectez-vous ou créez un compte pour accéder gratuitement à Mizane');
    }
  };

  // Fonctions de sauvegarde et de fichiers
  const writeFileContents = async (
    directory: FileSystemDirectoryHandle,
    filename: string,
    content: string | ArrayBuffer | Blob
  ) => {
    const fileHandle = await directory.getFileHandle(filename, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(content);
    await writable.close();
  };

  const handleSaveFile = async () => {
    const contentToSave = document.content ?? '';

    if (isTemplateMode) {
      const rootHandle = await ensureTemplateWorkspace();
      if (!rootHandle) {
        resetSaveStatus();
        return;
      }

      beginSaveOperation();
      try {
        const templateDir = await ensureTemplatesDirectory(rootHandle);
        const finalName = ensureTemplateFilename(document.filename || 'modele.rtf');
        const rtfContent = markdownToRtf(contentToSave);
        await writeFileContents(templateDir, finalName, rtfContent);

        const fullPath = buildTemplateFullPath(rootHandle.name, finalName);
        setDocument(prev => ({
          ...prev,
          filename: finalName,
          fullPath,
          originalFilename: finalName,
          originalFullPath: fullPath,
          isModified: false,
        }));

        toast.success(t.templateSaved ?? 'Template sauvegardé dans la bibliothèque.');
        concludeSaveOperation('success');
      } catch (error) {
        console.error('[handleSaveFile] Template save failed', error);
        if (error instanceof ClientWorkspaceError) {
          toast.error(error.message);
        } else {
          toast.error(t.templateSaveError ?? 'Impossible de sauvegarder le template.');
        }
        concludeSaveOperation('error');
      }
      return;
    }

    if (!ensureClientSelectionForDocuments()) {
      resetSaveStatus();
      return;
    }

    beginSaveOperation();
    try {
      const selectedClient = workspaceState.selectedClient;
      if (!selectedClient) {
        toast.warning(clientSelectionWarning);
        triggerClientSelectionReminder();
        concludeSaveOperation('error');
        return;
      }

      const clientHandle = selectedClient.directoryHandle;
      const documentsDir = await ensureDocumentsDirectory(clientHandle);
      const safeFilename = getFilenameFromPath(document.filename || 'nouveau_document.txt');
      const extension = safeFilename.split('.').pop()?.toLowerCase();

      if (extension === 'doc') {
        toast.error(t.docFormatUnsupported ?? 'Le format .doc n\'est pas supporté. Convertissez en .docx.');
        concludeSaveOperation('error');
        return;
      }

      if (extension === 'docx') {
        const docxBlob = await generateDocxBlob(contentToSave ?? '');
        await writeFileContents(documentsDir, safeFilename, docxBlob);
      } else if (extension === 'rtf') {
        const rtfContent = markdownToRtf(contentToSave ?? '');
        await writeFileContents(documentsDir, safeFilename, rtfContent);
      } else {
        await writeFileContents(documentsDir, safeFilename, contentToSave ?? '');
      }
      await touchClient(clientHandle);
      await workspaceActions.refreshClients();

      const fullPath = `${getWorkspaceRootLabel()}/${selectedClient.slug ?? 'client'}/documents/${safeFilename}`;
      setDocument(prev => ({
        ...prev,
        filename: safeFilename,
        fullPath,
        originalFilename: safeFilename,
        originalFullPath: fullPath,
        isModified: false,
      }));

      toast.success(t.documentSavedToWorkspace ?? 'Document enregistré dans le dossier client.');
      concludeSaveOperation('success');
    } catch (error) {
      console.error('[handleSaveFile] Document save failed', error);
      if (error instanceof ClientWorkspaceError) {
        toast.error(error.message);
      } else {
        toast.error(t.documentSaveError ?? 'Impossible de sauvegarder le document.');
      }
      concludeSaveOperation('error');
    }
  };

  const handleSaveWithFormat = async (
    requestedFilename: string,
    format: 'txt' | 'rtf' | 'md' | 'docx'
  ) => {
    const baseName = getFilenameFromPath(requestedFilename) || 'document';
    const extension = format === 'docx' ? 'docx' : format === 'rtf' ? 'rtf' : format === 'md' ? 'md' : 'txt';
    const normalisedName = baseName.toLowerCase().endsWith(`.${extension}`)
      ? baseName
      : `${baseName.replace(/\.[^.]+$/, '')}.${extension}`;
    const contentToSave = document.content ?? '';

    if (isTemplateMode) {
      const rootHandle = await ensureTemplateWorkspace();
      if (!rootHandle) {
        resetSaveStatus();
        return;
      }

      beginSaveOperation();
      try {
        const templateDir = await ensureTemplatesDirectory(rootHandle);

        let finalName = ensureTemplateFilename(normalisedName);
        if (!finalName.toLowerCase().endsWith('.rtf')) {
          toast.info(t.templateFormatForced ?? 'Les templates sont sauvegardés en RTF. Format ajusté.');
          finalName = ensureTemplateFilename(finalName.replace(/\.[^.]+$/, '.rtf'));
        }

        const rtfContent = markdownToRtf(contentToSave);
        await writeFileContents(templateDir, finalName, rtfContent);

        const fullPath = buildTemplateFullPath(rootHandle.name, finalName);
        setDocument(prev => ({
          ...prev,
          filename: finalName,
          fullPath,
          originalFilename: finalName,
          originalFullPath: fullPath,
          isModified: false,
        }));

        toast.success(t.templateSaved ?? 'Template sauvegardé dans la bibliothèque.');
        concludeSaveOperation('success');
        setSaveAsFilename(finalName);
        setSaveAsDialogOpen(false);
      } catch (error) {
        console.error('[handleSaveWithFormat] Template save failed', error);
        toast.error(t.templateSaveError ?? 'Impossible de sauvegarder le template.');
        concludeSaveOperation('error');
      }
      return;
    }

    if (!ensureClientSelectionForDocuments()) {
      resetSaveStatus();
      return;
    }

    beginSaveOperation();
    try {
      const selectedClient = workspaceState.selectedClient;
      if (!selectedClient) {
        toast.warning(clientSelectionWarning);
        triggerClientSelectionReminder();
        concludeSaveOperation('error');
        return;
      }

      const clientHandle = selectedClient.directoryHandle;
      const documentsDir = await ensureDocumentsDirectory(clientHandle);
      const extensionLower = extension.toLowerCase();

      if (extensionLower === 'doc') {
        toast.error(t.docFormatUnsupported ?? 'Le format .doc n\'est pas supporté. Convertissez en .docx.');
        concludeSaveOperation('error');
        return;
      }

      if (extensionLower === 'docx') {
        const docxBlob = await generateDocxBlob(contentToSave);
        await writeFileContents(documentsDir, normalisedName, docxBlob);
      } else if (extensionLower === 'rtf') {
        const rtfContent = markdownToRtf(contentToSave);
        await writeFileContents(documentsDir, normalisedName, rtfContent);
      } else {
        await writeFileContents(documentsDir, normalisedName, contentToSave);
      }

      await touchClient(clientHandle);
      await workspaceActions.refreshClients();

      const fullPath = `${getWorkspaceRootLabel()}/${selectedClient.slug}/documents/${normalisedName}`;
      setDocument(prev => ({
        ...prev,
        filename: normalisedName,
        fullPath,
        originalFilename: normalisedName,
        originalFullPath: fullPath,
        isModified: false,
      }));

      toast.success(t.documentSavedToWorkspace ?? 'Document enregistré dans le dossier client.');
      concludeSaveOperation('success');
      setSaveAsFilename(normalisedName);
      setSaveAsDialogOpen(false);
    } catch (error) {
      console.error('[handleSaveWithFormat] Document save failed', error);
      if (error instanceof ClientWorkspaceError) {
        toast.error(error.message);
      } else {
        toast.error(t.documentSaveError ?? 'Impossible de sauvegarder le document.');
      }
      concludeSaveOperation('error');
    }
  };

  const handleSaveAs = () => {
    if (!ensureClientSelectionForDocuments()) {
      resetSaveStatus();
      return;
    }

    setSaveAsFilename(document.filename);
    setSaveAsDialogOpen(true);
  };

  const handleViewModeToggle = () => {
    setViewMode(prev => prev === 'edit' ? 'preview' : 'edit');
  };

  const resetFileInputs = () => {
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (insertFileInputRef.current) insertFileInputRef.current.value = '';
    if (templateFileInputRef.current) templateFileInputRef.current.value = '';
    if (templateInsertInputRef.current) templateInsertInputRef.current.value = '';
  };

  const getWorkspaceRootLabel = () => `/${workspaceState.root?.name ?? DEFAULT_WORKSPACE_NAME}`;

  const handleCreateNewTemplate = useCallback(async () => {
    const rootHandle = await ensureTemplateWorkspace();
    if (!rootHandle) {
      return;
    }

    const timestamp = new Date().toISOString().replace(/[-:T]/g, '').split('.')[0];
    const suggestedName = ensureTemplateFilename(`modele_${timestamp}`);
    const fullPath = buildTemplateFullPath(rootHandle.name, suggestedName);

    setDocument({
      content: '',
      filename: suggestedName,
      fullPath,
      language: document.language,
      isModified: false,
      originalFilename: suggestedName,
      originalFullPath: fullPath
    });
    setViewMode('edit');
    toast.success(t.newTemplateCreated ?? 'Nouveau template créé');
  }, [ensureTemplateWorkspace, document.language, setDocument, setViewMode, t]);

  const handleTemplateFileInput = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    try {
      await loadTemplateFile(file);
    } catch (error) {
      console.error('[handleTemplateFileInput] Lecture template échouée', error);
      toast.error('Impossible de charger le template sélectionné.');
    } finally {
      resetFileInputs();
    }
  };

  const handleOpenTemplateFromWorkspace = async () => {
    try {
      const rootHandle = await ensureTemplateWorkspace();
      if (!rootHandle) {
        return;
      }

      const supportsPicker = typeof window !== 'undefined' && 'showOpenFilePicker' in window;
      if (!supportsPicker) {
        templateFileInputRef.current?.click();
        return;
      }

      const templatesDir = await ensureTemplatesDirectory(rootHandle);

      if ((templatesDir as any).requestPermission) {
        const permission = await (templatesDir as any).requestPermission({ mode: 'read' });
        if (permission === 'denied') {
          toast.error('Autorisation de lecture refusée pour /Mizane/templates.');
          return;
        }
      }

      const [fileHandle] = await (window as any).showOpenFilePicker({
        multiple: false,
        startIn: templatesDir as any,
        types: [
          {
            description: 'Templates MISAN',
            accept: {
              'application/rtf': ['.rtf'],
              'text/plain': ['.rtf'],
            },
          },
        ],
        excludeAcceptAllOption: false,
      });

      if (!fileHandle) {
        return;
      }

      const file = await fileHandle.getFile();
      if (!file.name.toLowerCase().endsWith('.rtf')) {
        toast.error('Seuls les fichiers .rtf sont supportés pour les templates.');
        return;
      }

      await loadTemplateFile(file, rootHandle);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
      console.error('[handleOpenTemplateFromWorkspace] Charger template échoué', error);
      toast.error('Impossible d\'ouvrir le template sélectionné.');
    }
  };

  const handleNewActionClick = useCallback(() => {
    if (isTemplateMode) {
      void handleCreateNewTemplate();
      return;
    }

    if (!ensureClientSelectionForDocuments()) {
      return;
    }

    createNewDocumentState(setDocument, setViewMode, document, t);
  }, [
    isTemplateMode,
    handleCreateNewTemplate,
    ensureClientSelectionForDocuments,
    setDocument,
    setViewMode,
    document,
    t,
  ]);

  const handleOpenActionClick = useCallback(() => {
    resetFileInputs();
    if (isTemplateMode) {
      void handleOpenTemplateFromWorkspace();
      return;
    }

    if (!ensureClientSelectionForDocuments()) {
      return;
    }

    fileInputRef.current?.click();
  }, [
    resetFileInputs,
    isTemplateMode,
    handleOpenTemplateFromWorkspace,
    ensureClientSelectionForDocuments,
  ]);

  const handleSaveActionClick = useCallback(() => {
    void handleSaveFile();
  }, [handleSaveFile]);

  const handleSaveAsActionClick = useCallback(() => {
    handleSaveAs();
  }, [handleSaveAs]);

  // Fonctions de gestion des modales profil
  const handleChangePassword = (data: any) => {
    console.log('Changement de mot de passe:', data);
    toast.success('Mot de passe mis à jour');
    setChangePasswordOpen(false);
  };

  const handleSaveAddresses = async () => {
    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      const updates: Record<string, string | null> = {
        address: personalAddress.street ?? '',
        city: personalAddress.city ?? '',
        postal_code: personalAddress.postalCode ?? '',
        country: personalAddress.country ?? '',
        billing_address: billingAddress.street ?? '',
        billing_city: billingAddress.city ?? '',
        billing_postal_code: billingAddress.postalCode ?? '',
        billing_country: billingAddress.country ?? ''
      };

      const result = await misanAuth.updateProfile(updates);

      if (result.success && result.user) {
        setAuthUser(result.user);
        const mapped = mapMisanUserToUserInfo(result.user);
        setUserInfo(mapped);
        toast.success('Adresses mises à jour');
        setAddressesOpen(false);
      } else {
        toast.error(result.error || 'Impossible de mettre à jour les adresses');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour des adresses:', error);
      toast.error('Erreur lors de la mise à jour des adresses');
    }
  };

  const handleSavePreferences = (site: LanguageCode, chat: LanguageCode) => {
    setSiteLanguage(site);
    setChatLanguage(chat);
    toast.success('Préférences mises à jour');
    setPreferencesOpen(false);
  };

  const handleSaveAccountInfo = async (info: UserInfo) => {
    const updates: Record<string, string | null> = {};

    if (info.avatar && info.avatar !== userInfo.avatar) {
      updates.avatar = info.avatar;
    }

    const normalize = (value?: string | null) => {
      if (value === null || value === undefined) return null;
      const trimmed = value.trim();
      return trimmed.length === 0 ? null : trimmed;
    };

    const normalizedSecondary = normalize(info.secondaryEmail);
    if (normalizedSecondary !== normalize(userInfo.secondaryEmail)) {
      if (normalizedSecondary) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(normalizedSecondary)) {
          toast.error('Adresse email secondaire invalide');
          return;
        }
      }
      updates.secondary_email = normalizedSecondary;
    }

    const normalizedPhone = normalize(info.phone);
    if (normalizedPhone !== normalize(userInfo.phone)) {
      updates.phone = normalizedPhone;
    }

    const addressChanged = (info.address?.street ?? '') !== (userInfo.address?.street ?? '') ||
      (info.address?.city ?? '') !== (userInfo.address?.city ?? '') ||
      (info.address?.postalCode ?? '') !== (userInfo.address?.postalCode ?? '') ||
      (info.address?.country ?? '') !== (userInfo.address?.country ?? '')
      || (info.address?.street ?? '') !== personalAddress.street
      || (info.address?.city ?? '') !== personalAddress.city
      || (info.address?.postalCode ?? '') !== personalAddress.postalCode
      || (info.address?.country ?? '') !== personalAddress.country;

   if (addressChanged) {
     updates.address = info.address?.street ?? personalAddress.street;
     updates.city = info.address?.city ?? personalAddress.city;
     updates.postal_code = info.address?.postalCode ?? personalAddress.postalCode;
     updates.country = info.address?.country ?? personalAddress.country;
      setPersonalAddress({
        street: updates.address ?? personalAddress.street,
        city: updates.city ?? personalAddress.city,
        postalCode: updates.postal_code ?? personalAddress.postalCode,
        country: updates.country ?? personalAddress.country
      });
    }

    const billingChanged = (info.billingAddress?.street ?? '') !== (userInfo.billingAddress?.street ?? '') ||
      (info.billingAddress?.city ?? '') !== (userInfo.billingAddress?.city ?? '') ||
      (info.billingAddress?.postalCode ?? '') !== (userInfo.billingAddress?.postalCode ?? '') ||
      (info.billingAddress?.country ?? '') !== (userInfo.billingAddress?.country ?? '')
      || (info.billingAddress?.street ?? '') !== billingAddress.street
      || (info.billingAddress?.city ?? '') !== billingAddress.city
      || (info.billingAddress?.postalCode ?? '') !== billingAddress.postalCode
      || (info.billingAddress?.country ?? '') !== billingAddress.country;

   if (billingChanged) {
     updates.billing_address = info.billingAddress?.street ?? billingAddress.street;
     updates.billing_city = info.billingAddress?.city ?? billingAddress.city;
     updates.billing_postal_code = info.billingAddress?.postalCode ?? billingAddress.postalCode;
     updates.billing_country = info.billingAddress?.country ?? billingAddress.country;
      setBillingAddress({
        street: updates.billing_address ?? billingAddress.street,
        city: updates.billing_city ?? billingAddress.city,
        postalCode: updates.billing_postal_code ?? billingAddress.postalCode,
        country: updates.billing_country ?? billingAddress.country
      });
    }

    if (Object.keys(updates).length === 0) {
      toast.info('Aucune modification détectée');
      setAccountInfoOpen(false);
      return;
    }

    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      const result = await misanAuth.updateProfile(updates);

      if (result.success && result.user) {
        setAuthUser(result.user);
        const mapped = mapMisanUserToUserInfo(result.user);
        setUserInfo(mapped);
        toast.success('Informations du compte mises à jour');
        setAccountInfoOpen(false);
      } else {
        toast.error(result.error || 'Impossible de mettre à jour le profil');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du profil:', error);
      toast.error('Erreur lors de la mise à jour du profil');
    }
  };

  const handleSelectInvoice = (invoice: Invoice) => {
    console.log('[Billing] Sélection facture', invoice.id);
  };

  const handleDownloadInvoice = (invoice: Invoice) => {
    downloadInvoiceDocument(invoice, userInfo, billingAddress, t);
    toast.success(`Facture ${invoice.id} téléchargée`);
  };

  const handleUpdateInvoice = (
    invoiceId: string,
    updates: Partial<Pick<Invoice, 'status' | 'paymentMethod' | 'paymentDate' | 'paymentReference'>>
  ) => {
    let updatedInvoice: Invoice | null = null;

    setInvoices(prev => prev.map(invoice => {
      if (invoice.id !== invoiceId) {
        return invoice;
      }

      const nextStatus = updates.status ?? invoice.status;
      let nextPaymentDate: Invoice['paymentDate'] = updates.paymentDate !== undefined
        ? updates.paymentDate
        : invoice.paymentDate;

      if ((nextStatus === 'paid' || nextStatus === 'free') && !nextPaymentDate) {
        nextPaymentDate = new Date().toISOString().slice(0, 10);
      }

      if (nextStatus !== 'paid' && nextStatus !== 'free' && updates.paymentDate === undefined) {
        nextPaymentDate = null;
      }

      const nextInvoice: Invoice = {
        ...invoice,
        ...updates,
        status: nextStatus,
        paymentDate: nextPaymentDate
      };

      updatedInvoice = nextInvoice;
      return nextInvoice;
    }));

    if (updatedInvoice) {
      setSelectedInvoice(prev => (prev && prev.id === invoiceId ? updatedInvoice : prev));
    }
  };

  // Vérifier la session au chargement
  React.useEffect(() => {
    checkExistingSession();
  }, []);

  // Rediriger les utilisateurs non authentifiés lorsqu'ils tentent d'accéder à la page principale
  React.useEffect(() => {
    if (currentPage === 'auth') {
      setAuthDialogOpen(true);
      setCurrentPage('home');
      return;
    }

    if (currentPage === 'main' && !isAuthenticated) {
      setCurrentPage('home');
      setAuthDialogOpen(true);
      toast.info('Connectez-vous pour accéder à l\'Assistant IA');
    }
  }, [currentPage, isAuthenticated]);

  React.useEffect(() => {
    if (!authDialogOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setAuthDialogOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [authDialogOpen]);

  const effectivePage = currentPage === 'auth' ? 'home' : currentPage;

  // Configuration des props du header (doit être défini avant les returns conditionnels)
  const headerProps = {
    currentPage: effectivePage,
    isAuthenticated,
    userInfo,
    siteLanguage,
    translations: t,
    subscriptionInfo,
    cartLength: cart.length,
    onNavigateHome: () => setCurrentPage('home'),
    onNavigateMain: () => setCurrentPage('main'),
    onNavigatePricing: () => setCurrentPage('pricing'),
    onNavigateLibrary: () => setCurrentPage('library'),
    headerTitle: 'Mizane',
    showReturnButton: effectivePage === 'library',
    onLogin: handleLogin,
    onProfileMenuClick: handleProfileMenuClick,
    onSetCartOpen: setCartOpen
  };

  useEffect(() => {
    if (effectivePage !== 'main') {
      return;
    }

    const invitation = computeInvitationForAgent(currentAgent);

    if (!invitation) {
      return;
    }

    setChatMessages((previous) => {
      const last = previous[previous.length - 1];
      if (last && last.metadata?.invitationFor === currentAgent && last.content === invitation) {
        return previous;
      }

      return [
        ...previous,
        {
          id: nanoid(10),
          role: 'assistant',
          content: invitation,
          timestamp: new Date(),
          metadata: { invitationFor: currentAgent, language: chatLanguage },
        },
      ];
    });
  }, [effectivePage, invitationVersion, computeInvitationForAgent, currentAgent, setChatMessages, chatLanguage]);

  const authDialog = authDialogOpen ? (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={() => setAuthDialogOpen(false)}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="icon"
          className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          aria-label="Fermer l'authentification"
          onClick={() => setAuthDialogOpen(false)}
        >
          <X className="w-4 h-4" />
        </Button>
        <React.Suspense fallback={<SuspenseFallback label="Chargement de l'espace de connexion..." />}>
          <SimpleAuthPage
            onSuccess={handleAuthSuccess}
            onInitializeDatabase={handleInitializeDatabase}
            onResetDatabase={handleResetDatabase}
            isInitializingDB={isInitializingDB}
            displayMode="modal"
          />
        </React.Suspense>
      </div>
    </div>
  ) : null;

  const accessRestrictionDetails = React.useMemo(() => {
    if (!accessRestriction) {
      return null;
    }

    if (accessRestriction.type === 'tokens') {
      return {
        title: 'Solde de jetons insuffisant',
        message: accessRestriction.reason || 'Votre solde de jetons ne permet pas d\'utiliser l\'assistant IA.',
        primaryLabel: 'Acheter des jetons',
        primaryAction: () => {
          setAccessRestriction(null);
          setStoreOpen(true);
        }
      };
    }

    return {
      title: 'Abonnement expiré',
      message: accessRestriction.reason || 'Votre abonnement doit être renouvelé pour accéder à l\'assistant IA.',
      primaryLabel: 'Voir les tarifs',
      primaryAction: () => {
        setAccessRestriction(null);
        setCurrentPage('pricing');
      }
    };
  }, [accessRestriction, setCurrentPage, setStoreOpen]);

  const accessRestrictionDialog = accessRestrictionDetails ? (
    <Dialog open onOpenChange={(open) => { if (!open) setAccessRestriction(null); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{accessRestrictionDetails.title}</DialogTitle>
          <DialogDescription>{accessRestrictionDetails.message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setAccessRestriction(null)}>
            Fermer
          </Button>
          <Button onClick={accessRestrictionDetails.primaryAction}>
            {accessRestrictionDetails.primaryLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  ) : null;

  // Rendu conditionnel des pages
  if (effectivePage === 'pricing') {
    return (
      <>
        <MizaneHeader {...headerProps} />
        <React.Suspense fallback={<SuspenseFallback label="Chargement des offres..." />}>
          <PricingPage
            addToCart={wrappedHandlers.addToCart}
            setUserInfo={setUserInfo}
            setStoreOpen={setStoreOpen}
            setCartOpen={setCartOpen}
            cartLength={cart.length}
            userInfo={userInfo}
            onBackToMain={() => setCurrentPage('home')}
            onProfileMenuClick={handleProfileMenuClick}
            t={t}
          />
        </React.Suspense>
        <CollapsibleFooter
          collapsed={footerCollapsed}
          onToggle={() => setFooterCollapsed((prev) => !prev)}
        />
        <React.Suspense fallback={<SuspenseFallback label="Chargement des modules de gestion..." />}>
          <ModalsContainer
            changePasswordOpen={changePasswordOpen}
            setChangePasswordOpen={setChangePasswordOpen}
            addressesOpen={addressesOpen}
            setAddressesOpen={setAddressesOpen}
            preferencesOpen={preferencesOpen}
            setPreferencesOpen={setPreferencesOpen}
            cartOpen={cartOpen}
            setCartOpen={setCartOpen}
            checkoutOpen={checkoutOpen}
            setCheckoutOpen={setCheckoutOpen}
            paymentOpen={paymentOpen}
            setPaymentOpen={setPaymentOpen}
            orderCompleteOpen={orderCompleteOpen}
            setOrderCompleteOpen={setOrderCompleteOpen}
            storeOpen={storeOpen}
            setStoreOpen={setStoreOpen}
            accountInfoOpen={accountInfoOpen}
            setAccountInfoOpen={setAccountInfoOpen}
            billingOpen={billingOpen}
            setBillingOpen={setBillingOpen}
            personalAddress={personalAddress}
            setPersonalAddress={setPersonalAddress}
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            siteLanguage={siteLanguage}
            setSiteLanguage={setSiteLanguage}
            chatLanguage={chatLanguage}
            setChatLanguage={setChatLanguage}
            cart={cart}
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            invoices={invoices}
            currentOrder={currentOrder}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            pricingSettings={pricingSettings}
            paymentSettings={paymentSettings}
            handleChangePassword={handleChangePassword}
            handleSaveAddresses={handleSaveAddresses}
            handleSavePreferences={handleSavePreferences}
            handleSaveAccountInfo={handleSaveAccountInfo}
            handleSelectInvoice={handleSelectInvoice}
            handleDownloadInvoice={handleDownloadInvoice}
            handleUpdateInvoice={handleUpdateInvoice}
            updateCartItemQuantity={wrappedHandlers.updateCartItemQuantity}
            removeFromCart={wrappedHandlers.removeFromCart}
            processOrder={wrappedHandlers.processOrder}
            addToCart={wrappedHandlers.addToCart}
            vatRate={vatRate}
            onProceedToCheckout={handleProceedToCheckout}
            t={t}
          />
        </React.Suspense>
        {authDialog}
        {accessRestrictionDialog}
        <CollapsibleFooter
          collapsed={footerCollapsed}
          onToggle={() => setFooterCollapsed((prev) => !prev)}
        />
      </>
    );
  }

  if (effectivePage === 'admin') {
    return (
      <>
        <React.Suspense fallback={<SuspenseFallback label="Chargement de l'espace administrateur..." />}>
          <AdminPage
            onBackToMain={() => setCurrentPage('home')}
            userInfo={userInfo}
            onProfileMenuClick={handleProfileMenuClick}
          />
        </React.Suspense>
        {authDialog}
        {accessRestrictionDialog}
        <CollapsibleFooter
          collapsed={footerCollapsed}
          onToggle={() => setFooterCollapsed((prev) => !prev)}
        />
      </>
    );
  }

  if (effectivePage === 'home') {
    return (
      <>
        <MizaneHeader {...headerProps} />
        <React.Suspense fallback={<SuspenseFallback label="Chargement de la page d'accueil..." />}>
          <HomePage
            userInfo={userInfo}
            isAuthenticated={isAuthenticated}
            cartLength={cart.length}
            onProfileMenuClick={handleProfileMenuClick}
            onStartChat={() => setCurrentPage('main')}
            onNavigateToApp={() => setCurrentPage('main')}
            onNavigateToPricing={() => setCurrentPage('pricing')}
            onStartFreeAccess={handleStartFreeAccess}
            onSetCartOpen={setCartOpen}
            t={t}
          />
        </React.Suspense>
        <React.Suspense fallback={<SuspenseFallback label="Chargement des modules de gestion..." />}>
          <ModalsContainer
            changePasswordOpen={changePasswordOpen}
            setChangePasswordOpen={setChangePasswordOpen}
            addressesOpen={addressesOpen}
            setAddressesOpen={setAddressesOpen}
            preferencesOpen={preferencesOpen}
            setPreferencesOpen={setPreferencesOpen}
            cartOpen={cartOpen}
            setCartOpen={setCartOpen}
            checkoutOpen={checkoutOpen}
            setCheckoutOpen={setCheckoutOpen}
            paymentOpen={paymentOpen}
            setPaymentOpen={setPaymentOpen}
            orderCompleteOpen={orderCompleteOpen}
            setOrderCompleteOpen={setOrderCompleteOpen}
            storeOpen={storeOpen}
            setStoreOpen={setStoreOpen}
            accountInfoOpen={accountInfoOpen}
            setAccountInfoOpen={setAccountInfoOpen}
            billingOpen={billingOpen}
            setBillingOpen={setBillingOpen}
            personalAddress={personalAddress}
            setPersonalAddress={setPersonalAddress}
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            siteLanguage={siteLanguage}
            setSiteLanguage={setSiteLanguage}
            chatLanguage={chatLanguage}
            setChatLanguage={setChatLanguage}
            cart={cart}
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            invoices={invoices}
            currentOrder={currentOrder}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            pricingSettings={pricingSettings}
            paymentSettings={paymentSettings}
            handleChangePassword={handleChangePassword}
            handleSaveAddresses={handleSaveAddresses}
            handleSavePreferences={handleSavePreferences}
            handleSaveAccountInfo={handleSaveAccountInfo}
            handleSelectInvoice={handleSelectInvoice}
            handleDownloadInvoice={handleDownloadInvoice}
            handleUpdateInvoice={handleUpdateInvoice}
            updateCartItemQuantity={wrappedHandlers.updateCartItemQuantity}
            removeFromCart={wrappedHandlers.removeFromCart}
            processOrder={wrappedHandlers.processOrder}
            addToCart={wrappedHandlers.addToCart}
            vatRate={vatRate}
            onProceedToCheckout={handleProceedToCheckout}
            t={t}
          />
        </React.Suspense>
        {authDialog}
        {accessRestrictionDialog}
        <CollapsibleFooter
          collapsed={footerCollapsed}
          onToggle={() => setFooterCollapsed((prev) => !prev)}
        />
      </>
    );
  }

  if (effectivePage === 'library') {
    return (
      <>
        <MizaneHeader {...headerProps} />
        <div className="h-screen flex flex-col bg-background">
          <main className="flex-1 flex flex-col px-6 py-10">
            <div className="flex flex-1 flex-col mx-auto w-full max-w-6xl space-y-8">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-[0.5em] text-emerald-600">bibliothèque juridique algérienne</p>
                <h1 className="text-3xl font-bold text-slate-950">Bibliothèque juridique algérienne</h1>
              </div>
              <div className="flex flex-1">
                <LibraryViewer src={LIBRARY_VIEWER_URL} />
              </div>
            </div>
          </main>
        </div>
        {authDialog}
        {accessRestrictionDialog}
        <CollapsibleFooter
          collapsed={footerCollapsed}
          onToggle={() => setFooterCollapsed((prev) => !prev)}
        />
      </>
    );
  }

  // Page principale (Assistant IA) - Nécessite une authentification
  if (effectivePage === 'main') {
    if (!isAuthenticated) {
      // L'effet ci-dessus ouvrira la modale d'authentification
      return null;
    }

    // Vérifier l'accès IA
    const accessCheck = checkUserAccess(userInfo);
    if (!accessCheck.canAccessAI && userInfo.role !== 'admin') {
      return null;
    }

    const workspaceLabel = workspaceState.root ? `/${workspaceState.root.name}` : '/Mizane';
    const conversationDisplay = workspaceState.conversationFilename
      ? workspaceState.conversationFilename.replace(/\.json$/i, '')
      : 'Aucune conversation';

    return (
      <>
        <div className="h-screen flex flex-col bg-background">
        <MizaneHeader {...headerProps} />

        {/* Alertes utilisateur */}
          {userAlerts.length > 0 && (
            <UserAlerts
              alerts={userAlerts}
              onDismiss={dismissAlert}
              userInfo={userInfo}
            />
          )}

          {/* Contenu principal */}
          <div className="px-6 py-3 border-b border-border bg-muted/30">
            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="text-base font-semibold text-foreground">Assistant IA</span>
              <Separator orientation="vertical" className="hidden sm:block h-5" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { void handleSelectWorkspace(); }}
                  className="flex items-center gap-2"
                >
                  <Home className="w-3 h-3" />
                  <span>{workspaceState.root ? workspaceLabel : 'Sélectionner /Mizane'}</span>
                </Button>
                <span
                  className={`h-2.5 w-2.5 rounded-full ${workspaceState.root ? 'bg-emerald-400' : 'bg-amber-400'}`}
                />
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-5" />
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { void handleOpenClientPanel(); }}
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="w-3 h-3" />
                  Dossier client
                </Button>
                <span className="text-sm text-muted-foreground">
                  {workspaceState.selectedClient ? workspaceState.selectedClient.name : 'Aucun'}
                </span>
              </div>
              <Separator orientation="vertical" className="hidden sm:block h-5" />
              <div className="flex items-center gap-2">
                <Languages className="w-4 h-4 text-muted-foreground" />
                <Select value={document.language} onValueChange={wrappedHandlers.handleLanguageChange}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(languages).map(([code, lang]) => (
                      <SelectItem key={code} value={code}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <div className="flex-1 flex bg-background overflow-hidden min-h-0">
            {/* Panel Chatbot */}
          <div className="w-1/2 flex flex-col border-r border-border overflow-hidden min-h-0">
            <div className="p-4 border-b border-border space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-2">
                        <AgentIcon className={`w-5 h-5 ${activeAgentColor}`} />
                        <span className="text-sm font-medium text-foreground">
                          {workspaceState.selectedClient ? conversationDisplay : 'Aucune conversation'}
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      {workspaceState.selectedClient
                        ? conversationDisplay
                        : 'Travaillez sur un dossier pour pouvoir sauvegarder votre discussion.'}
                    </TooltipContent>
                  </Tooltip>
                  {chatMessages.length > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {chatMessages.length} messages
                    </Badge>
                  )}
                  {(() => {
                    const accessCheck = checkUserAccess(userInfo);
                    return !accessCheck.canAccessAI && userInfo.role !== 'admin' ? (
                      <Badge variant="destructive" className="text-xs">
                        Accès restreint
                      </Badge>
                    ) : null;
                  })()}
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={wrappedHandlers.handleClearChat}
                    disabled={chatMessages.length === 0}
                    className="h-7 px-2 whitespace-nowrap"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Vider le chat
                  </Button>
                </div>
              </div>

              <div className={`flex flex-wrap items-center gap-2 ${chatLanguage === 'ar' ? 'justify-end' : ''}`}>
                <Popover open={assistantMenuOpen} onOpenChange={setAssistantMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        'border-input data-[placeholder]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 min-w-[220px] sm:flex-none',
                        chatLanguage === 'ar' ? 'flex-row-reverse text-right' : 'justify-start'
                      )}
                    >
                      <Bot className={`w-4 h-4 text-muted-foreground ${chatLanguage === 'ar' ? 'ml-2' : 'mr-2'}`} />
                      <span
                        dir={chatLanguage === 'ar' ? 'rtl' : 'ltr'}
                        className={cn('truncate flex-1', chatLanguage === 'ar' ? 'text-right' : 'text-left')}
                      >
                        {activeAgentName}
                      </span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align={chatLanguage === 'ar' ? 'end' : 'start'}
                    dir={chatLanguage === 'ar' ? 'rtl' : 'ltr'}
                    className={cn(
                      'p-0 w-[min(22rem,90vw)] shadow-lg border bg-background',
                      chatLanguage === 'ar' ? 'text-right' : 'text-left'
                    )}
                  >
                    <div className="max-h-72 overflow-y-auto py-2">
                      {availableAgentIds.map((id) => {
                        const agent = aiAgents[id];
                        if (!agent) {
                          return null;
                        }
                        const IconComponent = agent.icon;
                        const isActive = currentAgent === id;
                        return (
                          <button
                            type="button"
                            key={id}
                            onClick={() => {
                              setAssistantMenuOpen(false);
                              wrappedHandlers.handleAgentChange(id as AIAgentType);
                            }}
                            className={cn(
                              'w-full flex items-center gap-3 px-3 py-2 text-sm transition rounded-md text-foreground',
                              isActive ? 'bg-accent/30 ring-1 ring-primary/30' : 'hover:bg-accent/20',
                              chatLanguage === 'ar' ? 'flex-row-reverse text-right' : 'text-left'
                            )}
                          >
                            <IconComponent className={`w-4 h-4 shrink-0 ${agent.color}`} />
                            <div className={cn('flex flex-col flex-1', chatLanguage === 'ar' ? 'items-end text-right' : '')}>
                              <span className="font-medium">{agent.name}</span>
                              <span className="text-xs text-muted-foreground">{agent.description}</span>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>
                {availableAgentIds.length === 0 && (
                  <Badge variant="outline" className="text-xs">
                    Configurez vos fonctions IA dans l'administration.
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-hidden min-h-0">
              <ScrollArea className="h-full">
                <div className="p-4 space-y-4">
                  {chatMessages.length > 0 ? (
                    <React.Fragment>
                      <React.Suspense fallback={<InlineSuspenseFallback label="Chargement des outils de copie..." />}>
                        <ChatCopyControls
                          messages={chatMessages}
                          onCopyToEditor={wrappedHandlers.handleCopyToEditor}
                          language={chatLanguage}
                          userAvatarUrl={userInfo.avatar || undefined}
                        />
                      </React.Suspense>
                      {isChatProcessing && <ChatProcessingIndicator />}
                    </React.Fragment>
                  ) : (
                    <div className="flex items-center justify-center h-[360px] text-muted-foreground">
                      <div className="text-center space-y-4">
                        <div>
                          <AgentIcon className={`w-12 h-12 mx-auto mb-4 opacity-50 ${activeAgentColor}`} />
                          <h3 className="font-medium mb-2">{activeAgentName}</h3>
                          <p className="text-sm mb-2">{activeAgent?.description ?? 'Configurez cette fonction dans le panneau d’administration pour personnaliser son rôle.'}</p>
                          <div className="flex flex-col gap-2 text-xs">
                            <div className="flex items-center gap-2 justify-center">
                              <File className="w-3 h-3" />
                              <span>Ajoutez des références de fichiers</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center">
                              <Globe className="w-3 h-3" />
                              <span>Incluez des URLs dans vos prompts</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center">
                              <Download className="w-3 h-3" />
                              <span>Chargez des fichiers depuis internet</span>
                            </div>
                            <div className="flex items-center gap-2 justify-center">
                              <Mic className="w-3 h-3" />
                              <span>Utilisez la saisie vocale</span>
                            </div>
                          </div>
                        </div>
                        {isChatProcessing && <ChatProcessingIndicator />}
                      </div>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            <div className="p-4 border-t border-border">
              <React.Suspense fallback={<InlineSuspenseFallback label="Chargement de la zone de saisie..." />}>
                <ChatInputControls
                  value={chatInput}
                  onChange={setChatInput}
                  onSend={wrappedHandlers.handleSendMessage}
                  onFileLoadedToChat={wrappedHandlers.handleFileLoadedToChat}
                  language={document.language}
                  dir={languages[document.language].dir}
                  placeholder={t.typeMessage}
                  onStop={wrappedHandlers.handleStopResponse}
                  isProcessing={isChatProcessing}
                  onToggleSpeechOutput={handleToggleSpeechOutput}
                  speechOutputEnabled={speechOutputEnabled}
                  speechOutputSupported={speechOutputSupported}
                />
              </React.Suspense>
            </div>
          </div>
          {/* Panel Éditeur */}
          <div className="w-1/2 flex flex-col overflow-hidden min-h-0">
            <div className={`p-4 border-b border-border ${editorBackgroundClass}`}>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className={`flex items-center gap-2 ${editorAccentTextClass}`}>
                      <Sparkles className={`w-5 h-5 ${editorAccentIconClass}`} />
                      <h2 className="text-lg font-semibold">
                        {isTemplateMode ? (t.templateTitle ?? 'Templates juridiques') : t.documentTitle}
                      </h2>
                    </div>
                    <div className="inline-flex rounded-md bg-background/80 p-1 shadow-sm">
                      <Button
                        type="button"
                        variant="ghost"
                        className={`h-8 px-3 text-sm ${!isTemplateMode ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setEditorMode('document')}
                        aria-pressed={!isTemplateMode}
                      >
                        {t.editorDocumentTab ?? 'Document'}
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className={`h-8 px-3 text-sm ${isTemplateMode ? 'bg-white shadow text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                        onClick={() => setEditorMode('template')}
                        aria-pressed={isTemplateMode}
                      >
                        {t.editorTemplateTab ?? 'Template'}
                      </Button>
                    </div>
                  </div>
                </div>

                <EditorActions
                  isTemplateMode={isTemplateMode}
                  translations={t}
                  saveStatus={saveStatus}
                  showWorkspaceReminder={showWorkspaceSelectionReminder && !workspaceState.root}
                  showClientReminder={showClientSelectionReminder}
                  workspaceSelectionWarning={workspaceSelectionWarning}
                  clientSelectionWarning={clientSelectionWarning}
                  onDismissWorkspaceReminder={clearWorkspaceSelectionReminder}
                  onDismissClientReminder={clearClientSelectionReminder}
                  onCreateNew={handleNewActionClick}
                  onOpenFile={handleOpenActionClick}
                  onSave={handleSaveActionClick}
                  onSaveAs={handleSaveAsActionClick}
                  onInsertFile={() => {
                    const allowed = isTemplateMode
                      ? ensureWorkspaceSelection()
                      : ensureClientSelectionForDocuments();
                    if (!allowed) {
                      return;
                    }
                    resetFileInputs();
                    insertFileInputRef.current?.click();
                  }}
                  onInsertTemplate={() => {
                    const allowed = isTemplateMode
                      ? ensureWorkspaceSelection()
                      : ensureClientSelectionForDocuments();
                    if (!allowed) {
                      return;
                    }
                    resetFileInputs();
                    templateInsertInputRef.current?.click();
                  }}
                  onLoadFromUrl={() => {
                    const allowed = isTemplateMode
                      ? ensureWorkspaceSelection()
                      : ensureClientSelectionForDocuments();
                    if (!allowed) {
                      return;
                    }
                    setLoadFromUrlDialogOpen(true);
                  }}
                />

                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[220px]">
                    <Input
                      value={document.fullPath}
                      onChange={(e) => wrappedHandlers.handleFullPathChange(e.target.value)}
                      placeholder="Saisissez le nom du document"
                      dir={languages[document.language].dir}
                    />
                  </div>
                  {document.isModified && (
                    <Badge variant="secondary">*</Badge>
                  )}
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => viewMode === 'preview' ? setViewMode('edit') : null}
                      variant={viewMode === 'edit' ? 'default' : 'outline'}
                      size="icon"
                      className={`transition-all ${viewMode === 'edit' ? 'bg-primary text-primary-foreground' : ''}`}
                      aria-label={t.switchToEdit ?? 'Mode édition'}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => viewMode === 'edit' ? setViewMode('preview') : null}
                      variant={viewMode === 'preview' ? 'default' : 'outline'}
                      size="icon"
                      className={`transition-all ${viewMode === 'preview' ? 'bg-primary text-primary-foreground' : ''}`}
                      aria-label={t.switchToPreview ?? 'Mode aperçu'}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                {isTemplateMode && (
                  <div className="flex items-center gap-2 rounded border border-purple-200 bg-white/70 px-3 py-2 text-xs text-purple-700">
                    <Info className="w-3 h-3" />
                  <span>{t.templateHint ?? 'Templates stockés sous /Mizane/templates avec le préfixe temp_'}</span>
                  </div>
                )}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.rtf,.doc,.docx,.json"
                onChange={wrappedHandlers.handleOpenFile}
                className="hidden"
              />

              <input
                ref={insertFileInputRef}
                type="file"
                accept=".txt,.md,.rtf,.doc,.docx,.json"
                onChange={wrappedHandlers.handleInsertFile}
                className="hidden"
              />

              <input
                ref={templateFileInputRef}
                type="file"
                accept=".rtf"
                onChange={handleTemplateFileInput}
                className="hidden"
              />

              <input
                ref={templateInsertInputRef}
                type="file"
                accept=".rtf"
                onChange={wrappedHandlers.handleInsertTemplate}
                className="hidden"
              />
            </div>

            {viewMode === 'edit' && (
              <React.Suspense fallback={<InlineSuspenseFallback label="Chargement de la barre d'outils..." />}>
                <MarkdownToolbar 
                  onInsert={wrappedHandlers.insertMarkdown}
                  language={document.language}
                />
              </React.Suspense>
            )}

            <div className="flex-1 relative min-h-0">
              {viewMode === 'edit' ? (
                <div className="h-full p-4">
                  <textarea
                    ref={textareaRef}
                    value={document.content}
                    onChange={(e) => setDocument(prev => ({ ...prev, content: e.target.value, isModified: true }))}
                    className="w-full h-full resize-none border-0 focus:ring-0 bg-transparent outline-none focus:outline-none"
                    placeholder="# Mon Document\n\nCommencez à taper votre document avec le **formatage Markdown**..."
                    dir={languages[document.language].dir}
                    style={{ 
                      direction: languages[document.language].dir,
                      fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                    }}
                  />
                </div>
              ) : (
                <React.Suspense fallback={<SuspenseFallback label="Chargement de l'aperçu..." />}>
                  <MarkdownPreview 
                    content={document.content}
                    language={document.language}
                  />
                </React.Suspense>
              )}
            </div>

            <div className="px-4 py-2 border-t border-border bg-muted/30">
              <div className="flex flex-col gap-1 text-xs text-muted-foreground">
                <div className="flex flex-wrap items-center gap-4">
                  <span>Caractères&nbsp;: {document.content.length}</span>
                  <span>Lignes&nbsp;: {document.content.split('\n').length}</span>
                  <span>Mode&nbsp;: {viewMode === 'edit' ? t.editMode : t.previewMode}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span>Agent&nbsp;: {activeAgentName}</span>
                  <span>•</span>
                  <span>Assistant&nbsp;: {activeAssistantConfig ? activeAssistantConfig.name : 'Aucun'}</span>
                  <span>•</span>
                  <span>Langue&nbsp;: {languages[document.language].name}</span>
                  <span>•</span>
                  <span>Authentifié&nbsp;: {userInfo.name}</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span>{lastRequestTokensText}</span>
                  <span>•</span>
                  <span>{cumulativeTokensText}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <CollapsibleFooter
          collapsed={footerCollapsed}
          onToggle={() => setFooterCollapsed((prev) => !prev)}
        />

        {/* Modales */}
        <React.Suspense fallback={null}>
          <SaveFormatDialog
            open={saveAsDialogOpen}
            onOpenChange={setSaveAsDialogOpen}
            filename={saveAsFilename}
            onSave={(filename, format) => handleSaveWithFormat(filename, format as 'txt' | 'rtf' | 'md' | 'docx')}
            hasMarkdown={hasMarkdownFormatting(document.content ?? '')}
            onFilenameChange={setSaveAsFilename}
            language={document.language}
          />
        </React.Suspense>

        <React.Suspense fallback={null}>
          <LoadFromUrlDialog
            open={loadFromUrlDialogOpen}
            onOpenChange={setLoadFromUrlDialogOpen}
            onFileLoaded={wrappedHandlers.handleFileLoadedFromUrl}
            language={document.language}
          />
        </React.Suspense>

        <React.Suspense fallback={<SuspenseFallback label="Chargement des modules de gestion..." />}>
          <ModalsContainer
            changePasswordOpen={changePasswordOpen}
            setChangePasswordOpen={setChangePasswordOpen}
            addressesOpen={addressesOpen}
            setAddressesOpen={setAddressesOpen}
            preferencesOpen={preferencesOpen}
            setPreferencesOpen={setPreferencesOpen}
            cartOpen={cartOpen}
            setCartOpen={setCartOpen}
            checkoutOpen={checkoutOpen}
            setCheckoutOpen={setCheckoutOpen}
            paymentOpen={paymentOpen}
            setPaymentOpen={setPaymentOpen}
            orderCompleteOpen={orderCompleteOpen}
            setOrderCompleteOpen={setOrderCompleteOpen}
            storeOpen={storeOpen}
            setStoreOpen={setStoreOpen}
            accountInfoOpen={accountInfoOpen}
            setAccountInfoOpen={setAccountInfoOpen}
            personalAddress={personalAddress}
            setPersonalAddress={setPersonalAddress}
            billingAddress={billingAddress}
            setBillingAddress={setBillingAddress}
            siteLanguage={siteLanguage}
            setSiteLanguage={setSiteLanguage}
            chatLanguage={chatLanguage}
            setChatLanguage={setChatLanguage}
            cart={cart}
            userInfo={userInfo}
            setUserInfo={setUserInfo}
            invoices={invoices}
            currentOrder={currentOrder}
            selectedPaymentMethod={selectedPaymentMethod}
            setSelectedPaymentMethod={setSelectedPaymentMethod}
            pricingSettings={pricingSettings}
            paymentSettings={paymentSettings}
            handleChangePassword={handleChangePassword}
            handleSaveAddresses={handleSaveAddresses}
            handleSavePreferences={handleSavePreferences}
            handleSaveAccountInfo={handleSaveAccountInfo}
            handleSelectInvoice={handleSelectInvoice}
            handleDownloadInvoice={handleDownloadInvoice}
            handleUpdateInvoice={handleUpdateInvoice}
            updateCartItemQuantity={wrappedHandlers.updateCartItemQuantity}
            removeFromCart={wrappedHandlers.removeFromCart}
            processOrder={wrappedHandlers.processOrder}
            addToCart={wrappedHandlers.addToCart}
            vatRate={vatRate}
            onProceedToCheckout={handleProceedToCheckout}
            t={t}
          />
        </React.Suspense>
        <Sheet open={workspacePanelOpen} onOpenChange={setWorkspacePanelOpen}>
          <SheetContent side="right" className="w-full max-w-md">
            <SheetHeader className="pb-4">
              <SheetTitle>Espace client</SheetTitle>
            </SheetHeader>
            <ClientWorkspacePanel
              state={workspaceState}
              actions={workspaceActions}
              onRequestClose={() => setWorkspacePanelOpen(false)}
            />
          </SheetContent>
        </Sheet>
        </div>
        {authDialog}
        {accessRestrictionDialog}
      </>
    );
  }

  // Fallback - ne devrait jamais arriver
  return null;
}
