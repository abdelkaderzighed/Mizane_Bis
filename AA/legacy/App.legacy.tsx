import React, { useState, useRef } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { Card } from './components/ui/card';
import { Separator } from './components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './components/ui/select';
import { Badge } from './components/ui/badge';
import { ScrollArea } from './components/ui/scroll-area';
import { Checkbox } from './components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from './components/ui/popover';
import { Avatar, AvatarFallback, AvatarImage } from './components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './components/ui/dropdown-menu';
import MarkdownToolbar from './components/MarkdownToolbar';
import MarkdownPreview from './components/MarkdownPreview';
import SaveFormatDialog from './components/SaveFormatDialog';
import ChatCopyControls from './components/ChatCopyControls';
import ChatInputControls from './components/ChatInputControls';
import LoadFromUrlDialog from './components/LoadFromUrlDialog';
import { InvoiceDetailModal } from './components/modals/InvoiceDetailModal';
import { PricingPage } from './components/PricingPage';
import { AdminPage } from './components/AdminPage';
import { HomePage } from './components/HomePage';
import { SimpleAuthPage } from './components/SimpleAuthPage';
import { Footer } from './components/Footer';
import { ModalsContainer } from './components/ModalsContainer';
import { UserAlerts } from './components/UserAlerts';
import ConversationHistoryModal from './components/ConversationHistoryModal';
import { useConversationHistory } from './utils/conversationHistory';
import {
  createCartItem,
  updateCartItem,
  createOrder,
  getStatusColor,
  getFilenameFromPath,
  calculateOrderSummary
} from './utils/orderUtils';
import { generateAgentResponse } from './utils/agentUtils';
import { hasMarkdownFormatting, markdownToRtf } from './utils/markdownToRtf';
import { initializeMisanDatabase } from './utils/supabase/init-database';
import { resetMisanDatabase } from './utils/supabase/reset-database';
import {
  ChatMessage,
  DocumentState,
  AIAgentType,
  AIAgent,
  LLMType,
  LLMModel,
  UserInfo,
  Invoice,
  CartItem,
  Order,
  PaymentMethod,
  Address,
  LanguageCode
} from './types';
import {
  languages,
  MOCK_USER_INFO,
  MOCK_INVOICES,
  MOCK_ADDRESSES
} from './constants/config';
import { translations } from './locales/translations';
import {
  Save,
  FolderOpen,
  FileText,
  MessageSquare,
  Copy,
  Upload,
  Languages,
  Download,
  Info,
  Sparkles,
  Eye,
  Edit,
  Trash2,
  Globe,
  File,
  FolderIcon,
  Mic,
  Bot,
  PenTool,
  CheckCircle,
  BookOpen,
  BrainCircuit,
  Zap,
  ChevronDown,
  Settings,
  Cpu,
  Brain,
  User,
  Coins,
  Calendar,
  CreditCard,
  MapPin,
  Key,
  Receipt,
  ShoppingCart,
  Home,
  Building2,
  Camera,
  Phone,
  ExternalLink,
  Plus,
  Minus,
  LogOut,
  History
} from 'lucide-react';
import { toast } from 'sonner';

