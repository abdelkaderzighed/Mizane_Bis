import React from 'react';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

/**
 * Modal de confirmation stylisé selon les couleurs du site
 * Types: 'danger', 'warning', 'success', 'info'
 */
const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'warning',
  confirmText = 'Confirmer',
  cancelText = 'Annuler',
  loading = false,
  showCancel = true
}) => {
  if (!isOpen) return null;

  // Configuration des couleurs et icônes selon le type
  const configs = {
    danger: {
      icon: XCircle,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      headerGradient: 'from-red-50 to-pink-50',
      borderColor: 'border-red-200',
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      cancelButton: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400'
    },
    warning: {
      icon: AlertTriangle,
      iconColor: 'text-amber-600',
      iconBg: 'bg-amber-100',
      headerGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-200',
      confirmButton: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
      cancelButton: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400'
    },
    success: {
      icon: CheckCircle,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      headerGradient: 'from-green-50 to-emerald-50',
      borderColor: 'border-green-200',
      confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      cancelButton: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400'
    },
    info: {
      icon: Info,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      headerGradient: 'from-blue-50 to-indigo-50',
      borderColor: 'border-blue-200',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      cancelButton: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400'
    }
  };

  const config = configs[type] || configs.info;
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-md w-full animate-fade-in">
        {/* Header avec gradient */}
        <div className={`bg-gradient-to-r ${config.headerGradient} border-b ${config.borderColor} p-6 rounded-t-lg`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`${config.iconBg} p-2 rounded-full`}>
                <Icon className={`w-6 h-6 ${config.iconColor}`} />
              </div>
              <h2 className="text-xl font-bold text-gray-800">{title}</h2>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              disabled={loading}
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-700 leading-relaxed whitespace-pre-line">
            {message}
          </p>
        </div>

        {/* Footer avec boutons */}
        <div className="bg-gray-50 px-6 py-4 rounded-b-lg flex justify-end gap-3">
          {showCancel && (
            <button
              onClick={onClose}
              disabled={loading}
              className={`px-5 py-2 ${config.cancelButton} text-white rounded-lg font-medium transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {cancelText}
            </button>
          )}
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`px-5 py-2 ${config.confirmButton} text-white rounded-lg font-medium transition-all focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2`}
          >
            {loading && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
