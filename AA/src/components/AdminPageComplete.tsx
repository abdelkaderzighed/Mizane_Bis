import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { ScrollArea } from './ui/scroll-area';
import { Switch } from './ui/switch';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { Footer } from './Footer';
import { AIModelsManagement } from './AdminPageAIModels';
import type { 
  UserInfo, 
  AdminUser, 
  AdminOrder, 
  SiteSettings, 
  PricingSettings, 
  SubscriptionSettings,
  LLMSettings
} from '../types';
import { 
  ArrowLeft, 
  Users, 
  ShoppingCart, 
  Settings, 
  CreditCard, 
  Calendar,
  DollarSign,
  TrendingUp,
  UserCheck,
  UserX,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  Download,
  Upload,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Mail,
  Phone,
  MapPin,
  Save,
  Shield,
  Database,
  Coins,
  Percent,
  Globe,
  Lock,
  Unlock,
  Plus,
  Minus,
  ChevronDown,
  User,
  LogOut,
  Brain,
  Cpu
} from 'lucide-react';
import { toast } from 'sonner';

interface AdminPageProps {
  userInfo: UserInfo;
  onBackToMain: () => void;
  onProfileMenuClick: (action: string) => void;
}

// Données de test pour l'administration
const MOCK_ADMIN_USERS: AdminUser[] = [
];

const MOCK_ADMIN_ORDERS: AdminOrder[] = [
  {
    id: 'ORD-2024-001',
    items: [
      {
        id: 'item_1',
        type: 'subscription',
        name: 'Abonnement Premium - 1 mois',
        description: '1 million de jetons inclus',
        quantity: 1,
        unitPriceHT: 4000,
        totalHT: 4000,
        tokensIncluded: 1000000
      }
    ],
    summary: {
      subtotalHT: 4000,
      totalDiscount: 0,
      discountedSubtotal: 4000,
      vat: 800,
      totalTTC: 4800
    },
    payment: {
      method: 'card_cib',
      status: 'completed',
      transactionId: 'TXN_123456'
    },
    billingInfo: {
      name: 'Ahmed Benali',
      email: 'ahmed.benali@example.dz',
      phone: '+213 555 123 456',
      address: '123 Rue de la Liberté',
      city: 'Alger',
      postalCode: '16000',
      country: 'Algérie'
    },
    createdAt: new Date('2024-01-15'),
    status: 'paid',
    user: {
      id: 'user_001',
      name: 'Ahmed Benali',
      email: 'ahmed.benali@example.dz'
    }
  }
];

