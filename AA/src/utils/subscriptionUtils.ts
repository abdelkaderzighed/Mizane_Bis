import { UserInfo } from '../types';

export interface SubscriptionExpiryInfo {
  date: string;
  daysUntilExpiry: number;
  isExpired: boolean;
  isExpiringSoon: boolean;
  subscriptionType: string;
}

// Fonction pour calculer les informations d'expiration de l'abonnement
export const getSubscriptionExpiryInfo = (userInfo: UserInfo): SubscriptionExpiryInfo | null => {
  if (!userInfo.subscriptionEnd) return null;
  
  const expiryDate = new Date(userInfo.subscriptionEnd);
  const now = new Date();
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  const isExpired = daysUntilExpiry <= 0;
  const isExpiringSoon = daysUntilExpiry <= 7 && daysUntilExpiry > 0;
  
  return {
    date: expiryDate.toLocaleDateString('fr-FR', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric' 
    }),
    daysUntilExpiry,
    isExpired,
    isExpiringSoon,
    subscriptionType: userInfo.subscriptionType
  };
};

// Fonction pour obtenir la couleur du statut d'expiration
export const getExpiryStatusColor = (info: SubscriptionExpiryInfo): string => {
  if (info.isExpired) return 'text-red-200';
  if (info.isExpiringSoon) return 'text-yellow-200';
  return 'text-white';
};