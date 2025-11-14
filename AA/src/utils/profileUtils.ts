import { toast } from 'sonner';

// Fonctions de gestion du menu profil
export const handleProfileMenuClick = (
  action: string,
  setAccountInfoOpen: (open: boolean) => void,
  setBillingOpen: (open: boolean) => void,
  setAddressesOpen: (open: boolean) => void,
  setPreferencesOpen: (open: boolean) => void,
  setStoreOpen: (open: boolean) => void,
  setChangePasswordOpen: (open: boolean) => void,
  setCurrentPage: (page: 'home' | 'main' | 'pricing' | 'admin') => void,
  handleLogout: () => void,
  t: any
) => {
  switch (action) {
    case 'accountInfo':
      setAccountInfoOpen(true);
      break;
    case 'billing':
      setBillingOpen(true);
      break;
    case 'addresses':
      setAddressesOpen(true);
      break;
    case 'preferences':
      setPreferencesOpen(true);
      break;
    case 'subscription':
      toast.info(`Ouverture : ${t.subscription}`);
      break;
    case 'buySubscription':
      setStoreOpen(true);
      break;
    case 'buyTokens':
      setStoreOpen(true);
      break;
    case 'changePassword':
      setChangePasswordOpen(true);
      break;
    case 'admin':
      setCurrentPage('admin');
      break;
    case 'logout':
      handleLogout();
      break;
    default:
      break;
  }
};

// Fonctions de gestion des modales
export const handleSaveAccountInfo = (setAccountInfoOpen: (open: boolean) => void) => {
  toast.success('Informations sauvegardées');
  setAccountInfoOpen(false);
};

export const handleChangePassword = (setChangePasswordOpen: (open: boolean) => void) => {
  toast.success('Mot de passe modifié');
  setChangePasswordOpen(false);
};

export const handleSaveAddresses = (setAddressesOpen: (open: boolean) => void) => {
  toast.success('Adresses sauvegardées');
  setAddressesOpen(false);
};

export const handleSavePreferences = (
  setDocument: any,
  siteLanguage: string,
  setPreferencesOpen: (open: boolean) => void
) => {
  setDocument((prev: any) => ({ ...prev, language: siteLanguage }));
  toast.success('Préférences sauvegardées');
  setPreferencesOpen(false);
};