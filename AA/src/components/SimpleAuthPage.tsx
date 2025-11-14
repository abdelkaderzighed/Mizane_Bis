import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Label } from './ui/label';
import { SimpleCaptcha } from './SimpleCaptcha';
import { Eye, EyeOff, User, Mail, Lock, ArrowLeft, Settings, Database, Crown } from 'lucide-react';
import { toast } from 'sonner';
import { CompleteResetButton } from './CompleteResetButton';
import { DatabaseConnectionChecker } from './DatabaseConnectionChecker';
import { Alert, AlertDescription } from './ui/alert';

interface SimpleAuthPageProps {
  onSuccess: (authResult: any) => void;
  onInitializeDatabase: () => Promise<void>;
  onResetDatabase: () => Promise<void>;
  isInitializingDB: boolean;
  displayMode?: 'page' | 'modal';
}

type AuthMode = 'signin' | 'signup' | 'forgot';

export function SimpleAuthPage({ onSuccess, onInitializeDatabase, onResetDatabase, isInitializingDB, displayMode = 'page' }: SimpleAuthPageProps) {
  const [mode, setMode] = useState<AuthMode>('signin');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [captchaValid, setCaptchaValid] = useState<boolean | undefined>(undefined);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);

  // États pour les formulaires
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [signUpData, setSignUpData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [forgotData, setForgotData] = useState({
    email: ''
  });

  const isModal = displayMode === 'modal';
  const containerClasses = `${isModal ? 'min-h-full w-full' : 'min-h-screen'} flex items-center justify-center p-4`;
  const containerStyle = isModal ? undefined : { backgroundColor: '#006A35' };
  const cardClassName = `w-full max-w-md${isModal ? ' shadow-xl' : ''}`;

  const handleCreateAdminUser = async () => {
    setIsLoading(true);
    try {
      const { createAdminUser } = await import('../utils/supabase/init-database');
      const result = await createAdminUser();
      
      if (result.success) {
        toast.success('Compte administrateur créé/réactivé avec succès !');
        console.log('Admin créé:', result.admin_user);
        
        // Remplir automatiquement les champs de connexion
        setSignInData({
          email: 'a@a.a',
          password: 'admin'
        });
        
        toast.info('Les identifiants ont été pré-remplis. Vous pouvez maintenant vous connecter.');
      } else {
        toast.error(`Erreur: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur création admin:', error);
      toast.error('Erreur lors de la création du compte administrateur');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!captchaVerified) {
      setCaptchaValid(false);
      toast.error('Veuillez d\'abord compléter la vérification de sécurité');
      return;
    }

    if (!signInData.email || !signInData.password) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    setIsLoading(true);
    try {
      // Utiliser le vrai système d'authentification
      const { misanAuth } = await import('../utils/supabase/auth');
      const result = await misanAuth.signIn(signInData.email, signInData.password);
      
      if (result.success && result.user) {
        setInfoMessage(null);
        onSuccess(result);
        toast.success(`Connexion réussie ! Bienvenue ${result.user.name}`);
      } else {
        setInfoMessage(result.error || 'Votre compte est en cours d\'approbation.');
        toast.error(result.error || 'Erreur de connexion');
      }
    } catch (error) {
      console.error('Erreur de connexion:', error);
      setInfoMessage('Impossible de vérifier votre compte pour le moment. Veuillez réessayer ou contacter le support.');
      toast.error('Erreur lors de la connexion');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!captchaVerified) {
      setCaptchaValid(false);
      toast.error('Veuillez d\'abord compléter la vérification de sécurité');
      return;
    }

    if (!signUpData.name || !signUpData.email || !signUpData.password || !signUpData.confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (signUpData.password.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setIsLoading(true);
    try {
      // Utiliser le vrai système d'inscription
      const { misanAuth } = await import('../utils/supabase/auth');
      const result = await misanAuth.signUp(signUpData.email, signUpData.password, signUpData.name);
      
      if (result.success) {
        toast.success(result.message || 'Compte créé avec succès ! Vous recevrez un email après validation.');
        resetForm();
        setMode('signin');
        setSignInData({ email: signUpData.email, password: '' });
        setInfoMessage(result.message || 'Votre inscription est enregistrée. Vous recevrez un email après validation par un administrateur.');
      } else {
        toast.error(result.error || 'Erreur lors de la création du compte');
      }
    } catch (error) {
      console.error('Erreur d\'inscription:', error);
      toast.error('Erreur lors de la création du compte');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!captchaVerified) {
      setCaptchaValid(false);
      toast.error('Veuillez d\'abord compléter la vérification de sécurité');
      return;
    }

    if (!forgotData.email) {
      toast.error('Veuillez saisir votre adresse email');
      return;
    }

    setIsLoading(true);
    try {
      // Simulation d'envoi d'email de réinitialisation
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      toast.success('Un email de réinitialisation a été envoyé à votre adresse');
      setMode('signin');
    } catch (error) {
      console.error('Erreur mot de passe oublié:', error);
      toast.error('Erreur lors de l\'envoi de l\'email');
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setSignInData({ email: '', password: '' });
    setSignUpData({ name: '', email: '', password: '', confirmPassword: '' });
    setForgotData({ email: '' });
    setCaptchaVerified(false);
    setCaptchaValid(undefined);
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleModeChange = (newMode: AuthMode) => {
    setMode(newMode);
    resetForm();
    if (newMode !== 'signin') {
      setInfoMessage(null);
    }
  };

  if (mode === 'forgot') {
    return (
      <div className={containerClasses} style={containerStyle}>
        <Card className={cardClassName}>
          <CardHeader className="text-center relative">
              <div className="flex items-center justify-center mb-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleModeChange('signin')}
                  className="absolute left-4 top-4"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Retour
                </Button>
                <div className="text-2xl font-bold" style={{ color: '#006A35' }}>
                  Mizane
                </div>
              </div>
            <CardTitle>Mot de passe oublié</CardTitle>
            <CardDescription>
              Saisissez votre adresse email pour recevoir un lien de réinitialisation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">Adresse email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="votre@email.com"
                  value={forgotData.email}
                  onChange={(e) => setForgotData({ email: e.target.value })}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Vérificateur de connexion à la base de données */}
            <div className="border-t pt-4">
              <DatabaseConnectionChecker />
            </div>

            <SimpleCaptcha
              onVerified={setCaptchaVerified}
              isValid={captchaValid}
            />

            <Button
              onClick={handleForgotPassword}
              disabled={isLoading || !forgotData.email || !captchaVerified}
              className="w-full"
              style={{ backgroundColor: '#006A35' }}
            >
              {isLoading ? 'Envoi en cours...' : 'Envoyer le lien'}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={containerClasses} style={containerStyle}>
      <Card className={cardClassName}>
        <CardHeader className="text-center relative">
          <div className="text-2xl font-bold mb-4" style={{ color: '#006A35' }}>
            Mizane
          </div>
          <CardTitle>Accédez à votre assistant IA juridique</CardTitle>
          <CardDescription>
            Connectez-vous ou créez un compte pour commencer
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={mode} onValueChange={(value) => handleModeChange(value as AuthMode)} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Connexion</TabsTrigger>
              <TabsTrigger value="signup">Inscription</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-4 mt-6">
              {infoMessage && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertDescription className="text-sm leading-relaxed">
                    {infoMessage}
                  </AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="signin-email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signInData.email}
                    onChange={(e) => setSignInData({ ...signInData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signin-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signin-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Votre mot de passe"
                    value={signInData.password}
                    onChange={(e) => setSignInData({ ...signInData, password: e.target.value })}
                    className="pl-10 pr-10"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && captchaVerified && signInData.email && signInData.password) {
                        handleSignIn();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="text-right">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => handleModeChange('forgot')}
                  className="p-0 h-auto"
                >
                  Mot de passe oublié ?
                </Button>
              </div>

              <SimpleCaptcha
                onVerified={setCaptchaVerified}
                isValid={captchaValid}
              />


              <Button
                onClick={handleSignIn}
                disabled={isLoading || !signInData.email || !signInData.password || !captchaVerified}
                className="w-full"
                style={{ backgroundColor: '#006A35' }}
              >
                {isLoading ? 'Connexion...' : 'Se connecter'}
              </Button>

            </TabsContent>

            <TabsContent value="signup" className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nom complet</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Votre nom complet"
                    value={signUpData.name}
                    onChange={(e) => setSignUpData({ ...signUpData, name: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">Adresse email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signUpData.email}
                    onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Minimum 6 caractères"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                    className="pl-10 pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-confirm-password">Confirmer le mot de passe</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="signup-confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirmer votre mot de passe"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                    className="pl-10 pr-10"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && captchaVerified && signUpData.name && signUpData.email && signUpData.password && signUpData.confirmPassword) {
                        handleSignUp();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <SimpleCaptcha
                onVerified={setCaptchaVerified}
                isValid={captchaValid}
              />

              <Button
                onClick={handleSignUp}
                disabled={isLoading || !signUpData.name || !signUpData.email || !signUpData.password || !signUpData.confirmPassword || !captchaVerified}
                className="w-full"
                style={{ backgroundColor: '#006A35' }}
              >
                {isLoading ? 'Création...' : 'Créer un compte'}
              </Button>

              <div className="text-xs text-muted-foreground text-center">
                En créant un compte, vous acceptez nos conditions d'utilisation et notre politique de confidentialité.
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
