import { UserInfo } from '../types';

export interface AccessControlResult {
  canAccessAI: boolean;
  canUseAgent: boolean;
  canUseLLM: boolean;
  canCreateDocuments: boolean;
  reason?: string;
  tokensRequired?: number;
  upgradeRequired?: boolean;
}

// Fonction principale de contrôle d'accès
export const checkUserAccess = (user: UserInfo, tokensRequired: number = 0): AccessControlResult => {
  // Admin : accès illimité à tout
  if (user.role === 'admin') {
    return {
      canAccessAI: true,
      canUseAgent: true,
      canUseLLM: true,
      canCreateDocuments: true,
      reason: 'Accès administrateur illimité'
    };
  }

  const status = user.subscriptionStatus ?? 'inactive';

  if (status === 'inactive' || status === 'pending') {
    const pendingMessage = status === 'pending'
      ? 'Votre abonnement est en attente de validation par notre équipe. L\'activation sera confirmée dès validation du paiement.'
      : 'Votre compte est en cours d\'approbation par un administrateur.';
    return {
      canAccessAI: false,
      canUseAgent: false,
      canUseLLM: false,
      canCreateDocuments: false,
      reason: pendingMessage,
      upgradeRequired: false
    };
  }

  const now = new Date();
  let subscriptionStillValid = true;

  if (user.subscriptionEnd) {
    const parsedEnd = new Date(user.subscriptionEnd);
    if (!Number.isNaN(parsedEnd.getTime())) {
      subscriptionStillValid = parsedEnd > now;
    }
  }

  if (status === 'expired' || !subscriptionStillValid) {
    const expiredMessage = user.subscriptionType === 'premium' && user.trialUsed
      ? 'Votre période d\'essai a expiré. Les fonctionnalités IA nécessitent un abonnement Pro actif. Un seul abonnement gratuit est autorisé par compte.'
      : 'Votre abonnement a expiré. Renouvelez-le pour continuer à utiliser l\'IA.';

    return {
      canAccessAI: false,
      canUseAgent: false,
      canUseLLM: false,
      canCreateDocuments: true,
      reason: expiredMessage,
      upgradeRequired: true
    };
  }

  const tokenBalance = Number.isFinite(user.tokens) ? Number(user.tokens) : 0;
  const minimumTokensRequired = Math.max(tokensRequired, 1);

  if (tokenBalance < minimumTokensRequired) {
    return {
      canAccessAI: false,
      canUseAgent: false,
      canUseLLM: false,
      canCreateDocuments: true,
      reason: 'Jetons insuffisants',
      tokensRequired: minimumTokensRequired,
      upgradeRequired: true
    };
  }

  // Accès autorisé
  return {
    canAccessAI: true,
    canUseAgent: true,
    canUseLLM: true,
    canCreateDocuments: true,
    reason: 'Accès autorisé'
  };
};

// Fonction pour vérifier l'accès à un agent spécifique
export const checkAgentAccess = (user: UserInfo, agentType: string): AccessControlResult => {
  const baseAccess = checkUserAccess(user);
  
  if (!baseAccess.canAccessAI) {
    return baseAccess;
  }
  return baseAccess;
};

// Fonction pour vérifier l'accès à un modèle LLM
export const checkLLMAccess = (user: UserInfo, llmType: string): AccessControlResult => {
  const baseAccess = checkUserAccess(user);
  
  if (!baseAccess.canAccessAI) {
    return baseAccess;
  }
  return baseAccess;
};

// Fonction pour calculer le coût en jetons d'une action
export const calculateTokenCost = (actionType: string, contentLength: number = 0): number => {
  const baseCosts = {
    'chat': 10,
    'document_generation': 50,
    'analysis': 30,
    'correction': 20,
    'translation': 25,
    'creative': 40
  };

  const baseCost = baseCosts[actionType as keyof typeof baseCosts] || 10;
  
  // Ajuster selon la longueur du contenu
  const lengthMultiplier = Math.max(1, Math.ceil(contentLength / 1000));
  
  return baseCost * lengthMultiplier;
};

// Fonction pour vérifier et consommer des jetons
export const consumeTokens = async (
  user: UserInfo, 
  actionType: string, 
  contentLength: number = 0
): Promise<{ success: boolean; tokensConsumed: number; remainingTokens: number; error?: string }> => {
  
  // Admin : pas de consommation
  if (user.role === 'admin') {
    return {
      success: true,
      tokensConsumed: 0,
      remainingTokens: user.tokens,
      error: undefined
    };
  }

  const tokensRequired = calculateTokenCost(actionType, contentLength);
  const access = checkUserAccess(user, tokensRequired);

  if (!access.canAccessAI) {
    return {
      success: false,
      tokensConsumed: 0,
      remainingTokens: user.tokens,
      error: access.reason
    };
  }

  // Simuler la consommation (en réalité, ceci devrait appeler l'API)
  const newBalance = user.tokens - tokensRequired;

  return {
    success: true,
    tokensConsumed: tokensRequired,
    remainingTokens: newBalance
  };
};

// Fonction pour générer un message d'erreur d'accès
export const getAccessErrorMessage = (result: AccessControlResult, t: any): string => {
  if (result.reason === 'Abonnement expiré') {
    return t.subscriptionExpiredMessage || 'Votre abonnement a expiré. Souscrivez à un abonnement Pro pour continuer.';
  }
  
  if (result.reason === 'Jetons insuffisants') {
    return t.insufficientTokensMessage || `Jetons insuffisants. ${result.tokensRequired} jetons requis.`;
  }
  
  if (result.reason?.includes('premium')) {
    return t.premiumFeatureMessage || 'Fonctionnalité premium. Abonnement Pro requis.';
  }
  
  return result.reason || 'Accès non autorisé';
};
