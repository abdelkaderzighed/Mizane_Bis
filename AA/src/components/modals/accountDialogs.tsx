import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle
} from '../ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '../ui/alert-dialog';
import { ScrollArea } from '../ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '../ui/select';
import {
  Camera,
  CheckCircle,
  Home,
  Key,
  Languages,
  MapPin,
  MessageSquare,
  Settings,
  Shield,
  User,
  Building2,
  Zap,
  Coins
} from 'lucide-react';
import { toast } from 'sonner';

import { languages } from '../../constants/config';
import type { Address, LanguageCode, UserInfo } from '../../types';

const createEmptyAddress = (): Address => ({
  street: '',
  city: '',
  postalCode: '',
  country: ''
});

interface ChangePasswordDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: () => void;
  t: any;
}

export function ChangePasswordDialog({
  open,
  onOpenChange,
  onSubmit,
  t
}: ChangePasswordDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Key className="w-5 h-5" />
            {t.changePassword}
          </DialogTitle>
          <DialogDescription>{t.changePasswordDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="currentPassword">{t.currentPassword}</Label>
            <Input id="currentPassword" type="password" />
          </div>
          <div>
            <Label htmlFor="newPassword">{t.newPassword}</Label>
            <Input id="newPassword" type="password" />
          </div>
          <div>
            <Label htmlFor="confirmPassword">{t.confirmPassword}</Label>
            <Input id="confirmPassword" type="password" />
          </div>
          <div className="flex gap-2">
            <Button onClick={onSubmit} className="flex-1">
              {t.changePassword}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AddressesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  personalAddress: Address;
  setPersonalAddress: (address: Address | ((prev: Address) => Address)) => void;
  billingAddress: Address;
  setBillingAddress: (address: Address | ((prev: Address) => Address)) => void;
  onSave: () => void | Promise<void>;
  t: any;
}

export function AddressesDialog({
  open,
  onOpenChange,
  personalAddress,
  setPersonalAddress,
  billingAddress,
  setBillingAddress,
  onSave,
  t
}: AddressesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5" />
            {t.addresses}
          </DialogTitle>
          <DialogDescription>{t.addressesDescription}</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh]">
          <Tabs defaultValue="personal" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="personal">
                <Home className="w-4 h-4 mr-2" />
                {t.personalAddress}
              </TabsTrigger>
              <TabsTrigger value="billing">
                <Building2 className="w-4 h-4 mr-2" />
                {t.billingAddress}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personalStreet">{t.street}</Label>
                  <Input
                    id="personalStreet"
                    value={personalAddress.street}
                    onChange={(e) =>
                      setPersonalAddress(prev => ({ ...prev, street: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="personalCity">{t.city}</Label>
                  <Input
                    id="personalCity"
                    value={personalAddress.city}
                    onChange={(e) =>
                      setPersonalAddress(prev => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="personalZip">{t.postalCode}</Label>
                  <Input
                    id="personalZip"
                    value={personalAddress.zipCode}
                    onChange={(e) =>
                      setPersonalAddress(prev => ({ ...prev, zipCode: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="personalCountry">{t.country}</Label>
                  <Input
                    id="personalCountry"
                    value={personalAddress.country}
                    onChange={(e) =>
                      setPersonalAddress(prev => ({ ...prev, country: e.target.value }))
                    }
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="billing" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingStreet">{t.street}</Label>
                  <Input
                    id="billingStreet"
                    value={billingAddress.street}
                    onChange={(e) =>
                      setBillingAddress(prev => ({ ...prev, street: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="billingCity">{t.city}</Label>
                  <Input
                    id="billingCity"
                    value={billingAddress.city}
                    onChange={(e) =>
                      setBillingAddress(prev => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="billingZip">{t.postalCode}</Label>
                  <Input
                    id="billingZip"
                    value={billingAddress.zipCode}
                    onChange={(e) =>
                      setBillingAddress(prev => ({ ...prev, zipCode: e.target.value }))
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="billingCountry">{t.country}</Label>
                  <Input
                    id="billingCountry"
                    value={billingAddress.country}
                    onChange={(e) =>
                      setBillingAddress(prev => ({ ...prev, country: e.target.value }))
                    }
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </ScrollArea>
        <div className="flex gap-2">
          <Button onClick={onSave} className="flex-1">
            {t.save}
          </Button>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t.cancel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PreferencesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  siteLanguage: LanguageCode;
  chatLanguage: LanguageCode;
  onSiteLanguageChange: (lang: LanguageCode) => void;
  onChatLanguageChange: (lang: LanguageCode) => void;
  onSave: () => void;
  t: any;
}

export function PreferencesDialog({
  open,
  onOpenChange,
  siteLanguage,
  chatLanguage,
  onSiteLanguageChange,
  onChatLanguageChange,
  onSave,
  t
}: PreferencesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t.preferences}
          </DialogTitle>
          <DialogDescription>{t.preferencesDescription}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="siteLanguage">{t.siteLanguage}</Label>
            <Select value={siteLanguage} onValueChange={(value: LanguageCode) => onSiteLanguageChange(value)}>
              <SelectTrigger>
                <Languages className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languages).map(([code, lang]) => (
                  <SelectItem key={code} value={code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="chatLanguage">{t.chatLanguage}</Label>
            <Select value={chatLanguage} onValueChange={(value: LanguageCode) => onChatLanguageChange(value)}>
              <SelectTrigger>
                <MessageSquare className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(languages).map(([code, lang]) => (
                  <SelectItem key={code} value={code}>
                    {lang.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 border border-dashed rounded-lg bg-muted/40 text-xs text-muted-foreground">
            {t.llmSelectionLocked ?? "La sélection des modèles est gérée automatiquement par l'assistant."}
          </div>

          <div className="flex gap-2">
            <Button onClick={onSave} className="flex-1">
              {t.save}
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t.cancel}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface AccountInfoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userInfo: UserInfo;
  onSave: (info: UserInfo) => void | Promise<void>;
  onOpenChangePassword: () => void;
  onOpenPreferences: () => void;
  t: any;
}

export function AccountInfoDialog({
  open,
  onOpenChange,
  userInfo,
  onSave,
  onOpenChangePassword,
  onOpenPreferences,
  t
}: AccountInfoDialogProps) {
  const buildFormState = React.useCallback((): UserInfo => ({
    ...userInfo,
    secondaryEmail: userInfo.secondaryEmail ?? null,
    phone: userInfo.phone ?? null,
    address: userInfo.address ? { ...userInfo.address } : createEmptyAddress(),
    billingAddress: userInfo.billingAddress ? { ...userInfo.billingAddress } : createEmptyAddress()
  }), [userInfo]);

  const [formState, setFormState] = React.useState<UserInfo>(buildFormState);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const currentRole = formState.role || userInfo.role;

  React.useEffect(() => {
    if (open) {
      setFormState(buildFormState());
    }
  }, [userInfo, open, buildFormState]);

  const handleAvatarUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error(t.avatarFileTypeError);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error(t.avatarFileSizeError);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const imageUrl = e.target?.result as string;
      setFormState(prev => ({
        ...prev,
        avatar: imageUrl
      }));
      toast.success(t.avatarUpdated);
    };
    reader.readAsDataURL(file);
  };

  const handleAvatarChange = () => {
    avatarInputRef.current?.click();
  };

  const updateAddressField = (field: keyof Address, value: string) => {
    setFormState(prev => ({
      ...prev,
      address: {
        ...(prev.address ?? createEmptyAddress()),
        [field]: value
      }
    }));
  };

  const updateBillingAddressField = (field: keyof Address, value: string) => {
    setFormState(prev => ({
      ...prev,
      billingAddress: {
        ...(prev.billingAddress ?? createEmptyAddress()),
        [field]: value
      }
    }));
  };

  const formatDate = (value?: string | null) => {
    if (!value) {
      return '—';
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            {t.accountInfo}
          </DialogTitle>
          <DialogDescription>
            {currentRole === 'admin'
              ? t.adminAccountDescription
              : t.userAccountDescription}
          </DialogDescription>
        </DialogHeader>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarUpload}
          className="hidden"
        />

        {currentRole === 'admin' ? (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={formState.avatar} alt={formState.name} />
                  <AvatarFallback className="bg-red-100 text-red-600 text-2xl font-bold">
                    {formState.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t.avatarCameraHint}
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="adminFirstName">{`${t.firstName} *`}</Label>
                  <Input
                    id="adminFirstName"
                  value={formState.name.split(' ')[0] || ''}
                  onChange={(e) => {
                      const lastName = formState.name.split(' ').slice(1).join(' ') || '';
                      const newName = lastName ? `${e.target.value} ${lastName}` : e.target.value;
                      setFormState(prev => ({ ...prev, name: newName }));
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="adminLastName">{`${t.lastName} *`}</Label>
                  <Input
                    id="adminLastName"
                  value={formState.name.split(' ').slice(1).join(' ') || ''}
                  onChange={(e) => {
                      const firstName = formState.name.split(' ')[0] || '';
                      const newName = firstName ? `${firstName} ${e.target.value}` : e.target.value;
                      setFormState(prev => ({ ...prev, name: newName }));
                    }}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="adminEmail">{t.adminEmail}</Label>
                <div className="relative">
                  <Input
                    id="adminEmail"
                    type="email"
                    value={formState.email}
                    disabled
                    className="bg-muted text-muted-foreground pr-20"
                  />
                  <Badge
                    variant="outline"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs border-orange-300 text-orange-600"
                  >
                    {t.notEditableBadge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {t.adminEmailLockedNotice}
                </p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <Shield className="w-5 h-5 text-red-600" />
                <h4 className="font-semibold text-red-800">{t.adminPrivilegesTitle}</h4>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{t.adminPrivilegeUnlimitedAI}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{t.adminPrivilegeUnlimitedTokens}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{t.adminPrivilegeUserManagement}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span>{t.adminPrivilegeSystemConfig}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button
                onClick={() => {
                  onOpenChange(false);
                  onOpenChangePassword();
                }}
                variant="outline"
                className="w-full justify-start"
              >
                <Key className="w-4 h-4 mr-2" />
                {t.adminChangePassword}
              </Button>

              <Button
                onClick={() => {
                  onOpenChange(false);
                  onOpenPreferences();
                }}
                variant="outline"
                className="w-full justify-start"
              >
                <Settings className="w-4 h-4 mr-2" />
                Préférences
              </Button>

            </div>
            <div className="flex gap-2 pt-4 border-t">
              <Button onClick={() => onSave(formState)} className="flex-1">
                <User className="w-4 h-4 mr-2" />
                {t.saveChanges}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-3">
              <div className="relative">
                <Avatar className="w-20 h-20">
                  <AvatarImage src={formState.avatar} alt={formState.name} />
                  <AvatarFallback className="bg-primary/10 text-2xl">
                    {formState.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                  onClick={handleAvatarChange}
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {t.avatarGenericHint}
              </p>
            </div>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="userName">{t.fullName}</Label>
                <div className="relative">
                  <Input
                    id="userName"
                    value={formState.name ?? ''}
                    readOnly
                    disabled
                    className="bg-muted text-muted-foreground pr-20"
                  />
                  <Badge
                    variant="outline"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs border-orange-300 text-orange-600"
                  >
                    {t.notEditableBadge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.nameLockedNotice}</p>
              </div>

              <div>
                <Label htmlFor="userEmail">{t.email}</Label>
                <div className="relative">
                  <Input
                    id="userEmail"
                    type="email"
                    value={formState.email ?? ''}
                    readOnly
                    disabled
                    className="bg-muted text-muted-foreground pr-20"
                  />
                  <Badge
                    variant="outline"
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-xs border-orange-300 text-orange-600"
                  >
                    {t.notEditableBadge}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t.emailLockedNotice}</p>
              </div>

              <div>
                <Label htmlFor="userSecondaryEmail">{t.secondaryEmail}</Label>
                <Input
                  id="userSecondaryEmail"
                  type="email"
                  value={formState.secondaryEmail ?? ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, secondaryEmail: e.target.value }))}
                  placeholder={t.secondaryEmailPlaceholder}
                />
              </div>

              <div>
                <Label htmlFor="userPhone">{t.phone}</Label>
                <Input
                  id="userPhone"
                  value={formState.phone ?? ''}
                  onChange={(e) => setFormState(prev => ({ ...prev, phone: e.target.value }))}
                  placeholder={t.phonePlaceholder}
                />
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Home className="w-4 h-4" />
                {t.personalAddress}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="personalStreet">{t.street}</Label>
                  <Input
                    id="personalStreet"
                    value={formState.address?.street ?? ''}
                    onChange={(e) => updateAddressField('street', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="personalCity">{t.city}</Label>
                  <Input
                    id="personalCity"
                    value={formState.address?.city ?? ''}
                    onChange={(e) => updateAddressField('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="personalPostal">{t.postalCode}</Label>
                  <Input
                    id="personalPostal"
                    value={formState.address?.postalCode ?? ''}
                    onChange={(e) => updateAddressField('postalCode', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="personalCountry">{t.country}</Label>
                  <Input
                    id="personalCountry"
                    value={formState.address?.country ?? ''}
                    onChange={(e) => updateAddressField('country', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <h4 className="font-medium flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                {t.billingAddress}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="billingStreet">{t.street}</Label>
                  <Input
                    id="billingStreet"
                    value={formState.billingAddress?.street ?? ''}
                    onChange={(e) => updateBillingAddressField('street', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="billingCity">{t.city}</Label>
                  <Input
                    id="billingCity"
                    value={formState.billingAddress?.city ?? ''}
                    onChange={(e) => updateBillingAddressField('city', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="billingPostal">{t.postalCode}</Label>
                  <Input
                    id="billingPostal"
                    value={formState.billingAddress?.postalCode ?? ''}
                    onChange={(e) => updateBillingAddressField('postalCode', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="billingCountry">{t.country}</Label>
                  <Input
                    id="billingCountry"
                    value={formState.billingAddress?.country ?? ''}
                    onChange={(e) => updateBillingAddressField('country', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Zap className="w-4 h-4" />
                {t.subscription}
              </h4>
              <div className="text-sm space-y-1">
                <div className="flex justify-between">
                  <span>{t.typeLabel}</span>
                  <Badge
                    variant={['premium', 'pro', 'admin'].includes(formState.subscriptionType) ? 'default' : 'secondary'}
                  >
                    {formState.subscriptionType === 'premium'
                      ? t.premium
                      : formState.subscriptionType === 'pro'
                        ? t.pro
                        : formState.subscriptionType === 'admin'
                          ? t.admin
                          : t.free}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span>{t.validity}</span>
                  <span>
                    {formatDate(formState.subscriptionStart)}{' '}–{' '}{formatDate(formState.subscriptionEnd)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>{t.tokensLabel}</span>
                  <span className="flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    {(formState.tokens || 0).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={() => onSave(formState)} className="flex-1">
                {t.save}
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t.cancel}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
