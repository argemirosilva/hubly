import { useState, useRef, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

export const useAudioRecorder = () => {
  const { config, user, isRecording, setIsRecording } = useAppStore();
  const { toast } = useToast();
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
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
        
        // Check if audio has dialogue (simplified - in production use proper VAD)
        if (audioBlob.size > 10000 && user?.token) {
          toast({
            title: 'Enviando áudio...',
            description: 'Áudio com diálogo detectado',
          });
          
          const result = await apiService.sendAudio(audioBlob, user.token);
          if (result.success) {
            toast({
              title: 'Áudio enviado',
              description: 'Gravação enviada com sucesso',
            });
          }
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

      toast({
        title: 'Gravação iniciada',
        description: `Duração: ${config?.recordingDurationMinutes || 5} minutos`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a gravação. Verifique as permissões do microfone.',
        variant: 'destructive',
      });
    }
  }, [config, user, setIsRecording, toast]);

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
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
