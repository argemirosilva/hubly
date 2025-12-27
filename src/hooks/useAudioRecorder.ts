import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';
import { initVAD, analyzeAudioForSpeech } from '@/utils/vadDetection';

export const useAudioRecorder = () => {
  const { config, user, isRecording, setIsRecording } = useAppStore();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [vadStatus, setVadStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');

  // Initialize VAD on mount
  useEffect(() => {
    const loadVAD = async () => {
      setVadStatus('loading');
      const success = await initVAD();
      setVadStatus(success ? 'ready' : 'fallback');
    };
    loadVAD();
  }, []);

  const analyzeAndSendAudio = useCallback(async (audioBlob: Blob) => {
    if (!user?.token) return;

    setIsAnalyzing(true);
    
    try {
      toast({
        title: 'Analisando áudio...',
        description: 'Detectando presença de diálogo',
      });

      const result = await analyzeAudioForSpeech(audioBlob);
      
      console.log('VAD Analysis:', result);

      if (result.hasSpeech) {
        toast({
          title: 'Diálogo detectado!',
          description: `${result.speechPercentage.toFixed(1)}% do áudio contém fala.`,
        });

        // Check if online
        if (navigator.onLine) {
          const sendResult = await apiService.sendAudio(audioBlob, user.token);
          
          if (sendResult.success) {
            toast({
              title: 'Áudio enviado',
              description: 'Gravação enviada com sucesso',
            });
          } else {
            // Failed to send, save offline
            await syncService.saveForOffline('audio', {
              blob: audioBlob,
              timestamp: Date.now(),
              hasSpeech: result.hasSpeech,
              speechPercentage: result.speechPercentage,
            });
            toast({
              title: 'Salvo localmente',
              description: 'Será enviado quando a conexão for restaurada',
            });
          }
        } else {
          // Offline, save locally
          await syncService.saveForOffline('audio', {
            blob: audioBlob,
            timestamp: Date.now(),
            hasSpeech: result.hasSpeech,
            speechPercentage: result.speechPercentage,
          });
          toast({
            title: 'Salvo offline',
            description: 'Será sincronizado quando houver conexão',
          });
        }
      } else {
        toast({
          title: 'Sem diálogo detectado',
          description: `Apenas ${result.speechPercentage.toFixed(1)}% do áudio contém fala. Descartado.`,
        });
      }
    } catch (error) {
      console.error('Error analyzing audio:', error);
      toast({
        title: 'Erro na análise',
        description: 'Não foi possível analisar o áudio',
        variant: 'destructive',
      });
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, toast]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        stream.getTracks().forEach((track) => track.stop());
        
        // Analyze with VAD before sending
        if (audioBlob.size > 5000) {
          await analyzeAndSendAudio(audioBlob);
        } else {
          toast({
            title: 'Áudio muito curto',
            description: 'Gravação descartada (muito curta)',
          });
        }
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      // Timer for recording duration
      const durationMs = (config?.recordingDurationMinutes || 5) * 60 * 1000;
      let elapsed = 0;
      
      timerRef.current = setInterval(() => {
        elapsed += 1000;
        setRecordingTime(elapsed / 1000);
        
        if (elapsed >= durationMs) {
          stopRecording();
        }
      }, 1000);

      const offlineStatus = navigator.onLine ? '' : ' | Modo Offline';
      toast({
        title: 'Gravação iniciada',
        description: `Duração: ${config?.recordingDurationMinutes || 5} min${offlineStatus}`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a gravação. Verifique as permissões do microfone.',
        variant: 'destructive',
      });
    }
  }, [config, setIsRecording, toast, analyzeAndSendAudio]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsRecording(false);
    setRecordingTime(0);
  }, [setIsRecording]);

  const toggleRecording = useCallback(() => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    recordingTime,
    isAnalyzing,
    vadStatus,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
