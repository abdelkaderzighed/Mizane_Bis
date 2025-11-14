import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
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
  Clock, 
  MapPin,
  CreditCard,
  Activity,
  Edit
} from 'lucide-react';

interface UserDetailModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: AdminUser | null;
  onEdit?: (user: AdminUser) => void;
}

export function UserDetailModal({ open, onOpenChange, user, onEdit }: UserDetailModalProps) {
  if (!user) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-50 border-green-200';
      case 'pending': return 'text-amber-600 bg-amber-50 border-amber-200';
      case 'inactive': return 'text-red-600 bg-red-50 border-red-200';
      case 'expired': return 'text-orange-600 bg-orange-50 border-orange-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-500 text-white';
      case 'collaborateur': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Actif';
      case 'inactive':
        return 'Inactif';
      case 'pending':
        return 'En attente';
      case 'expired':
        return 'Expiré';
      default:
        return status;
    }
  };

  const getSubscriptionDisplay = (subscriptionType: string, role: string) => {
    if (role === 'admin' || role === 'collaborateur') {
      return 'N/A';
    }
    switch (subscriptionType) {
      case 'premium': return 'Premium';
      case 'pro': return 'Pro';
      case 'admin': return 'Administrateur';
      case 'trial': return 'Période d\'essai';
      case 'free': return 'Gratuit';
      default: return 'N/A';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>{user.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
            </Avatar>
            Détails de l'utilisateur : {user.name}
          </DialogTitle>
          <DialogDescription>
            Consultation des informations complètes de l'utilisateur, incluant ses données personnelles, son abonnement et ses statistiques d'utilisation.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Informations personnelles */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Informations personnelles
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="w-12 h-12">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="text-lg">
                    {user.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-medium">{user.name}</h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="w-4 h-4" />
                    {user.email}
                  </p>
                </div>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">ID utilisateur</span>
                  <span className="text-sm text-muted-foreground font-mono">{user.id}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Rôle</span>
                  <Badge className={`text-xs ${getRoleColor(user.role)}`}>
                    <Shield className="w-3 h-3 mr-1" />
                    {user.role === 'admin' ? 'Administrateur' :
                     user.role === 'collaborateur' ? 'Collaborateur' :
                     'Utilisateur'}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Statut</span>
                  <Badge className={`text-xs border ${getStatusColor(user.status)}`}>
                    <Activity className="w-3 h-3 mr-1" />
                    {getStatusLabel(user.status)}
                  </Badge>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Date de création</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    {new Date(user.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Dernière connexion</span>
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    {new Date(user.lastLogin).toLocaleDateString('fr-FR')}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Abonnement et finances */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Abonnement et finances
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Type d'abonnement</span>
                  <Badge variant={getSubscriptionDisplay(user.subscriptionType, user.role) === 'Premium' ? 'default' : 'secondary'} className="text-xs">
                    {getSubscriptionDisplay(user.subscriptionType, user.role)}
                  </Badge>
                </div>

                {user.subscriptionStart && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Début d'abonnement</span>
                    <span className="text-sm text-muted-foreground">{user.subscriptionStart}</span>
                  </div>
                )}

                {user.subscriptionEnd && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Fin d'abonnement</span>
                    <span className="text-sm text-muted-foreground">{user.subscriptionEnd}</span>
                  </div>
                )}

                <Separator />

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Jetons disponibles</span>
                  <span className="text-sm font-semibold flex items-center gap-1">
                    <Coins className="w-4 h-4 text-yellow-600" />
                    {user.tokens.toLocaleString()}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Commandes totales</span>
                  <span className="text-sm text-muted-foreground">{user.totalOrders}</span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Montant total dépensé</span>
                  <span className="text-sm font-semibold">
                    {user.totalSpent.toLocaleString()} DA
                  </span>
                </div>
              </div>

              {/* Indicateur de rentabilité */}
              {user.totalOrders > 0 && (
                <>
                  <Separator />
                  <div className="bg-muted p-3 rounded-lg">
                    <h4 className="text-sm font-medium mb-2">Statistiques client</h4>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span>Panier moyen</span>
                        <span>{Math.round(user.totalSpent / user.totalOrders).toLocaleString()} DA</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Statut client</span>
                        <span className={user.totalSpent > 10000 ? 'text-green-600 font-medium' : 'text-muted-foreground'}>
                          {user.totalSpent > 10000 ? 'Premium' : 'Standard'}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Barre d'actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            Dernière mise à jour : {new Date().toLocaleDateString('fr-FR')} à {new Date().toLocaleTimeString('fr-FR')}
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fermer
            </Button>
            {onEdit && (
              <Button onClick={() => onEdit(user)}>
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
