import React, { useState, useEffect } from 'react';
import { 
  User, 
  LogOut, 
  Bell, 
  CreditCard, 
  Settings, 
  MessageSquare, 
  FileText, 
  BarChart3,
  Crown,
  Coins,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react';
import { AuthService, type AuthUser } from '../utils/supabase';

interface DashboardProps {
  user: AuthUser;
  onLogout: () => void;
}

export default function Dashboard({ user, onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loadingAlerts, setLoadingAlerts] = useState(true);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      const userAlerts = await AuthService.getUserAlerts();
      setAlerts(userAlerts);
    } catch (error) {
      console.error('Erreur chargement alertes:', error);
    } finally {
      setLoadingAlerts(false);
    }
  };

  const handleMarkAlertAsRead = async (alertId: string) => {
    const success = await AuthService.markAlertAsRead(alertId);
    if (success) {
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    }
  };

  const getSubscriptionEndDate = () => {
    if (!user.subscription_end) return null;
    return new Date(user.subscription_end);
  };

  const getDaysUntilExpiry = () => {
    const endDate = getSubscriptionEndDate();
    if (!endDate) return null;
    const now = new Date();
    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'text-purple-600';
      case 'pro': return 'text-blue-600';
      case 'premium': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600';
      case 'pending': return 'text-amber-600';
      case 'inactive': return 'text-gray-600';
      case 'expired': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Actif';
      case 'inactive': return 'Inactif';
      case 'pending': return 'En attente';
      case 'expired': return 'Expiré';
      default: return status;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900">Dashboard</h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Bell className="h-6 w-6 text-gray-600 hover:text-gray-900 cursor-pointer" />
                {alerts.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                    {alerts.length}
                  </span>
                )}
              </div>
              <div className="flex items-center space-x-2">
                <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                  <User className="h-5 w-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{user.name || user.email}</span>
                <button
                  onClick={onLogout}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Navigation */}
        <nav className="mb-8">
          <div className="flex space-x-8">
            {[
              { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3 },
              { id: 'messages', label: 'Messages', icon: MessageSquare },
              { id: 'documents', label: 'Documents', icon: FileText },
              { id: 'billing', label: 'Facturation', icon: CreditCard },
              { id: 'settings', label: 'Paramètres', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-md ${
                  activeTab === tab.id
                    ? 'bg-indigo-100 text-indigo-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            ))}
          </div>
        </nav>

        {/* Contenu principal */}
        <div className="flex-1 p-6">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Alertes */}
              {alerts.length > 0 && (
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Bell className="h-5 w-5 mr-2" />
                    Alertes ({alerts.length})
                  </h3>
                  <div className="space-y-3">
                    {alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={`p-4 rounded-lg border-l-4 ${
                          alert.level === 'error' ? 'bg-red-50 border-red-400' :
                          alert.level === 'warning' ? 'bg-yellow-50 border-yellow-400' :
                          'bg-blue-50 border-blue-400'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            {alert.level === 'error' ? (
                              <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5" />
                            ) : alert.level === 'warning' ? (
                              <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
                            ) : (
                              <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                            )}
                            <div>
                              <h4 className={`font-medium ${
                                alert.level === 'error' ? 'text-red-800' :
                                alert.level === 'warning' ? 'text-yellow-800' :
                                'text-blue-800'
                              }`}>
                                {alert.title}
                              </h4>
                              <p className={`text-sm mt-1 ${
                                alert.level === 'error' ? 'text-red-700' :
                                alert.level === 'warning' ? 'text-yellow-700' :
                                'text-blue-700'
                              }`}>
                                {alert.message}
                              </p>
                              <p className="text-xs text-gray-500 mt-2">
                                {new Date(alert.created_at).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleMarkAlertAsRead(alert.id)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Statistiques */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Coins className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Jetons disponibles</p>
                      <p className="text-2xl font-bold text-gray-900">
                        {user.tokens_balance.toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Calendar className="h-8 w-8 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Statut abonnement</p>
                      <p className={`text-lg font-bold ${getStatusColor(user.subscription_status)}`}>
                        {getStatusText(user.subscription_status)} 
                        {user.role === 'premium' && user.subscription_status === 'active' && ' (Essai)'}
                      </p>
                      {user.subscription_end && (
                        <p className="text-sm text-gray-500 mt-1">
                          {user.subscription_status === 'active' ? 'Expire le' : 'Expiré le'} {' '}
                          {getSubscriptionEndDate()?.toLocaleDateString('fr-FR')}
                          {getDaysUntilExpiry() !== null && getDaysUntilExpiry()! > 0 && (
                            <span className="ml-2 text-orange-600 font-medium">
                              ({getDaysUntilExpiry()} jour{getDaysUntilExpiry()! > 1 ? 's' : ''} restant{getDaysUntilExpiry()! > 1 ? 's' : ''})
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Crown className="h-8 w-8 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Type de compte</p>
                      <p className={`text-lg font-bold ${getRoleColor(user.role)}`}>
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <BarChart3 className="h-8 w-8 text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-600">Utilisation ce mois</p>
                      <p className="text-2xl font-bold text-gray-900">12,450</p>
                      <p className="text-sm text-gray-500">jetons consommés</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
