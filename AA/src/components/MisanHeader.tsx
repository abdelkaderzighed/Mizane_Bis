import React from 'react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import {
  Bot,
  BookOpen,
  CreditCard,
  Coins,
  Calendar,
  ChevronDown,
  User,
  Receipt,
  Settings,
  Key,
  LogOut,
  ShoppingCart,
  FolderOpen
} from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import { UserInfo, LanguageCode } from '../types';
interface MizaneHeaderProps {
  currentPage: 'home' | 'main' | 'pricing' | 'admin' | 'library';
  isAuthenticated: boolean;
  userInfo: UserInfo;
  siteLanguage: LanguageCode;
  translations: Record<string, string>;
  subscriptionInfo?: {
    date: string;
    isExpired: boolean;
    isExpiringSoon: boolean;
  };
  cartLength?: number;
  onNavigateHome: () => void;
  onNavigateMain: () => void;
  onNavigatePricing: () => void;
  onNavigateLibrary?: () => void;
  onLogin: () => void;
  onProfileMenuClick: (action: string) => void;
  onSetCartOpen?: (open: boolean) => void;
  showReturnButton?: boolean;
  headerTitle?: string;
  headerBadge?: {
    text: string;
    className: string;
  };
  onSelectWorkspace?: () => void;
  workspaceReady?: boolean;
  workspaceLabel?: string;
}

