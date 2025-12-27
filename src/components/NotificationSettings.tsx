import React from 'react';
import { Bell, BellOff, BellRing, Loader2, Smartphone } from 'lucide-react';
import { usePushNotifications } from '@/hooks/usePushNotifications';

const NotificationSettings: React.FC = () => {
  const { isSupported, isRegistered, isInitializing, initialize, showLocalNotification } = usePushNotifications();

  const handleTestNotification = async () => {
    await showLocalNotification(
      '🚨 Teste Ampara',
      'Esta é uma notificação de teste do app Ampara'
    );
  };

  if (!isSupported) {
    return (
      <div className="card-ampara">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-display">Notificações Push</h3>
            <p className="text-xs text-muted-foreground">Apenas no app nativo</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Notificações push funcionam apenas no app instalado no celular (iOS/Android).
        </p>
      </div>
    );
  }

  return (
    <div className="card-ampara">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center ${
            isRegistered ? 'bg-primary/10' : 'bg-accent'
          }`}>
            {isRegistered ? (
              <BellRing className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-base font-bold text-foreground font-display">Notificações Push</h3>
            <p className="text-xs text-muted-foreground">
              {isRegistered ? 'Ativadas' : 'Desativadas'}
            </p>
          </div>
        </div>

        {isRegistered && (
          <span className="px-3 py-1.5 rounded-full bg-success/10 text-success text-xs font-semibold">
            Ativo
          </span>
        )}
      </div>

      {!isRegistered ? (
        <button
          onClick={initialize}
          disabled={isInitializing}
          className="w-full h-12 rounded-2xl gradient-primary text-primary-foreground font-semibold flex items-center justify-center gap-2 hover:shadow-medium transition-all duration-300 disabled:opacity-50"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Ativando...
            </>
          ) : (
            <>
              <Bell className="w-5 h-5" />
              Ativar Notificações
            </>
          )}
        </button>
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Você receberá notificações de:
          </p>
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <span className="w-2 h-2 rounded-full bg-emergency" />
              Alertas de emergência
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <span className="w-2 h-2 rounded-full bg-primary" />
              Status de sincronização
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <span className="w-2 h-2 rounded-full bg-warning" />
              Avisos do sistema
            </li>
          </ul>

          <button
            onClick={handleTestNotification}
            className="w-full h-11 rounded-2xl bg-accent text-foreground font-medium flex items-center justify-center gap-2 hover:bg-accent/80 transition-all duration-300 mt-4"
          >
            <Bell className="w-4 h-4" />
            Testar Notificação
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
