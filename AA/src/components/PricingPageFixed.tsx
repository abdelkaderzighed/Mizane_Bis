import React, { useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Input } from './ui/input';
import { Separator } from './ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Footer } from './Footer';
import {
  CreditCard,
  Calendar,
  Coins,
  CheckCircle,
  Settings,
  Sparkles,
  ShoppingCart,
  ChevronDown,
  User,
  Key,
  Receipt,
  MapPin,
  ArrowLeft,
  Home
} from 'lucide-react';
import { toast } from 'sonner';
import { UserInfo } from '../types';

interface PricingPageProps {
  addToCart: (type: 'subscription' | 'tokens', quantity: number) => void;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo>>;
  setStoreOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  cartLength: number;
  userInfo: UserInfo;
  onBackToMain: () => void;
  onProfileMenuClick: (action: string) => void;
}

export function PricingPage({ 
  addToCart, 
  setUserInfo, 
  setStoreOpen, 
  setCartOpen, 
  cartLength,
  userInfo,
  onBackToMain,
  onProfileMenuClick
}: PricingPageProps) {
  // Vérification de sécurité pour éviter les erreurs
  if (!userInfo || typeof userInfo.tokens !== 'number') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="text-lg">Chargement...</div>
        </div>
      </div>
    );
  }

  const freeTrialStatus = useMemo(() => {
    if (userInfo.trialUsed) {
      return {
        disabled: true,
        message: "Vous avez déjà profité de l'essai gratuit. Un seul abonnement gratuit est autorisé par compte.",
        tone: 'error' as const,
      };
    }

    if (userInfo.subscriptionType === 'premium' && userInfo.subscriptionStatus === 'expired') {
      return {
        disabled: true,
        message: "Votre essai gratuit a expiré. Souscrivez à un abonnement Pro pour continuer à accéder à l'IA.",
        tone: 'error' as const,
      };
    }

    if (userInfo.subscriptionType === 'premium' && userInfo.subscriptionStatus === 'active') {
      const until = userInfo.subscriptionEnd ? ` jusqu'au ${userInfo.subscriptionEnd}` : '';
      return {
        disabled: true,
        message: `Votre période d'essai est déjà active${until}.`,
        tone: 'info' as const,
      };
    }

    return { disabled: false, message: null, tone: 'info' as const };
  }, [userInfo.subscriptionEnd, userInfo.subscriptionStatus, userInfo.subscriptionType, userInfo.trialUsed]);

  const handleFreeTrialStart = () => {
    if (freeTrialStatus.disabled) {
      if (freeTrialStatus.message) {
        (freeTrialStatus.tone === 'error' ? toast.error : toast.info)(freeTrialStatus.message);
      }
      return;
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);
    
    setUserInfo((prev: UserInfo) => ({
      ...prev,
      tokens: Math.max(prev.tokens || 0, 0) + 100000,
      subscriptionStart: new Date().toISOString(),
      subscriptionEnd: trialEndDate.toLocaleDateString('fr-FR'),
      subscriptionStatus: 'active',
      subscriptionType: 'premium',
      trialUsed: true
    }));
    
    toast.success("Essai gratuit de 7 jours activé ! 100 000 jetons ajoutés à votre compte. Un seul abonnement gratuit est autorisé.");
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header Misan - identique à l'application principale */}
      <div className="flex items-center justify-between px-6 py-3 text-white border-b-2 border-red-700" style={{ backgroundColor: '#006A35' }}>
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToMain}
            className="text-white hover:bg-white/20 mr-2"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="text-2xl font-bold">Misan</div>
          <Badge variant="secondary" className="text-xs bg-white/20 text-white border-white/30">
            En construction
          </Badge>
        </div>

        <div className="flex items-center gap-6">
          {userInfo.role !== 'admin' && (
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4" />
              <span className="text-sm font-medium">
                {userInfo.tokens.toLocaleString()} jetons
              </span>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCartOpen(true)}
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

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            <span className="text-sm">
              Abonnement jusqu'au {userInfo.subscriptionEnd}
            </span>
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
                Mon Profil
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('accountInfo')}>
                <User className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>Informations du compte</span>
                  <span className="text-xs text-muted-foreground">{userInfo.email}</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('changePassword')}>
                <Key className="w-4 h-4 mr-2" />
                Changer le mot de passe
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('billing')}>
                <Receipt className="w-4 h-4 mr-2" />
                <div className="flex flex-col">
                  <span>Facturation</span>
                  <span className="text-xs text-muted-foreground">Historique des factures</span>
                </div>
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('addresses')}>
                <MapPin className="w-4 h-4 mr-2" />
                Adresses
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('buySubscription')}>
                <CreditCard className="w-4 h-4 mr-2" />
                Acheter un abonnement
              </DropdownMenuItem>
              
              <DropdownMenuItem onClick={() => onProfileMenuClick('buyTokens')}>
                <ShoppingCart className="w-4 h-4 mr-2" />
                Acheter des jetons
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Contenu de la page de tarifs */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        {/* En-tête de la page */}
        <div className="text-center mb-16">
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Tarifs Misan
              </h1>
              <p className="text-xl text-muted-foreground mt-2">
                Découvrez toutes nos formules d'abonnement et options de jetons
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-4xl mx-auto">
            Commencez avec notre essai gratuit de 7 jours incluant 100 000 jetons. 
            Profitez ensuite de nos formules flexibles adaptées à tous vos besoins.
          </p>
        </div>

        <div className="space-y-20">
          {/* Section Essai Gratuit */}
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8">Commencez gratuitement</h2>
            <Card className="max-w-md mx-auto p-8 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                🆓 GRATUIT
              </div>
              <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-green-800 mb-4">Essai Gratuit 7 Jours</h3>
              <div className="mb-6">
                <div className="text-4xl font-bold text-green-700 mb-2">0 DA</div>
                <div className="text-lg text-green-600">Pendant 7 jours</div>
              </div>
              <div className="bg-white/80 rounded-lg p-4 mb-6">
                <div className="text-lg font-semibold text-green-800">
                  + 100 000 jetons inclus
                </div>
                <div className="text-sm text-green-600 mt-1">
                  Parfait pour découvrir Misan
                </div>
              </div>
              <ul className="space-y-3 text-sm text-green-700 mb-8">
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Accès à tous les agents IA
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Documents illimités
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Support par email
                </li>
                <li className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  Toutes les fonctionnalités premium
                </li>
              </ul>
              <Button 
                className="w-full h-14 text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed"
                disabled={freeTrialStatus.disabled}
                onClick={handleFreeTrialStart}
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Commencer l'essai gratuit
              </Button>
              {freeTrialStatus.disabled && freeTrialStatus.message && (
                <p className="mt-3 text-sm text-muted-foreground">{freeTrialStatus.message}</p>
              )}
            </Card>
          </div>

          {/* Section Footer de la page */}
          <div className="flex items-center justify-between pt-12 border-t border-border mt-20">
            <div className="flex items-center gap-6 text-muted-foreground">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>✨ Les abonnements et jetons sont <strong>cumulables</strong></span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <span>🔒 Paiement sécurisé • TVA 20% incluse</span>
            </div>
            <div className="flex gap-3">
              <Button onClick={() => setStoreOpen(true)} variant="outline" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Boutique
              </Button>
              <Button onClick={() => setCartOpen(true)} variant="outline" className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4" />
                Panier ({cartLength})
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer global */}
      <Footer />
    </div>
  );
}
