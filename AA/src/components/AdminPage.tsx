import React, { useState, useEffect, Suspense, useCallback } from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Footer } from './Footer';
import {
  loadSiteSettings, 
  saveSiteSettings, 
  loadPricingSettings, 
  savePricingSettings,
  loadPaymentSettings,
  savePaymentSettings,
  loadLLMSettings,
  saveLLMSettings,
  DEFAULT_PRICING_SETTINGS,
  DEFAULT_PAYMENT_SETTINGS,
  DEFAULT_LLM_SETTINGS,
  fetchEmailTemplates
} from '../utils/settings';
import { sendAdminEmail } from '../utils/email';
import { fetchAdminOrders, updateAdminOrder, deleteAdminOrders } from '../utils/invoiceService';
import type { 
  UserInfo, 
  AdminUser, 
  AdminOrder, 
  SiteSettings, 
  PricingSettings, 
  SubscriptionSettings,
  PaymentSettings,
  LLMSettings,
  EmailTemplate
} from '../types';
import {
  ArrowLeft,
  Users,
  ShoppingCart,
  Settings,
  CreditCard,
  DollarSign,
  TrendingUp,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Shield,
  Database,
  Globe,
  Lock,
  Unlock,
  Plus,
  Minus,
  ChevronDown,
  User,
  LogOut,
  Brain,
  Cpu,
  Loader2,
  Wallet
} from './admin/icons';
import { toast } from 'sonner';
const AdminUsersTab = React.lazy(() =>
  import('./admin/AdminUsersTab').then(module => ({ default: module.AdminUsersTab }))
);

const AdminOrdersTab = React.lazy(() =>
  import('./admin/AdminOrdersTab').then(module => ({ default: module.AdminOrdersTab }))
);

const AdminSiteSettingsTab = React.lazy(() =>
  import('./admin/AdminSiteSettingsTab').then(module => ({ default: module.AdminSiteSettingsTab }))
);

const AdminPricingTab = React.lazy(() =>
  import('./admin/AdminPricingTab').then(module => ({ default: module.AdminPricingTab }))
);

const AIModelsManagement = React.lazy(() =>
  import('./AdminPageAIModels').then(module => ({ default: module.AIModelsManagement }))
);

const FreeTrialSettings = React.lazy(() =>
  import('./admin/FreeTrialSettings').then(module => ({ default: module.FreeTrialSettings }))
);

const PaymentMethodsTab = React.lazy(() =>
  import('./admin/payments/PaymentMethodsTab').then(module => ({ default: module.PaymentMethodsTab }))
);

const AlertRulesTab = React.lazy(() =>
  import('./admin/AlertRulesTab').then(module => ({ default: module.AlertRulesTab }))
);

const EmailTemplatesTab = React.lazy(() =>
  import('./admin/EmailTemplatesTab').then(module => ({ default: module.EmailTemplatesTab }))
);

const NewUserModal = React.lazy(() =>
  import('./modals/NewUserModal').then(module => ({ default: module.NewUserModal }))
);

const UserEditModal = React.lazy(() =>
  import('./modals/UserEditModal').then(module => ({ default: module.UserEditModal }))
);

const UserDetailModal = React.lazy(() =>
  import('./modals/UserDetailModal').then(module => ({ default: module.UserDetailModal }))
);

const OrderEditModal = React.lazy(() =>
  import('./modals/OrderEditModal').then(module => ({ default: module.OrderEditModal }))
);

const OrderInvoiceModal = React.lazy(() =>
  import('./modals/OrderInvoiceModal').then(module => ({ default: module.OrderInvoiceModal }))
);

const UserImportModal = React.lazy(() =>
  import('./modals/UserImportModal').then(module => ({ default: module.UserImportModal }))
);

const EmailUserModal = React.lazy(() =>
  import('./modals/EmailUserModal').then(module => ({ default: module.EmailUserModal }))
);

interface AdminPageProps {
  userInfo: UserInfo;
  onBackToMain: () => void;
  onProfileMenuClick: (action: string) => void;
}

const mapRoleFromStore = (role: string): 'user' | 'collaborateur' | 'admin' => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'collaborateur';
    default:
      return 'user';
  }
};

const mapRoleToStore = (role: string): 'admin' | 'pro' | 'premium' => {
  switch (role) {
    case 'admin':
      return 'admin';
    case 'collaborateur':
      return 'pro';
    default:
      return 'premium';
  }
};

const mapStatusFromStore = (status: string): 'active' | 'inactive' | 'expired' | 'pending' => {
  switch (status) {
    case 'expired':
      return 'expired';
    case 'active':
      return 'active';
    case 'pending':
    case 'en_attente':
      return 'pending';
    default:
      return 'inactive';
  }
};

const mapStatusToStore = (status: string): 'active' | 'inactive' | 'expired' | 'pending' => {
  switch (status) {
    case 'expired':
      return 'expired';
    case 'active':
      return 'active';
    case 'pending':
      return 'pending';
    default:
      return 'inactive';
  }
};

