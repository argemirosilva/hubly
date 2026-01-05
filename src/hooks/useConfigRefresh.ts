import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';

const CONFIG_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutos

/**
 * Hook para atualizar configurações do servidor periodicamente
 * NOTA: As configurações são obtidas durante o login.
 * Este hook apenas mantém o estado sincronizado localmente.
 * Se precisar atualizar configs do servidor, o usuário deve fazer novo login.
 */
export const useConfigRefresh = () => {
  const { user, config } = useAppStore();
  const lastRefreshRef = useRef<number>(Date.now());

  const refreshConfig = useCallback(async () => {
    if (!user?.email) {
      console.log('[ConfigRefresh] Sem usuário logado');
      return false;
    }

    // As configurações são obtidas no login e mantidas no estado local
    // Não há endpoint separado para refresh - configs são atualizadas no próximo login
    console.log('[ConfigRefresh] Configurações atuais:', {
      inicio: config?.gravacaoInicio,
      fim: config?.gravacaoFim,
      dias: config?.gravacaoDias
    });
    
    lastRefreshRef.current = Date.now();
    return true;
  }, [user, config]);

  // Log periódico para debug (não faz chamada de rede)
  useEffect(() => {
    if (!user?.email) return;

    const interval = setInterval(() => {
      console.log('[ConfigRefresh] Config check - usando dados do login');
    }, CONFIG_REFRESH_INTERVAL);

    return () => clearInterval(interval);
  }, [user?.email]);

  return {
    refreshConfig,
    lastRefresh: lastRefreshRef.current,
  };
};
