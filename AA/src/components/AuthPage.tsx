import React, { useState } from 'react';
import { User, Lock, Mail, AlertCircle, CheckCircle, Loader, Database, UserPlus } from 'lucide-react';
import { AuthService, type AuthResponse } from '../utils/supabase';

interface AuthPageProps {
  onAuthSuccess: (user: any) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      let result: AuthResponse;

      if (isLogin) {
        result = await AuthService.login(formData.email, formData.password);
      } else {
        if (!formData.name.trim()) {
          setMessage({ type: 'error', text: 'Le nom est requis' });
          return;
        }
        result = await AuthService.register(formData.email, formData.password, formData.name);
      }

      if (result.success && result.user) {
        setMessage({ type: 'success', text: result.message || 'Connexion réussie!' });
        setTimeout(() => onAuthSuccess(result.user), 1000);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur inconnue' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur de connexion' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInitDatabase = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await AuthService.initializeDatabase();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Base de données initialisée!' });
        setDbInitialized(true);
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur initialisation' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur initialisation' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdmin = async () => {
    setLoading(true);
    setMessage(null);

    try {
      const result = await AuthService.createAdmin();
      
      if (result.success) {
        setMessage({ type: 'success', text: result.message || 'Admin créé!' });
      } else {
        setMessage({ type: 'error', text: result.error || 'Erreur création admin' });
      }
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error instanceof Error ? error.message : 'Erreur création admin' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        {/* Logo et titre */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-indigo-600 rounded-full flex items-center justify-center mb-4">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Misan</h1>
          <p className="text-gray-600">
            {isLogin ? 'Connectez-vous à votre compte' : 'Créez votre compte gratuit'}
          </p>
        </div>

        {/* Boutons d'initialisation */}
        {!dbInitialized && (
          <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration initiale</h3>
            
            <button
              onClick={handleInitDatabase}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <Database className="h-4 w-4 mr-2" />
              )}
              Initialiser la base de données
            </button>

            <button
              onClick={handleCreateAdmin}
              disabled={loading}
              className="w-full flex items-center justify-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Créer compte admin (a@a.a / admin)
            </button>
          </div>
        )}

        {/* Formulaire d'authentification */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom complet
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required={!isLogin}
                    value={formData.name}
                    onChange={handleInputChange}
                    className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Votre nom complet"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="votre@email.com"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              {isLogin ? 'Se connecter' : 'Créer le compte'}
            </button>
          </form>

          <div className="mt-4 text-center">
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage(null);
                setFormData({ email: '', password: '', name: '' });
              }}
              className="text-sm text-indigo-600 hover:text-indigo-500"
            >
              {isLogin 
                ? "Pas de compte ? Créez-en un gratuitement" 
                : "Déjà un compte ? Connectez-vous"
              }
            </button>
          </div>

          {!isLogin && (
            <div className="mt-4 p-3 bg-blue-50 rounded-md">
              <div className="flex">
                <CheckCircle className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium">Essai gratuit inclus :</p>
                  <ul className="mt-1 list-disc list-inside space-y-1">
                    <li>7 jours d'accès complet</li>
                    <li>100 000 jetons inclus</li>
                    <li>Toutes les fonctionnalités IA</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Messages */}
        {message && (
          <div className={`rounded-md p-4 ${
            message.type === 'success' ? 'bg-green-50 border border-green-200' :
            message.type === 'error' ? 'bg-red-50 border border-red-200' :
            'bg-blue-50 border border-blue-200'
          }`}>
            <div className="flex">
              {message.type === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-400 mr-2 flex-shrink-0" />
              ) : message.type === 'error' ? (
                <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0" />
              ) : (
                <AlertCircle className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
              )}
              <p className={`text-sm ${
                message.type === 'success' ? 'text-green-700' :
                message.type === 'error' ? 'text-red-700' :
                'text-blue-700'
              }`}>
                {message.text}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}