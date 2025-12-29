import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';

const PING_INTERVAL_NORMAL = 5 * 60 * 1000; // 5 minutos
const PING_INTERVAL_LOW_BATTERY = 15 * 60 * 1000; // 15 minutos
const RETRY_INTERVAL = 30 * 1000; // 30 segundos

interface PingPayload {
  email_usuario: string;
  dispositivo_info: string;
  bateria_percentual?: number;
  versao_app: string;
}

export const usePingService = () => {
  const { user, config } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  const getDeviceInfo = useCallback((): string => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';
    
    // Tentar detectar dispositivo
    if (/android/i.test(ua)) {
      const match = ua.match(/Android\s+([\d.]+)/);
      const version = match ? match[1] : 'Unknown';
      return `Android ${version} - ${platform}`;
    }
    
    if (/iPad|iPhone|iPod/.test(ua)) {
      const match = ua.match(/OS\s+([\d_]+)/);
      const version = match ? match[1].replace(/_/g, '.') : 'Unknown';
      return `iOS ${version} - ${platform}`;
    }
    
    return `Web Browser - ${platform}`;
  }, []);

  const getAppVersion = useCallback((): string => {
    return '1.0.0'; // TODO: Obter versão real do app
  }, []);

  const sendPing = useCallback(async (): Promise<boolean> => {
    if (!user?.email || !config?.apiBaseUrl) return false;

    try {
      // Verificar conectividade
      if (!navigator.onLine) {
        console.log('[Ping] Sem internet, adiando ping');
        return false;
      }

      const batteryLevel = await apiService.getBatteryLevel();
      
      const payload: PingPayload = {
        email_usuario: user.email,
        dispositivo_info: getDeviceInfo(),
        bateria_percentual: batteryLevel,
        versao_app: getAppVersion(),
      };

      const response = await fetch(`${config.apiBaseUrl}/api/functions/pingMobile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        console.log('[Ping] ✅ Enviado com sucesso');
        return true;
      } else {
        console.error('[Ping] ❌ Erro:', data.error);
        return false;
      }
    } catch (error) {
      console.error('[Ping] ❌ Erro ao enviar:', error);
      return false;
    }
  }, [user, config, getDeviceInfo, getAppVersion]);

  const scheduleNextPing = useCallback(async () => {
    // Limpar intervalos anteriores
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Determinar intervalo baseado na bateria
    const batteryLevel = await apiService.getBatteryLevel();
    const interval = (batteryLevel && batteryLevel < 15) 
      ? PING_INTERVAL_LOW_BATTERY 
      : PING_INTERVAL_NORMAL;

    console.log(`[Ping] Próximo ping em ${interval / 60000} minutos`);

    intervalRef.current = setInterval(async () => {
      const success = await sendPing();
      
      if (!success && !retryTimeoutRef.current) {
        // Tentar novamente em 30 segundos
        retryTimeoutRef.current = setTimeout(async () => {
          await sendPing();
          retryTimeoutRef.current = null;
        }, RETRY_INTERVAL);
      }
    }, interval);
  }, [sendPing]);

  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    console.log('[Ping] Serviço iniciado');

    // Enviar ping imediato
    await sendPing();

    // Agendar pings regulares
    await scheduleNextPing();

    // Listener para quando voltar online
    const handleOnline = () => {
      console.log('[Ping] Conexão restaurada, enviando ping');
      sendPing();
    };

    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [sendPing, scheduleNextPing]);

  const stop = useCallback(() => {
    isRunningRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    
    console.log('[Ping] Serviço parado');
  }, []);

  // Iniciar automaticamente quando usuário estiver logado
  useEffect(() => {
    if (user?.email && config?.apiBaseUrl) {
      start();
    }

    return () => {
      stop();
    };
  }, [user, config, start, stop]);

  return {
    sendPing,
    start,
    stop,
  };
};