export default function App() {
  // États d'authentification - Simplifiés pour éviter la confusion
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authAccess, setAuthAccess] = useState<any>(null);
  const [authAlerts, setAuthAlerts] = useState<any[]>([]);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);

  // État pour la navigation entre les pages
  const [currentPage, setCurrentPage] = useState<'home' | 'main' | 'pricing' | 'admin' | 'auth'>('home');

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState<AIAgentType>('conversation');
  const [selectedLLMs, setSelectedLLMs] = useState<LLMType[]>(['gpt4']);
  const [llmSelectorOpen, setLlmSelectorOpen] = useState(false);
  
  // État pour l'historique des conversations
  const [conversationHistoryOpen, setConversationHistoryOpen] = useState(false);
  const conversationHistory = useConversationHistory(isAuthenticated ? authUser?.id : undefined);

  const [document, setDocument] = useState<DocumentState>({
    content: '',
    filename: 'nouveau_document.txt',
    fullPath: 'nouveau_document.txt',
    language: 'fr',
    isModified: false
  });
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [saveAsFilename, setSaveAsFilename] = useState('');
  const [loadFromUrlDialogOpen, setLoadFromUrlDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');

  // États des modales profil
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [pricingOpen, setPricingOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [orderCompleteOpen, setOrderCompleteOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card_cib');

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertFileInputRef = useRef<HTMLInputElement>(null);

  // Données utilisateur et configuration - Toujours initialisé avec MOCK_USER_INFO
  const [userInfo, setUserInfo] = useState<UserInfo>(MOCK_USER_INFO);
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES as any);
  const [personalAddress, setPersonalAddress] = useState<Address>(MOCK_ADDRESSES.personal);
  const [billingAddress, setBillingAddress] = useState<Address>(MOCK_ADDRESSES.billing);
  const [siteLanguage, setSiteLanguage] = useState<LanguageCode>('fr');
  const [chatLanguage, setChatLanguage] = useState<LanguageCode>('fr');
  
  // Configuration des agents IA
  const aiAgents: Record<AIAgentType, AIAgent> = {
    conversation: {
      id: 'conversation',
      name: translations[siteLanguage].agents.conversation.name,
      description: translations[siteLanguage].agents.conversation.description,
      icon: MessageSquare,
      color: 'text-blue-600'
    },
    writing: {
      id: 'writing',
      name: translations[siteLanguage].agents.writing.name,
      description: translations[siteLanguage].agents.writing.description,
      icon: PenTool,
      color: 'text-green-600'
    },
    correction: {
      id: 'correction',
      name: translations[siteLanguage].agents.correction.name,
      description: translations[siteLanguage].agents.correction.description,
      icon: CheckCircle,
      color: 'text-red-600'
    },
    analysis: {
      id: 'analysis',
      name: translations[siteLanguage].agents.analysis.name,
      description: translations[siteLanguage].agents.analysis.description,
      icon: BookOpen,
      color: 'text-purple-600'
    },
    creative: {
      id: 'creative',
      name: translations[siteLanguage].agents.creative.name,
      description: translations[siteLanguage].agents.creative.description,
      icon: Sparkles,
      color: 'text-pink-600'
    },
    technical: {
      id: 'technical',
      name: translations[siteLanguage].agents.technical.name,
      description: translations[siteLanguage].agents.technical.description,
      icon: BrainCircuit,
      color: 'text-orange-600'
    }
  };

  // Configuration des modèles LLM
  const llmModels: Record<LLMType, LLMModel> = {
    gpt4: {
      id: 'gpt4',
      name: translations[siteLanguage].llms.gpt4.name,
      provider: translations[siteLanguage].llms.gpt4.provider,
      description: translations[siteLanguage].llms.gpt4.description,
      color: 'text-green-600',
      isPremium: true
    },
    gpt35: {
      id: 'gpt35',
      name: translations[siteLanguage].llms.gpt35.name,
      provider: translations[siteLanguage].llms.gpt35.provider,
      description: translations[siteLanguage].llms.gpt35.description,
      color: 'text-blue-600',
      isPremium: false
    },
    claude35sonnet: {
      id: 'claude35sonnet',
      name: translations[siteLanguage].llms.claude35sonnet.name,
      provider: translations[siteLanguage].llms.claude35sonnet.provider,
      description: translations[siteLanguage].llms.claude35sonnet.description,
      color: 'text-purple-600',
      isPremium: true
    },
    claude3haiku: {
      id: 'claude3haiku',
      name: translations[siteLanguage].llms.claude3haiku.name,
      provider: translations[siteLanguage].llms.claude3haiku.provider,
      description: translations[siteLanguage].llms.claude3haiku.description,
      color: 'text-indigo-600',
      isPremium: false
    },
    gemini: {
      id: 'gemini',
      name: translations[siteLanguage].llms.gemini.name,
      provider: translations[siteLanguage].llms.gemini.provider,
      description: translations[siteLanguage].llms.gemini.description,
      color: 'text-yellow-600',
      isPremium: false
    },
    llama2: {
      id: 'llama2',
      name: translations[siteLanguage].llms.llama2.name,
      provider: translations[siteLanguage].llms.llama2.provider,
      description: translations[siteLanguage].llms.llama2.description,
      color: 'text-orange-600',
      isPremium: false
    },
    mistral: {
      id: 'mistral',
      name: translations[siteLanguage].llms.mistral.name,
      provider: translations[siteLanguage].llms.mistral.provider,
      description: translations[siteLanguage].llms.mistral.description,
      color: 'text-red-600',
      isPremium: false
    },
    palm2: {
      id: 'palm2',
      name: translations[siteLanguage].llms.palm2.name,
      provider: translations[siteLanguage].llms.palm2.provider,
      description: translations[siteLanguage].llms.palm2.description,
      color: 'text-gray-600',
      isPremium: false
    }
  };

  const t = translations[siteLanguage];

  const hasMarkdownContent = hasMarkdownFormatting(document.content);
  const activeAgent = aiAgents[currentAgent];
  const AgentIcon = activeAgent.icon;

  // Fonctions de gestion des alertes utilisateur
  const generateUserAlerts = (user: UserInfo) => {
    const alerts: any[] = [];
    
    // Pas d'alertes pour l'administrateur
    if (user.role === 'admin') {
      return alerts;
    }
    
    const now = new Date();
    const subscriptionEnd = new Date(user.subscriptionEnd);
    const daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    // Alerte période d'essai qui se termine
    if (user.subscriptionType === 'trial' && daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
      alerts.push({
        id: 'trial_ending',
        type: 'trial_ending',
        title: `Votre période d'essai se termine dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`,
        message: 'Souscrivez à un abonnement Pro pour continuer à utiliser tous les agents IA et modèles LLM premium.',
        action: {
          label: 'Voir les tarifs',
          onClick: () => setCurrentPage('pricing')
        },
        dismissible: true
      });
    }

    // Alerte abonnement expiré
    if (user.subscriptionType === 'trial' && daysUntilExpiry <= 0) {
      alerts.push({
        id: 'subscription_expired',
        type: 'subscription_expired',
        title: 'Votre période d\'essai a expiré',
        message: 'Vous avez maintenant accès aux fonctionnalités de base uniquement. Souscrivez à un abonnement Pro pour retrouver toutes les fonctionnalités.',
        action: {
          label: 'S\'abonner maintenant',
          onClick: () => setCurrentPage('pricing')
        },
        dismissible: false
      });
    }

    // Alerte jetons faibles
    if (user.tokens < 10000) {
      alerts.push({
        id: 'low_tokens',
        type: 'low_tokens',
        title: 'Nombre de jetons faible',
        message: `Il vous reste ${user.tokens.toLocaleString()} jetons. Rechargez votre compte pour continuer à utiliser l'IA sans interruption.`,
        action: {
          label: 'Acheter des jetons',
          onClick: () => setStoreOpen(true)
        },
        dismissible: true
      });
    }

    return alerts;
  };

  // Générer les alertes automatiquement quand l'utilisateur est connecté
  React.useEffect(() => {
    if (isAuthenticated && userInfo) {
      const alerts = generateUserAlerts(userInfo);
      setUserAlerts(alerts);
    } else {
      setUserAlerts([]);
    }
  }, [isAuthenticated, userInfo]);

  // Fonction pour dismisser une alerte
  const dismissAlert = (alertId: string) => {
    setUserAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Calculer la date d'expiration de l'abonnement
  const getSubscriptionExpiryInfo = () => {
    if (!isAuthenticated || !userInfo.subscriptionEnd) return null;
    
    const expiryDate = new Date(userInfo.subscriptionEnd);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    const isExpired = daysUntilExpiry <= 0;
    const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
    
    return {
      date: expiryDate.toLocaleDateString('fr-FR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      }),
      daysUntilExpiry,
      isExpired,
      isExpiringSoon,
      subscriptionType: userInfo.subscriptionType
    };
  };

  const subscriptionInfo = getSubscriptionExpiryInfo();

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
      default:
        console.log('Action de menu profil inconnue:', action);
    }
  };

  // Fonctions de gestion des agents et LLM
  const handleAgentChange = (newAgent: AIAgentType) => {
    setCurrentAgent(newAgent);
    toast.success(`Agent ${aiAgents[newAgent].name} sélectionné`);
  };

  const handleLLMToggle = (llmId: LLMType) => {
    setSelectedLLMs(prev => {
      if (prev.includes(llmId)) {
        return prev.filter(id => id !== llmId);
      } else {
        return [...prev, llmId];
      }
    });
  };

  // Fonction pour gérer l'authentification
  const handleAuthSuccess = (authResult: any) => {
    // Vérifier si c'est une authentification réelle ou mock
    if (authResult.user && authResult.user.email === 'a@a.a') {
      // Utiliser l'authentification réelle pour l'admin
      console.log('🔄 Basculement vers l\'authentification réelle pour l\'admin...');
      
      // Tenter une connexion réelle
      checkRealAdminAuth(authResult);
    } else {
      // Utiliser les données mock pour les autres utilisateurs
      setAuthUser(authResult.user);
      setAuthAccess(authResult.access);
      setAuthAlerts(authResult.alerts || []);
      setUserInfo(authResult.user);
      setIsAuthenticated(true);

      // Rediriger vers la page d'accueil après connexion réussie
      setCurrentPage('home');
      
      toast.success(`Bienvenue ${authResult.user.name} !`);
    }
  };

  const checkRealAdminAuth = async (mockAuthResult: any) => {
    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      const result = await misanAuth.signIn('a@a.a', 'admin');

      if (result && result.success && result.user) {
        // Authentification réelle réussie
        setAuthUser(result.user);
        setAuthAccess(result.access);
        setAuthAlerts(result.alerts || []);
        setUserInfo(result.user);
        setIsAuthenticated(true);

        // Rediriger vers la page d'accueil après connexion réussie
        setCurrentPage('home');
        
        toast.success(`Connexion admin réelle réussie ! Bienvenue ${result.user.name}`);
      } else {
        // Fallback vers les données mock si l'authentification réelle échoue
        console.log('Authentification réelle échouée, utilisation des données mock');
        setAuthUser(mockAuthResult.user);
        setAuthAccess(mockAuthResult.access);
        setAuthAlerts(mockAuthResult.alerts || []);
        setUserInfo(mockAuthResult.user);
        setIsAuthenticated(true);

        // Rediriger vers la page d'accueil après connexion réussie
        setCurrentPage('home');
        
        toast.success(`Bienvenue ${mockAuthResult.user.name} (mode développement)`);
      }
    } catch (error) {
      console.log('Erreur authentification réelle, utilisation des données mock:', error);
      // Fallback vers les données mock
      setAuthUser(mockAuthResult.user);
      setAuthAccess(mockAuthResult.access);
      setAuthAlerts(mockAuthResult.alerts || []);
      setUserInfo(mockAuthResult.user);
      setIsAuthenticated(true);

      // Rediriger vers la page d'accueil après connexion réussie
      setCurrentPage('home');
      
      toast.success(`Bienvenue ${mockAuthResult.user.name} (mode développement)`);
    }
  };

  // Fonctions de gestion du chat
  const handleSendMessage = async () => {
    if (!chatInput.trim() || selectedLLMs.length === 0) {
      if (selectedLLMs.length === 0) {
        toast.error('Veuillez sélectionner au moins un modèle LLM');
      }
      return;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatInput,
      sender: 'user',
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Gérer l'historique des conversations - créer une nouvelle session si nécessaire
    try {
      if (!conversationHistory.hasActiveSession()) {
        conversationHistory.createNewSession(currentAgent, selectedLLMs);
      }

      // Ajouter le message utilisateur à l'historique
      conversationHistory.addMessageToCurrentSession(userMessage as any);
    } catch (error) {
      console.log('Erreur lors de la gestion de l\'historique:', error);
      // Créer une nouvelle session en cas d'erreur
      try {
        conversationHistory.createNewSession(currentAgent, selectedLLMs);
        conversationHistory.addMessageToCurrentSession(userMessage as any);
      } catch (retryError) {
        console.log('Impossible de créer la session d\'historique:', retryError);
      }
    }

    // Simuler une réponse de l'IA
    try {
      const response = await generateAgentResponse(
        chatInput,
        currentAgent,
        selectedLLMs,
        llmModels
      );

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: response,
        sender: 'ai',
        timestamp: new Date(),
        agent: currentAgent,
        llms: selectedLLMs
      };

      setChatMessages(prev => [...prev, aiMessage]);
      
      // Ajouter le message IA à l'historique
      try {
        conversationHistory.addMessageToCurrentSession(aiMessage as any);
      } catch (error) {
        console.log('Erreur lors de l\'ajout du message IA à l\'historique:', error);
      }
    } catch (error) {
      console.error('Erreur génération réponse:', error);
      toast.error('Erreur lors de la génération de la réponse');
    }
  };

  const handleClearChat = () => {
    // Terminer la session actuelle avant d'effacer le chat
    if (conversationHistory.hasActiveSession()) {
      conversationHistory.endCurrentSession();
    }
    
    setChatMessages([]);
    toast.success('Conversation effacée');
  };

  // Fonctions de gestion de l'historique des conversations
  const handleLoadConversationFromHistory = (sessionId: string) => {
    const messages = conversationHistory.loadSession(sessionId);
    setChatMessages(messages as ChatMessage[]);
    
    // Récupérer les informations de la session pour mettre à jour l'agent et les LLMs
    const session = conversationHistory.getSession(sessionId);
    if (session) {
      setCurrentAgent(session.primaryAgent);
      setSelectedLLMs(session.llmsUsed);
    }
    
    toast.success('Conversation restaurée');
  };

  const handleDeleteConversationFromHistory = (sessionId: string) => {
    conversationHistory.deleteSession(sessionId);
    toast.success('Conversation supprimée de l\'historique');
  };

  const handleClearAllConversationsHistory = () => {
    conversationHistory.clearAllSessions();
    toast.success('Historique complet effacé');
  };

  const handleExportConversationsHistory = () => {
    conversationHistory.exportHistory();
    toast.success('Historique exporté');
  };

  const handleCopyToEditor = (content: string) => {
    setDocument(prev => ({
      ...prev,
      content: content,
      isModified: true
    }));
    toast.success('Contenu copié dans l\'éditeur');
  };

  const handleFileLoadedToChat = (content: string, filename: string) => {
    const fileMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `📎 Fichier chargé: ${filename}\n\n${content}`,
      sender: 'user',
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, fileMessage]);
  };

  // Fonctions de gestion des documents
  const handleNewDocument = () => {
    setDocument({
      content: '',
      filename: 'nouveau_document.txt',
      fullPath: 'nouveau_document.txt',
      language: 'fr',
      isModified: false
    });
    toast.success('Nouveau document créé');
  };

  const resetFileInputs = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (insertFileInputRef.current) {
      insertFileInputRef.current.value = '';
    }
  };

  const handleOpenFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setDocument({
        content,
        filename: file.name,
        fullPath: file.name,
        originalFullPath: file.name,
        language: document.language,
        isModified: false
      });
      toast.success(`Fichier "${file.name}" ouvert`);
    };
    reader.readAsText(file);
  };

  const handleInsertFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setDocument(prev => ({
        ...prev,
        content: prev.content + '\n\n' + content,
        isModified: true
      }));
      toast.success(`Contenu du fichier "${file.name}" inséré`);
    };
    reader.readAsText(file);
  };

  const handleFileLoadedFromUrl = (content: string, url: string) => {
    const filename = getFilenameFromPath(url);
    setDocument({
      content,
      filename,
      fullPath: filename,
      originalFullPath: url,
      language: document.language,
      isModified: false
    });
    toast.success(`Fichier chargé depuis: ${url}`);
  };

  const handleSaveFile = () => {
    const blob = new Blob([document.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = document.filename;
    a.click();
    URL.revokeObjectURL(url);
    
    setDocument(prev => ({ ...prev, isModified: false }));
    toast.success(`Fichier "${document.filename}" sauvegardé`);
  };

  const handleSaveAs = () => {
    setSaveAsFilename(document.filename);
    setSaveAsDialogOpen(true);
  };

  const saveWithFormat = (filename: string, format: string) => {
    let content = document.content;
    let mimeType = 'text/plain';
    let extension = '.txt';

    if (format === 'rtf' && hasMarkdownFormatting(document.content)) {
      content = markdownToRtf(document.content);
      mimeType = 'application/rtf';
      extension = '.rtf';
    } else if (format === 'md') {
      mimeType = 'text/markdown';
      extension = '.md';
    }

    const finalFilename = filename.includes('.') ? filename : filename + extension;
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = finalFilename;
    a.click();
    URL.revokeObjectURL(url);

    setDocument(prev => ({ 
      ...prev, 
      filename: finalFilename,
      fullPath: finalFilename,
      isModified: false 
    }));
    toast.success(`Fichier sauvegardé: ${finalFilename}`);
  };

  const handleFullPathChange = (newPath: string) => {
    setDocument(prev => ({
      ...prev,
      fullPath: newPath,
      filename: getFilenameFromPath(newPath),
      isModified: true
    }));
  };

  const handleLanguageChange = (newLanguage: LanguageCode) => {
    setDocument(prev => ({ ...prev, language: newLanguage }));
    toast.success(`Langue changée: ${languages[newLanguage].name}`);
  };

  const handleViewModeToggle = () => {
    setViewMode(prev => prev === 'edit' ? 'preview' : 'edit');
  };

  const insertMarkdown = (markdown: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = 
        document.content.slice(0, start) + 
        markdown + 
        document.content.slice(end);
      
      setDocument(prev => ({ 
        ...prev, 
        content: newContent, 
        isModified: true 
      }));

      // Repositionner le curseur
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + markdown.length,
          start + markdown.length
        );
      }, 0);
    }
  };

  // Fonctions de gestion du commerce
  const addToCart = (item: any) => {
    const cartItem = createCartItem(item);
    setCart(prev => {
      const existing = prev.find(ci => ci.id === cartItem.id);
      if (existing) {
        return prev.map(ci => 
          ci.id === cartItem.id 
            ? updateCartItem(ci, ci.quantity + 1)
            : ci
        );
      }
      return [...prev, cartItem];
    });
    toast.success(`${cartItem.name} ajouté au panier`);
  };

  const updateCartItemQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    
    setCart(prev => prev.map(item => 
      item.id === id 
        ? updateCartItem(item, quantity)
        : item
    ));
  };

  const removeFromCart = (id: string) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.success('Article retiré du panier');
  };

  const processOrder = (orderData: any) => {
    const order = createOrder(cart, orderData, userInfo);
    setCurrentOrder(order);
    
    // Simuler le traitement
    setTimeout(() => {
      setCart([]);
      setCheckoutOpen(false);
      setPaymentOpen(false);
      setOrderCompleteOpen(true);
      toast.success('Commande traitée avec succès !');
    }, 2000);
  };

  // Fonctions de gestion des modales profil
  const handleChangePassword = (data: any) => {
    console.log('Changement de mot de passe:', data);
    toast.success('Mot de passe mis à jour');
    setChangePasswordOpen(false);
  };

  const handleSaveAddresses = (personal: Address, billing: Address) => {
    setPersonalAddress(personal);
    setBillingAddress(billing);
    toast.success('Adresses mises à jour');
    setAddressesOpen(false);
  };

  const handleSavePreferences = (site: LanguageCode, chat: LanguageCode) => {
    setSiteLanguage(site);
    setChatLanguage(chat);
    toast.success('Préférences mises à jour');
    setPreferencesOpen(false);
  };

  const handleSaveAccountInfo = (info: any) => {
    setUserInfo(prev => ({ ...prev, ...info }));
    toast.success('Informations du compte mises à jour');
    setAccountInfoOpen(false);
  };

  // Vérifier la session au chargement
  React.useEffect(() => {
    // Tester le système d'authentification réel
    checkExistingSession();
  }, []);

  const checkExistingSession = async () => {
    try {
      console.log('🔍 Vérification de session existante...');
      const { misanAuth } = await import('./utils/supabase/auth');
      const result = await misanAuth.checkSession();

      if (result && result.success && result.user) {
        console.log('✅ Session valide trouvée:', result.user.email);
        setAuthUser(result.user);
        setAuthAccess(result.access);
        setAuthAlerts(result.alerts || []);
        setUserInfo(result.user);
        setIsAuthenticated(true);

        // Rediriger vers la page d'accueil après connexion réussie
        setCurrentPage('home');
        
        toast.success(`Bienvenue ${result.user.name} !`);
      } else {
        // Pas de session existante, rester sur la page d'authentification
        console.log('ℹ️ Aucune session valide trouvée');
      }
    } catch (error: any) {
      // Gérer spécifiquement les erreurs de refresh token
      if (error?.message?.includes('Invalid Refresh Token') || 
          error?.message?.includes('Refresh Token Not Found') ||
          error?.name === 'AuthApiError') {
        console.log('🔄 Token de session expiré, nettoyage des données...');
        
        // Nettoyer les tokens invalides du localStorage
        try {
          localStorage.removeItem('supabase.auth.token');
          sessionStorage.clear();
          
          // Tenter de nettoyer via l'auth client
          const { misanAuth } = await import('./utils/supabase/auth');
          await misanAuth.signOut();
          
          console.log('🧹 Nettoyage des tokens terminé');
        } catch (cleanupError) {
          console.log('⚠️ Erreur lors du nettoyage:', cleanupError);
        }
      } else {
        console.log('ℹ️ Erreur de vérification de session (normale):', error?.message || error);
      }
      
      // Dans tous les cas, rester sur l'état non authentifié
      console.log('👤 Utilisateur non authentifié - affichage page d\'accueil');
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
      console.log('🔥 Démarrage de la réinitialisation complète...');
      const result = await resetMisanDatabase();

      if (result.success) {
        toast.success('🔥 Base de données complètement réinitialisée !');
        toast.info('Toutes les données ont été supprimées');
        console.log('✅ ÉTAPE 1 TERMINÉE - BASE DE DONNÉES RÉINITIALISÉE');

        // Vérifier que la base de données est vraiment vide
        console.log('🔍 Vérification que la base de données est vide...');

        const { verifyDatabaseEmpty } = await import('./utils/supabase/verify-database');
        const verification = await verifyDatabaseEmpty();

        if (verification.success) {
          if (verification.isEmpty) {
            toast.success('✅ Vérification : Base de données confirmée VIDE');
            console.log('✅ VÉRIFICATION CONFIRMÉE - BASE DE DONNÉES VIDE');

            // Afficher les détails de la vérification
            console.log('📋 Détails de la vérification:');
            verification.details.forEach(detail => console.log(`  ${detail}`));

            toast.info(`Utilisateurs Auth: ${verification.userCount} | Tables vérifiées: ${Object.keys(verification.tableStatus).length}`);
          } else {
            toast.error('⚠️ ATTENTION: Des données subsistent dans la base !');
            console.error('❌ PROBLÈME - DES DONNÉES SUBSISTENT:');
            console.error(`👥 Utilisateurs Auth restants: ${verification.userCount}`);

            // Afficher ce qui reste
            verification.details.forEach(detail => console.log(`  ${detail}`));

            // Afficher le statut des tables
            Object.entries(verification.tableStatus).forEach(([table, status]) => {
              if (status.rowCount > 0) {
                console.error(`🗃️ Table ${table}: ${status.rowCount} lignes restantes`);
              }
            });
          }
        } else {
          toast.error('❌ Impossible de vérifier l\'état de la base de données');
          console.error('❌ Erreur de vérification:', verification.error);
        }
      } else {
        toast.error(result.error || 'Erreur lors de la réinitialisation');
        console.error('❌ ERREUR ÉTAPE 1:', result.error);
      }

      // Afficher les détails de l'opération
      if (result.operations_performed) {
        console.log('📋 Opérations effectuées:', result.operations_performed);
      }

    } catch (error) {
      console.error('❌ Erreur réinitialisation:', error);
      toast.error('Erreur de connexion au serveur');
    } finally {
      setIsInitializingDB(false);
    }
  };

  const handleLogout = async () => {
    try {
      console.log('🚪 Déconnexion en cours...');
      const { misanAuth } = await import('./utils/supabase/auth');
      await misanAuth.signOut();

      // Nettoyer également le localStorage
      try {
        localStorage.removeItem('supabase.auth.token');
        sessionStorage.clear();
      } catch (cleanupError) {
        console.log('⚠️ Erreur lors du nettoyage du localStorage:', cleanupError);
      }

      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthAccess(null);
      setAuthAlerts([]);
      setUserInfo(MOCK_USER_INFO);
      setCurrentPage('home');

      console.log('✅ Déconnexion réussie');
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('❌ Erreur déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
    }
  };

  const handleLogin = () => {
    setCurrentPage('auth');
  };

  // Fonction pour gérer l'accès gratuit - Pour les utilisateurs non connectés, redirige vers l'authentification
  const handleStartFreeAccess = () => {
    if (isAuthenticated) {
      // Utilisateur déjà connecté, diriger vers l'Assistant IA
      setCurrentPage('main');
      toast.success('Accès à l\'Assistant IA accordé !');
    } else {
      // Utilisateur non connecté, diriger vers l'authentification
      setCurrentPage('auth');
      toast.info('Connectez-vous ou créez un compte pour accéder gratuitement à Misan');
    }
  };

  // Si on est sur la page de tarifs, afficher uniquement cette page
  if (currentPage === 'pricing') {
    return (
      <>
        {/* Header Misan */}
        <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentPage('home')}
              className="text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
            >
              Misan
            </button>
            
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isAuthenticated) {
                    setCurrentPage('main');
                  } else {
                    setCurrentPage('auth');
                    toast.info('Connectez-vous pour accéder à l\'Assistant IA');
                  }
                }}
                className="text-white hover:bg-white/20"
                disabled={!isAuthenticated}
                title={isAuthenticated ? "Accéder à l'Assistant IA" : "Connexion requise pour l'Assistant IA"}
              >
                <Bot className="w-4 h-4 mr-2" />
                Assistant IA
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage('pricing')}
                className="text-white hover:bg-white/20"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Tarifs
              </Button>

              {/* Affichage du solde de tokens pour les utilisateurs connectés uniquement (sauf admin) */}
              {isAuthenticated && userInfo.role !== 'admin' && (
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {(userInfo.tokens || 0).toLocaleString()} {t.tokens}
                  </span>
                </div>
              )}

              {/* Affichage de l'expiration d'abonnement pour les utilisateurs connectés uniquement (sauf admin) */}
              {isAuthenticated && userInfo.role !== 'admin' && subscriptionInfo && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">
                    <span className="opacity-75">Expire le</span>{' '}
                    <span className={subscriptionInfo.isExpired ? 'text-red-200' : subscriptionInfo.isExpiringSoon ? 'text-yellow-200' : 'text-white'}>
                      {subscriptionInfo.date}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Menu profil pour utilisateurs connectés */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarImage src={userInfo.avatar} />
                      <AvatarFallback className="bg-white/20 text-white text-xs">
                        {userInfo.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {userInfo.name}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('accountInfo')}>
                    <User className="w-4 h-4 mr-2" />
                    Informations du compte
                  </DropdownMenuItem>
                  {userInfo.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('billing')}>
                      <Receipt className="w-4 h-4 mr-2" />
                      Facturation
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('preferences')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Préférences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {userInfo.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('buySubscription')}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Gérer l'abonnement
                    </DropdownMenuItem>
                  )}
                  {userInfo.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('buyTokens')}>
                      <Coins className="w-4 h-4 mr-2" />
                      Acheter des jetons
                    </DropdownMenuItem>
                  )}
                  {userInfo.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleProfileMenuClick('admin')}>
                        <Key className="w-4 h-4 mr-2" />
                        Administration
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogin}
                className="text-white hover:bg-green-500/20 border border-green-300/30 hover:border-green-400"
                title="Se connecter à Misan"
              >
                <User className="w-4 h-4 mr-2" />
                Connexion
              </Button>
            )}
          </div>
        </div>
        
        <PricingPage
          addToCart={addToCart}
          setUserInfo={setUserInfo}
          setStoreOpen={setStoreOpen}
          setCartOpen={setCartOpen}
          cartLength={cart.length}
          userInfo={userInfo}
          onBackToMain={() => setCurrentPage('home')}
          onProfileMenuClick={handleProfileMenuClick}
        />
        
        {/* Footer */}
        <Footer />
      </>
    );
  }

  // Si on est sur la page d'authentification, afficher uniquement cette page
  if (currentPage === 'auth') {
    return (
      <>
        {/* Header Misan simplifié pour l'authentification */}
        <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
          <button 
            onClick={() => setCurrentPage('home')}
            className="text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
          >
            Misan
          </button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCurrentPage('home')}
            className="text-white hover:bg-white/20"
          >
            <Home className="w-4 h-4 mr-2" />
            Retour à l'accueil
          </Button>
        </div>
        
        <SimpleAuthPage
          onSuccess={handleAuthSuccess}
          onInitializeDatabase={handleInitializeDatabase}
          onResetDatabase={handleResetDatabase}
          isInitializingDB={isInitializingDB}
        />
        
        {/* Footer */}
        <Footer />
      </>
    );
  }

  // Si on est sur la page d'administration, afficher uniquement cette page
  if (currentPage === 'admin') {
    return (
      <AdminPage
        onBackToMain={() => setCurrentPage('home')}
        userInfo={userInfo}
        onProfileMenuClick={handleProfileMenuClick}
      />
    );
  }

  // Si on est sur la page d'accueil, afficher uniquement cette page
  if (currentPage === 'home') {
    return (
      <>
        {/* Header Misan */}
        <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentPage('home')}
              className="text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
            >
              Misan
            </button>
            
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (isAuthenticated) {
                    setCurrentPage('main');
                  } else {
                    setCurrentPage('auth');
                    toast.info('Connectez-vous pour accéder à l\'Assistant IA');
                  }
                }}
                className="text-white hover:bg-white/20"
                disabled={!isAuthenticated}
                title={isAuthenticated ? "Accéder à l'Assistant IA" : "Connexion requise pour l'Assistant IA"}
              >
                <Bot className="w-4 h-4 mr-2" />
                Assistant IA
              </Button>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentPage('pricing')}
                className="text-white hover:bg-white/20"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                Tarifs
              </Button>

              {/* Affichage du solde de tokens pour les utilisateurs connectés uniquement (sauf admin) */}
              {isAuthenticated && userInfo.role !== 'admin' && (
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {(userInfo.tokens || 0).toLocaleString()} {t.tokens}
                  </span>
                </div>
              )}

              {/* Affichage de l'expiration d'abonnement pour les utilisateurs connectés uniquement (sauf admin) */}
              {isAuthenticated && userInfo.role !== 'admin' && subscriptionInfo && (
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  <span className="text-xs">
                    <span className="opacity-75">Expire le</span>{' '}
                    <span className={subscriptionInfo.isExpired ? 'text-red-200' : subscriptionInfo.isExpiringSoon ? 'text-yellow-200' : 'text-white'}>
                      {subscriptionInfo.date}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Panier avec badge (sauf pour admin) */}
            {userInfo.role !== 'admin' && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCartOpen(true)}
                className="text-white hover:bg-white/20 relative"
                title="Voir le panier"
              >
                <ShoppingCart className="w-4 h-4 mr-2" />
                Panier
                {cart.length > 0 && (
                  <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-600 text-white">
                    {cart.length}
                  </Badge>
                )}
              </Button>
            )}

            {/* Menu profil pour utilisateurs connectés */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                    <Avatar className="w-6 h-6 mr-2">
                      <AvatarImage src={userInfo.avatar} />
                      <AvatarFallback className="bg-white/20 text-white text-xs">
                        {userInfo.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    {userInfo.name}
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('accountInfo')}>
                    <User className="w-4 h-4 mr-2" />
                    Informations du compte
                  </DropdownMenuItem>
                  {userInfo.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('billing')}>
                      <Receipt className="w-4 h-4 mr-2" />
                      Facturation
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('preferences')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Préférences
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  {userInfo.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('buySubscription')}>
                      <CreditCard className="w-4 h-4 mr-2" />
                      Gérer l'abonnement
                    </DropdownMenuItem>
                  )}
                  {userInfo.role !== 'admin' && (
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('buyTokens')}>
                      <Coins className="w-4 h-4 mr-2" />
                      Acheter des jetons
                    </DropdownMenuItem>
                  )}
                  {userInfo.role === 'admin' && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => handleProfileMenuClick('admin')}>
                        <Key className="w-4 h-4 mr-2" />
                        Administration
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                    <LogOut className="w-4 h-4 mr-2" />
                    Déconnexion
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogin}
                className="text-white hover:bg-green-500/20 border border-green-300/30 hover:border-green-400"
                title="Se connecter à Misan"
              >
                <User className="w-4 h-4 mr-2" />
                Connexion
              </Button>
            )}
          </div>
        </div>
        
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
        
        {/* Footer */}
        <Footer />
        
        {/* Modales disponibles même sur la page d'accueil */}
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
          currentOrder={currentOrder}
          selectedPaymentMethod={selectedPaymentMethod}
          setSelectedPaymentMethod={setSelectedPaymentMethod}
          handleChangePassword={handleChangePassword}
          handleSaveAddresses={handleSaveAddresses}
          handleSavePreferences={handleSavePreferences}
          handleSaveAccountInfo={handleSaveAccountInfo}
          updateCartItemQuantity={updateCartItemQuantity}
          removeFromCart={removeFromCart}
          processOrder={processOrder}
          addToCart={addToCart}
          t={t}
        />

        {/* Modal d'historique des conversations */}
        <ConversationHistoryModal
          open={conversationHistoryOpen}
          onOpenChange={setConversationHistoryOpen}
          sessions={conversationHistory.history.sessions}
          onLoadSession={handleLoadConversationFromHistory}
          onDeleteSession={handleDeleteConversationFromHistory}
          onClearAll={handleClearAllConversationsHistory}
          onExport={handleExportConversationsHistory}
          currentSessionId={conversationHistory.currentSessionId}
          language={siteLanguage}
          agentConfigs={Object.fromEntries(
            Object.entries(aiAgents).map(([key, agent]) => [
              key,
              { name: agent.name, color: agent.color, icon: agent.icon }
            ])
          )}
          llmConfigs={Object.fromEntries(
            Object.entries(llmModels).map(([key, model]) => [
              key,
              { name: model.name, color: model.color }
            ])
          )}
        />

        {/* Autres modales pour les fonctionnalités documents */}
        <SaveFormatDialog
          open={saveAsDialogOpen}
          onOpenChange={setSaveAsDialogOpen}
          filename={saveAsFilename}
          onSave={saveWithFormat}
          hasMarkdown={hasMarkdownContent}
        />

        <LoadFromUrlDialog
          open={loadFromUrlDialogOpen}
          onOpenChange={setLoadFromUrlDialogOpen}
          onFileLoaded={handleFileLoadedFromUrl}
          language={document.language}
        />
      </>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Alertes utilisateur */}
      {userAlerts.length > 0 && (
        <UserAlerts
          alerts={userAlerts}
          onDismiss={dismissAlert}
        />
      )}

      {/* Header Misan */}
      <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setCurrentPage('home')}
            className="text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
          >
            Misan
          </button>
          
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (isAuthenticated) {
                  setCurrentPage('main');
                } else {
                  setCurrentPage('auth');
                  toast.info('Connectez-vous pour accéder à l\'Assistant IA');
                }
              }}
              className="text-white hover:bg-white/20"
              disabled={!isAuthenticated}
              title={isAuthenticated ? "Accéder à l'Assistant IA" : "Connexion requise pour l'Assistant IA"}
            >
              <Bot className="w-4 h-4 mr-2" />
              Assistant IA
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCurrentPage('pricing')}
              className="text-white hover:bg-white/20"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Tarifs
            </Button>

            {/* Affichage du solde de tokens pour les utilisateurs connectés uniquement (sauf admin) */}
            {isAuthenticated && userInfo.role !== 'admin' && (
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {(userInfo.tokens || 0).toLocaleString()} {t.tokens}
                </span>
              </div>
            )}

            {/* Affichage de l'expiration d'abonnement pour les utilisateurs connectés uniquement (sauf admin) */}
            {isAuthenticated && userInfo.role !== 'admin' && subscriptionInfo && (
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span className="text-xs">
                  <span className="opacity-75">Expire le</span>{' '}
                  <span className={subscriptionInfo.isExpired ? 'text-red-200' : subscriptionInfo.isExpiringSoon ? 'text-yellow-200' : 'text-white'}>
                    {subscriptionInfo.date}
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Panier avec badge (sauf pour admin) */}
          {userInfo.role !== 'admin' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCartOpen(true)}
              className="text-white hover:bg-white/20 relative"
              title="Voir le panier"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Panier
              {cart.length > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs bg-red-600 text-white">
                  {cart.length}
                </Badge>
              )}
            </Button>
          )}

          {/* Menu profil pour utilisateurs connectés */}
          {isAuthenticated ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-white hover:bg-white/20">
                  <Avatar className="w-6 h-6 mr-2">
                    <AvatarImage src={userInfo.avatar} />
                    <AvatarFallback className="bg-white/20 text-white text-xs">
                      {userInfo.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  {userInfo.name}
                  <ChevronDown className="w-4 h-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleProfileMenuClick('accountInfo')}>
                  <User className="w-4 h-4 mr-2" />
                  Informations du compte
                </DropdownMenuItem>
                {userInfo.role !== 'admin' && (
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('billing')}>
                    <Receipt className="w-4 h-4 mr-2" />
                    Facturation
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => handleProfileMenuClick('preferences')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Préférences
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {userInfo.role !== 'admin' && (
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('buySubscription')}>
                    <CreditCard className="w-4 h-4 mr-2" />
                    Gérer l'abonnement
                  </DropdownMenuItem>
                )}
                {userInfo.role !== 'admin' && (
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('buyTokens')}>
                    <Coins className="w-4 h-4 mr-2" />
                    Acheter des jetons
                  </DropdownMenuItem>
                )}
                {userInfo.role === 'admin' && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleProfileMenuClick('admin')}>
                      <Key className="w-4 h-4 mr-2" />
                      Administration
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="w-4 h-4 mr-2" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogin}
              className="text-white hover:bg-green-500/20 border border-green-300/30 hover:border-green-400"
              title="Se connecter à Misan"
            >
              <User className="w-4 h-4 mr-2" />
              Connexion
            </Button>
          )}
        </div>
      </div>

      {/* Contenu principal - Interface double panel */}
      <div className="flex-1 flex bg-background">
        {/* Panel Chatbot */}
        <div className="w-1/2 flex flex-col border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <AgentIcon className={`w-5 h-5 ${activeAgent.color}`} />
                <h2>{t.chatTitle}</h2>
                {chatMessages.length > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {chatMessages.length}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Bouton Historique */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setConversationHistoryOpen(true)}
                  className="h-7 px-2"
                  title="Historique des conversations"
                >
                  <History className="w-3 h-3 mr-1" />
                  Historique
                </Button>
                
                {chatMessages.length > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleClearChat}
                    className="h-7 px-2"
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    {t.clearChat}
                  </Button>
                )}
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              <Select value={currentAgent} onValueChange={handleAgentChange}>
                <SelectTrigger className="flex-1">
                  <Bot className="w-4 h-4 mr-2" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(aiAgents).map(([id, agent]) => {
                    const IconComponent = agent.icon;
                    return (
                      <SelectItem key={id} value={id}>
                        <div className="flex items-center gap-2">
                          <IconComponent className={`w-4 h-4 ${agent.color}`} />
                          <div className="flex flex-col">
                            <span className="font-medium">{agent.name}</span>
                            <span className="text-xs text-muted-foreground">{agent.description}</span>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>

              <Popover open={llmSelectorOpen} onOpenChange={setLlmSelectorOpen}>
                <PopoverTrigger className="flex-1">
                  <div className="flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1">
                    <div className="flex items-center gap-2">
                      <Cpu className="w-4 h-4" />
                      <span className="truncate">
                        {selectedLLMs.length === 0 
                          ? t.selectLLM
                          : selectedLLMs.length === 1 
                            ? llmModels[selectedLLMs[0]].name
                            : `${selectedLLMs.length} modèles`
                        }
                      </span>
                    </div>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0">
                  <div className="p-4">
                    <h4 className="font-medium mb-3">{t.selectLLMPrompt}</h4>
                    <div className="space-y-3">
                      {Object.entries(llmModels).map(([id, model]) => (
                        <div key={id} className="flex items-start gap-3">
                          <Checkbox
                            id={id}
                            checked={selectedLLMs.includes(id as LLMType)}
                            onCheckedChange={() => handleLLMToggle(id as LLMType)}
                          />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <label 
                                htmlFor={id} 
                                className={`font-medium cursor-pointer ${model.color}`}
                              >
                                {model.name}
                              </label>
                              {model.isPremium && (
                                <Badge variant="outline" className="text-xs">
                                  {t.premium}
                                </Badge>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {model.provider} • {model.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="outline" className={`text-xs ${activeAgent.color}`}>
                <AgentIcon className="w-3 h-3 mr-1" />
                {activeAgent.name}
              </Badge>
              
              {selectedLLMs.map(llmId => (
                <Badge key={llmId} variant="secondary" className={`text-xs ${llmModels[llmId].color}`}>
                  <Brain className="w-3 h-3 mr-1" />
                  {llmModels[llmId].name}
                </Badge>
              ))}
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            {chatMessages.length > 0 ? (
              <ChatCopyControls
                messages={chatMessages}
                onCopyToEditor={handleCopyToEditor}
                language={document.language}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <AgentIcon className={`w-12 h-12 mx-auto mb-4 opacity-50 ${activeAgent.color}`} />
                  <h3 className="font-medium mb-2">{activeAgent.name}</h3>
                  <p className="text-sm mb-2">{activeAgent.description}</p>
                  {selectedLLMs.length > 0 && (
                    <div className="flex items-center gap-1 justify-center mb-4">
                      <Brain className="w-4 h-4" />
                      <span className="text-xs">
                        {selectedLLMs.map(llm => llmModels[llm].name).join(', ')}
                      </span>
                    </div>
                  )}
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
              </div>
            )}
          </ScrollArea>

          <div className="p-4 border-t border-border">
            <ChatInputControls
              value={chatInput}
              onChange={setChatInput}
              onSend={handleSendMessage}
              onFileLoadedToChat={handleFileLoadedToChat}
              language={document.language}
              dir={languages[document.language].dir}
              placeholder={t.typeMessage}
            />
          </div>
        </div>

        {/* Panel Éditeur */}
        <div className="w-1/2 flex flex-col">
          <div className="p-4 border-b border-border">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h2 className="text-blue-600">{t.documentTitle}</h2>
                <div className="flex items-center gap-1 text-blue-600">
                  <Info className="w-4 h-4" />
                  <span className="text-xs">{t.markdownSupport}</span>
                </div>
                {document.content && hasMarkdownFormatting(document.content) && (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                    {t.formatDetected}
                  </Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleViewModeToggle}
                  variant={viewMode === 'preview' ? 'default' : 'outline'}
                  size="sm"
                  className="transition-all"
                >
                  {viewMode === 'edit' ? (
                    <>
                      <Eye className="w-4 h-4 mr-1" />
                      {t.switchToPreview}
                    </>
                  ) : (
                    <>
                      <Edit className="w-4 h-4 mr-1" />
                      {t.switchToEdit}
                    </>
                  )}
                </Button>
                
                <Select 
                  value={document.language} 
                  onValueChange={handleLanguageChange}
                >
                  <SelectTrigger className="w-40">
                    <Languages className="w-4 h-4 mr-2" />
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

            <div className="flex items-center gap-2 mb-4">
              <div className="flex-1 relative">
                <Input
                  value={document.fullPath}
                  onChange={(e) => handleFullPathChange(e.target.value)}
                  className="pl-8"
                  placeholder={t.fullPath}
                  dir={languages[document.language].dir}
                />
                <FolderIcon className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              </div>
              {document.isModified && (
                <Badge variant="secondary">*</Badge>
              )}
              <Badge variant={viewMode === 'edit' ? 'secondary' : 'default'} className="text-xs">
                {viewMode === 'edit' ? t.editMode : t.previewMode}
              </Badge>
            </div>

            {(document.originalFullPath && document.originalFullPath !== document.fullPath) && (
              <div className="flex items-center gap-2 mb-4">
                <Badge variant="outline" className="text-xs">
                  <FolderIcon className="w-3 h-3 mr-1" />
                  {t.originalPath}: {document.originalFullPath}
                </Badge>
                {document.originalFullPath.startsWith('http') ? (
                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-600">
                    <Globe className="w-3 h-3 mr-1" />
                    {t.urlFile}
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-xs text-green-600 border-green-600">
                    <File className="w-3 h-3 mr-1" />
                    {t.localFile}
                  </Badge>
                )}
              </div>
            )}

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleNewDocument} 
                variant="outline" 
                size="sm"
              >
                <FileText className="w-4 h-4 mr-1" />
                {t.newDocument}
              </Button>
              
              <Button 
                onClick={() => {
                  resetFileInputs();
                  fileInputRef.current?.click();
                }} 
                variant="outline" 
                size="sm"
              >
                <FolderOpen className="w-4 h-4 mr-1" />
                {t.openFile}
              </Button>

              <Button 
                onClick={() => setLoadFromUrlDialogOpen(true)} 
                variant="outline" 
                size="sm"
              >
                <Globe className="w-4 h-4 mr-1" />
                {t.loadFromUrl}
              </Button>
              
              <Button onClick={handleSaveFile} variant="outline" size="sm">
                <Save className="w-4 h-4 mr-1" />
                {t.saveFile}
              </Button>

              <Button onClick={handleSaveAs} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-1" />
                {t.saveAs}
              </Button>

              <Button 
                onClick={() => {
                  resetFileInputs();
                  insertFileInputRef.current?.click();
                }} 
                variant="outline" 
                size="sm"
              >
                <Upload className="w-4 h-4 mr-1" />
                {t.insertFile}
              </Button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".txt,.md,.rtf,.doc,.docx,.json"
              onChange={handleOpenFile}
              className="hidden"
            />
            
            <input
              ref={insertFileInputRef}
              type="file"
              accept=".txt,.md,.rtf,.doc,.docx,.json"
              onChange={handleInsertFile}
              className="hidden"
            />
          </div>

          {viewMode === 'edit' && (
            <MarkdownToolbar 
              onInsert={insertMarkdown}
              language={document.language}
            />
          )}

          <div className="flex-1 relative">
            {viewMode === 'edit' ? (
              <div className="h-full p-4">
                <textarea
                  ref={textareaRef}
                  value={document.content}
                  onChange={(e) => setDocument(prev => ({ ...prev, content: e.target.value, isModified: true }))}
                  className="w-full h-full resize-none border-0 focus:ring-0 bg-transparent outline-none focus:outline-none"
                  placeholder={`# Mon Document

Commencez à taper votre document avec le formatage Markdown...

## Fonctionnalités
- Gras et *italique*
- Listes et citations
- Code et liens

Utilisez le chat IA pour obtenir de l'aide !

**Bienvenue sur Misan - Votre gestionnaire intelligent de documents !**`}
                  dir={languages[document.language].dir}
                  style={{ 
                    direction: languages[document.language].dir,
                    fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Monaco, Consolas, "Liberation Mono", "Courier New", monospace'
                  }}
                />
              </div>
            ) : (
              <MarkdownPreview 
                content={document.content}
                language={document.language}
              />
            )}
          </div>

          <div className="px-4 py-2 border-t border-border bg-muted/30">
            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <div className="flex items-center gap-4">
                <span>Caractères: {document.content.length}</span>
                <span>Lignes: {document.content.split('\n').length}</span>
                {document.content && hasMarkdownFormatting(document.content) && (
                  <Badge variant="outline" className="text-xs">
                    <Sparkles className="w-3 h-3 mr-1" />
                    Markdown
                  </Badge>
                )}
                <span>Mode: {viewMode === 'edit' ? t.editMode : t.previewMode}</span>
              </div>
              <div className="flex items-center gap-2">
                <span>Agent: {activeAgent.name}</span>
                <span className="text-xs">
                  {t.currentAgent}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modales globales - Disponibles sur toutes les pages */}
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
        currentOrder={currentOrder}
        selectedPaymentMethod={selectedPaymentMethod}
        setSelectedPaymentMethod={setSelectedPaymentMethod}
        handleChangePassword={handleChangePassword}
        handleSaveAddresses={handleSaveAddresses}
        handleSavePreferences={handleSavePreferences}
        handleSaveAccountInfo={handleSaveAccountInfo}
        updateCartItemQuantity={updateCartItemQuantity}
        removeFromCart={removeFromCart}
        processOrder={processOrder}
        addToCart={addToCart}
        t={t}
      />

      {/* Modal d'historique des conversations */}
      <ConversationHistoryModal
        open={conversationHistoryOpen}
        onOpenChange={setConversationHistoryOpen}
        sessions={conversationHistory.history.sessions}
        onLoadSession={handleLoadConversationFromHistory}
        onDeleteSession={handleDeleteConversationFromHistory}
        onClearAll={handleClearAllConversationsHistory}
        onExport={handleExportConversationsHistory}
        currentSessionId={conversationHistory.currentSessionId}
        language={siteLanguage}
        agentConfigs={Object.fromEntries(
          Object.entries(aiAgents).map(([key, agent]) => [
            key,
            { name: agent.name, color: agent.color, icon: agent.icon }
          ])
        )}
        llmConfigs={Object.fromEntries(
          Object.entries(llmModels).map(([key, model]) => [
            key,
            { name: model.name, color: model.color }
          ])
        )}
      />

      {/* Autres modales pour les fonctionnalités documents */}
      <SaveFormatDialog
        open={saveAsDialogOpen}
        onOpenChange={setSaveAsDialogOpen}
        filename={saveAsFilename}
        onSave={saveWithFormat}
        hasMarkdown={hasMarkdownContent}
import AuthPage from './components/AuthPage';
import { AuthService, type AuthUser } from './utils/supabase';

      <LoadFromUrlDialog
