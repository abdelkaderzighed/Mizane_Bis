import React from 'react';
import { Alert, AlertDescription } from './ui/alert';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { checkUserAccess } from '../utils/accessControl';
import {
  AlertTriangle,
  Clock,
  Coins,
  CheckCircle,
  Info,
  X,
  Shield,
  Lock
} from 'lucide-react';

interface AlertItem {
  id: string;
  type: 'trial_ending' | 'low_tokens' | 'subscription_expired' | 'trial_started' | 'payment_due' | 'general';
  title: string;
  message: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  dismissible: boolean;
  severity?: 'info' | 'warning' | 'error';
}

interface UserAlertsProps {
  alerts: AlertItem[];
  onDismiss: (alertId: string) => void;
  onActionClick?: (alertId: string, actionType: string) => void;
  userInfo?: any;
}

export function UserAlerts({ alerts, onDismiss, onActionClick, userInfo }: UserAlertsProps) {
  if (alerts.length === 0) return null;

  // Vérifier l'accès utilisateur pour afficher une alerte de statut
  const accessStatus = userInfo ? checkUserAccess(userInfo) : null;

  const getAlertIcon = (type: AlertItem['type'], severity?: AlertItem['severity']) => {
    if (type === 'general') {
      switch (severity) {
        case 'warning':
          return <AlertTriangle className="w-4 h-4" />;
        case 'error':
          return <AlertTriangle className="w-4 h-4" />;
        default:
          return <Info className="w-4 h-4" />;
      }
    }

    switch (type) {
      case 'trial_ending':
      case 'subscription_expired':
      case 'payment_due':
        return <AlertTriangle className="w-4 h-4" />;
      case 'low_tokens':
        return <Coins className="w-4 h-4" />;
      case 'trial_started':
        return <CheckCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const getAlertStyle = (type: AlertItem['type'], severity?: AlertItem['severity']) => {
    if (severity) {
      switch (severity) {
        case 'warning':
          return 'border-amber-200 bg-amber-50 text-amber-800';
        case 'error':
          return 'border-red-200 bg-red-50 text-red-800';
        default:
          return 'border-blue-200 bg-blue-50 text-blue-800';
      }
    }

    switch (type) {
      case 'trial_started':
        return 'border-green-200 bg-green-50 text-green-800';
      case 'trial_ending':
      case 'low_tokens':
        return 'border-orange-200 bg-orange-50 text-orange-800';
      case 'subscription_expired':
      case 'payment_due':
        return 'border-red-200 bg-red-50 text-red-800';
      default:
        return 'border-blue-200 bg-blue-50 text-blue-800';
    }
  };

  return (
    <div className="space-y-3 p-4 border-b border-border bg-muted/30">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <span className="text-sm font-medium">Notifications importantes</span>
        <Badge variant="secondary" className="text-xs">{alerts.length}</Badge>
        
        {/* Indicateur de statut d'accès */}
        {accessStatus && (
          <Badge 
            variant={accessStatus.canAccessAI ? "default" : "destructive"} 
            className="text-xs ml-auto"
          >
            {accessStatus.canAccessAI ? (
              <>
                <Shield className="w-3 h-3 mr-1" />
                Accès autorisé
              </>
            ) : (
              <>
                <Lock className="w-3 h-3 mr-1" />
                Accès restreint
              </>
            )}
          </Badge>
        )}
      </div>

      {alerts.map((alert) => (
        <Alert
          key={alert.id}
          className={`relative ${getAlertStyle(alert.type, alert.severity)}`}
        >
          <div className="col-span-2 flex items-start gap-2">
            {getAlertIcon(alert.type, alert.severity)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm">{alert.title}</h4>
                {alert.dismissible && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDismiss(alert.id)}
                    className="h-auto p-1 hover:bg-black/10"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
              </div>
              <AlertDescription className="text-sm mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
                {alert.message}
              </AlertDescription>
              {alert.action && (
                <Button
                  size="sm"
                  onClick={alert.action.onClick}
                  className="mt-2 h-7 text-xs"
                >
                  {alert.action.label}
                </Button>
              )}
            </div>
          </div>
        </Alert>
      ))}

      {/* Alerte de statut d'accès si problème */}
      {accessStatus && !accessStatus.canAccessAI && (
        <Alert className="border-red-200 bg-red-50 text-red-800">
          <Lock className="w-4 h-4" />
          <div className="col-span-2 flex-1 min-w-0">
            <h4 className="font-medium text-sm">Accès IA restreint</h4>
            <AlertDescription className="text-sm mt-1 whitespace-nowrap overflow-hidden text-ellipsis">
              {accessStatus.reason}
              {accessStatus.tokensRequired && (
                <span className="block mt-1">
                  Jetons requis : {accessStatus.tokensRequired.toLocaleString()}
                </span>
              )}
            </AlertDescription>
          </div>
        </Alert>
      )}
    </div>
  );
}
