import { useEffect, useRef } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

/**
 * Hook para enviar notificações locais quando o período de monitoramento inicia ou termina
 */
export const useMonitoringNotifications = (isInSchedule: boolean) => {
  const previousStateRef = useRef<boolean | null>(null);
  const isInitializedRef = useRef(false);

  useEffect(() => {
    const sendNotification = async (title: string, body: string) => {
      try {
        if (Capacitor.isNativePlatform()) {
          // Verificar permissão
          const permission = await LocalNotifications.checkPermissions();
          if (permission.display !== 'granted') {
            const request = await LocalNotifications.requestPermissions();
            if (request.display !== 'granted') {
              console.log('[MonitoringNotifications] Permissão negada');
              return;
            }
          }

          await LocalNotifications.schedule({
            notifications: [
              {
                id: Date.now(),
                title,
                body,
                schedule: { at: new Date(Date.now() + 100) },
                sound: 'default',
                smallIcon: 'ic_stat_shield',
                largeIcon: 'ic_launcher',
              },
            ],
          });
          console.log(`[MonitoringNotifications] Notificação enviada: ${title}`);
        } else {
          // Fallback para Web Notifications
          if ('Notification' in window) {
            if (Notification.permission === 'granted') {
              new Notification(title, { body, icon: '/app-icon-1024.png' });
            } else if (Notification.permission !== 'denied') {
              const permission = await Notification.requestPermission();
              if (permission === 'granted') {
                new Notification(title, { body, icon: '/app-icon-1024.png' });
              }
            }
          }
        }
      } catch (error) {
        console.error('[MonitoringNotifications] Erro ao enviar notificação:', error);
      }
    };

    // Não notificar na primeira renderização (estado inicial)
    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      previousStateRef.current = isInSchedule;
      return;
    }

    // Verificar se houve mudança de estado
    if (previousStateRef.current !== isInSchedule) {
      if (isInSchedule) {
        // Entrou no período de monitoramento
        sendNotification(
          '🛡️ Monitoramento Ativo',
          'O período de monitoramento iniciou. Você está protegida.'
        );
      } else {
        // Saiu do período de monitoramento
        sendNotification(
          '⏸️ Monitoramento Pausado',
          'O período de monitoramento terminou. Retorna no próximo horário agendado.'
        );
      }
      previousStateRef.current = isInSchedule;
    }
  }, [isInSchedule]);
};
