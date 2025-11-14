import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Switch } from '../ui/switch';
import { Calendar, Coins, Loader2, Save, Percent } from './icons';
import type { PricingSettings } from '../../types';

interface AdminPricingTabProps {
  pricingSettings: PricingSettings;
  setPricingSettings: React.Dispatch<React.SetStateAction<PricingSettings>>;
  onSavePricing: () => void;
  isSavingPricingSettings: boolean;
  isLoadingPricingSettings: boolean;
}

export function AdminPricingTab({
  pricingSettings,
  setPricingSettings,
  onSavePricing,
  isSavingPricingSettings,
  isLoadingPricingSettings,
}: AdminPricingTabProps) {
  return (
    <div className="space-y-6">
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
                      monthlyPrice: parseInt(e.target.value, 10) || 0,
                    },
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
                      monthlyTokens: parseInt(e.target.value, 10) || 0,
                    },
                  }))}
                />
              </div>
            </div>
            <Button
              onClick={onSavePricing}
              disabled={isSavingPricingSettings || isLoadingPricingSettings}
            >
              {isSavingPricingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder Abonnement
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Jetons Supplémentaires</CardTitle>
            <CardDescription>Prix des jetons à l'achat séparé</CardDescription>
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
                    pricePerMillion: parseInt(e.target.value, 10) || 0,
                  },
                }))}
              />
            </div>
            <Button
              onClick={onSavePricing}
              disabled={isSavingPricingSettings || isLoadingPricingSettings}
            >
              {isSavingPricingSettings ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Sauvegarde...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Sauvegarder Jetons
                </>
              )}
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
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Remises par Durée d'Abonnement
              </h4>
              <div className="space-y-2">
                {pricingSettings.discounts
                  .filter(discount => discount.threshold <= 12)
                  .map((discount, index) => (
                    <div key={`subscription-${index}`} className="flex items-center gap-2 text-sm">
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
                {pricingSettings.discounts
                  .filter(discount => discount.threshold > 12)
                  .map((discount, index) => (
                    <div key={`tokens-${index}`} className="flex items-center gap-2 text-sm">
                      <Badge variant="outline">{(discount.threshold / 1_000_000).toFixed(0)}M jetons</Badge>
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
                vat: { ...prev.vat, enabled },
              }))}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