export function MizaneHeader({
  currentPage,
  isAuthenticated,
  userInfo,
  siteLanguage,
  translations,
  subscriptionInfo,
  cartLength = 0,
  onNavigateHome,
  onNavigateMain,
  onNavigatePricing,
  onNavigateLibrary,
  onLogin,
  onProfileMenuClick,
  onSetCartOpen,
  showReturnButton = false,
  headerTitle = 'Mizane',
  headerBadge,
  onSelectWorkspace,
  workspaceReady = false,
  workspaceLabel
}: MizaneHeaderProps) {
  const t = translations;
  const formatDate = (value?: string | null) => {
    if (!value) return 'N/A';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return value;
    }
    return parsed.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const tokenIndicator = React.useMemo(() => {
    const tokens = userInfo?.tokens ?? 0;
    if (tokens <= 0) {
      return {
        color: 'bg-red-500',
        tooltip: 'Votre solde de jetons est épuisé. Racheter des tokens.',
        label: 'Alerte jetons'
      };
    }
    if (tokens <= 50000) {
      return {
        color: 'bg-amber-500',
        tooltip: 'Pensez à renouveler votre stock de jetons.',
        label: 'Jetons faibles'
      };
    }
    return {
      color: 'bg-emerald-500',
      tooltip: 'Solde de jetons positif.',
      label: 'Jetons OK'
    };
  }, [userInfo?.tokens]);

  const subscriptionIndicator = React.useMemo(() => {
    if (userInfo.subscriptionStatus === 'pending') {
      return {
        color: 'bg-amber-500',
        tooltip: 'Abonnement en attente de validation. Accès disponible dès confirmation du paiement.',
        label: 'En attente'
      };
    }
    if (userInfo.subscriptionStatus === 'inactive') {
      return {
        color: 'bg-amber-500',
        tooltip: 'Compte en cours d\'approbation par l\'administrateur.',
        label: 'Compte en validation'
      };
    }
    if (userInfo.subscriptionStatus === 'expired') {
      return {
        color: 'bg-red-500',
        tooltip: 'Votre compte est expiré. Contactez l\'administrateur ou renouvelez votre abonnement.',
        label: 'Compte expiré'
      };
    }

    if (!subscriptionInfo) {
      return null;
    }
    if (subscriptionInfo.isExpired) {
      return {
        color: 'bg-red-500',
        tooltip: "Votre abonnement a expiré. Renouvelez-le pour continuer à profiter de l'assistant IA.",
        label: 'Abonnement expiré'
      };
    }
    if (subscriptionInfo.isExpiringSoon) {
      return {
        color: 'bg-amber-500',
        tooltip: 'Pensez à renouveler votre abonnement avant son expiration.',
        label: 'Abonnement à renouveler'
      };
    }
    return {
      color: 'bg-emerald-500',
      tooltip: 'Abonnement actif.',
      label: 'Abonnement actif'
    };
  }, [subscriptionInfo?.isExpired, subscriptionInfo?.isExpiringSoon, userInfo.subscriptionStatus]);

  const showPrimaryNav = ['home', 'main', 'pricing', 'library'].includes(currentPage);

  const StatusDot = ({ color, tooltip, label }: { color: string; tooltip: string; label: string }) => (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="inline-flex h-3 w-3 items-center justify-center"
          role="status"
          aria-label={label}
        >
          <span className={`h-2.5 w-2.5 rounded-full ${color}`} />
        </span>
      </TooltipTrigger>
      <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
  );

  return (
    <div
      className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700"
      style={{ backgroundColor: '#006A35' }}
      data-site-language={siteLanguage}
    >
      <div className="flex items-center gap-3">
        {showReturnButton && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNavigateHome}
            className="text-white hover:bg-white/20 mr-2"
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m12 19-7-7 7-7"/>
              <path d="m19 12-7 7-7-7"/>
            </svg>
            Retour
          </Button>
        )}
        
        <button 
          onClick={onNavigateHome}
          className="text-2xl font-bold hover:opacity-80 transition-opacity cursor-pointer"
        >
          {headerTitle}
        </button>
        
        {headerBadge && (
          <Badge variant="secondary" className={headerBadge.className}>
            {headerBadge.text}
          </Badge>
        )}
        
        {/* Navigation principale */}
        {showPrimaryNav && (
          <div className="flex items-center gap-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigateMain}
              className="text-white hover:bg-white/20"
            >
              <Bot className="w-4 h-4 mr-2" />
              Assistant IA
            </Button>

            <Button
              variant="ghost"
              size="sm"
              onClick={onNavigatePricing}
              className="text-white hover:bg-white/20"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              Tarifs
            </Button>

            {onNavigateLibrary && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onNavigateLibrary}
                className="text-white hover:bg-white/20"
              >
                <BookOpen className="w-4 h-4 mr-2" />
                Bibliothèque juridique
              </Button>
            )}

            {isAuthenticated && userInfo.role !== 'admin' && currentPage !== 'pricing' && (
              <div className="flex items-center gap-2">
                <StatusDot {...tokenIndicator} />
                <Coins className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {(userInfo.tokens || 0).toLocaleString()} {t.tokens}
                </span>
              </div>
            )}

            {/* Affichage de l'expiration d'abonnement pour les utilisateurs connectés */}
            {isAuthenticated && subscriptionInfo && currentPage !== 'pricing' && userInfo.role !== 'admin' && (
              <div className="flex items-center gap-2">
                {subscriptionIndicator && <StatusDot {...subscriptionIndicator} />}
                <Calendar className="w-4 h-4" />
                <span className="text-xs">
                  Abonnement jusqu'au {subscriptionInfo.date}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Statistiques pour pages spéciales */}
        {currentPage === 'pricing' && onSetCartOpen && (
          <div className="flex items-center gap-6">
            {isAuthenticated && userInfo.role !== 'admin' && (
              <>
                <div className="flex items-center gap-2">
                  <StatusDot {...tokenIndicator} />
                  <Coins className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {userInfo?.tokens?.toLocaleString() || '0'} jetons
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {subscriptionIndicator && <StatusDot {...subscriptionIndicator} />}
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">
                    Abonnement jusqu'au {formatDate(userInfo?.subscriptionEnd)}
                  </span>
                </div>
              </>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetCartOpen(true)}
              className="text-white hover:bg-white/20 relative"
            >
              <ShoppingCart className="w-4 h-4 mr-2" />
              Panier
              {cartLength > 0 && (
                <Badge className="absolute -top-2 -right-2 w-5 h-5 text-xs bg-red-500 text-white">
                  {cartLength}
                </Badge>
              )}
            </Button>
          </div>
        )}

        {onSelectWorkspace && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onSelectWorkspace}
            className={`ml-4 flex items-center gap-2 border border-white/30 bg-white/10 text-white hover:bg-white/20 ${workspaceReady ? '' : 'opacity-90'}`}
          >
            <FolderOpen className="w-4 h-4" />
              <span className="text-sm font-medium">
                {workspaceReady ? workspaceLabel ?? 'Workspace prêt' : 'Sélectionner /Mizane'}
              </span>
            <span
              className={`ml-1 h-2.5 w-2.5 rounded-full ${workspaceReady ? 'bg-emerald-400' : 'bg-amber-400'}`}
              aria-label={workspaceReady ? 'Workspace prêt' : 'Workspace requis'}
            />
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        {onSetCartOpen && currentPage !== 'pricing' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetCartOpen(true)}
            className="text-white hover:bg-white/20 relative"
          >
            <ShoppingCart className="w-4 h-4" />
            {cartLength > 0 && (
              <Badge className="absolute -top-2 -right-2 w-5 h-5 text-xs bg-red-500 text-white">
                {cartLength}
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
              <DropdownMenuLabel>
                {currentPage === 'admin' ? 'Administration' : 'Mon compte'}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onProfileMenuClick('accountInfo')}>
                <User className="w-4 h-4 mr-2" />
                Informations du compte
              </DropdownMenuItem>
              {currentPage !== 'admin' && userInfo.role !== 'admin' && (
                <>
                  <DropdownMenuItem onClick={() => onProfileMenuClick('billing')}>
                    <Receipt className="w-4 h-4 mr-2" />
                    Facturation
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onProfileMenuClick('preferences')}>
                    <Settings className="w-4 h-4 mr-2" />
                    Préférences
                  </DropdownMenuItem>
                </>
              )}
              {userInfo.role === 'admin' && currentPage !== 'admin' && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => onProfileMenuClick('admin')}>
                    <Key className="w-4 h-4 mr-2" />
                    Administration
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onProfileMenuClick('logout')} className="text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Déconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onLogin}
            className="text-white hover:bg-green-500/20 border border-green-300/30 hover:border-green-400"
            title="Se connecter à Mizane"
          >
            <User className="w-4 h-4 mr-2" />
            Connexion
          </Button>
        )}
      </div>
    </div>
  );
}
