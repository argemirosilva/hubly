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
      <div className="card-ampara !p-4">
        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center">
            <Smartphone className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-display">Notificações Push</h3>
            <p className="text-[10px] text-muted-foreground">Apenas no app nativo</p>
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Notificações push funcionam apenas no app instalado (iOS/Android).
        </p>
      </div>
    );
  }

  return (
    <div className="card-ampara !p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
            isRegistered ? 'bg-primary/10' : 'bg-accent'
          }`}>
            {isRegistered ? (
              <BellRing className="w-4 h-4 text-primary" />
            ) : (
              <BellOff className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground font-display">Notificações Push</h3>
            <p className="text-[10px] text-muted-foreground">
              {isRegistered ? 'Ativadas' : 'Desativadas'}
            </p>
          </div>
        </div>

        {isRegistered && (
          <span className="px-2 py-1 rounded-full bg-success/10 text-success text-[10px] font-semibold">
            Ativo
          </span>
        )}
      </div>

      {!isRegistered ? (
        <button
          onClick={initialize}
          disabled={isInitializing}
          className="w-full h-9 rounded-xl gradient-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-1.5 hover:shadow-medium transition-all duration-300 disabled:opacity-50"
        >
          {isInitializing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Ativando...
            </>
          ) : (
            <>
              <Bell className="w-4 h-4" />
              Ativar Notificações
            </>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Você receberá notificações de:
          </p>
          <ul className="space-y-1.5 text-xs">
            <li className="flex items-center gap-1.5 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-emergency" />
              Alertas de emergência
            </li>
            <li className="flex items-center gap-1.5 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-primary" />
              Status de sincronização
            </li>
            <li className="flex items-center gap-1.5 text-foreground">
              <span className="w-1.5 h-1.5 rounded-full bg-warning" />
              Avisos do sistema
            </li>
          </ul>

          <button
            onClick={handleTestNotification}
            className="w-full h-8 rounded-lg bg-accent text-foreground text-xs font-medium flex items-center justify-center gap-1.5 hover:bg-accent/80 transition-all duration-300 mt-2"
          >
            <Bell className="w-3 h-3" />
            Testar Notificação
          </button>
        </div>
      )}
    </div>
  );
};

export default NotificationSettings;
