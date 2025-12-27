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
      <div className="bg-card rounded-2xl p-5 border border-border">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Notificações Push</h3>
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
    <div className="bg-card rounded-2xl p-5 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            isRegistered ? 'bg-primary/10' : 'bg-secondary'
          }`}>
            {isRegistered ? (
              <BellRing className="w-5 h-5 text-primary" />
            ) : (
              <BellOff className="w-5 h-5 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-base font-semibold text-foreground">Notificações Push</h3>
            <p className="text-xs text-muted-foreground">
              {isRegistered ? 'Ativadas' : 'Desativadas'}
            </p>
          </div>
        </div>

        {isRegistered && (
          <span className="px-2 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
            Ativo
          </span>
        )}
      </div>

      {!isRegistered ? (
        <button
          onClick={initialize}
          disabled={isInitializing}
          className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors disabled:opacity-50"
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
          <ul className="space-y-2 text-sm">
            <li className="flex items-center gap-2 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emergency" />
              Alertas de emergência
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Status de sincronização
            </li>
            <li className="flex items-center gap-2 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              Avisos do sistema
            </li>
          </ul>

          <button
            onClick={handleTestNotification}
            className="w-full h-10 rounded-xl bg-secondary text-foreground font-medium flex items-center justify-center gap-2 hover:bg-secondary/80 transition-colors mt-4"
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
