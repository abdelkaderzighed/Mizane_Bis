import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent } from './ui/card';
import { RefreshCw, CheckCircle2 } from 'lucide-react';

interface SimpleCaptchaProps {
  onVerified: (isVerified: boolean) => void;
  isValid?: boolean;
  className?: string;
}

// Générateur de captcha simple avec opérations mathématiques
function generateMathCaptcha(): { question: string; answer: number } {
  const operations = ['+', '-', '×'];
  const operation = operations[Math.floor(Math.random() * operations.length)];
  
  let num1: number, num2: number, answer: number;
  
  switch (operation) {
    case '+':
      num1 = Math.floor(Math.random() * 50) + 1;
      num2 = Math.floor(Math.random() * 50) + 1;
      answer = num1 + num2;
      break;
    case '-':
      num1 = Math.floor(Math.random() * 50) + 25; // Assurer un résultat positif
      num2 = Math.floor(Math.random() * 25) + 1;
      answer = num1 - num2;
      break;
    case '×':
      num1 = Math.floor(Math.random() * 12) + 1;
      num2 = Math.floor(Math.random() * 12) + 1;
      answer = num1 * num2;
      break;
    default:
      num1 = 5;
      num2 = 3;
      answer = 8;
  }
  
  return {
    question: `${num1} ${operation} ${num2} = ?`,
    answer
  };
}

export function SimpleCaptcha({ onVerified, isValid, className = "" }: SimpleCaptchaProps) {
  const [captcha, setCaptcha] = useState(generateMathCaptcha());
  const [userAnswer, setUserAnswer] = useState('');
  const [isVerified, setIsVerified] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    onVerified(isVerified);
  }, [isVerified, onVerified]);

  const handleSubmit = () => {
    const answer = parseInt(userAnswer.trim());
    
    if (answer === captcha.answer) {
      setIsVerified(true);
      setShowError(false);
    } else {
      setAttempts(prev => prev + 1);
      setShowError(true);
      setUserAnswer('');
      
      // Régénérer le captcha après 3 tentatives incorrectes
      if (attempts >= 2) {
        handleRefresh();
        setAttempts(0);
      }
    }
  };

  const handleRefresh = () => {
    setCaptcha(generateMathCaptcha());
    setUserAnswer('');
    setIsVerified(false);
    setShowError(false);
    setAttempts(0);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isVerified) {
      handleSubmit();
    }
  };

  if (isVerified) {
    return (
      <Card className={`${className} border-green-200 bg-green-50`}>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 text-green-700">
            <CheckCircle2 className="w-5 h-5" />
            <div className="flex-1">
              <div className="font-medium">Vérification réussie</div>
              <div className="text-sm text-green-600">Vous pouvez maintenant continuer</div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="text-green-700 hover:bg-green-100"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`${className} ${isValid === false ? 'border-red-300 bg-red-50' : 'border-border'}`}>
      <CardContent className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-sm">Vérification de sécurité</div>
              <div className="text-xs text-muted-foreground">
                Résolvez cette opération pour continuer
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              className="h-8 w-8 p-0"
              title="Nouveau captcha"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-1 flex items-center gap-2">
              <div 
                className="px-4 py-2 bg-muted rounded-md font-mono text-lg font-bold border"
                style={{ fontFamily: 'monospace' }}
              >
                {captcha.question}
              </div>
              <Input
                type="number"
                value={userAnswer}
                onChange={(e) => setUserAnswer(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Votre réponse"
                className="w-24 text-center"
                disabled={isVerified}
              />
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={!userAnswer.trim() || isVerified}
              size="sm"
            >
              Vérifier
            </Button>
          </div>

          {showError && (
            <div className="text-sm text-red-600 bg-red-50 p-2 rounded-md">
              ❌ Réponse incorrecte. 
              {attempts >= 2 ? ' Un nouveau captcha a été généré.' : ` Tentatives restantes: ${3 - attempts - 1}`}
            </div>
          )}
          
          {attempts > 0 && !showError && (
            <div className="text-xs text-orange-600">
              Tentative {attempts}/3
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}