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
    if (!user?.email || !config?.apiBaseUrl) {
      console.log('[ConfigRefresh] Sem usuário ou URL configurada');
      return false;
    }

    try {
      console.log('[ConfigRefresh] Buscando configurações atualizadas...');
      
      // Usar o endpoint de login para obter config atualizada
      // Passamos um token vazio pois já estamos logados
      const response = await fetch(`${config.apiBaseUrl}/api/functions/loginCustomizado`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: user.email,
          refresh: true // Flag para indicar que é um refresh
        }),
      });
      
      const data = await response.json();
      
      if (data.success && data.usuario) {
        const updatedConfig = {
          ...config,
          gravacaoInicio: data.usuario.gravacao_inicio,
          gravacaoFim: data.usuario.gravacao_fim,
          gravacaoDias: data.usuario.gravacao_dias,
          contatosRedeApoio: data.usuario.contatos_rede_apoio,
        };
        
        // Verificar se houve mudanças
        const hasChanges = 
          config.gravacaoInicio !== updatedConfig.gravacaoInicio ||
          config.gravacaoFim !== updatedConfig.gravacaoFim ||
          JSON.stringify(config.gravacaoDias) !== JSON.stringify(updatedConfig.gravacaoDias);
        
        if (hasChanges) {
          console.log('[ConfigRefresh] Configurações atualizadas:', {
            inicio: updatedConfig.gravacaoInicio,
            fim: updatedConfig.gravacaoFim,
            dias: updatedConfig.gravacaoDias
          });
          setConfig(updatedConfig);
        } else {
          console.log('[ConfigRefresh] Sem alterações nas configurações');
        }
        
        lastRefreshRef.current = Date.now();
        return true;
      }
      
      console.log('[ConfigRefresh] Resposta inválida do servidor');
      return false;
    } catch (error) {
      console.error('[ConfigRefresh] Erro ao buscar configurações:', error);
      return false;
    }
  }, [user, config, setConfig]);

  // Iniciar refresh periódico
  useEffect(() => {
    if (!user?.email || !config?.apiBaseUrl) return;

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
  }, [user, config?.apiBaseUrl, refreshConfig]);

  return {
    refreshConfig,
    lastRefresh: lastRefreshRef.current,
  };
};
