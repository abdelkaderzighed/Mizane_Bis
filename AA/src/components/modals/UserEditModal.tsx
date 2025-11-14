import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Separator } from '../ui/separator';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AdminUser } from '../../types';
import { 
  User, 
  Mail, 
  Shield, 
  Calendar, 
  Coins, 
  Save,
  X,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface UserEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onSave?: (updatedUser: AdminUser) => Promise<boolean>;
}

export function UserEditModal({ open, onOpenChange, user, onSave }: UserEditModalProps) {
  const [formData, setFormData] = useState<Partial<AdminUser>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialiser le formulaire quand l'utilisateur change
  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name,
        role: user.role,
        status: user.status,
        tokens: user.tokens,
        subscriptionType: user.subscriptionType,
        subscriptionStart: user.subscriptionStart,
        subscriptionEnd: user.subscriptionEnd
      });
    }
  }, [user]);

  if (!user) return null;

  const handleInputChange = (field: keyof AdminUser, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Validation basique
      if (!formData.name?.trim()) {
        toast.error('Le nom est requis');
        return;
      }

      if (formData.tokens !== undefined && formData.tokens < 0) {
        toast.error('Le nombre de jetons ne peut pas être négatif');
        return;
      }

      // Créer l'utilisateur mis à jour
      const updatedUser: AdminUser = {
        ...user,
        ...formData,
        name: formData.name!.trim(),
        tokens: Number(formData.tokens) || 0
      };

      if (onSave) {
        const result = await onSave(updatedUser);
        if (!result) {
          return;
        }
      }

      toast.success('Utilisateur mis à jour avec succès');
      onOpenChange(false);
    } catch (error) {
      console.error('Erreur lors de la mise à jour:', error);
      toast.error('Erreur lors de la mise à jour de l\'utilisateur');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      name: user.name,
      role: user.role,
      status: user.status,
      tokens: user.tokens,
      subscriptionType: user.subscriptionType,
      subscriptionStart: user.subscriptionStart,
      subscriptionEnd: user.subscriptionEnd
    });
    onOpenChange(false);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'collaborateur': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            Modifier l'utilisateur : {user.name}
          </DialogTitle>
          <DialogDescription>
            Modification des informations de l'utilisateur. L'email et le mot de passe ne peuvent pas être modifiés depuis cette interface.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Informations non modifiables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Informations de connexion
              </CardTitle>
              <CardDescription>
                Ces informations ne peuvent pas être modifiées depuis cette interface.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm text-muted-foreground">Email</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input value={user.email} disabled className="bg-muted" />
                  <Badge variant="outline" className="text-xs">
                    <AlertCircle className="w-3 h-3 mr-1" />
                    Non modifiable
                  </Badge>
                </div>
              </div>

              <div>
                <Label className="text-sm text-muted-foreground">ID utilisateur</Label>
                <Input value={user.id} disabled className="bg-muted font-mono text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* Informations modifiables */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <User className="w-4 h-4" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Nom complet *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="Nom complet de l'utilisateur"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="role">Rôle</Label>
                  <Select 
                    value={formData.role || ''} 
                    onValueChange={(value) => handleInputChange('role', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="user">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gray-500 text-white text-xs">
                            <User className="w-3 h-3 mr-1" />
                            Utilisateur
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="collaborateur">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-500 text-white text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Collaborateur
                          </Badge>
                        </div>
                      </SelectItem>
                      <SelectItem value="admin">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-red-500 text-white text-xs">
                            <Shield className="w-3 h-3 mr-1" />
                            Administrateur
                          </Badge>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="status">Statut</Label>
                  <Select 
                    value={formData.status || ''} 
                    onValueChange={(value) => handleInputChange('status', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="pending">En attente</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="expired">Expiré</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
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
                <Label htmlFor="tokens">Nombre de jetons</Label>
                <Input
                  id="tokens"
                  type="number"
                  min="0"
                  value={formData.tokens || 0}
                  onChange={(e) => handleInputChange('tokens', parseInt(e.target.value) || 0)}
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="subscriptionType">Type d'abonnement</Label>
                  <Select 
                    value={formData.subscriptionType || ''} 
                    onValueChange={(value) => handleInputChange('subscriptionType', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="admin">Administrateur</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="subscriptionStart">Début d'abonnement</Label>
                  <Input
                    id="subscriptionStart"
                    type="date"
                    value={formData.subscriptionStart || ''}
                    onChange={(e) => handleInputChange('subscriptionStart', e.target.value)}
                  />
                </div>

                <div>
                  <Label htmlFor="subscriptionEnd">Fin d'abonnement</Label>
                  <Input
                    id="subscriptionEnd"
                    type="date"
                    value={formData.subscriptionEnd || ''}
                    onChange={(e) => handleInputChange('subscriptionEnd', e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Barre d'actions */}
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
                disabled={isSubmitting}
              >
                <Save className="w-4 h-4 mr-2" />
                {isSubmitting ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
