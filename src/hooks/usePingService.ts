import { useEffect, useRef, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import { backgroundService, registerHeadlessTask } from '@/services/backgroundService';
import { Capacitor } from '@capacitor/core';
import { useToast } from '@/hooks/use-toast';

const PING_INTERVAL = 120 * 1000; // 120 segundos (2 minutos)
const RETRY_INTERVAL = 30 * 1000; // 30 segundos

interface PingPayload {
  email_usuario: string;
  dispositivo_info: string;
  bateria_percentual?: number;
  versao_app: string;
}

export const usePingService = () => {
  const { user, config, logout } = useAppStore();
  const navigate = useNavigate();
  const { toast } = useToast();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);
  const swRegistrationRef = useRef<ServiceWorkerRegistration | null>(null);
  const [isServiceWorkerActive, setIsServiceWorkerActive] = useState(false);
  const [isNativeBackgroundActive, setIsNativeBackgroundActive] = useState(false);

  const getDeviceInfo = useCallback((): string => {
    const ua = navigator.userAgent;
    const platform = navigator.platform || 'Unknown';
    
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
    return '1.0.0';
  }, []);

  // Função para lidar com sessão expirada
  const handleSessionExpired = useCallback(() => {
    console.warn('[Ping] Sessão expirada detectada, fazendo logout');
    logout();
    toast({
      title: 'Sessão expirada',
      description: 'Faça login novamente para continuar',
      variant: 'destructive',
    });
    navigate('/');
  }, [logout, toast, navigate]);

  // Enviar ping - função principal
  const sendPing = useCallback(async (): Promise<boolean> => {
    if (!user?.email) return false;

    try {
      if (!navigator.onLine) {
        console.log('[Ping] Sem internet, adiando ping');
        return false;
      }

      const batteryLevel = await apiService.getBatteryLevel();
      
      const payload = {
        email_usuario: user.email,
        dispositivo_info: getDeviceInfo(),
        bateria_percentual: batteryLevel || 100,
        versao_app: getAppVersion(),
        token_sessao: user.sessionToken,
      };

      const result = await apiService.sendPing(payload);

      if (result.success) {
        console.log('[Ping] ✅ Enviado com sucesso');
        return true;
      } else {
        // Verificar se é erro de sessão expirada
        if (result.error?.includes('Sessão inválida') || result.error?.includes('Sessão expirada')) {
          handleSessionExpired();
          return false;
        }
        console.error('[Ping] ❌ Erro:', result.error);
        return false;
      }
    } catch (error) {
      console.error('[Ping] ❌ Erro ao enviar:', error);
      return false;
    }
  }, [user, getDeviceInfo, getAppVersion]);

  // Registrar Service Worker para background sync (Web/PWA)
  const registerServiceWorker = useCallback(async () => {
    if (!('serviceWorker' in navigator)) {
      console.log('[Ping] Service Worker não suportado');
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.register('/sw-ping.js', {
        scope: '/',
      });
      
      swRegistrationRef.current = registration;
      console.log('[Ping] Service Worker registrado');

      await navigator.serviceWorker.ready;
      setIsServiceWorkerActive(true);

      // Registrar periodic sync se disponível
      if ('periodicSync' in registration) {
        try {
          // @ts-ignore - API experimental
          await registration.periodicSync.register('ping-sync', {
            minInterval: 5 * 60 * 1000,
          });
          console.log('[Ping] Periodic Sync registrado');
        } catch (error) {
          console.log('[Ping] Periodic Sync não permitido:', error);
        }
      }

      return true;
    } catch (error) {
      console.error('[Ping] Erro ao registrar Service Worker:', error);
      return false;
    }
  }, []);

  // Enviar configuração para o Service Worker
  const initServiceWorkerPing = useCallback(async () => {
    if (!navigator.serviceWorker.controller) return;
    
    const batteryLevel = await apiService.getBatteryLevel();
    
    navigator.serviceWorker.controller.postMessage({
      type: 'INIT_PING',
      data: {
        email: user?.email,
        apiBaseUrl: config?.apiBaseUrl,
        batteryLevel,
      },
    });
    
    console.log('[Ping] Configuração enviada ao Service Worker');
  }, [user, config]);

  // Iniciar serviço nativo de background (Capacitor)
  const startNativeBackgroundService = useCallback(async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('[Ping] Não é plataforma nativa');
      return false;
    }

    try {
      // Registrar handler headless
      await registerHeadlessTask();

      // Wrapper para converter retorno para void
      const pingWrapper = async (): Promise<void> => {
        await sendPing();
      };

      // Iniciar serviço de background nativo
      const started = await backgroundService.start(pingWrapper);
      
      if (started) {
        setIsNativeBackgroundActive(true);
        console.log('[Ping] ✅ Serviço nativo de background iniciado');
      }
      
      return started;
    } catch (error) {
      console.error('[Ping] Erro ao iniciar background nativo:', error);
      return false;
    }
  }, [sendPing]);

  // Agendar próximo ping (foreground fallback)
  const scheduleNextPing = useCallback(async () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = PING_INTERVAL;

    console.log(`[Ping] Próximo ping em ${interval / 60000} minutos`);

    intervalRef.current = setInterval(async () => {
      const success = await sendPing();
      
      if (!success && !retryTimeoutRef.current) {
        retryTimeoutRef.current = setTimeout(async () => {
          await sendPing();
          retryTimeoutRef.current = null;
        }, RETRY_INTERVAL);
      }
    }, interval);
  }, [sendPing]);

  // Iniciar serviço completo
  const start = useCallback(async () => {
    if (isRunningRef.current) return;
    
    isRunningRef.current = true;
    console.log('[Ping] Serviço iniciado');

    // 1. Tentar serviço nativo primeiro (melhor para background)
    const nativeStarted = await startNativeBackgroundService();

    // 2. Se não for nativo, usar Service Worker (PWA)
    if (!nativeStarted) {
      const swRegistered = await registerServiceWorker();
      
      if (swRegistered) {
        setTimeout(() => {
          initServiceWorkerPing();
        }, 1000);
      }
    }

    // 3. Enviar ping imediato
    await sendPing();

    // 4. Agendar pings no foreground (backup)
    await scheduleNextPing();

    // Listeners
    const handleOnline = () => {
      console.log('[Ping] Conexão restaurada, enviando ping');
      sendPing();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        console.log('[Ping] App voltou ao foco');
        sendPing();
      }
    };

    const handleSWMessage = (event: MessageEvent) => {
      const { type } = event.data;
      if (type === 'PING_SUCCESS') {
        console.log('[Ping] SW reportou ping bem-sucedido');
      } else if (type === 'PING_ERROR') {
        console.log('[Ping] SW reportou erro no ping');
      }
    };

    window.addEventListener('online', handleOnline);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);

    return () => {
      window.removeEventListener('online', handleOnline);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [sendPing, scheduleNextPing, registerServiceWorker, initServiceWorkerPing, startNativeBackgroundService]);

  // Parar serviço
  const stop = useCallback(async () => {
    isRunningRef.current = false;
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }

    // Parar Service Worker
    if (navigator.serviceWorker?.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'STOP_PING' });
    }

    // Parar serviço nativo
    await backgroundService.stop();
    setIsNativeBackgroundActive(false);
    
    console.log('[Ping] Serviço parado');
  }, []);

  // Iniciar automaticamente quando usuário estiver logado, parar quando deslogar
  useEffect(() => {
    if (user?.email) {
      start();
    } else {
      // Usuário deslogou - parar serviço imediatamente
      stop();
    }

    return () => {
      stop();
    };
  }, [user, start, stop]);

  return {
    sendPing,
    start,
    stop,
    isServiceWorkerActive,
    isNativeBackgroundActive,
    isNative: Capacitor.isNativePlatform(),
  };
};