const mapSubscriptionTypeFromStore = (subscriptionType: string): 'admin' | 'pro' | 'premium' => {
  switch (subscriptionType) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'pro';
    default:
      return 'premium';
  }
};

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.includes(',') ? result.split(',')[1] : result;
        resolve(base64);
      } else {
        resolve('');
      }
    };
    reader.onerror = () => {
      reject(reader.error ?? new Error('Impossible de lire le fichier en base64'));
    };
    reader.readAsDataURL(file);
  });
}

const mapSubscriptionTypeToStore = (subscriptionType: string): 'admin' | 'pro' | 'premium' => {
  switch (subscriptionType) {
    case 'admin':
      return 'admin';
    case 'pro':
      return 'pro';
    default:
      return 'premium';
  }
};

const normalizeDateForForm = (date?: string | null): string => {
  if (!date) {
    return '';
  }
  const [firstPart] = date.split('T');
  return firstPart || '';
};

// Hook pour récupérer les vrais utilisateurs depuis la BD
const useRealUsers = () => {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      
 const { buildEdgeFunctionUrl } = await import('../utils/supabase/edge');
      const { misanAuth } = await import('../utils/supabase/auth');
      const accessToken = await misanAuth.getAccessToken();

      if (!accessToken) {
        throw new Error('Session administrateur expirée. Veuillez vous reconnecter.');
      }

 const url = await buildEdgeFunctionUrl('/functions/v1/make-server-810b4099/list-users'); const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Erreur ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success && data.users) {
        // Convertir les données en format AdminUser
        const adminUsers: AdminUser[] = data.users
          .filter((u: any) => u.kv_profile)
          .map((u: any) => ({
            id: u.auth_user.id,
            name: u.kv_profile.name,
            email: u.kv_profile.email,
            avatar: u.kv_profile.avatar || '',
            role: mapRoleFromStore(u.kv_profile?.role || ''),
            status: mapStatusFromStore(u.kv_profile?.subscription_status || ''),
            subscriptionType: mapSubscriptionTypeFromStore(u.kv_profile?.subscription_type || ''),
            subscriptionStart: normalizeDateForForm(u.kv_profile?.subscription_start || u.kv_profile?.created_at),
            subscriptionEnd: normalizeDateForForm(u.kv_profile?.subscription_end),
            tokens: u.kv_profile.tokens_balance || 0,
            createdAt: u.auth_user.created_at?.split('T')[0] || '',
            lastLogin: u.auth_user.last_sign_in_at?.split('T')[0] || '',
            totalOrders: 0,
            totalSpent: 0
          }));
        
        setUsers(adminUsers);
      } else {
        setUsers([]);
      }
    } catch (err) {
      console.error('Erreur récupération utilisateurs:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const removeFromState = (userId: string) => {
    setUsers(prev => prev.filter(user => user.id !== userId));
  };

  return { users, loading, error, refetch: fetchUsers, removeFromState };
};

// Hook pour récupérer les vraies commandes depuis la BD
const useRealOrders = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const loadedOrders = await fetchAdminOrders();
      setOrders(loadedOrders);
    } catch (err) {
      console.error('Erreur récupération commandes:', err);
      setError(err instanceof Error ? err.message : 'Erreur inconnue');
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  return { orders, loading, error, refetch: fetchOrders };
};

