import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Switch } from '../ui/switch';
import { Button } from '../ui/button';
import { Loader2, Save } from './icons';
import type { SiteSettings } from '../../types';

interface AdminSiteSettingsTabProps {
  siteSettings: SiteSettings;
  setSiteSettings: React.Dispatch<React.SetStateAction<SiteSettings>>;
  onSaveSite: () => void;
  isSavingSiteSettings: boolean;
  isLoadingSiteSettings: boolean;
}

export function AdminSiteSettingsTab({
  siteSettings,
  setSiteSettings,
  onSaveSite,
  isSavingSiteSettings,
  isLoadingSiteSettings,
}: AdminSiteSettingsTabProps) {
  return (
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
            Cette clé sera utilisée pour l'envoi des emails transactionnels via Brevo.
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
        <Button
          onClick={onSaveSite}
          disabled={isSavingSiteSettings || isLoadingSiteSettings}
        >
          {isSavingSiteSettings ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Sauvegarder
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
