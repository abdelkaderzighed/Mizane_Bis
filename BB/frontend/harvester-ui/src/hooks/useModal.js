import { useState } from 'react';

export const useModal = () => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    type: 'info',
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Annuler',
    showCancel: false,
    onConfirm: null
  });

  const showModal = ({ type = 'info', title, message, confirmText = 'OK', cancelText = 'Annuler', showCancel = false, onConfirm }) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      confirmText,
      cancelText,
      showCancel,
      onConfirm
    });
  };

  const closeModal = () => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const showConfirm = (message, onConfirm, title = 'Confirmation') => {
    showModal({
      type: 'confirm',
      title,
      message,
      showCancel: true,
      confirmText: 'Confirmer',
      onConfirm
    });
  };

  const showAlert = (message, title = 'Information') => {
    showModal({
      type: 'info',
      title,
      message,
      showCancel: false
    });
  };

  const showWarning = (message, title = 'Attention') => {
    showModal({
      type: 'warning',
      title,
      message,
      showCancel: false
    });
  };

  const showSuccess = (message, title = 'Succès') => {
    showModal({
      type: 'success',
      title,
      message,
      showCancel: false
    });
  };

  const showError = (message, title = 'Erreur') => {
    showModal({
      type: 'error',
      title,
      message,
      showCancel: false
    });
  };

  return {
    modalState,
    closeModal,
    showModal,
    showConfirm,
    showAlert,
    showWarning,
    showSuccess,
    showError
  };
};
