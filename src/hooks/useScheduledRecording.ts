import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';

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
 * Hook para controle automático da escuta de comandos de voz baseado nos períodos configurados
 * Gerencia quando a escuta de comandos deve estar ativa baseado em gravacao_inicio, gravacao_fim e gravacao_dias
 * Suporta override manual pelo usuário
 */
export const useScheduledRecording = () => {
  const { config, user, voiceCommandManualOverride } = useAppStore();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInSchedule, setIsInSchedule] = useState(false);
  const [nextScheduleInfo, setNextScheduleInfo] = useState<string>('');

  // Verificar se está dentro do horário configurado
  const checkSchedule = useCallback((): boolean => {
    if (!config?.gravacaoInicio || !config?.gravacaoFim || !config?.gravacaoDias) {
      setIsInSchedule(false);
      setNextScheduleInfo('Horários não configurados');
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

    const inSchedule = isDayConfigured && isTimeInRange;
    setIsInSchedule(inSchedule);

    // Info sobre próximo agendamento
    if (inSchedule) {
      const remainingMinutes = endTimeMinutes - currentTimeMinutes;
      const hours = Math.floor(remainingMinutes / 60);
      const mins = remainingMinutes % 60;
      setNextScheduleInfo(`Termina em ${hours}h${mins}m`);
    } else {
      setNextScheduleInfo(`Agendado: ${config.gravacaoInicio} - ${config.gravacaoFim}`);
    }

    return inSchedule;
  }, [config]);

  // Verificar schedule periodicamente
  useEffect(() => {
    if (!user?.email || !config) return;

    // Verificar imediatamente
    checkSchedule();

    // Verificar a cada 30 segundos para melhor responsividade
    checkIntervalRef.current = setInterval(checkSchedule, 30 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, config, checkSchedule]);

  // Calcular se a escuta está habilitada (override manual tem prioridade)
  const voiceCommandEnabled = voiceCommandManualOverride !== null 
    ? voiceCommandManualOverride 
    : isInSchedule;

  return {
    isInSchedule,
    nextScheduleInfo,
    scheduledDays: config?.gravacaoDias || [],
    scheduledStart: config?.gravacaoInicio || '',
    scheduledEnd: config?.gravacaoFim || '',
    voiceCommandEnabled,
    isManualOverride: voiceCommandManualOverride !== null,
  };
};
