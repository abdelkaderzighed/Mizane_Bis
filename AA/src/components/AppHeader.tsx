import React from 'react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import {
  Bot,
  CreditCard,
  Coins,
  ChevronDown,
  User,
  Key,
  Receipt,
  MapPin,
  Settings,
  Calendar,
  ShoppingCart,
  Building2,
  LogOut
} from 'lucide-react';
import { UserInfo } from '../types';

interface AppHeaderProps {
  userInfo: UserInfo;
  setCurrentPage: (page: 'home' | 'main' | 'pricing' | 'admin') => void;
  onProfileMenuClick: (action: string) => void;
  t: any;
  handleLogout: () => void;
}

export function AppHeader({
  userInfo,
  setCurrentPage,
  onProfileMenuClick,
  t,
  handleLogout
}: AppHeaderProps) {
  return (
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
            onClick={() => setCurrentPage('main')}
            className="text-white hover:bg-white/20"
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

          {userInfo.role !== 'admin' && (
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-medium">
                {(userInfo.tokens || 0).toLocaleString()} {t.tokens}
              </span>
            </div>
          )}
        </div>
      </div>

      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-3 p-2 hover:bg-white/20 text-white rounded-md transition-colors outline-none ring-0 focus:ring-2 focus:ring-white/50">
          <Avatar className="w-8 h-8">
            <AvatarImage src={userInfo.avatar} alt={userInfo.name} />
            <AvatarFallback className="bg-white/20 text-white text-xs">
              {userInfo.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium hidden md:block">
            {userInfo.name}
          </span>
          <ChevronDown className="w-4 h-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64" align="end">
          <DropdownMenuLabel className="flex items-center gap-2">
            <User className="w-4 h-4" />
            {t.myProfile}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('accountInfo')}>
            <User className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>{t.accountInfo}</span>
              <span className="text-xs text-muted-foreground">{userInfo.email}</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('changePassword')}>
            <Key className="w-4 h-4 mr-2" />
            {t.changePassword}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('billing')}>
            <Receipt className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>{t.billing}</span>
              <span className="text-xs text-muted-foreground">{t.invoiceHistory}</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('addresses')}>
            <MapPin className="w-4 h-4 mr-2" />
            {t.addresses}
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('preferences')}>
            <Settings className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>{t.preferences}</span>
              <span className="text-xs text-muted-foreground">{t.siteLanguage} • {t.chatLanguage}</span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('subscription')}>
            <Calendar className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>{t.subscription}</span>
              <span className="text-xs text-muted-foreground">
                {userInfo.subscriptionStart} - {userInfo.subscriptionEnd}
              </span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuItem>
            <Coins className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>Jetons</span>
              <span className="text-xs text-muted-foreground">
                {(userInfo.tokens || 0).toLocaleString()} {t.tokens}
              </span>
            </div>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('buySubscription')}>
            <CreditCard className="w-4 h-4 mr-2" />
            {t.buySubscription}
          </DropdownMenuItem>
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('buyTokens')}>
            <ShoppingCart className="w-4 h-4 mr-2" />
            {t.buyTokens}
          </DropdownMenuItem>
          
          {/* Afficher le menu Administration seulement pour les admins */}
          {userInfo.role === 'admin' && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onProfileMenuClick('admin')}>
                <Building2 className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>Administration</span>
                  <span className="text-xs text-muted-foreground">Gérer utilisateurs et paramètres</span>
                </div>
              </DropdownMenuItem>
            </>
          )}
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem onClick={() => onProfileMenuClick('logout')}>
            <LogOut className="w-4 h-4 mr-2" />
            <div className="flex flex-col">
              <span>Déconnexion</span>
              <span className="text-xs text-muted-foreground">Se déconnecter de Misan</span>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
