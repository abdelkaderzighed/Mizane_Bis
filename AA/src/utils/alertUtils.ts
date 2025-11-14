import { UserInfo } from '../types';

export interface UserAlert {
  id: string;
  type: string;
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
  severity?: 'info' | 'warning' | 'error';
}

// Fonctions de gestion des alertes utilisateur
export const generateUserAlerts = (
  user: UserInfo,
  setCurrentPage: (page: 'home' | 'main' | 'pricing' | 'admin') => void,
  setStoreOpen: (open: boolean) => void
): UserAlert[] => {
  const alerts: UserAlert[] = [];
  const now = new Date();
  const subscriptionEnd = new Date(user.subscriptionEnd);
  const daysUntilExpiry = Math.ceil((subscriptionEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (user.subscriptionStatus === 'pending') {
    alerts.push({
      id: 'subscription_pending',
      type: 'general',
      title: 'Abonnement en attente',
      message: 'Nous avons bien enregistré votre renouvellement. L\'accès complet sera activé dès confirmation du paiement.',
      dismissible: false,
      severity: 'warning'
    });
  }

  if (user.subscriptionStatus === 'inactive') {
    alerts.push({
      id: 'account_pending',
      type: 'general',
      title: 'Compte en cours d\'approbation',
      message: 'Votre compte est en cours d\'examen par l\'administrateur. Vous recevrez un email dès son activation.',
      dismissible: false,
      severity: 'warning'
    });
  }

  if (user.subscriptionStatus === 'expired') {
    alerts.push({
      id: 'account_expired',
      type: 'general',
      title: 'Compte expiré',
      message: 'Votre accès est suspendu. Renouvelez votre abonnement ou contactez le support pour réactiver votre compte.',
      dismissible: false,
      severity: 'error'
    });
  }

  // Alerte période d'essai qui se termine
  if (user.subscriptionType === 'trial' && daysUntilExpiry <= 3 && daysUntilExpiry > 0) {
    alerts.push({
      id: 'trial_ending',
      type: 'trial_ending',
      title: `Votre période d'essai se termine dans ${daysUntilExpiry} jour${daysUntilExpiry > 1 ? 's' : ''}`,
      message: 'Souscrivez à un abonnement Pro pour continuer à utiliser tous les agents IA et modèles LLM premium.',
      action: {
        label: 'Voir les tarifs',
        onClick: () => setCurrentPage('pricing')
      },
      dismissible: true
    });
  }

  // Alerte abonnement expiré
  if (user.subscriptionType === 'trial' && daysUntilExpiry <= 0) {
    alerts.push({
      id: 'subscription_expired',
      type: 'subscription_expired',
      title: 'Votre période d\'essai a expiré',
      message: 'Vous avez maintenant accès aux fonctionnalités de base uniquement. Souscrivez à un abonnement Pro pour retrouver toutes les fonctionnalités.',
      action: {
        label: 'S\'abonner maintenant',
        onClick: () => setCurrentPage('pricing')
      },
      dismissible: false
    });
  }

  // Alerte jetons faibles
  if (user.tokens < 10000) {
    alerts.push({
      id: 'low_tokens',
      type: 'low_tokens',
      title: 'Nombre de jetons faible',
      message: `Il vous reste ${user.tokens.toLocaleString()} jetons. Rechargez votre compte pour continuer à utiliser l'IA sans interruption.`,
      action: {
        label: 'Acheter des jetons',
        onClick: () => setStoreOpen(true)
      },
      dismissible: true
    });
  }

  return alerts;
};
