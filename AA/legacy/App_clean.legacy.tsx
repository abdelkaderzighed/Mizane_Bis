import React, { useState, useRef } from 'react';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
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
import { AuthPage } from './components/AuthPage';
import { Footer } from './components/Footer';
import { ModalsContainer } from './components/ModalsContainer';
import { UserAlerts } from './components/UserAlerts';
import { generateAgentResponse } from './utils/agentUtils';
import { hasMarkdownFormatting, markdownToRtf } from './utils/markdownToRtf';
import { initializeMisanDatabase } from './utils/supabase/init-database';
import { createCartItem, updateCartItem, createOrder, getFilenameFromPath } from './utils/orderUtils';
import { 
  ChatMessage, DocumentState, AIAgentType, AIAgent, LLMType, LLMModel, 
  UserInfo, Invoice, CartItem, Order, PaymentMethod, Address, LanguageCode 
} from './types';
import { languages, MOCK_USER_INFO, MOCK_INVOICES, MOCK_ADDRESSES } from './constants/config';
import { translations } from './locales/translations';
import { 
  Save, FolderOpen, FileText, MessageSquare, Upload, Languages, Download, Info, Sparkles, 
  Eye, Edit, Trash2, Globe, File, FolderIcon, Mic, Bot, PenTool, CheckCircle, BookOpen, 
  BrainCircuit, ChevronDown, Settings, Cpu, Brain, User, Coins, Calendar, CreditCard, 
  MapPin, Key, Receipt, ShoppingCart, Building2, LogOut 
} from 'lucide-react';
import { toast } from 'sonner';

