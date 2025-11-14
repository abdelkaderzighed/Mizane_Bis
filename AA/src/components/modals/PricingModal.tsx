import React from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import {
  CreditCard,
  Calendar,
  Coins,
  CheckCircle,
  Settings,
  Sparkles,
  ShoppingCart
} from 'lucide-react';
import { toast } from 'sonner';
import { UserInfo } from '../../types';

interface PricingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  addToCart: (type: 'subscription' | 'tokens', quantity: number) => void;
  setUserInfo: React.Dispatch<React.SetStateAction<UserInfo>>;
  setStoreOpen: (open: boolean) => void;
  setCartOpen: (open: boolean) => void;
  cartLength: number;
  userInfo: UserInfo;
}

export function PricingModal({ 
  open, 
  onOpenChange, 
  addToCart, 
  setUserInfo, 
  setStoreOpen, 
  setCartOpen, 
  cartLength,
  userInfo
}: PricingModalProps) {
  const freeTrialStatus = React.useMemo(() => {
    if (!userInfo) {
      return { disabled: true, message: "Informations utilisateur indisponibles.", tone: 'info' as const };
    }

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
  }, [userInfo]);

  const handleFreeTrialStart = () => {
    if (freeTrialStatus.disabled) {
      if (freeTrialStatus.message) {
        (freeTrialStatus.tone === 'error' ? toast.error : toast.info)(freeTrialStatus.message);
      }
      return;
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 7);

    setUserInfo(prev => ({
      ...prev,
      tokens: Math.max(prev.tokens || 0, 0) + 100000,
      subscriptionStart: new Date().toISOString(),
      subscriptionEnd: trialEndDate.toLocaleDateString('fr-FR'),
      subscriptionStatus: 'active',
      subscriptionType: 'premium',
      trialUsed: true
    }));

    toast.success("Essai gratuit de 7 jours activé ! 100 000 jetons ajoutés à votre compte. Un seul abonnement gratuit est autorisé.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-7 h-7 text-white" />
            </div>
            <div>
              <DialogTitle className="text-3xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Tarifs Misan
              </DialogTitle>
              <DialogDescription className="text-lg mt-1">
                Découvrez toutes nos formules d'abonnement et options de jetons. Commencez avec notre essai gratuit de 7 jours !
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-12">
          {/* Section Essai Gratuit */}
          <div className="text-center">
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

          {/* Section Abonnements */}
          <div>
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4">Formules d'abonnement</h3>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Chaque abonnement inclut des jetons mensuels gratuits et l'accès à tous nos services premium. 
                <span className="font-semibold text-blue-600"> Les mois sont cumulables :</span> si vous avez déjà un abonnement, 
                la nouvelle durée s'ajoute à votre abonnement actuel.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Plan Basique */}
              <Card className="relative p-8 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                    <Calendar className="w-8 h-8 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Basique</h3>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">4000 DA</div>
                    <div className="text-sm text-muted-foreground">/mois</div>
                  </div>
                  <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-6">
                    <div className="text-sm font-medium text-green-800">
                      + 1M jetons/mois
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      2 agents IA
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Documents illimités
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Support email
                    </li>
                  </ul>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      addToCart('subscription', 1);
                      toast.success('Abonnement Basique ajouté au panier');
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>

              {/* Plan 6 Mois - Populaire */}
              <Card className="relative p-8 cursor-pointer border-primary transition-all duration-300 shadow-lg scale-105 bg-gradient-to-br from-blue-50 to-purple-50">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-1 font-semibold">
                    ⭐ Populaire
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Calendar className="w-8 h-8 text-white" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">6 Mois</h3>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">22320 DA</div>
                    <div className="text-sm text-muted-foreground line-through">24000 DA</div>
                    <Badge variant="secondary" className="mt-2 bg-green-100 text-green-800">
                      -7% d'économie
                    </Badge>
                  </div>
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <div className="text-sm font-medium text-blue-800">
                      + 6M jetons inclus
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Tous les agents IA
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      LLM Premium
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Support prioritaire
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                    onClick={() => {
                      addToCart('subscription', 6);
                      toast.success('Abonnement 6 Mois ajouté au panier');
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>

              {/* Plan Annuel */}
              <Card className="relative p-8 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group">
                <div className="absolute -top-3 right-4">
                  <Badge variant="outline" className="border-orange-300 text-orange-600 bg-orange-50">
                    Meilleure valeur
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-orange-100 to-orange-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-orange-200 group-hover:to-orange-300 transition-all duration-300">
                    <Calendar className="w-8 h-8 text-orange-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Annuel</h3>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-primary">38400 DA</div>
                    <div className="text-sm text-muted-foreground line-through">48000 DA</div>
                    <Badge variant="secondary" className="mt-2 bg-orange-100 text-orange-800">
                      -20% d'économie
                    </Badge>
                  </div>
                  <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-lg p-3 mb-6">
                    <div className="text-sm font-medium text-orange-800">
                      + 12M jetons inclus
                    </div>
                  </div>
                  <ul className="space-y-3 text-sm text-muted-foreground mb-6">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      API personnalisée
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Support dédié 24/7
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      Formation équipe
                    </li>
                  </ul>
                  <Button 
                    className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 hover:from-orange-600 hover:to-yellow-600"
                    onClick={() => {
                      addToCart('subscription', 12);
                      toast.success('Abonnement Annuel ajouté au panier');
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>

              {/* Plan Custom */}
              <Card className="relative p-8 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-purple-100 group-hover:to-purple-200 transition-all duration-300">
                    <Settings className="w-8 h-8 text-gray-600 group-hover:text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold mb-2">Personnalisé</h3>
                  <div className="mb-4">
                    <div className="text-3xl font-bold text-purple-600">?M</div>
                    <div className="text-sm text-muted-foreground">mois au choix</div>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-6">
                    <div className="text-sm font-medium text-purple-800">
                      Jetons selon durée
                    </div>
                  </div>
                  <div className="mb-6">
                    <Input 
                      type="number" 
                      placeholder="Nombre de mois"
                      min="1"
                      max="24"
                      id="customSubscription"
                      className="text-center mb-3"
                    />
                    <div className="text-xs text-muted-foreground">
                      4000 DA × mois choisis
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('customSubscription') as HTMLInputElement;
                      const months = parseInt(input.value) || 1;
                      addToCart('subscription', months);
                      input.value = '';
                      toast.success(`Abonnement ${months} mois ajouté au panier`);
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>
            </div>
          </div>

          {/* Section Jetons */}
          <div>
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold mb-4">Packs de jetons supplémentaires</h3>
              <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
                Achetez des jetons supplémentaires pour vos projets intensifs. 
                <span className="font-semibold text-yellow-600"> Les jetons sont cumulables :</span> ils s'ajoutent directement 
                à votre solde existant.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {/* Pack Standard */}
              <Card className="p-6 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-yellow-100 to-yellow-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-yellow-200 group-hover:to-yellow-300 transition-all duration-300">
                    <Coins className="w-8 h-8 text-yellow-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Standard</h3>
                  <div className="text-2xl font-bold text-yellow-600 mb-1">1M</div>
                  <div className="text-xs text-muted-foreground mb-4">jetons</div>
                  <div className="text-xl font-bold text-primary mb-4">1000 DA</div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Usage occasionnel
                  </p>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      addToCart('tokens', 1);
                      toast.success('Pack Standard 1M jetons ajouté au panier');
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>

              {/* Pack Premium */}
              <Card className="p-6 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group relative">
                <div className="absolute -top-2 right-2">
                  <Badge variant="secondary" className="bg-green-100 text-green-800 text-xs">
                    -10%
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-green-100 to-green-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-green-200 group-hover:to-green-300 transition-all duration-300">
                    <Coins className="w-8 h-8 text-green-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Premium</h3>
                  <div className="text-2xl font-bold text-green-600 mb-1">10M</div>
                  <div className="text-xs text-muted-foreground mb-4">jetons</div>
                  <div className="space-y-1 mb-4">
                    <div className="text-xl font-bold text-primary">9000 DA</div>
                    <div className="text-sm text-muted-foreground line-through">10000 DA</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Usage régulier
                  </p>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      addToCart('tokens', 10);
                      toast.success('Pack Premium 10M jetons ajouté au panier');
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>

              {/* Pack Pro */}
              <Card className="p-6 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group relative">
                <div className="absolute -top-2 right-2">
                  <Badge variant="secondary" className="bg-purple-100 text-purple-800 text-xs">
                    -20%
                  </Badge>
                </div>
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-purple-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-purple-200 group-hover:to-purple-300 transition-all duration-300">
                    <Coins className="w-8 h-8 text-purple-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Pro</h3>
                  <div className="text-2xl font-bold text-purple-600 mb-1">20M</div>
                  <div className="text-xs text-muted-foreground mb-4">jetons</div>
                  <div className="space-y-1 mb-4">
                    <div className="text-xl font-bold text-primary">16000 DA</div>
                    <div className="text-sm text-muted-foreground line-through">20000 DA</div>
                  </div>
                  <p className="text-sm text-muted-foreground mb-6">
                    Usage intensif
                  </p>
                  <Button 
                    className="w-full bg-purple-600 hover:bg-purple-700"
                    onClick={() => {
                      addToCart('tokens', 20);
                      toast.success('Pack Pro 20M jetons ajouté au panier');
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>

              {/* Pack Custom */}
              <Card className="p-6 cursor-pointer hover:border-primary transition-all duration-300 hover:shadow-lg group">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl flex items-center justify-center mx-auto mb-4 group-hover:from-blue-100 group-hover:to-blue-200 transition-all duration-300">
                    <Settings className="w-8 h-8 text-gray-600 group-hover:text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Personnalisé</h3>
                  <div className="text-2xl font-bold text-blue-600 mb-1">?M</div>
                  <div className="text-xs text-muted-foreground mb-4">jetons</div>
                  <div className="text-lg font-bold text-primary mb-4">Prix calculé</div>
                  <div className="space-y-3 mb-6">
                    <Input 
                      type="number" 
                      placeholder="Millions de jetons"
                      min="1"
                      id="customTokensPricing"
                      className="text-center"
                    />
                    <p className="text-xs text-muted-foreground">
                      1000 DA / million
                    </p>
                  </div>
                  <Button 
                    className="w-full"
                    variant="outline"
                    onClick={() => {
                      const input = document.getElementById('customTokensPricing') as HTMLInputElement;
                      const quantity = parseInt(input.value) || 1;
                      addToCart('tokens', quantity);
                      input.value = '';
                      toast.success(`Pack Custom ${quantity}M jetons ajouté au panier`);
                    }}
                  >
                    Ajouter au panier
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-8 border-t border-border mt-12">
          <div className="flex items-center gap-3 text-muted-foreground">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <span>✨ Les abonnements et jetons sont <strong>cumulables</strong></span>
            <Separator orientation="vertical" className="h-4" />
            <span>🔒 Paiement sécurisé • TVA 20% incluse</span>
          </div>
          <div className="flex gap-2">
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
      </DialogContent>
    </Dialog>
  );
}
