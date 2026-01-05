import { useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService, type AudioPayload } from '@/services/api';
import { syncService } from '@/services/syncService';
import { analyzeAudioForSpeech } from '@/utils/vadDetection';

/**
 * Hook para gravação silenciosa em modo coação
 * Grava continuamente em background sem feedback visual
 * para não alertar o agressor
 */
export const useCoercionRecording = () => {
  const { config, user, isCoercionMode } = useAppStore();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const isRecordingRef = useRef(false);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const processAndSendAudio = useCallback(async (audioBlob: Blob) => {
    if (!user?.email || audioBlob.size < 5000) return;

    try {
      const result = await analyzeAudioForSpeech(audioBlob);
      
      if (result.hasSpeech) {
        const durationSeconds = (config?.recordingDurationMinutes || 5) * 60;
        
        // Tentar enviar silenciosamente
        if (navigator.onLine) {
          const payload: AudioPayload = {
            file_url: URL.createObjectURL(audioBlob),
            duracao_segundos: durationSeconds,
            tamanho_mb: audioBlob.size / (1024 * 1024),
            email_usuario: user.email,
          };
          await apiService.sendAudio(payload);
        } else {
          // Salvar offline silenciosamente
          await syncService.saveForOffline('audio', {
            blob: audioBlob,
            timestamp: Date.now(),
            hasSpeech: result.hasSpeech,
            speechPercentage: result.speechPercentage,
            coercionMode: true,
          });
        }
      }
    } catch (error) {
      // Silencioso - não mostrar erros para não alertar
      console.error('Coercion recording error:', error);
    }
  }, [user, config]);

  const startSilentRecording = useCallback(async () => {
    if (isRecordingRef.current) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;
      isRecordingRef.current = true;

      const startNewRecordingCycle = () => {
        if (!isRecordingRef.current || !streamRef.current) return;

        // Use WAV format - fallback to webm if not supported
        const mimeType = MediaRecorder.isTypeSupported('audio/wav') 
          ? 'audio/wav' 
          : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        
        const mediaRecorder = new MediaRecorder(streamRef.current, { mimeType });

        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          await processAndSendAudio(audioBlob);
          
          // Iniciar novo ciclo de gravação
          if (isRecordingRef.current) {
            startNewRecordingCycle();
          }
        };

        mediaRecorder.start(1000);

        // Parar após duração configurada
        const durationMs = (config?.recordingDurationMinutes || 5) * 60 * 1000;
        
        recordingIntervalRef.current = setTimeout(() => {
          if (mediaRecorderRef.current?.state !== 'inactive') {
            mediaRecorderRef.current?.stop();
          }
        }, durationMs);
      };

      startNewRecordingCycle();
    } catch (error) {
      console.error('Failed to start silent recording:', error);
    }
  }, [config, processAndSendAudio]);

  const stopSilentRecording = useCallback(() => {
    isRecordingRef.current = false;

    if (recordingIntervalRef.current) {
      clearTimeout(recordingIntervalRef.current);
      recordingIntervalRef.current = null;
    }

    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Auto-iniciar quando modo coação ativo
  useEffect(() => {
    if (isCoercionMode) {
      startSilentRecording();
    }

    return () => {
      if (isCoercionMode) {
        stopSilentRecording();
      }
    };
  }, [isCoercionMode, startSilentRecording, stopSilentRecording]);

  return {
    startSilentRecording,
    stopSilentRecording,
    isActive: isRecordingRef.current,
  };
};