export default function App() {
  // États d'authentification et alertes
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authUser, setAuthUser] = useState<any>(null);
  const [authAccess, setAuthAccess] = useState<any>(null);
  const [authAlerts, setAuthAlerts] = useState<any[]>([]);
  const [isInitializingDB, setIsInitializingDB] = useState(false);
  const [userAlerts, setUserAlerts] = useState<any[]>([]);

  // États de chat et document
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [currentAgent, setCurrentAgent] = useState<AIAgentType>('conversation');
  const [selectedLLMs, setSelectedLLMs] = useState<LLMType[]>(['gpt4']);
  const [llmSelectorOpen, setLlmSelectorOpen] = useState(false);
  const [document, setDocument] = useState<DocumentState>({
    content: '',
    filename: 'nouveau_document.txt',
    fullPath: 'nouveau_document.txt',
    language: 'fr',
    isModified: false
  });
  const [viewMode, setViewMode] = useState<'edit' | 'preview'>('edit');
  
  // États de navigation et modales
  const [currentPage, setCurrentPage] = useState<'home' | 'main' | 'pricing' | 'admin'>('home');
  const [saveAsDialogOpen, setSaveAsDialogOpen] = useState(false);
  const [saveAsFilename, setSaveAsFilename] = useState('');
  const [loadFromUrlDialogOpen, setLoadFromUrlDialogOpen] = useState(false);
  
  // États des modales profil et commerce
  const [accountInfoOpen, setAccountInfoOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [billingOpen, setBillingOpen] = useState(false);
  const [addressesOpen, setAddressesOpen] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [invoiceDetailOpen, setInvoiceDetailOpen] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [orderCompleteOpen, setOrderCompleteOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('card_cib');
  
  // Refs et données utilisateur
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const insertFileInputRef = useRef<HTMLInputElement>(null);
  const [userInfo, setUserInfo] = useState<UserInfo>(authUser || MOCK_USER_INFO);
  const [invoices] = useState<Invoice[]>(MOCK_INVOICES as any);
  const [personalAddress, setPersonalAddress] = useState<Address>(MOCK_ADDRESSES.personal);
  const [billingAddress, setBillingAddress] = useState<Address>(MOCK_ADDRESSES.billing);
  const [siteLanguage, setSiteLanguage] = useState<LanguageCode>('fr');
  const [chatLanguage, setChatLanguage] = useState<LanguageCode>('fr');

  const t = translations[siteLanguage];

  // Fonctions de gestion des alertes utilisateur
  const generateUserAlerts = (user: UserInfo) => {
    const alerts: any[] = [];
    const now = new Date();
    const subscriptionEnd = new Date(user.subscriptionEnd);
    const daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (user.subscriptionType === 'trial' && daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
      alerts.push({
        id: 'trial_ending',
        type: 'trial_ending',
        title: `Votre période d'essai se termine dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`,
        message: 'Souscrivez à un abonnement Pro pour continuer à utiliser tous les agents IA et modèles LLM premium.',
        action: { label: 'Voir les tarifs', onClick: () => setCurrentPage('pricing') },
        dismissible: true
      });
    }

    if (user.subscriptionType === 'trial' && daysUntilExpiry <= 0) {
      alerts.push({
        id: 'subscription_expired',
        type: 'subscription_expired',
        title: 'Votre période d\'essai a expiré',
        message: 'Vous avez maintenant accès aux fonctionnalités de base uniquement. Souscrivez à un abonnement Pro pour retrouver toutes les fonctionnalités.',
        action: { label: 'S\'abonner maintenant', onClick: () => setCurrentPage('pricing') },
        dismissible: false
      });
    }

    if (user.tokens < 10000) {
      alerts.push({
        id: 'low_tokens',
        type: 'low_tokens',
        title: 'Nombre de jetons faible',
        message: `Il vous reste ${user.tokens.toLocaleString()} jetons. Rechargez votre compte pour continuer à utiliser l'IA sans interruption.`,
        action: { label: 'Acheter des jetons', onClick: () => setStoreOpen(true) },
        dismissible: true
      });
    }

    return alerts;
  };

  const handleDismissAlert = (alertId: string) => {
    setUserAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Mettre à jour les alertes quand les informations utilisateur changent
  React.useEffect(() => {
    if (isAuthenticated && userInfo) {
      const alerts = generateUserAlerts(userInfo);
      setUserAlerts(alerts);
    }
  }, [isAuthenticated, userInfo, userInfo?.tokens, userInfo?.subscriptionEnd]);

  // Vérifier la session au chargement
  React.useEffect(() => {
    console.log('Application en mode logout - veuillez vous connecter');
  }, []);

  const handleAuthSuccess = (authResult: any) => {
    setAuthUser(authResult.user);
    setAuthAccess(authResult.access);
    setAuthAlerts(authResult.alerts || []);
    setUserInfo(authResult.user);
    setIsAuthenticated(true);
    toast.success(`Bienvenue ${authResult.user.name} !`);
  };

  const handleLogout = async () => {
    try {
      const { misanAuth } = await import('./utils/supabase/auth');
      await misanAuth.signOut();
      
      setIsAuthenticated(false);
      setAuthUser(null);
      setAuthAccess(null);
      setAuthAlerts([]);
      setUserInfo(MOCK_USER_INFO);
      setCurrentPage('home');
      
      toast.success('Déconnexion réussie');
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      toast.error('Erreur lors de la déconnexion');
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

  // Si l'utilisateur n'est pas connecté, afficher la page d'authentification
  if (!isAuthenticated) {
    return (
      <AuthPage
        onAuthSuccess={handleAuthSuccess}
        onInitializeDatabase={handleInitializeDatabase}
        isInitializing={isInitializingDB}
      />
    );
  }

  // Configuration des agents IA et modèles LLM
  const aiAgents: Record<AIAgentType, AIAgent> = {
    conversation: { id: 'conversation', name: t.agents.conversation.name, description: t.agents.conversation.description, icon: MessageSquare, color: 'text-blue-600' },
    writing: { id: 'writing', name: t.agents.writing.name, description: t.agents.writing.description, icon: PenTool, color: 'text-green-600' },
    correction: { id: 'correction', name: t.agents.correction.name, description: t.agents.correction.description, icon: CheckCircle, color: 'text-red-600' },
    analysis: { id: 'analysis', name: t.agents.analysis.name, description: t.agents.analysis.description, icon: BookOpen, color: 'text-purple-600' },
    creative: { id: 'creative', name: t.agents.creative.name, description: t.agents.creative.description, icon: Sparkles, color: 'text-pink-600' },
    technical: { id: 'technical', name: t.agents.technical.name, description: t.agents.technical.description, icon: BrainCircuit, color: 'text-orange-600' }
  };

  const llmModels: Record<LLMType, LLMModel> = {
    gpt4: { id: 'gpt4', name: t.llms.gpt4.name, provider: t.llms.gpt4.provider, description: t.llms.gpt4.description, color: 'text-green-600', isPremium: true },
    gpt35: { id: 'gpt35', name: t.llms.gpt35.name, provider: t.llms.gpt35.provider, description: t.llms.gpt35.description, color: 'text-blue-600', isPremium: false },
    claude35sonnet: { id: 'claude35sonnet', name: t.llms.claude35sonnet.name, provider: t.llms.claude35sonnet.provider, description: t.llms.claude35sonnet.description, color: 'text-purple-600', isPremium: true },
    claude3haiku: { id: 'claude3haiku', name: t.llms.claude3haiku.name, provider: t.llms.claude3haiku.provider, description: t.llms.claude3haiku.description, color: 'text-indigo-600', isPremium: false },
    gemini: { id: 'gemini', name: t.llms.gemini.name, provider: t.llms.gemini.provider, description: t.llms.gemini.description, color: 'text-yellow-600', isPremium: false },
    llama2: { id: 'llama2', name: t.llms.llama2.name, provider: t.llms.llama2.provider, description: t.llms.llama2.description, color: 'text-orange-600', isPremium: false },
    mistral: { id: 'mistral', name: t.llms.mistral.name, provider: t.llms.mistral.provider, description: t.llms.mistral.description, color: 'text-red-600', isPremium: false },
    palm2: { id: 'palm2', name: t.llms.palm2.name, provider: t.llms.palm2.provider, description: t.llms.palm2.description, color: 'text-gray-600', isPremium: false }
  };

  // Fonctions de gestion du panier et des commandes
  const addToCart = (type: 'subscription' | 'tokens', quantity: number) => {
    const item = createCartItem(type, quantity);
    setCart(prev => [...prev, item]);
    toast.success(`${item.name} ajouté au panier`);
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
    toast.success('Article retiré du panier');
  };

  const updateCartItemQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(itemId);
      return;
    }
    setCart(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      return updateCartItem(item, newQuantity);
    }));
  };

  const processOrder = () => {
    if (cart.length === 0) {
      toast.error('Votre panier est vide');
      return;
    }

    const order = createOrder(cart, selectedPaymentMethod, userInfo, billingAddress);
    setCurrentOrder(order);
    setCart([]);
    setPaymentOpen(false);
    setOrderCompleteOpen(true);

    const totalTokens = order.items.reduce((sum, item) => sum + (item.tokensIncluded || 0), 0);
    if (totalTokens > 0) {
      setUserInfo(prev => ({ ...prev, tokens: prev.tokens + totalTokens }));
    }

    toast.success(`Commande ${order.id} créée avec succès !`);
  };

  // Autres fonctions (handlers pour les actions utilisateur)
  const handleProfileMenuClick = (action: string) => {
    switch (action) {
      case 'accountInfo': setAccountInfoOpen(true); break;
      case 'billing': setBillingOpen(true); break;
      case 'addresses': setAddressesOpen(true); break;
      case 'preferences': setPreferencesOpen(true); break;
      case 'buySubscription': setStoreOpen(true); break;
      case 'buyTokens': setStoreOpen(true); break;
      case 'changePassword': setChangePasswordOpen(true); break;
      case 'admin': setCurrentPage('admin'); break;
      case 'logout': handleLogout(); break;
      default: break;
    }
  };

  const hasMarkdownContent = hasMarkdownFormatting(document.content);
  const activeAgent = aiAgents[currentAgent];
  const AgentIcon = activeAgent.icon;

  // Pages spécifiques
  if (currentPage === 'home') {
    return (
      <>
        <HomePage
          userInfo={userInfo}
          cartLength={cart.length}
          onProfileMenuClick={handleProfileMenuClick}
          onStartChat={() => setCurrentPage('main')}
          onNavigateToApp={() => setCurrentPage('main')}
          onNavigateToPricing={() => setCurrentPage('pricing')}
          onSetCartOpen={setCartOpen}
          t={t}
        />
        <ModalsContainer
          changePasswordOpen={changePasswordOpen} setChangePasswordOpen={setChangePasswordOpen}
          addressesOpen={addressesOpen} setAddressesOpen={setAddressesOpen}
          preferencesOpen={preferencesOpen} setPreferencesOpen={setPreferencesOpen}
          cartOpen={cartOpen} setCartOpen={setCartOpen}
          checkoutOpen={checkoutOpen} setCheckoutOpen={setCheckoutOpen}
          paymentOpen={paymentOpen} setPaymentOpen={setPaymentOpen}
          orderCompleteOpen={orderCompleteOpen} setOrderCompleteOpen={setOrderCompleteOpen}
          storeOpen={storeOpen} setStoreOpen={setStoreOpen}
          accountInfoOpen={accountInfoOpen} setAccountInfoOpen={setAccountInfoOpen}
          personalAddress={personalAddress} setPersonalAddress={setPersonalAddress}
          billingAddress={billingAddress} setBillingAddress={setBillingAddress}
          siteLanguage={siteLanguage} setSiteLanguage={setSiteLanguage}
          chatLanguage={chatLanguage} setChatLanguage={setChatLanguage}
          cart={cart} userInfo={userInfo} setUserInfo={setUserInfo} currentOrder={currentOrder}
          selectedPaymentMethod={selectedPaymentMethod} setSelectedPaymentMethod={setSelectedPaymentMethod}
          handleChangePassword={() => { toast.success('Mot de passe modifié'); setChangePasswordOpen(false); }}
          handleSaveAddresses={() => { toast.success('Adresses sauvegardées'); setAddressesOpen(false); }}
          handleSavePreferences={() => { setDocument(prev => ({ ...prev, language: siteLanguage })); toast.success('Préférences sauvegardées'); setPreferencesOpen(false); }}
          handleSaveAccountInfo={() => { toast.success('Informations sauvegardées'); setAccountInfoOpen(false); }}
          updateCartItemQuantity={updateCartItemQuantity} removeFromCart={removeFromCart}
          processOrder={processOrder} addToCart={addToCart} t={t}
        />
      </>
    );
  }

  if (currentPage === 'pricing') {
    return (
      <PricingPage
        addToCart={addToCart} setUserInfo={setUserInfo} setStoreOpen={setStoreOpen}
        setCartOpen={setCartOpen} cartLength={cart.length} userInfo={userInfo}
        onBackToMain={() => setCurrentPage('home')} onProfileMenuClick={handleProfileMenuClick}
      />
    );
  }

  if (currentPage === 'admin') {
    return (
      <AdminPage
        userInfo={userInfo}
        onBackToMain={() => setCurrentPage('home')}
        onProfileMenuClick={handleProfileMenuClick}
      />
    );
  }

  // Page principale avec l'interface complète
  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Header Misan */}
      <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentPage('home')} className="text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer">
            Misan
          </button>
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
            Assistant IA Juridique
          </Badge>
        </div>

        <div className="flex items-center gap-6">
          <Button variant="ghost" size="sm" onClick={() => setCurrentPage('main')} className="text-white hover:bg-white/20">
            <Bot className="w-4 h-4 mr-2" />
            Assistant IA
          </Button>

          <Button variant="ghost" size="sm" onClick={() => setCurrentPage('pricing')} className="text-white hover:bg-white/20">
            <CreditCard className="w-4 h-4 mr-2" />
            Tarifs
          </Button>

          {userInfo.role !== 'admin' && (
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-medium">{userInfo.tokens.toLocaleString()} {t.tokens}</span>
            </div>
          )}

          <Button variant="ghost" size="sm" onClick={() => setCartOpen(true)} className="text-white hover:bg-white/20 relative">
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t.cart}
            {cart.length > 0 && (
              <Badge className="absolute -top-2 -right-2 w-5 h-5 text-xs bg-red-500 text-white">
                {cart.length}
              </Badge>
            )}
          </Button>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">{t.subscriptionUntil} {userInfo.subscriptionEnd}</span>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-3 p-2 hover:bg-white/20 text-white rounded-md transition-colors outline-none ring-0 focus:ring-2 focus:ring-white/50">
              <Avatar className="w-8 h-8">
                <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
                <AvatarFallback className="bg-white/20 text-white text-xs">
                  {userInfo.name.split(' ').map(n => n[0]).join('')}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm font-medium hidden md:block">{userInfo.name}</span>
              <ChevronDown className="w-4 h-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64" align="end">
              <DropdownMenuLabel className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {t.myProfile}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('accountInfo')}>
                <User className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{t.accountInfo}</span>
                  <span className="text-xs text-muted-foreground">{userInfo.email}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('changePassword')}>
                <Key className="w-4 h-4 mr-2" />
                {t.changePassword}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('billing')}>
                <Receipt className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{t.billing}</span>
                  <span className="text-xs text-muted-foreground">{t.invoiceHistory}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('addresses')}>
                <MapPin className="w-4 h-4 mr-2" />
                {t.addresses}
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('preferences')}>
                <Settings className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>{t.preferences}</span>
                  <span className="text-xs text-muted-foreground">{t.siteLanguage} • {t.chatLanguage}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('buySubscription')}>
                <CreditCard className="w-4 h-4 mr-2" />
                {t.buySubscription}
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('buyTokens')}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                {t.buyTokens}
              </DropdownMenuItem>
              
              {userInfo.role === 'admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => handleProfileMenuClick('admin')}>
                    <Building2 className="w-4 h-4 mr-2" />
                    <div className="flex flex-col">
                      <span>Administration</span>
                      <span className="text-xs text-muted-foreground">Gérer utilisateurs et paramètres</span>
                    </div>
                  </DropdownMenuItem>
                </>
              )}
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => handleProfileMenuClick('logout')}>
                <LogOut className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>Déconnexion</span>
                  <span className="text-xs text-muted-foreground">Se déconnecter de Misan</span>
                </div>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Alertes utilisateur */}
      {userAlerts.length > 0 && (
        <UserAlerts
          alerts={userAlerts}
          onDismiss={handleDismissAlert}
        />
      )}

      {/* Message temporaire pour indiquer que l'interface principale sera ajoutée */}
      <div className="flex-1 flex items-center justify-center bg-background">
        <div className="text-center p-8">
          <Bot className="w-16 h-16 mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-bold mb-2">Interface principale en construction</h2>
          <p className="text-muted-foreground mb-4">
            L'interface de chat et d'édition de documents sera intégrée ici prochainement.
          </p>
          <p className="text-sm text-muted-foreground">
            Utilisez le menu pour naviguer vers les autres pages ou gérer votre profil.
          </p>
        </div>
      </div>

      {/* Footer global */}
      <Footer />

      {/* Modales */}
      <SaveFormatDialog
        open={saveAsDialogOpen}
        onOpenChange={setSaveAsDialogOpen}
        filename={saveAsFilename}
        onFilenameChange={setSaveAsFilename}
        onSave={(filename, format) => true}
        language={document.language}
      />

      <LoadFromUrlDialog
        open={loadFromUrlDialogOpen}
        onOpenChange={setLoadFromUrlDialogOpen}
        onFileLoaded={(content, filename) => {}}
        language={document.language}
      />

      <InvoiceDetailModal
        open={invoiceDetailOpen}
        onOpenChange={setInvoiceDetailOpen}
        invoice={selectedInvoice}
        userInfo={userInfo}
        billingAddress={billingAddress}
        translations={t}
      />

      <ModalsContainer
        changePasswordOpen={changePasswordOpen} setChangePasswordOpen={setChangePasswordOpen}
        addressesOpen={addressesOpen} setAddressesOpen={setAddressesOpen}
        preferencesOpen={preferencesOpen} setPreferencesOpen={setPreferencesOpen}
        cartOpen={cartOpen} setCartOpen={setCartOpen}
        checkoutOpen={checkoutOpen} setCheckoutOpen={setCheckoutOpen}
        paymentOpen={paymentOpen} setPaymentOpen={setPaymentOpen}
        orderCompleteOpen={orderCompleteOpen} setOrderCompleteOpen={setOrderCompleteOpen}
        storeOpen={storeOpen} setStoreOpen={setStoreOpen}
        accountInfoOpen={accountInfoOpen} setAccountInfoOpen={setAccountInfoOpen}
        personalAddress={personalAddress} setPersonalAddress={setPersonalAddress}
        billingAddress={billingAddress} setBillingAddress={setBillingAddress}
        siteLanguage={siteLanguage} setSiteLanguage={setSiteLanguage}
        chatLanguage={chatLanguage} setChatLanguage={setChatLanguage}
        cart={cart} userInfo={userInfo} setUserInfo={setUserInfo} currentOrder={currentOrder}
        selectedPaymentMethod={selectedPaymentMethod} setSelectedPaymentMethod={setSelectedPaymentMethod}
        handleChangePassword={() => { toast.success('Mot de passe modifié'); setChangePasswordOpen(false); }}
        handleSaveAddresses={() => { toast.success('Adresses sauvegardées'); setAddressesOpen(false); }}
        handleSavePreferences={() => { setDocument(prev => ({ ...prev, language: siteLanguage })); toast.success('Préférences sauvegardées'); setPreferencesOpen(false); }}
        handleSaveAccountInfo={() => { toast.success('Informations sauvegardées'); setAccountInfoOpen(false); }}
        updateCartItemQuantity={updateCartItemQuantity} removeFromCart={removeFromCart}
        processOrder={processOrder} addToCart={addToCart} t={t}
      />
    </div>
  );
}