export function AdminPage({ userInfo, onBackToMain, onProfileMenuClick }: AdminPageProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [usersFilter, setUsersFilter] = useState('all');
  const [ordersFilter, setOrdersFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  
  // États pour les paramètres
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    siteName: 'Misan',
    siteDescription: 'Gestionnaire et éditeur de documents IA',
    supportEmail: 'support@misan.dz',
    brevoApiKey: '',
    maintenanceMode: false,
    registrationEnabled: true,
    freeTrialDays: 7,
    freeTrialTokens: 100000
  });

  const [pricingSettings, setPricingSettings] = useState<PricingSettings>({
    subscription: {
      monthlyPrice: 4000,
      monthlyTokens: 1000000,
      currency: 'DA'
    },
    tokens: {
      pricePerMillion: 1000,
      currency: 'DA'
    },
    discounts: [
      { threshold: 6, percentage: 7 },
      { threshold: 12, percentage: 20 },
      { threshold: 10000000, percentage: 10 },
      { threshold: 20000000, percentage: 20 }
    ],
    vat: {
      enabled: true,
      rate: 20
    }
  });

  const [subscriptionSettings, setSubscriptionSettings] = useState<SubscriptionSettings>({
    free: {
      durationDays: 7,
      tokensIncluded: 100000,
      features: ['Reconnaissance vocale', 'Agents IA de base', 'Export TXT/RTF']
    },
    premium: {
      monthlyPrice: 4000,
      tokensIncluded: 1000000,
      features: ['Tous les agents IA', 'Tous les modèles LLM', 'Support prioritaire', 'Export avancé']
    }
  });

  // États pour les paramètres LLM
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
    models: {},
    defaultModels: ['gpt35'],
    maxSimultaneousModels: 3,
    apiKeys: {},
    globalSettings: {
      allowUserOverrides: true,
      defaultTimeout: 30000,
      maxRetries: 3,
      enableCaching: true,
      allowModelSelection: true,
      defaultModelId: 'gpt35'
    }
  });

  // Filtrage des utilisateurs
  const filteredUsers = MOCK_ADMIN_USERS.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = usersFilter === 'all' || 
                         (usersFilter === 'active' && user.status === 'active') ||
                         (usersFilter === 'inactive' && user.status === 'inactive') ||
                         (usersFilter === 'premium' && user.subscriptionType === 'premium') ||
                         (usersFilter === 'admin' && user.role === 'admin');
    return matchesSearch && matchesFilter;
  });

  // Filtrage des commandes
  const filteredOrders = MOCK_ADMIN_ORDERS.filter(order => {
    const matchesSearch = order.user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         order.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = ordersFilter === 'all' || order.status === ordersFilter;
    return matchesSearch && matchesFilter;
  });

  // Statistiques du tableau de bord
  const dashboardStats = {
    totalUsers: MOCK_ADMIN_USERS.length,
    activeUsers: MOCK_ADMIN_USERS.filter(u => u.status === 'active').length,
    premiumUsers: MOCK_ADMIN_USERS.filter(u => u.subscriptionType === 'premium').length,
    totalOrders: MOCK_ADMIN_ORDERS.length,
    monthlyRevenue: MOCK_ADMIN_ORDERS.reduce((sum, order) => sum + order.summary.totalTTC, 0),
    pendingOrders: MOCK_ADMIN_ORDERS.filter(o => o.status === 'pending').length
  };

  const handleUserAction = (userId: string, action: 'suspend' | 'activate' | 'delete' | 'make_admin') => {
    toast.success(`Action "${action}" appliquée à l'utilisateur ${userId}`);
  };

  const handleOrderAction = (orderId: string, action: 'refund' | 'cancel' | 'approve') => {
    toast.success(`Action "${action}" appliquée à la commande ${orderId}`);
  };

  const handleSaveSettings = (type: 'site' | 'pricing' | 'subscription') => {
    toast.success(`Paramètres ${type} sauvegardés`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': case 'paid': case 'completed': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'inactive': case 'cancelled': case 'failed': return 'text-red-600 bg-red-50 border-red-200';
      case 'suspended': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
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
              <DropdownMenuItem onClick={() => onProfileMenuClick('accountInfo')}>
                <User className="w-4 h-4 mr-2" />
                Informations du compte
              </DropdownMenuItem>
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
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
          <TabsList className="grid w-full grid-cols-5">
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
            <TabsTrigger value="ai-models" className="flex items-center gap-2">
              <Brain className="w-4 h-4" />
              Modèles d'IA
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
                    {Math.round((dashboardStats.premiumUsers / dashboardStats.totalUsers) * 100)}% du total
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
          </TabsContent>

          {/* Gestion des utilisateurs */}
          <TabsContent value="users" className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher utilisateurs..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-80"
                  />
                </div>
                <Select value={usersFilter} onValueChange={setUsersFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tous les utilisateurs</SelectItem>
                    <SelectItem value="active">Actifs</SelectItem>
                    <SelectItem value="inactive">Inactifs</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="admin">Administrateurs</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Exporter
                </Button>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Nouvel utilisateur
                </Button>
              </div>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Utilisateur</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Abonnement</TableHead>
                    <TableHead>Jetons</TableHead>
                    <TableHead>Commandes</TableHead>
                    <TableHead>Dernière connexion</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="w-8 h-8">
                            <AvatarImage src={user.avatar} alt={user.name} />
                            <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium flex items-center gap-2">
                              {user.name}
                              {user.role === 'admin' && (
                                <Badge className="text-xs bg-red-500">Admin</Badge>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${getStatusColor(user.status)}`}>
                          {user.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={user.subscriptionType === 'premium' ? 'default' : 'secondary'} className="text-xs">
                          {user.subscriptionType}
                        </Badge>
                      </TableCell>
                      <TableCell>{user.tokens.toLocaleString()}</TableCell>
                      <TableCell>{user.totalOrders}</TableCell>
                      <TableCell>{user.lastLogin}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="w-4 h-4 mr-2" />
                              Modifier
                            </DropdownMenuItem>
                            {user.status === 'active' ? (
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'suspend')}>
                                <UserX className="w-4 h-4 mr-2" />
                                Suspendre
                              </DropdownMenuItem>
                            ) : (
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'activate')}>
                                <UserCheck className="w-4 h-4 mr-2" />
                                Activer
                              </DropdownMenuItem>
                            )}
                            {user.role !== 'admin' && (
                              <DropdownMenuItem onClick={() => handleUserAction(user.id, 'make_admin')}>
                                <Shield className="w-4 h-4 mr-2" />
                                Promouvoir admin
                              </DropdownMenuItem>
                            )}
                            <Separator />
                            <DropdownMenuItem className="text-red-600" onClick={() => handleUserAction(user.id, 'delete')}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Supprimer
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Gestion des commandes */}
          <TabsContent value="orders" className="flex-1 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Rechercher commandes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8 w-80"
                  />
                </div>
                <Select value={ordersFilter} onValueChange={setOrdersFilter}>
                  <SelectTrigger className="w-48">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Toutes les commandes</SelectItem>
                    <SelectItem value="paid">Payées</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="cancelled">Annulées</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Exporter commandes
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Commande</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Montant</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-sm">{order.id}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.user.name}</div>
                          <div className="text-sm text-muted-foreground">{order.user.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs">
                          {order.items[0]?.type}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.summary.totalTTC.toLocaleString()} DA</TableCell>
                      <TableCell>
                        <Badge className={`text-xs border ${getStatusColor(order.status)}`}>
                          {order.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{order.createdAt.toLocaleDateString('fr-FR')}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedOrder(order)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Voir détails
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOrderAction(order.id, 'refund')}>
                              <RefreshCw className="w-4 h-4 mr-2" />
                              Rembourser
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleOrderAction(order.id, 'cancel')}>
                              <XCircle className="w-4 h-4 mr-2" />
                              Annuler
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>

          {/* Gestion de la tarification */}
          <TabsContent value="pricing" className="flex-1 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Abonnement Premium</CardTitle>
                  <CardDescription>
                    Configuration des prix et fonctionnalités de l'abonnement mensuel
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="monthly-price">Prix mensuel (DA)</Label>
                      <Input
                        id="monthly-price"
                        type="number"
                        value={pricingSettings.subscription.monthlyPrice}
                        onChange={(e) => setPricingSettings(prev => ({
                          ...prev,
                          subscription: {
                            ...prev.subscription,
                            monthlyPrice: parseInt(e.target.value) || 0
                          }
                        }))}
                      />
                    </div>
                    <div>
                      <Label htmlFor="monthly-tokens">Jetons inclus</Label>
                      <Input
                        id="monthly-tokens"
                        type="number"
                        value={pricingSettings.subscription.monthlyTokens}
                        onChange={(e) => setPricingSettings(prev => ({
                          ...prev,
                          subscription: {
                            ...prev.subscription,
                            monthlyTokens: parseInt(e.target.value) || 0
                          }
                        }))}
                      />
                    </div>
                  </div>
                  <Button onClick={() => handleSaveSettings('pricing')}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder Abonnement
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Jetons Supplémentaires</CardTitle>
                  <CardDescription>
                    Prix des jetons à l'achat séparé
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="token-price">Prix par million de jetons (DA)</Label>
                    <Input
                      id="token-price"
                      type="number"
                      value={pricingSettings.tokens.pricePerMillion}
                      onChange={(e) => setPricingSettings(prev => ({
                        ...prev,
                        tokens: {
                          ...prev.tokens,
                          pricePerMillion: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                  <Button onClick={() => handleSaveSettings('pricing')}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder Jetons
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Remises Automatiques</CardTitle>
                <CardDescription>
                  Configuration des remises pour abonnements et achats de jetons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        Remises par Durée d'Abonnement
                      </h4>
                      <div className="space-y-2">
                        {pricingSettings.discounts.filter(d => d.threshold <= 12).map((discount, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{discount.threshold} mois</Badge>
                            <span>→ {discount.percentage}% de remise</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3 flex items-center gap-2">
                        <Coins className="w-4 h-4" />
                        Remises par Volume de Jetons
                      </h4>
                      <div className="space-y-2">
                        {pricingSettings.discounts.filter(d => d.threshold > 12).map((discount, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <Badge variant="outline">{(discount.threshold / 1000000).toFixed(0)}M jetons</Badge>
                            <span>→ {discount.percentage}% de remise</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Percent className="w-4 h-4" />
                      <Label htmlFor="vat-enabled">TVA activée ({pricingSettings.vat.rate}%)</Label>
                    </div>
                    <Switch
                      id="vat-enabled"
                      checked={pricingSettings.vat.enabled}
                      onCheckedChange={(enabled) => setPricingSettings(prev => ({
                        ...prev,
                        vat: { ...prev.vat, enabled }
                      }))}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Gestion des modèles d'IA */}
          <TabsContent value="ai-models" className="flex-1">
            <AIModelsManagement
              llmSettings={llmSettings}
              setLlmSettings={setLlmSettings}
              onSave={() => toast.success('Paramètres IA sauvegardés')}
            />
          </TabsContent>

          {/* Paramètres généraux */}
          <TabsContent value="settings" className="flex-1 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Paramètres du Site</CardTitle>
                  <CardDescription>
                    Configuration générale de l'application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="site-name">Nom du site</Label>
                    <Input
                      id="site-name"
                      value={siteSettings.siteName}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, siteName: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="site-description">Description</Label>
                    <Textarea
                      id="site-description"
                      value={siteSettings.siteDescription}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="support-email">Email de support</Label>
                    <Input
                      id="support-email"
                      type="email"
                      value={siteSettings.supportEmail}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, supportEmail: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="brevo-api-key">Clé API Brevo (SMTP)</Label>
                    <Input
                      id="brevo-api-key"
                      type="password"
                      value={siteSettings.brevoApiKey}
                      placeholder="sb-xxxxxxxxxxxxxxxx"
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, brevoApiKey: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Coller la clé API fournie par Brevo pour activer l'envoi d'emails.
                    </p>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maintenance-mode">Mode maintenance</Label>
                    <Switch
                      id="maintenance-mode"
                      checked={siteSettings.maintenanceMode}
                      onCheckedChange={(checked) => setSiteSettings(prev => ({ ...prev, maintenanceMode: checked }))}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="registration-enabled">Inscription activée</Label>
                    <Switch
                      id="registration-enabled"
                      checked={siteSettings.registrationEnabled}
                      onCheckedChange={(checked) => setSiteSettings(prev => ({ ...prev, registrationEnabled: checked }))}
                    />
                  </div>
                  <Button onClick={() => handleSaveSettings('site')}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Période d'Essai</CardTitle>
                  <CardDescription>
                    Configuration de l'essai gratuit pour nouveaux utilisateurs
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="trial-days">Durée d'essai (jours)</Label>
                    <Input
                      id="trial-days"
                      type="number"
                      value={siteSettings.freeTrialDays}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, freeTrialDays: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="trial-tokens">Jetons d'essai</Label>
                    <Input
                      id="trial-tokens"
                      type="number"
                      value={siteSettings.freeTrialTokens}
                      onChange={(e) => setSiteSettings(prev => ({ ...prev, freeTrialTokens: parseInt(e.target.value) || 0 }))}
                    />
                  </div>
                  <Button onClick={() => handleSaveSettings('site')}>
                    <Save className="w-4 h-4 mr-2" />
                    Sauvegarder Essai
                  </Button>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <Footer />
    </div>
  );
}
