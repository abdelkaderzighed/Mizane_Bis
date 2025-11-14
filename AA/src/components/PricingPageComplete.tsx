import React, { useEffect, useMemo, useState } from 'react';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  CreditCard,
  Coins,
  CheckCircle,
  Sparkles,
  Download,
  Calendar,
  Zap,
  Shield,
  Plus
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { toast } from 'sonner';
import { PricingSettings, UserInfo } from '../types';
import { fetchPublicPricingSettings } from '../utils/settings';
import { fetchFreeTrialConfig } from '../utils/freeTrial';

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

const CARD_CLASS = 'border border-emerald-200 shadow-sm hover:shadow-md transition-shadow';

const formatCurrency = (value: number, currency: string) => {
  const code = currency === 'DA' ? 'DZD' : currency;
  return new Intl.NumberFormat('fr-DZ', {
    style: 'currency',
    currency: code,
    maximumFractionDigits: 0
  }).format(value);
};

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
  const [freeTrialConfig, setFreeTrialConfig] = useState({ durationDays: 7, tokens: 100000, enabled: true });
  const [pricingSettings, setPricingSettings] = useState<PricingSettings | null>(null);
  const [isLoadingPricing, setIsLoadingPricing] = useState(true);
  const [pricingError, setPricingError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    fetchPublicPricingSettings()
      .then(config => {
        if (!isMounted) return;
        setPricingSettings(config);
        setPricingError(null);
      })
      .catch(error => {
        console.error('Impossible de charger les tarifs dynamiques', error);
        if (!isMounted) return;
        setPricingSettings(null);
        setPricingError("Les paramètres tarifaires n'ont pas pu être chargés.");
      })
      .finally(() => {
        if (isMounted) {
          setIsLoadingPricing(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    fetchFreeTrialConfig()
      .then(setFreeTrialConfig)
      .catch(() => {
        /* garder les valeurs par défaut */
      });
  }, []);

  const vatRate = pricingSettings?.vat.enabled ? pricingSettings.vat.rate : 0;
  const currency = pricingSettings?.subscription.currency ?? 'DA';

  const discounts = pricingSettings?.discounts ?? [];

  const durationDiscounts = useMemo(
    () => discounts
      .filter(discount => discount.threshold <= 12)
      .sort((a, b) => a.threshold - b.threshold),
    [discounts]
  );

  const tokenDiscounts = useMemo(
    () => discounts
      .filter(discount => discount.threshold > 12)
      .sort((a, b) => a.threshold - b.threshold),
    [discounts]
  );

  const subscriptionPlans = useMemo(() => {
    if (!pricingSettings) return [];

    const monthlyPrice = pricingSettings.subscription.monthlyPrice;
    const durations = [1, 6, 12];

    return durations.map(duration => {
      const discount = durationDiscounts
        .filter(rule => duration >= rule.threshold)
        .reduce((acc, rule) => Math.max(acc, rule.percentage), 0);

      const baseHT = monthlyPrice * duration;
      const discountedHT = baseHT * (1 - discount / 100);
      const taxAmount = discountedHT * (vatRate / 100);
      const totalTTC = discountedHT + taxAmount;

      return {
        duration,
        discount,
        priceHT: discountedHT,
        priceTTC: totalTTC,
        taxAmount,
        monthlyEffective: discountedHT / duration
      };
    });
  }, [pricingSettings, durationDiscounts, vatRate]);

  const tokenPacks = useMemo(() => {
    if (!pricingSettings) return [];

    const pricePerMillion = pricingSettings.tokens.pricePerMillion;
    const packs = [1, 5, 10, 20];

    return packs.map(millions => {
      const tokens = millions * 1_000_000;
      const discount = tokenDiscounts
        .filter(rule => tokens >= rule.threshold)
        .reduce((acc, rule) => Math.max(acc, rule.percentage), 0);

      const baseHT = pricePerMillion * millions;
      const discountedHT = baseHT * (1 - discount / 100);
      const taxAmount = discountedHT * (vatRate / 100);
      const totalTTC = discountedHT + taxAmount;

      return {
        millions,
        discount,
        priceHT: discountedHT,
        priceTTC: totalTTC,
        taxAmount
      };
    });
  }, [pricingSettings, tokenDiscounts, vatRate]);

  const freeTrialStatus = useMemo(() => {
    if (!freeTrialConfig.enabled) {
      return {
        disabled: true,
        message: "L'essai gratuit n'est plus disponible pour le moment.",
        tone: 'info' as const,
      };
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
  }, [freeTrialConfig.enabled, userInfo.subscriptionEnd, userInfo.subscriptionStatus, userInfo.subscriptionType, userInfo.trialUsed]);

  const handleFreeTrialStart = () => {
    if (freeTrialStatus.disabled) {
      if (freeTrialStatus.message) {
        (freeTrialStatus.tone === 'error' ? toast.error : toast.info)(freeTrialStatus.message);
      }
      return;
    }

    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + freeTrialConfig.durationDays);

    setUserInfo(prev => ({
      ...prev,
      tokens: Math.max(prev.tokens || 0, 0) + freeTrialConfig.tokens,
      subscriptionStart: new Date().toISOString(),
      subscriptionEnd: trialEndDate.toLocaleDateString('fr-FR'),
      subscriptionStatus: 'active',
      subscriptionType: 'premium',
      trialUsed: true
    }));

    toast.success(`Essai gratuit de ${freeTrialConfig.durationDays} jour${freeTrialConfig.durationDays > 1 ? 's' : ''} activé ! ${freeTrialConfig.tokens.toLocaleString()} jetons ajoutés à votre compte. Un seul abonnement gratuit est autorisé.`);
  };

  const handleAddSubscription = (months: number) => {
    if (!pricingSettings) {
      toast.error('Les tarifs ne sont pas encore disponibles.');
      return;
    }
    addToCart('subscription', months);
    setStoreOpen(true);
    toast.success(`Abonnement de ${months} mois ajouté au panier.`);
  };

  const handleAddTokens = (millions: number) => {
    if (!pricingSettings) {
      toast.error('Les tarifs ne sont pas encore disponibles.');
      return;
    }
    addToCart('tokens', millions);
    setStoreOpen(true);
    toast.success(`${millions.toLocaleString()} million${millions > 1 ? 's' : ''} de jetons ajouté${millions > 1 ? 's' : ''} au panier.`);
  };

  const monthlyPlan = subscriptionPlans.find(plan => plan.duration === 1) ?? null;
  const preferredTokenPack = tokenPacks.find(pack => pack.millions === 1) ?? null;

  const renderPricingStatus = () => {
    if (isLoadingPricing) {
      return (
        <div className="rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-4 text-sm text-emerald-800">
          Chargement des tarifs en cours…
        </div>
      );
    }

    if (pricingError) {
      return (
        <div className="rounded-lg border border-destructive bg-destructive/10 p-4 text-sm text-destructive">
          {pricingError}
        </div>
      );
    }

    return null;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-6 py-12 space-y-20">
        {/* En-tête */}
        <div className="text-center space-y-6">
          <div className="flex items-center justify-center gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-10 h-10 text-white" />
            </div>
            <div className="text-left">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
                Tarifs Misan
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mt-2">
                Choisissez l'abonnement et les packs de jetons adaptés à votre cabinet.
              </p>
            </div>
          </div>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
            Commencez gratuitement, puis accédez à toutes les fonctionnalités de Misan avec des formules flexibles. Les prix sont exprimés en dinars algériens.
          </p>
          {renderPricingStatus()}
        </div>

        {/* Essai gratuit */}
        <div className="text-center">
          <h2 className="text-3xl font-bold mb-8">Commencez gratuitement</h2>
          <Card className="max-w-md mx-auto p-8 bg-gradient-to-br from-green-50 to-emerald-100 border-2 border-green-300 relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
              🆓 GRATUIT
            </div>
            <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-green-800 mb-4">Essai Premium {freeTrialConfig.durationDays} jours</h3>
            <div className="mb-6">
              <div className="text-4xl font-bold text-green-700 mb-2">0 DA</div>
              <div className="text-lg text-green-600">Sans engagement</div>
            </div>
            <div className="bg-white/80 rounded-lg p-4 mb-6">
              <div className="text-lg font-semibold text-green-800">
                + {freeTrialConfig.tokens.toLocaleString()} jetons inclus
              </div>
              <div className="text-sm text-green-600 mt-1">
                Parfait pour découvrir Misan
              </div>
            </div>
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

        {/* Formules professionnelles */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Formules professionnelles</h2>
            <p className="text-muted-foreground">
              Abonnements mensuels avec jetons inclus et remises automatiques sur les engagements longs.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {subscriptionPlans.length === 0 ? (
              <Card className={`${CARD_CLASS} p-6 text-center text-muted-foreground`}>
                Les formules d'abonnement seront disponibles dès que les tarifs seront configurés.
              </Card>
            ) : (
              subscriptionPlans.map(plan => (
                <Card key={plan.duration} className={`relative ${CARD_CLASS}`}>
                  {plan.duration === 12 && (
                    <div className="absolute top-0 right-0 bg-emerald-600 text-white px-4 py-1 text-xs font-semibold rounded-bl-lg">
                      🌟 Offre la plus avantageuse
                    </div>
                  )}
                  <div className="p-6 space-y-5">
                    <div>
                      <div className="text-sm uppercase tracking-wide text-emerald-600 font-semibold">
                        {plan.duration} mois
                      </div>
                      <div className="mt-2 text-3xl font-bold text-emerald-900">
                        {formatCurrency(plan.priceTTC, currency)} TTC
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Soit {formatCurrency(plan.monthlyEffective, currency)} HT / mois
                      </div>
                    </div>
                    {plan.discount > 0 && (
                      <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <CheckCircle className="w-4 h-4" />
                        {plan.discount}% de remise incluse
                      </div>
                    )}
                    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-2">
                      <div className="flex justify-between">
                        <span>Montant HT</span>
                        <span>{formatCurrency(plan.priceHT, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA ({vatRate}%)</span>
                        <span>{formatCurrency(plan.taxAmount, currency)}</span>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        {(pricingSettings?.subscription.monthlyTokens ?? 0).toLocaleString()} jetons inclus par mois
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600" />
                        Renouvellement automatique modifiable
                      </div>
                    </div>
                    <Button className="w-full" onClick={() => handleAddSubscription(plan.duration)}>
                      Ajouter au panier
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </section>

        {/* Packs de jetons */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Packs de jetons supplémentaires</h2>
            <p className="text-muted-foreground">
              Renforcez votre capacité de traitement. Remises automatiques sur les gros volumes.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-4">
            {tokenPacks.length === 0 ? (
              <Card className={`${CARD_CLASS} p-6 text-center text-muted-foreground`}>Les packs de jetons seront disponibles dès que les tarifs seront configurés.</Card>
            ) : (
              tokenPacks.map(pack => (
                <Card key={pack.millions} className={CARD_CLASS}>
                  <div className="p-6 space-y-4">
                    <div>
                      <div className="text-sm uppercase tracking-wide text-emerald-600 font-semibold">
                        {pack.millions.toLocaleString()} million{pack.millions > 1 ? 's' : ''} de jetons
                      </div>
                      <div className="mt-2 text-3xl font-bold text-emerald-900">
                        {formatCurrency(pack.priceTTC, currency)} TTC
                      </div>
                      {pack.discount > 0 && (
                        <div className="text-xs text-emerald-600">
                          Remise de {pack.discount}% appliquée
                        </div>
                      )}
                    </div>
                    <div className="rounded-lg bg-muted p-4 text-sm text-muted-foreground space-y-2">
                      <div className="flex justify-between">
                        <span>Montant HT</span>
                        <span>{formatCurrency(pack.priceHT, currency)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>TVA ({vatRate}%)</span>
                        <span>{formatCurrency(pack.taxAmount, currency)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Jetons disponibles immédiatement
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Valables sans limite de durée
                    </div>
                    <Button variant="outline" className="w-full" onClick={() => handleAddTokens(pack.millions)}>
                      Ajouter au panier
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
          <div className="rounded-lg bg-muted px-6 py-4 flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Besoins spécifiques (plus de 20 millions de jetons) ? Contactez-nous pour un devis personnalisé.</span>
            </div>
            <Button variant="ghost" onClick={() => setStoreOpen(true)}>
              Contacter le support
            </Button>
          </div>
        </section>

        {/* Boutique intégrée */}
        <section className="space-y-6">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">Commander directement</h2>
            <p className="text-muted-foreground">
              Ajoutez des abonnements ou packs de jetons à votre panier en quelques clics.
            </p>
          </div>
          <Tabs defaultValue="subscriptions" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="subscriptions">Abonnements</TabsTrigger>
              <TabsTrigger value="tokens">Jetons</TabsTrigger>
            </TabsList>

            <TabsContent value="subscriptions" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Abonnement mensuel</h3>
                    <p className="text-sm text-muted-foreground">
                      Inclut {(pricingSettings?.subscription.monthlyTokens ?? 0).toLocaleString()} jetons chaque mois avec accès complet aux fonctionnalités.
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Coins className="w-3 h-3 mr-1" />
                        Jetons inclus
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Calendar className="w-3 h-3 mr-1" />
                        Renouvellement automatique
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    {monthlyPlan ? (
                      <>
                        <p className="text-2xl font-bold">{formatCurrency(monthlyPlan.priceHT, currency)}</p>
                        <p className="text-sm text-muted-foreground">HT / mois</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Tarifs indisponibles</p>
                    )}
                    <Button onClick={() => handleAddSubscription(1)} className="mt-2" disabled={!pricingSettings}>
                      <Plus className="w-4 h-4 mr-2" />
                      Ajouter
                    </Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="tokens" className="space-y-4">
              <Card className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-medium">Jetons supplémentaires</h3>
                    <p className="text-sm text-muted-foreground">
                      Recharge immédiate de votre solde pour couvrir les dossiers volumineux.
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <Badge variant="secondary" className="text-xs">
                        <Zap className="w-3 h-3 mr-1" />
                        Utilisation instantanée
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        <Shield className="w-3 h-3 mr-1" />
                        Sans expiration
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    {preferredTokenPack ? (
                      <>
                        <p className="text-2xl font-bold">{formatCurrency(preferredTokenPack.priceHT, currency)}</p>
                        <p className="text-sm text-muted-foreground">HT / million</p>
                      </>
                    ) : (
                      <p className="text-sm text-muted-foreground">Tarifs indisponibles</p>
                    )}
                    <div className="flex items-center gap-2 mt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddTokens(1)}
                        disabled={!pricingSettings}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        1M
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAddTokens(5)}
                        disabled={!pricingSettings}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        5M
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleAddTokens(10)}
                        disabled={!pricingSettings}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        10M
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-muted-foreground space-y-1">
              <p>Abonnement + packs de jetons : composez votre offre sur mesure.</p>
              <p>TVA appliquée : {vatRate}% • Paiements sécurisés</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStoreOpen(true)}
                disabled={!pricingSettings}
              >
                Boutique
              </Button>
              <Button variant="outline" onClick={() => setCartOpen(true)}>
                Panier ({cartLength})
              </Button>
            </div>
          </div>
        </section>
      </div>

    </div>
  );
}
