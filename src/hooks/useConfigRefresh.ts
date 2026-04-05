import { useEffect, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';

const CONFIG_REFRESH_INTERVAL = 15 * 60 * 1000; // 15 minutos

/**
 * Hook para atualizar configurações do servidor periodicamente
 */
export const useConfigRefresh = () => {
  const { user, config, setConfig } = useAppStore();
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<number>(0);

  const refreshConfig = useCallback(async () => {
    if (!user?.email) {
      console.log('[ConfigRefresh] Sem usuário logado');
      return false;
    }

    try {
      console.log('[ConfigRefresh] Buscando configurações atualizadas...');
      
      const response = await apiService.refreshConfig(user.email, user.sessionToken);
      
      if (response.success && response.data) {
        // Mapear campos da API para o formato do config local
        const apiData = response.data as {
          gravacao_inicio?: string;
          gravacao_fim?: string;
          gravacao_dias?: string[];
          contatos_rede_apoio?: any[];
        };
        
        const updatedConfig = {
          ...config,
          gravacaoInicio: apiData.gravacao_inicio || config?.gravacaoInicio,
          gravacaoFim: apiData.gravacao_fim || config?.gravacaoFim,
          gravacaoDias: apiData.gravacao_dias || config?.gravacaoDias,
          contatosRedeApoio: apiData.contatos_rede_apoio || config?.contatosRedeApoio,
        };
        
        // Verificar se houve mudanças
        const hasChanges = 
          config?.gravacaoInicio !== updatedConfig.gravacaoInicio ||
          config?.gravacaoFim !== updatedConfig.gravacaoFim ||
          JSON.stringify(config?.gravacaoDias) !== JSON.stringify(updatedConfig.gravacaoDias);
        
        if (hasChanges) {
          console.log('[ConfigRefresh] Configurações atualizadas:', {
            inicio: updatedConfig.gravacaoInicio,
            fim: updatedConfig.gravacaoFim,
            dias: updatedConfig.gravacaoDias
          });
          setConfig(updatedConfig as any);
        } else {
          console.log('[ConfigRefresh] Sem alterações nas configurações');
        }
        
        lastRefreshRef.current = Date.now();
        return true;
      }
      
      console.log('[ConfigRefresh] Resposta inválida:', response.error);
      return false;
    } catch (error) {
      console.error('[ConfigRefresh] Erro ao buscar configurações:', error);
      return false;
    }
  }, [user, config, setConfig]);

  // TEMPORARIAMENTE DESABILITADO para debug
  // Iniciar refresh periódico
  useEffect(() => {
    console.log('[ConfigRefresh] Serviço DESABILITADO para debug');
    return;
    /*
    if (!user?.email) return;

    // Refresh inicial após 1 minuto (para não sobrecarregar no login)
    const initialTimeout = setTimeout(() => {
      refreshConfig();
    }, 60 * 1000);

    // Refresh periódico a cada 15 minutos
    intervalRef.current = setInterval(() => {
      refreshConfig();
    }, CONFIG_REFRESH_INTERVAL);

    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    */
  }, [user?.email, refreshConfig]);

  return {
    refreshConfig,
    lastRefresh: lastRefreshRef.current,
  };
};
