import { Capacitor } from '@capacitor/core';

// Estado do serviço
let isBackgroundServiceRunning = false;
let pingCallback: (() => Promise<void>) | null = null;

// Referências aos plugins (carregados dinamicamente)
let BackgroundTask: any = null;
let BackgroundFetch: any = null;

const loadNativePlugins = async () => {
  if (!Capacitor.isNativePlatform()) {
    console.log('[BackgroundService] Não é plataforma nativa, usando Service Worker');
    return false;
  }

  try {
    const bgTaskModule = await import('@capawesome/capacitor-background-task');
    BackgroundTask = bgTaskModule.BackgroundTask;
    console.log('[BackgroundService] BackgroundTask carregado');
  } catch (error) {
    console.log('[BackgroundService] BackgroundTask não disponível:', error);
  }

  try {
    const bgFetchModule = await import('@transistorsoft/capacitor-background-fetch');
    BackgroundFetch = bgFetchModule.BackgroundFetch;
    console.log('[BackgroundService] BackgroundFetch carregado');
  } catch (error) {
    console.log('[BackgroundService] BackgroundFetch não disponível:', error);
  }

  return BackgroundTask !== null || BackgroundFetch !== null;
};

// Configurar Background Fetch para pings periódicos
const configureBackgroundFetch = async (onPing: () => Promise<void>) => {
  if (!BackgroundFetch) {
    console.log('[BackgroundService] BackgroundFetch não disponível');
    return false;
  }

  try {
    // Handler para quando a tarefa é executada
    const onEvent = async (taskId: string) => {
      console.log('[BackgroundService] Background fetch event:', taskId);
      
      try {
        await onPing();
      } catch (error) {
        console.error('[BackgroundService] Erro no ping:', error);
      }
      
      // Sinalizar que terminou
      BackgroundFetch.finish(taskId);
    };

    // Handler para timeout
    const onTimeout = async (taskId: string) => {
      console.log('[BackgroundService] Background fetch timeout:', taskId);
      BackgroundFetch.finish(taskId);
    };

    const status = await BackgroundFetch.configure(
      {
        minimumFetchInterval: 15, // Mínimo 15 minutos no iOS
        stopOnTerminate: false,
        startOnBoot: true,
        enableHeadless: true,
        requiresNetworkConnectivity: true,
        forceAlarmManager: true,
      },
      onEvent,
      onTimeout
    );

    console.log('[BackgroundService] BackgroundFetch configurado, status:', status);

    // Agendar tarefa periódica customizada
    await BackgroundFetch.scheduleTask({
      taskId: 'ampara-ping',
      delay: 15 * 60 * 1000, // 15 minutos
      periodic: true,
      forceAlarmManager: true,
      stopOnTerminate: false,
      enableHeadless: true,
    });

    console.log('[BackgroundService] Tarefa periódica agendada');
    return true;
  } catch (error) {
    console.error('[BackgroundService] Erro ao configurar BackgroundFetch:', error);
    return false;
  }
};

// Configurar Background Task para quando app vai para background
const configureBackgroundTask = async (onPing: () => Promise<void>) => {
  if (!BackgroundTask) {
    console.log('[BackgroundService] BackgroundTask não disponível');
    return false;
  }

  try {
    // beforeExit retorna o taskId
    const taskId = await BackgroundTask.beforeExit(async () => {
      console.log('[BackgroundService] App entrando em background, executando ping');
      
      try {
        await onPing();
      } catch (error) {
        console.error('[BackgroundService] Erro no ping de background:', error);
      }
    });

    // Finalizar a tarefa após execução
    if (taskId) {
      await BackgroundTask.finish({ taskId });
    }

    console.log('[BackgroundService] BackgroundTask configurado');
    return true;
  } catch (error) {
    console.error('[BackgroundService] Erro ao configurar BackgroundTask:', error);
    return false;
  }
};

// API Pública do Serviço de Background
export const backgroundService = {
  isNative: () => Capacitor.isNativePlatform(),

  start: async (onPing: () => Promise<void>) => {
    if (isBackgroundServiceRunning) {
      console.log('[BackgroundService] Já está rodando');
      return true;
    }

    pingCallback = onPing;

    const hasNativePlugins = await loadNativePlugins();

    if (!hasNativePlugins) {
      console.log('[BackgroundService] Sem plugins nativos, usando fallback web');
      return false;
    }

    const bgFetchOk = await configureBackgroundFetch(onPing);
    const bgTaskOk = await configureBackgroundTask(onPing);

    isBackgroundServiceRunning = bgFetchOk || bgTaskOk;

    if (isBackgroundServiceRunning) {
      console.log('[BackgroundService] ✅ Serviço iniciado com sucesso');
    }

    return isBackgroundServiceRunning;
  },

  stop: async () => {
    if (!isBackgroundServiceRunning) {
      return;
    }

    try {
      if (BackgroundFetch) {
        await BackgroundFetch.stop();
        console.log('[BackgroundService] BackgroundFetch parado');
      }
    } catch (error) {
      console.error('[BackgroundService] Erro ao parar BackgroundFetch:', error);
    }

    isBackgroundServiceRunning = false;
    pingCallback = null;
    console.log('[BackgroundService] Serviço parado');
  },

  isRunning: () => isBackgroundServiceRunning,

  executePing: async () => {
    if (pingCallback) {
      await pingCallback();
    }
  },

  finishTask: async (taskId: string) => {
    if (BackgroundFetch) {
      await BackgroundFetch.finish(taskId);
    }
  },
};

export const registerHeadlessTask = async () => {
  if (!Capacitor.isNativePlatform()) return;
  console.log('[BackgroundService] Handler headless registrado');
};
