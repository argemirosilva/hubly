import { useEffect, useRef, useCallback, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { useAudioRecorder } from './useAudioRecorder';

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
 * Hook para gravação automática baseada nos períodos configurados
 * Verifica gravacao_inicio, gravacao_fim e gravacao_dias do config
 */
export const useScheduledRecording = () => {
  const { config, user } = useAppStore();
  const { isRecording, startRecording, stopRecording } = useAudioRecorder();
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [isInSchedule, setIsInSchedule] = useState(false);
  const [nextScheduleInfo, setNextScheduleInfo] = useState<string>('');

  const checkSchedule = useCallback(() => {
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
      setNextScheduleInfo(`Gravando - termina em ${hours}h${mins}m`);
    } else {
      setNextScheduleInfo(`Aguardando: ${config.gravacaoInicio} - ${config.gravacaoFim}`);
    }

    return inSchedule;
  }, [config]);

  // Gerenciar gravação baseada no schedule
  useEffect(() => {
    if (!user?.email || !config) return;

    const manageRecording = () => {
      const shouldRecord = checkSchedule();

      if (shouldRecord && !isRecording) {
        console.log('[Schedule] Iniciando gravação programada');
        startRecording();
      } else if (!shouldRecord && isRecording) {
        console.log('[Schedule] Parando gravação - fora do horário');
        stopRecording();
      }
    };

    // Verificar imediatamente
    manageRecording();

    // Verificar a cada minuto
    checkIntervalRef.current = setInterval(manageRecording, 60 * 1000);

    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, [user, config, isRecording, startRecording, stopRecording, checkSchedule]);

  return {
    isInSchedule,
    nextScheduleInfo,
    scheduledDays: config?.gravacaoDias || [],
    scheduledStart: config?.gravacaoInicio || '',
    scheduledEnd: config?.gravacaoFim || '',
  };
};
