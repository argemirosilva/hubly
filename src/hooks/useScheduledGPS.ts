import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useGeolocation } from './useGeolocation';

const DAY_MAP: Record<string, number> = {
  'dom': 0,
  'seg': 1,
  'ter': 2,
  'qua': 3,
  'qui': 4,
  'sex': 5,
  'sab': 6,
};

/**
 * Hook para controle automático do GPS baseado nos períodos de monitoramento configurados
 * Inicia/para o GPS automaticamente baseado em gravacao_inicio, gravacao_fim e gravacao_dias
 */
export const useScheduledGPS = () => {
  const { config, user } = useAppStore();
  const { isTracking, startTracking, stopTracking, currentLocation } = useGeolocation();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInMonitoringPeriod, setIsInMonitoringPeriod] = useState(false);
  const wasInPeriodRef = useRef(false);

  // Verificar se está dentro do período de monitoramento
  const checkMonitoringPeriod = useCallback((): boolean => {
    if (!config?.gravacaoInicio || !config?.gravacaoFim || !config?.gravacaoDias) {
      return false;
    }

    const now = new Date();
    const currentDay = now.getDay();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const currentTimeMinutes = currentHour * 60 + currentMinute;

    // Parse horários (formato "HH:MM")
    const [startHour, startMinute] = config.gravacaoInicio.split(':').map(Number);
    const [endHour, endMinute] = config.gravacaoFim.split(':').map(Number);
    const startTimeMinutes = startHour * 60 + (startMinute || 0);
    const endTimeMinutes = endHour * 60 + (endMinute || 0);

    // Verificar se o dia atual está configurado
    const configuredDays = config.gravacaoDias.map(d => DAY_MAP[d.toLowerCase()]);
    const isDayConfigured = configuredDays.includes(currentDay);

    // Verificar se está no horário
    const isTimeInRange = currentTimeMinutes >= startTimeMinutes && currentTimeMinutes < endTimeMinutes;

    return isDayConfigured && isTimeInRange;
  }, [config]);

  // Verificar e controlar GPS automaticamente
  useEffect(() => {
    if (!user?.email || !config) return;

    const updateGPSStatus = () => {
      const inPeriod = checkMonitoringPeriod();
      setIsInMonitoringPeriod(inPeriod);

      // Se entrou no período de monitoramento e GPS não está ativo, iniciar
      if (inPeriod && !wasInPeriodRef.current && !isTracking) {
        console.log('[ScheduledGPS] Entrando no período de monitoramento, iniciando GPS');
        startTracking();
      }
      
      // Se saiu do período de monitoramento e GPS está ativo, parar
      if (!inPeriod && wasInPeriodRef.current && isTracking) {
        console.log('[ScheduledGPS] Saindo do período de monitoramento, parando GPS');
        stopTracking();
      }

      wasInPeriodRef.current = inPeriod;
    };

    // Verificar imediatamente
    updateGPSStatus();

    // Verificar a cada 30 segundos
    checkIntervalRef.current = setInterval(updateGPSStatus, 30 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, config, checkMonitoringPeriod, isTracking, startTracking, stopTracking]);

  return {
    isInMonitoringPeriod,
    isTracking,
    currentLocation,
    // Permitir controle manual apenas se estiver no período
    toggleTracking: () => {
      if (isInMonitoringPeriod) {
        if (isTracking) {
          stopTracking();
        } else {
          startTracking();
        }
      }
    },
  };
};
