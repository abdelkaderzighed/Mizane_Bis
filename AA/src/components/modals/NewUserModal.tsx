import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { AdminUser } from '../../types';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Coins, 
  Save,
  X,
  AlertCircle,
  UserPlus,
  Info,
  Lock
} from 'lucide-react';
import { toast } from 'sonner';

interface NewUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: (newUser: Partial<AdminUser>) => void;
}

interface NewUserForm {
  name: string;
  email: string;
  role: string;
  status: string;
  subscriptionType: string;
  subscriptionStart: string;
  subscriptionEnd: string;
  tokens: number;
  sendWelcomeEmail: boolean;
  generatePassword: boolean;
}

export function NewUserModal({ open, onOpenChange, onSave }: NewUserModalProps) {
  const [formData, setFormData] = useState<NewUserForm>({
    name: '',
    email: '',
    role: 'user',
    status: 'active',
    subscriptionType: 'premium',
    subscriptionStart: '',
    subscriptionEnd: '',
    tokens: 100000,
    sendWelcomeEmail: true,
    generatePassword: true
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const allowedRoles = [
    { value: 'user', label: 'Utilisateur', color: 'bg-gray-500 text-white' },
    { value: 'collaborateur', label: 'Collaborateur', color: 'bg-blue-500 text-white' },
    { value: 'admin', label: 'Administrateur', color: 'bg-red-500 text-white' }
  ];

  const allowedStatuses = [
    { value: 'active', label: 'Actif' },
    { value: 'inactive', label: 'Inactif' },
    { value: 'pending', label: 'En attente' },
    { value: 'expired', label: 'Expiré' }
  ];

  const allowedSubscriptionTypes = [
    { value: 'premium', label: 'Premium', description: 'Accès complet' },
    { value: 'pro', label: 'Pro', description: 'Abonnement mensuel' },
    { value: 'admin', label: 'Administrateur', description: 'Accès total administrateur' }
  ];

  const handleInputChange = (field: keyof NewUserForm, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const generateDefaultTokens = (subscriptionType: string, role: string) => {
    if (role === 'admin') return 1000000;
    if (role === 'collaborateur') return 500000;
    
    switch (subscriptionType) {
      case 'admin':
        return 1000000;
      case 'pro':
        return 500000;
      case 'premium':
      default:
        return 100000;
    }
  };

  const handleSubscriptionTypeChange = (subscriptionType: string) => {
    const defaultTokens = generateDefaultTokens(subscriptionType, formData.role);
    
    // Auto-remplir les dates pour les abonnements payants
    let subscriptionStart = '';
    let subscriptionEnd = '';
    
    if (subscriptionType === 'pro' || subscriptionType === 'premium' || subscriptionType === 'admin') {
      const today = new Date();
      const endDate = new Date(today);
      endDate.setMonth(today.getMonth() + 1);
      
      subscriptionStart = today.toISOString().split('T')[0];
      subscriptionEnd = endDate.toISOString().split('T')[0];
    }

    setFormData(prev => ({
      ...prev,
      subscriptionType,
      tokens: defaultTokens,
      subscriptionStart,
      subscriptionEnd
    }));
  };

  const handleRoleChange = (role: string) => {
    const defaultTokens = generateDefaultTokens(formData.subscriptionType, role);
    setFormData(prev => ({
      ...prev,
      role,
      tokens: defaultTokens
    }));
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.name.trim()) {
      errors.push('Le nom est obligatoire');
    }

    if (!formData.email.trim()) {
      errors.push('L\'email est obligatoire');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.push('Format d\'email invalide');
    }

    if (formData.tokens < 0) {
      errors.push('Le nombre de jetons ne peut pas être négatif');
    }

    if (formData.subscriptionStart && formData.subscriptionEnd) {
      const startDate = new Date(formData.subscriptionStart);
      const endDate = new Date(formData.subscriptionEnd);
      
      if (endDate <= startDate) {
        errors.push('La date de fin d\'abonnement doit être postérieure à la date de début');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const validation = validateForm();
      
      if (!validation.isValid) {
        validation.errors.forEach(error => toast.error(error));
        return;
      }

      // Créer le nouvel utilisateur
      const newUser: Partial<AdminUser> = {
        name: formData.name.trim(),
        email: formData.email.trim().toLowerCase(),
        role: formData.role as any,
        status: formData.status as any,
        subscriptionType: formData.subscriptionType as any,
        subscriptionStart: formData.subscriptionStart,
        subscriptionEnd: formData.subscriptionEnd,
        tokens: formData.tokens,
        // Générer un ID temporaire - sera remplacé lors de la sauvegarde
        id: `new_user_${Date.now()}`,
        avatar: '/api/placeholder/32/32',
        createdAt: new Date().toISOString().split('T')[0],
        lastLogin: new Date().toISOString().split('T')[0],
        totalOrders: 0,
        totalSpent: 0
      };

      // Simuler la création
      await new Promise(resolve => setTimeout(resolve, 1500));

      onSave?.(newUser);
      
      // Messages de confirmation
      toast.success('Utilisateur créé avec succès');
      
      if (formData.generatePassword) {
        toast.info('Un mot de passe temporaire a été généré et envoyé par email');
      }
      
      if (formData.sendWelcomeEmail) {
        toast.info('Email de bienvenue envoyé à l\'utilisateur');
      }

      // Réinitialiser le formulaire
      setFormData({
        name: '',
        email: '',
        role: 'user',
        status: 'active',
        subscriptionType: 'free',
        subscriptionStart: '',
        subscriptionEnd: '',
        tokens: 100000,
        sendWelcomeEmail: true,
        generatePassword: true
      });

      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la création:', error);
      toast.error('Erreur lors de la création de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: '',
      email: '',
      role: 'user',
      status: 'active',
      subscriptionType: 'free',
      subscriptionStart: '',
      subscriptionEnd: '',
      tokens: 100000,
      sendWelcomeEmail: true,
      generatePassword: true
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <UserPlus className="w-6 h-6 text-green-600" />
            Créer un nouvel utilisateur
          </DialogTitle>
          <DialogDescription>
            Créez un nouveau compte utilisateur avec ses paramètres d'abonnement et de jetons.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations de base
              </CardTitle>
              <CardDescription>
                Informations personnelles et de connexion du nouvel utilisateur.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nom complet de l'utilisateur"
                  required
                />
              </div>

              <div>
                <Label htmlFor="email">Adresse email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@example.dz"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Select 
                    value={formData.role} 
                    onValueChange={handleRoleChange}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedRoles.map(role => (
                        <SelectItem key={role.value} value={role.value}>
                          <div className="flex items-center gap-2">
                            <Badge className={`${role.color} text-xs`}>
                              <Shield className="w-3 h-3 mr-1" />
                              {role.label}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Statut initial</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedStatuses.map(status => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Alert>
                <Lock className="w-4 h-4" />
                <AlertDescription>
                  Un mot de passe temporaire sera généré automatiquement et envoyé à l'utilisateur par email.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Abonnement et jetons */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Coins className="w-4 h-4" />
                Abonnement et jetons
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subscriptionType">Type d'abonnement</Label>
                <Select 
                  value={formData.subscriptionType} 
                  onValueChange={handleSubscriptionTypeChange}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedSubscriptionTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        <div className="flex flex-col">
                          <span className="font-medium">{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="tokens">Nombre de jetons initial</Label>
                <Input
                  id="tokens"
                  type="number"
                  min="0"
                  value={formData.tokens}
                  onChange={(e) => handleInputChange('tokens', parseInt(e.target.value) || 0)}
                  placeholder="100000"
                />
                <div className="text-xs text-muted-foreground mt-1">
                  Jetons alloués automatiquement selon le type d'abonnement
                </div>
              </div>

              {(formData.subscriptionType === 'trial' || formData.subscriptionType === 'pro' || formData.subscriptionType === 'premium') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="subscriptionStart">Début d'abonnement</Label>
                    <Input
                      id="subscriptionStart"
                      type="date"
                      value={formData.subscriptionStart}
                      onChange={(e) => handleInputChange('subscriptionStart', e.target.value)}
                    />
                  </div>

                  <div>
                    <Label htmlFor="subscriptionEnd">Fin d'abonnement</Label>
                    <Input
                      id="subscriptionEnd"
                      type="date"
                      value={formData.subscriptionEnd}
                      onChange={(e) => handleInputChange('subscriptionEnd', e.target.value)}
                    />
                  </div>
                </div>
              )}

              {formData.subscriptionType === 'trial' && (
                <Alert>
                  <Info className="w-4 h-4" />
                  <AlertDescription>
                    La période d'essai est configurée pour 7 jours avec 100 000 jetons inclus.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Options de création */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Options de création
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Générer un mot de passe temporaire</Label>
                  <div className="text-sm text-muted-foreground">
                    Un mot de passe sécurisé sera créé et envoyé par email
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.generatePassword}
                  onChange={(e) => handleInputChange('generatePassword', e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label>Envoyer un email de bienvenue</Label>
                  <div className="text-sm text-muted-foreground">
                    L'utilisateur recevra un email avec ses identifiants et les instructions
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={formData.sendWelcomeEmail}
                  onChange={(e) => handleInputChange('sendWelcomeEmail', e.target.checked)}
                  className="h-4 w-4"
                />
              </div>

              <Alert>
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <strong>Important :</strong> L'utilisateur devra changer son mot de passe lors de sa première connexion.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>

          {/* Aperçu du nouvel utilisateur */}
          {formData.name && formData.email && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Aperçu de l'utilisateur</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-medium">
                    {formData.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{formData.name}</div>
                    <div className="text-sm text-muted-foreground">{formData.email}</div>
                    <div className="flex items-center gap-2 mt-2">
                      <Badge className={`text-xs ${allowedRoles.find(r => r.value === formData.role)?.color}`}>
                        {allowedRoles.find(r => r.value === formData.role)?.label}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {allowedSubscriptionTypes.find(s => s.value === formData.subscriptionType)?.label}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        <Coins className="w-3 h-3 mr-1" />
                        {formData.tokens.toLocaleString()} jetons
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="flex justify-between items-center pt-4 border-t">
            <div className="text-xs text-muted-foreground">
              * Champs obligatoires
            </div>
            
            <div className="flex gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                <X className="w-4 h-4 mr-2" />
                Annuler
              </Button>
              <Button 
                type="submit" 
                disabled={isSubmitting || !formData.name.trim() || !formData.email.trim()}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Création...' : 'Créer l\'utilisateur'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