export function AdminPage({ userInfo, onBackToMain, onProfileMenuClick }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [usersFilter, setUsersFilter] = useState('all');
const [ordersFilter, setOrdersFilter] = useState('all');
const [orderTypeFilter, setOrderTypeFilter] = useState('all');
const [orderPaymentFilter, setOrderPaymentFilter] = useState('all');
const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
const [pendingDeleteOrders, setPendingDeleteOrders] = useState<string[] | null>(null);
const [isDeletingOrders, setIsDeletingOrders] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [ordersPerPage] = useState(10);

  // États pour les modales
  const [newUserModalOpen, setNewUserModalOpen] = useState(false);
  const [userEditModalOpen, setUserEditModalOpen] = useState(false);
  const [userDetailModalOpen, setUserDetailModalOpen] = useState(false);
  const [orderEditModalOpen, setOrderEditModalOpen] = useState(false);
  const [orderInvoiceModalOpen, setOrderInvoiceModalOpen] = useState(false);
  const [userImportModalOpen, setUserImportModalOpen] = useState(false);
  const [emailUserModalOpen, setEmailUserModalOpen] = useState(false);
  const [emailTemplates, setEmailTemplates] = useState<EmailTemplate[]>([]);
  const [isLoadingEmailTemplates, setIsLoadingEmailTemplates] = useState(false);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [communicationsFullView, setCommunicationsFullView] = useState<null | 'alerts' | 'emails'>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [isDeletingUser, setIsDeletingUser] = useState(false);

  // Utiliser les hooks pour récupérer les vraies données
  const {
    users,
    loading: usersLoading,
    error: usersError,
    refetch: refetchUsers,
    removeFromState: removeUserFromState,
  } = useRealUsers();
  const { orders, loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useRealOrders();

  const loadEmailTemplates = useCallback(async () => {
    try {
      setIsLoadingEmailTemplates(true);
      const templates = await fetchEmailTemplates();
      const activeTemplates = templates.filter(template => template.isActive);
      setEmailTemplates(activeTemplates);
    } catch (error) {
      console.error('Erreur chargement templates emails:', error);
      toast.error("Impossible de charger les templates d'email");
    } finally {
      setIsLoadingEmailTemplates(false);
    }
  }, []);

  useEffect(() => {
    void loadEmailTemplates();
  }, [loadEmailTemplates]);

  // États pour les paramètres
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: 'Misan',
    siteDescription: 'Assistant IA Juridique',
    supportEmail: 'support@misan.dz',
    brevoApiKey: '',
    maintenanceMode: false,
    registrationEnabled: true,
    freeTrialDays: 7,
    freeTrialTokens: 100000
  });
  const [isLoadingSiteSettings, setIsLoadingSiteSettings] = useState(false);
  const [isSavingSiteSettings, setIsSavingSiteSettings] = useState(false);
  const [isLoadingPricingSettings, setIsLoadingPricingSettings] = useState(false);
  const [isSavingPricingSettings, setIsSavingPricingSettings] = useState(false);
  const [isLoadingPaymentSettings, setIsLoadingPaymentSettings] = useState(false);
  const [isSavingPaymentSettings, setIsSavingPaymentSettings] = useState(false);
  const [isLoadingLLMSettings, setIsLoadingLLMSettings] = useState(false);
  const [isSavingLLMSettings, setIsSavingLLMSettings] = useState(false);

  const cloneSettings = <T,>(settings: T): T => JSON.parse(JSON.stringify(settings));

  useEffect(() => {
    setIsLoadingSiteSettings(true);
    setIsLoadingPricingSettings(true);
    setIsLoadingPaymentSettings(true);
    setIsLoadingLLMSettings(true);

    Promise.all([loadSiteSettings(), loadPricingSettings(), loadPaymentSettings(), loadLLMSettings()])
      .then(([site, pricing, payment, llm]) => {
        if (site) {
          setSiteSettings(prev => ({ ...prev, ...site }));
        }
        if (pricing) {
          setPricingSettings(cloneSettings(pricing));
        }
        if (payment) {
          setPaymentSettings(cloneSettings(payment));
        }
        if (llm) {
          setLlmSettings(prev => ({ ...prev, ...llm }));
        }
      })
      .catch(error => {
        console.error('Erreur chargement paramètres administrateur:', error);
      })
      .finally(() => {
        setIsLoadingSiteSettings(false);
        setIsLoadingPricingSettings(false);
        setIsLoadingPaymentSettings(false);
        setIsLoadingLLMSettings(false);
      });
  }, []);

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>(() => cloneSettings(DEFAULT_PRICING_SETTINGS));
  const [paymentSettings, setPaymentSettings] = useState<PaymentSettings>(() => cloneSettings(DEFAULT_PAYMENT_SETTINGS));

  const [llmSettings, setLlmSettings] = useState<LLMSettings>(DEFAULT_LLM_SETTINGS);

  // Filtrage des utilisateurs
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = usersFilter === 'all' || 
                         (usersFilter === 'active' && user.status === 'active') ||
                         (usersFilter === 'pending' && user.status === 'pending') ||
                         (usersFilter === 'inactive' && user.status === 'inactive') ||
                         (usersFilter === 'premium' && user.subscriptionType === 'premium') ||
                         (usersFilter === 'admin' && user.role === 'admin');
    return matchesSearch && matchesFilter;
  });

  // Statistiques du tableau de bord
  const dashboardStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    premiumUsers: users.filter(u => u.subscriptionType === 'premium').length,
    totalOrders: orders.length,
    monthlyRevenue: orders.reduce((sum, order) => sum + (order.summary?.totalTTC || 0), 0),
    pendingOrders: orders.filter(o => o.status === 'pending').length
  };

  // Fonctions de gestion des utilisateurs
  const handleUserAction = async (userId: string, action: 'suspend' | 'activate' | 'delete' | 'make_admin' | 'email') => {
    if (action === 'email') {
      setSelectedUserIds([userId]);
      if (!isLoadingEmailTemplates && emailTemplates.length === 0) {
        void loadEmailTemplates();
      }
      setEmailUserModalOpen(true);
      return;
    }

    try {
      const { misanAuth } = await import('../utils/supabase/auth');

      if (action === 'delete') {
        const userToDelete = users.find(u => u.id === userId);
        if (!userToDelete) {
          toast.error("Utilisateur introuvable");
          return;
        }

        setPendingDeleteUserId(userToDelete.id);
        return;
      }

      const updates: Record<string, unknown> = {};
      let successMessage = '';

      switch (action) {
        case 'activate':
          updates.status = 'active';
          successMessage = 'Utilisateur activé';
          break;
        case 'suspend':
          updates.status = 'inactive';
          successMessage = 'Utilisateur suspendu';
          break;
        case 'make_admin':
          updates.role = 'admin';
          successMessage = 'Utilisateur promu admin';
          break;
        default:
          successMessage = 'Action appliquée';
      }

      const result = await misanAuth.adminUpdateUser(userId, updates);

      if (!result.success) {
        toast.error(result.error || "Impossible d'appliquer l'action");
        return;
      }

      toast.success(successMessage);
      await refetchUsers();
    } catch (error) {
      console.error('Erreur action utilisateur:', error);
      toast.error("Erreur lors de l'application de l'action utilisateur");
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    setSelectedUserIds(prev => 
      checked 
        ? [...prev, userId]
        : prev.filter(id => id !== userId)
    );
  };

  const handleSelectAllUsers = (checked: boolean) => {
    setSelectedUserIds(checked ? filteredUsers.map(u => u.id) : []);
  };

  const pendingDeleteUser = pendingDeleteUserId ? users.find(u => u.id === pendingDeleteUserId) : null;

  const handleConfirmDeleteUser = async () => {
    if (!pendingDeleteUserId) {
      return;
    }

    try {
      setIsDeletingUser(true);
      const { misanAuth } = await import('../utils/supabase/auth');
      const deleteResult = await misanAuth.adminDeleteUser(pendingDeleteUserId);

      if (!deleteResult.success) {
        toast.error(deleteResult.error || "Impossible de supprimer l'utilisateur");
        return;
      }

      removeUserFromState(pendingDeleteUserId);
      setSelectedUserIds(prev => prev.filter(id => id !== pendingDeleteUserId));
      toast.success('Utilisateur supprimé');
      setPendingDeleteUserId(null);
      await refetchUsers();
    } catch (error) {
      console.error('Erreur suppression utilisateur:', error);
      toast.error("Erreur lors de la suppression de l'utilisateur");
    } finally {
      setIsDeletingUser(false);
    }
  };

  // Fonctions de gestion des commandes
  const handleOrderAction = (orderId: string, action: 'refund' | 'cancel' | 'approve') => {
    toast.success(`Action "${action}" appliquée à la commande ${orderId}`);
    refetchOrders();
  };

const handleSelectOrder = (orderId: string, checked: boolean) => {
  setSelectedOrderIds(prev => 
    checked 
      ? [...prev, orderId]
      : prev.filter(id => id !== orderId)
  );
};

const handleConfirmDeleteOrders = async () => {
  if (!pendingDeleteOrders || pendingDeleteOrders.length === 0) {
    setPendingDeleteOrders(null);
    return;
  }

  try {
    setIsDeletingOrders(true);
    await deleteAdminOrders(pendingDeleteOrders);
    toast.success(pendingDeleteOrders.length > 1 ? 'Commandes supprimées' : 'Commande supprimée');
    setSelectedOrderIds(prev => prev.filter(id => !pendingDeleteOrders.includes(id)));
    await refetchOrders();
  } catch (error) {
    console.error('Erreur suppression commandes:', error);
    toast.error(error instanceof Error ? error.message : 'Erreur lors de la suppression des commandes');
  } finally {
    setIsDeletingOrders(false);
    setPendingDeleteOrders(null);
  }
};

  // Fonctions de sauvegarde des paramètres
  const handleSaveSettings = async (type: 'site' | 'pricing' | 'payment' | 'subscription') => {
    if (type === 'site') {
      setIsSavingSiteSettings(true);
      try {
        await saveSiteSettings(siteSettings);
        toast.success('Paramètres du site sauvegardés');
      } catch (error) {
        console.error('Erreur sauvegarde paramètres du site:', error);
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des paramètres.');
      } finally {
        setIsSavingSiteSettings(false);
      }
      return;
    }

    if (type === 'pricing') {
      setIsSavingPricingSettings(true);
      try {
        await savePricingSettings(pricingSettings);
        toast.success('Paramètres tarifaires sauvegardés');
      } catch (error) {
        console.error('Erreur sauvegarde paramètres tarifaires:', error);
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des paramètres tarifaires.');
      } finally {
        setIsSavingPricingSettings(false);
      }
      return;
    }

    if (type === 'payment') {
      setIsSavingPaymentSettings(true);
      try {
        await savePaymentSettings(paymentSettings);
        toast.success('Paramètres de paiement sauvegardés');
      } catch (error) {
        console.error('Erreur sauvegarde paramètres de paiement:', error);
        toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des paramètres de paiement.');
      } finally {
        setIsSavingPaymentSettings(false);
      }
      return;
    }

    toast.success(`Paramètres ${type} sauvegardés`);
  };

  const handleSaveLLMSettings = async (settingsOverride?: LLMSettings) => {
    setIsSavingLLMSettings(true);
    try {
      const payload = settingsOverride ?? llmSettings;
      await saveLLMSettings(payload);
      if (settingsOverride) {
        setLlmSettings(settingsOverride);
      }
      toast.success('Paramètres LLM sauvegardés');
    } catch (error) {
      console.error('Erreur sauvegarde paramètres LLM:', error);
      toast.error(error instanceof Error ? error.message : 'Erreur lors de la sauvegarde des paramètres LLM');
    } finally {
      setIsSavingLLMSettings(false);
    }
  };

  // Fonctions pour les modales
  const handleEditUser = (user: AdminUser) => {
    setSelectedUser(user);
    setUserEditModalOpen(true);
  };

  const handleViewUser = (user: AdminUser) => {
    setSelectedUser(user);
    setUserDetailModalOpen(true);
  };

  const handleEditOrder = (order: AdminOrder) => {
    setSelectedOrder(order);
    setOrderEditModalOpen(true);
  };

  const handleViewInvoice = (order: AdminOrder) => {
    setSelectedOrder(order);
    setOrderInvoiceModalOpen(true);
  };

  const handleExportOrders = () => {
    toast.success('Export des commandes en cours...');
  };

  const handleBulkAction = (action: string, ids: string[]) => {
    if (action === 'delete') {
      if (ids.length === 0) {
        return;
      }
      setPendingDeleteOrders(ids);
      return;
    }
    toast.success(`Action groupée "${action}" sur ${ids.length} élément(s)`);
  };

  const normalizeDateForUpdate = (value?: string | null): string | null => {
    if (!value) {
      return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }
    const parsed = new Date(trimmed);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed.toISOString();
    }
    return trimmed;
  };

  const handleSaveOrder = async (updatedOrder: AdminOrder): Promise<void> => {
    const relatedUser = users.find((user) => user.id === updatedOrder.user.id) ?? null;

    let userStatus: 'active' | 'inactive' | 'expired' | 'pending';
    let subscriptionStart: string | null = null;
    let subscriptionEnd: string | null = null;

    switch (updatedOrder.status) {
      case 'paid': {
        userStatus = 'active';
        subscriptionStart = updatedOrder.payment.paymentDate
          ?? normalizeDateForUpdate(relatedUser?.subscriptionStart)
          ?? new Date().toISOString();
        subscriptionEnd = normalizeDateForUpdate(relatedUser?.subscriptionEnd);
        break;
      }
      case 'overdue': {
        userStatus = 'expired';
        subscriptionStart = normalizeDateForUpdate(relatedUser?.subscriptionStart);
        subscriptionEnd = normalizeDateForUpdate(relatedUser?.subscriptionEnd);
        break;
      }
      case 'pending': {
        userStatus = 'inactive';
        subscriptionStart = normalizeDateForUpdate(relatedUser?.subscriptionStart);
        subscriptionEnd = normalizeDateForUpdate(relatedUser?.subscriptionEnd);
        break;
      }
      case 'cancelled': {
        userStatus = relatedUser?.status === 'expired' ? 'expired' : 'inactive';
        subscriptionStart = null;
        subscriptionEnd = null;
        break;
      }
      default: {
        userStatus = 'inactive';
        subscriptionStart = normalizeDateForUpdate(relatedUser?.subscriptionStart);
        subscriptionEnd = normalizeDateForUpdate(relatedUser?.subscriptionEnd);
      }
    }

    try {
      await updateAdminOrder(updatedOrder, {
        userStatus,
        subscriptionStart,
        subscriptionEnd
      });

      await Promise.all([
        refetchOrders(),
        refetchUsers()
      ]);

      setSelectedOrder(null);
    } catch (error) {
      throw error instanceof Error ? error : new Error('Mise à jour de la commande impossible');
    }
  };

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
    case 'paid':
      case 'completed':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'pending':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'inactive':
      case 'cancelled':
      case 'failed':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'expired':
      case 'suspended':
        return 'text-orange-600 bg-orange-50 border-orange-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header Admin */}
      <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToMain}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="text-2xl font-bold">Administration Misan</div>
          <Badge variant="secondary" className="text-xs bg-red-500/80 text-white border-red-400">
            <Shield className="w-3 h-3 mr-1" />
            Admin
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="text-sm">{dashboardStats.totalUsers} utilisateurs</span>
          </div>
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            <span className="text-sm">{dashboardStats.totalOrders} commandes</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="text-sm">{dashboardStats.monthlyRevenue.toLocaleString()} DA</span>
          </div>

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
              <DropdownMenuLabel>Administration</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onProfileMenuClick('preferences')}>
                <Settings className="w-4 h-4 mr-2" />
                Préférences
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onProfileMenuClick('logout')} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contenu principal */}
      <div className="flex-1 p-6 overflow-y-auto">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-8">
            <TabsTrigger value="dashboard" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Tableau de bord
            </TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              Utilisateurs
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" />
              Commandes
            </TabsTrigger>
            <TabsTrigger value="pricing" className="flex items-center gap-2">
              <CreditCard className="w-4 h-4" />
              Tarification
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center gap-2">
              <Wallet className="w-4 h-4" />
              Paiements
            </TabsTrigger>
            <TabsTrigger value="ai-models" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Modèles d'IA
            </TabsTrigger>
            <TabsTrigger value="communications" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Alertes & Emails
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Paramètres
            </TabsTrigger>
          </TabsList>

          {/* Tableau de bord */}
          <TabsContent value="dashboard" className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Utilisateurs Total</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-green-600">+{dashboardStats.activeUsers} actifs</span>
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Abonnés Premium</CardTitle>
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.premiumUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    {dashboardStats.totalUsers > 0 ? Math.round((dashboardStats.premiumUsers / dashboardStats.totalUsers) * 100) : 0}% du total
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Revenus Mensuels</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{dashboardStats.monthlyRevenue.toLocaleString()} DA</div>
                  <p className="text-xs text-muted-foreground">
                    <span className="text-orange-600">{dashboardStats.pendingOrders} en attente</span>
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Activité récente */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Utilisateurs Récents</CardTitle>
                  <CardDescription>Derniers utilisateurs inscrits</CardDescription>
                </CardHeader>
                <CardContent>
                  {usersLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-6 h-6 animate-spin" />
                    </div>
                  ) : users.length > 0 ? (
                    <div className="space-y-4">
                      {users.slice(0, 5).map((user) => (
                        <div key={user.id} className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                          <Badge 
                            className={`text-xs border ${getStatusColor(user.status)}`}
                          >
                            {user.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-muted-foreground">
                      <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">Aucun utilisateur</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Statistiques Système</CardTitle>
                  <CardDescription>État général de la plateforme</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Mode maintenance</span>
                      <Badge variant={siteSettings.maintenanceMode ? 'destructive' : 'default'}>
                        {siteSettings.maintenanceMode ? 'Activé' : 'Désactivé'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Inscriptions</span>
                      <Badge variant={siteSettings.registrationEnabled ? 'default' : 'secondary'}>
                        {siteSettings.registrationEnabled ? 'Ouvertes' : 'Fermées'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Période d'essai</span>
                      <span className="text-sm font-medium">{siteSettings.freeTrialDays} jours</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Jetons d'essai</span>
                      <span className="text-sm font-medium">{siteSettings.freeTrialTokens.toLocaleString()}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Gestion des utilisateurs */}
          <TabsContent value="users" className="flex-1">
            <Suspense
              fallback={(
                <Card className="p-8">
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement du module utilisateurs...
                  </div>
                </Card>
              )}
            >
              <AdminUsersTab
                searchTerm={searchTerm}
                onSearchTermChange={(value) => setSearchTerm(value)}
                usersFilter={usersFilter}
                onUsersFilterChange={(value) => setUsersFilter(value)}
                onImport={() => setUserImportModalOpen(true)}
                onRefresh={refetchUsers}
                onCreate={() => setNewUserModalOpen(true)}
                usersLoading={usersLoading}
                usersError={usersError}
                filteredUsers={filteredUsers}
                selectedUserIds={selectedUserIds}
                onSelectAllUsers={handleSelectAllUsers}
                onSelectUser={handleSelectUser}
                onViewUser={handleViewUser}
                onEditUser={handleEditUser}
                onUserAction={handleUserAction}
                getStatusClass={getStatusColor}
              />
            </Suspense>
          </TabsContent>

          {/* Gestion des commandes */}
          <TabsContent value="orders" className="flex-1">
            <Suspense
              fallback={(
                <Card className="p-8">
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement du module commandes...
                  </div>
                </Card>
              )}
            >
              <AdminOrdersTab
                orders={orders}
                searchTerm={searchTerm}
                onSearchTermChange={(value) => setSearchTerm(value)}
                ordersFilter={ordersFilter}
                onOrdersFilterChange={(value) => setOrdersFilter(value)}
                orderTypeFilter={orderTypeFilter}
                onOrderTypeFilterChange={(value) => setOrderTypeFilter(value)}
                orderPaymentFilter={orderPaymentFilter}
                onOrderPaymentFilterChange={(value) => setOrderPaymentFilter(value)}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                ordersPerPage={ordersPerPage}
                onEditOrder={handleEditOrder}
                onViewInvoice={handleViewInvoice}
                onExportOrders={handleExportOrders}
                selectedOrderIds={selectedOrderIds}
                onSelectOrder={handleSelectOrder}
                onClearSelection={() => setSelectedOrderIds([])}
                onBulkMarkPaid={(ids) => handleBulkAction('mark_paid', ids)}
                onBulkMarkCompleted={(ids) => handleBulkAction('mark_completed', ids)}
                onBulkMarkCancelled={(ids) => handleBulkAction('mark_cancelled', ids)}
                onBulkDelete={(ids) => handleBulkAction('delete', ids)}
                onBulkExport={(ids) => handleBulkAction('export', ids)}
                ordersLoading={ordersLoading}
                ordersError={ordersError}
                refetchOrders={refetchOrders}
              />
            </Suspense>
          </TabsContent>

          {/* Gestion de la tarification */}
          <TabsContent value="pricing" className="flex-1">
            <Suspense
              fallback={(
                <Card className="p-6">
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement des paramètres tarifaires...
                  </div>
                </Card>
              )}
            >
              <AdminPricingTab
                pricingSettings={pricingSettings}
                setPricingSettings={setPricingSettings}
                onSavePricing={() => handleSaveSettings('pricing')}
                isSavingPricingSettings={isSavingPricingSettings}
                isLoadingPricingSettings={isLoadingPricingSettings}
              />
            </Suspense>
          </TabsContent>

          {/* Gestion des paiements */}
          <TabsContent value="payments" className="flex-1">
            <Suspense
              fallback={(
                <Card className="p-6">
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement des paramètres de paiement...
                  </div>
                </Card>
              )}
            >
              <PaymentMethodsTab
                paymentSettings={paymentSettings}
                setPaymentSettings={setPaymentSettings}
                onSave={() => handleSaveSettings('payment')}
                isSaving={isSavingPaymentSettings}
                isLoading={isLoadingPaymentSettings}
              />
            </Suspense>
          </TabsContent>

          {/* Gestion des modèles d'IA */}
          <TabsContent value="ai-models" className="flex-1">
            <Suspense
              fallback={(
                <Card className="p-6">
                  <div className="flex items-center justify-center text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Chargement des modèles IA...
                  </div>
                </Card>
              )}
            >
              <AIModelsManagement
                llmSettings={llmSettings}
                setLlmSettings={setLlmSettings}
                onSave={handleSaveLLMSettings}
                isSaving={isSavingLLMSettings}
                isLoading={isLoadingLLMSettings}
              />
            </Suspense>
          </TabsContent>

          {/* Communications */}
          <TabsContent value="communications" className="flex-1">
            {communicationsFullView ? (
              <div className="flex flex-col h-full gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCommunicationsFullView(null)}
                    className="w-full sm:w-auto"
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Retour aux onglets
                  </Button>
                  <div className="flex flex-col text-sm">
                    <span className="font-semibold">
                      {communicationsFullView === 'alerts' ? 'Liste complète des alertes' : 'Liste complète des templates emails'}
                    </span>
                    <span className="text-muted-foreground">
                      Affichage en pleine page pour gérer un volume important d'entrées.
                    </span>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <Suspense
                    fallback={(
                      <Card className="h-full">
                        <CardContent className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Chargement de la liste...
                        </CardContent>
                      </Card>
                    )}
                  >
                    {communicationsFullView === 'alerts' ? (
                      <AlertRulesTab variant="page" />
                    ) : (
                      <EmailTemplatesTab variant="page" />
                    )}
                  </Suspense>
                </div>
              </div>
            ) : (
              <Tabs defaultValue="alerts" className="h-full flex flex-col">
                <TabsList className="w-full grid grid-cols-2 mb-4">
                  <TabsTrigger value="alerts" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Alertes
                  </TabsTrigger>
                  <TabsTrigger value="emails" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    Emails
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="alerts" className="flex-1">
                  <Suspense
                    fallback={(
                      <Card>
                        <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Chargement des alertes...
                        </CardContent>
                      </Card>
                    )}
                  >
                    <AlertRulesTab onOpenFullPage={() => setCommunicationsFullView('alerts')} />
                  </Suspense>
                </TabsContent>

                <TabsContent value="emails" className="flex-1">
                  <Suspense
                    fallback={(
                      <Card>
                        <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Chargement des emails...
                        </CardContent>
                      </Card>
                    )}
                  >
                    <EmailTemplatesTab onOpenFullPage={() => setCommunicationsFullView('emails')} />
                  </Suspense>
                </TabsContent>
              </Tabs>
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Suspense
                fallback={(
                  <Card>
                    <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chargement des paramètres du site...
                    </CardContent>
                  </Card>
                )}
              >
                <AdminSiteSettingsTab
                  siteSettings={siteSettings}
                  setSiteSettings={setSiteSettings}
                  onSaveSite={() => handleSaveSettings('site')}
                  isSavingSiteSettings={isSavingSiteSettings}
                  isLoadingSiteSettings={isLoadingSiteSettings}
                />
              </Suspense>

              <Suspense
                fallback={(
                  <Card>
                    <CardContent className="flex items-center justify-center p-6 text-sm text-muted-foreground">
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Chargement de l'essai gratuit...
                    </CardContent>
                  </Card>
                )}
              >
                <FreeTrialSettings />
              </Suspense>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modales */}
      {newUserModalOpen && (
        <Suspense fallback={null}>
          <NewUserModal
            open={newUserModalOpen}
            onOpenChange={setNewUserModalOpen}
            onSave={(newUser) => {
              console.log('Nouvel utilisateur:', newUser);
              refetchUsers();
            }}
          />
        </Suspense>
      )}

      {userEditModalOpen && (
        <Suspense fallback={null}>
          <UserEditModal
            open={userEditModalOpen}
            onOpenChange={setUserEditModalOpen}
            user={selectedUser}
            onSave={async (updatedUser) => {
              try {
                const { misanAuth } = await import('../utils/supabase/auth');
                const result = await misanAuth.adminUpdateUser(updatedUser.id, {
                  name: updatedUser.name,
                  role: mapRoleToStore(updatedUser.role || 'user'),
                  status: mapStatusToStore(updatedUser.status || 'inactive'),
                  subscriptionType: mapSubscriptionTypeToStore(updatedUser.subscriptionType || 'premium'),
                  subscriptionStart: updatedUser.subscriptionStart,
                  subscriptionEnd: updatedUser.subscriptionEnd,
                  tokens: updatedUser.tokens
                });

                if (!result.success) {
                  toast.error(result.error || 'Erreur lors de la mise à jour de l\'utilisateur');
                  return false;
                }

                await refetchUsers();
                setSelectedUser(null);
                return true;
              } catch (error) {
                console.error('Erreur mise à jour utilisateur:', error);
                toast.error('Erreur lors de la mise à jour de l\'utilisateur');
                return false;
              }
            }}
          />
        </Suspense>
      )}

      {userDetailModalOpen && (
        <Suspense fallback={null}>
          <UserDetailModal
            open={userDetailModalOpen}
            onOpenChange={setUserDetailModalOpen}
            user={selectedUser}
            onEdit={(user) => {
              setUserDetailModalOpen(false);
              setSelectedUser(user);
              setUserEditModalOpen(true);
            }}
          />
        </Suspense>
      )}

      {orderEditModalOpen && (
        <Suspense fallback={null}>
          <OrderEditModal
            open={orderEditModalOpen}
            onOpenChange={setOrderEditModalOpen}
            order={selectedOrder}
            onSave={handleSaveOrder}
          />
        </Suspense>
      )}

      {orderInvoiceModalOpen && (
        <Suspense fallback={null}>
          <OrderInvoiceModal
            open={orderInvoiceModalOpen}
            onOpenChange={setOrderInvoiceModalOpen}
            order={selectedOrder}
          />
        </Suspense>
      )}

      {userImportModalOpen && (
        <Suspense fallback={null}>
          <UserImportModal
            open={userImportModalOpen}
            onOpenChange={setUserImportModalOpen}
            onImport={(importedUsers) => {
              console.log('Utilisateurs importés:', importedUsers);
              refetchUsers();
            }}
          />
        </Suspense>
      )}

      {emailUserModalOpen && (
        <Suspense fallback={null}>
          <EmailUserModal
            open={emailUserModalOpen}
            onOpenChange={(open) => {
              setEmailUserModalOpen(open);
              if (!open) {
                setSelectedUserIds([]);
              }
            }}
            selectedUsers={users.filter(u => selectedUserIds.includes(u.id))}
            templates={emailTemplates}
            isLoadingTemplates={isLoadingEmailTemplates}
            onRefreshTemplates={loadEmailTemplates}
            onSendEmail={async (emailData) => {
              try {
                const attachmentsPayload = await Promise.all(
                  (emailData.attachments ?? []).map(async (file) => ({
                    name: file.name,
                    content: await fileToBase64(file),
                    type: file.type || undefined,
                  }))
                );

                const response = await sendAdminEmail({
                  to: emailData.to,
                  cc: emailData.cc,
                  bcc: emailData.bcc,
                  subject: emailData.subject,
                  htmlContent: emailData.content,
                  textContent: emailData.textContent,
                  attachments: attachmentsPayload.length > 0 ? attachmentsPayload : undefined,
                  templateId: emailData.templateId ?? null,
                });

                if (!response.success) {
                  toast.error(response.error ?? "Impossible d'envoyer l'email");
                  return false;
                }

                const attachmentInfo = attachmentsPayload.length > 0
                  ? ` avec ${attachmentsPayload.length} pièce(s) jointe(s)`
                  : '';

                toast.success(`Email envoyé à ${emailData.to.length} destinataire(s)${attachmentInfo}`);
                return true;
              } catch (error) {
                console.error('Erreur lors de l\'envoi de l\'email:', error);
                toast.error(error instanceof Error ? error.message : "Impossible d'envoyer l'email");
                return false;
              }
            }}
          />
        </Suspense>
      )}

      <AlertDialog
        open={Boolean(pendingDeleteUser)}
        onOpenChange={(open) => {
          if (!open && !isDeletingUser) {
            setPendingDeleteUserId(null);
          }
        }}
      >
        {pendingDeleteUser && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer {pendingDeleteUser.name}&nbsp;?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement le compte et ses accès. Elle est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingUser}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteUser}
                disabled={isDeletingUser}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingUser ? 'Suppression…' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>

      <AlertDialog
        open={Boolean(pendingDeleteOrders)}
        onOpenChange={(open) => {
          if (!open && !isDeletingOrders) {
            setPendingDeleteOrders(null);
          }
        }}
      >
        {pendingDeleteOrders && (
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                Supprimer {pendingDeleteOrders.length > 1 ? `${pendingDeleteOrders.length} commandes` : `la commande ${pendingDeleteOrders[0]}`} ?
              </AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement les enregistrements associés (factures et transactions). Elle est irréversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeletingOrders}>Annuler</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDeleteOrders}
                disabled={isDeletingOrders}
                className="bg-destructive text-white hover:bg-destructive/90"
              >
                {isDeletingOrders ? 'Suppression…' : 'Supprimer'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        )}
      </AlertDialog>
    </div>
  );
}
