import { useState, useRef, useCallback, useEffect } from 'react';
import { useAppStore } from '@/store/appStore';
import { apiService, type AudioPayload } from '@/services/api';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';
import { initVAD, analyzeAudioForSpeech } from '@/utils/vadDetection';

/**
 * Hook para gravação contínua com quebra de arquivos por tempo
 * 
 * Comportamento:
 * 1. Após comando de início, grava continuamente
 * 2. A cada X minutos (recordingDurationMinutes), envia o arquivo e inicia nova gravação
 * 3. Para quando: comando stop OU fim do período de monitoramento
 */
export const useContinuousRecording = () => {
  const { config, user, isRecording, setIsRecording } = useAppStore();
  const { toast } = useToast();
  
  // Refs para controle de gravação
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const segmentStartTimeRef = useRef<number>(0);
  const totalSegmentsRef = useRef<number>(0);
  
  // Estados
  const [recordingTime, setRecordingTime] = useState(0);
  const [currentSegmentTime, setCurrentSegmentTime] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [vadStatus, setVadStatus] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const [segmentCount, setSegmentCount] = useState(0);

  // Initialize VAD on mount
  useEffect(() => {
    const loadVAD = async () => {
      setVadStatus('loading');
      const success = await initVAD();
      setVadStatus(success ? 'ready' : 'fallback');
    };
    loadVAD();
  }, []);

  // Enviar segmento de áudio
  const sendAudioSegment = useCallback(async (audioBlob: Blob, durationSeconds: number, segmentNumber: number) => {
    if (!user?.email) return;

    console.log(`[ContinuousRecording] Processando segmento #${segmentNumber}, duração: ${durationSeconds}s, tamanho: ${(audioBlob.size / 1024).toFixed(1)}KB`);

    // Analisar com VAD
    setIsAnalyzing(true);
    
    try {
      const result = await analyzeAudioForSpeech(audioBlob);
      console.log(`[ContinuousRecording] VAD resultado segmento #${segmentNumber}:`, result);

      if (result.hasSpeech) {
        // Converter para base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve) => {
          reader.onloadend = () => {
            const base64 = reader.result as string;
            resolve(base64.split(',')[1]); // Remover prefixo data:...
          };
          reader.readAsDataURL(audioBlob);
        });

        const base64Data = await base64Promise;
        
        const payload: AudioPayload = {
          file_base64: base64Data,
          file_name: `segment_${segmentNumber}_${Date.now()}.wav`,
          duracao_segundos: durationSeconds,
          tamanho_mb: audioBlob.size / (1024 * 1024),
          email_usuario: user.email,
        };

        if (navigator.onLine) {
          const sendResult = await apiService.sendAudio(payload);
          
          if (sendResult?.success) {
            console.log(`[ContinuousRecording] Segmento #${segmentNumber} enviado com sucesso`);
            toast({
              title: `Segmento #${segmentNumber} enviado`,
              description: `${result.speechPercentage.toFixed(0)}% de fala detectada`,
            });
          } else {
            // Falha no envio, salvar offline
            await syncService.saveForOffline('audio', {
              blob: audioBlob,
              timestamp: Date.now(),
              hasSpeech: result.hasSpeech,
              speechPercentage: result.speechPercentage,
              durationSeconds,
              segmentNumber,
            });
            console.log(`[ContinuousRecording] Segmento #${segmentNumber} salvo offline (falha envio)`);
          }
        } else {
          // Offline, salvar localmente
          await syncService.saveForOffline('audio', {
            blob: audioBlob,
            timestamp: Date.now(),
            hasSpeech: result.hasSpeech,
            speechPercentage: result.speechPercentage,
            durationSeconds,
            segmentNumber,
          });
          console.log(`[ContinuousRecording] Segmento #${segmentNumber} salvo offline`);
        }
      } else {
        console.log(`[ContinuousRecording] Segmento #${segmentNumber} descartado (sem fala: ${result.speechPercentage.toFixed(1)}%)`);
      }
    } catch (error) {
      console.error(`[ContinuousRecording] Erro processando segmento #${segmentNumber}:`, error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [user, toast]);

  // Finalizar segmento atual e iniciar novo
  const rotateSegment = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return;
    }

    const currentChunks = [...chunksRef.current];
    const segmentDuration = (Date.now() - segmentStartTimeRef.current) / 1000;
    totalSegmentsRef.current += 1;
    const segmentNumber = totalSegmentsRef.current;

    console.log(`[ContinuousRecording] Rotacionando segmento #${segmentNumber}`);

    // Resetar chunks e timer para próximo segmento
    chunksRef.current = [];
    segmentStartTimeRef.current = Date.now();
    setCurrentSegmentTime(0);
    setSegmentCount(segmentNumber);

    // Processar segmento anterior em background
    if (currentChunks.length > 0) {
      const mimeType = mediaRecorderRef.current.mimeType;
      const audioBlob = new Blob(currentChunks, { type: mimeType });
      
      if (audioBlob.size > 5000) {
        // Processar em background sem bloquear
        sendAudioSegment(audioBlob, segmentDuration, segmentNumber).catch(err => {
          console.error('[ContinuousRecording] Erro ao enviar segmento:', err);
        });
      }
    }
  }, [sendAudioSegment]);

  // Iniciar gravação contínua
  const startRecording = useCallback(async () => {
    try {
      console.log('[ContinuousRecording] Iniciando gravação contínua...');
      
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Determinar formato de áudio
      const mimeType = MediaRecorder.isTypeSupported('audio/wav') 
        ? 'audio/wav' 
        : MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      totalSegmentsRef.current = 0;
      segmentStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        console.log('[ContinuousRecording] MediaRecorder parado');
        
        // Processar último segmento
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: mimeType });
          const segmentDuration = (Date.now() - segmentStartTimeRef.current) / 1000;
          totalSegmentsRef.current += 1;
          
          if (audioBlob.size > 5000) {
            await sendAudioSegment(audioBlob, segmentDuration, totalSegmentsRef.current);
          }
        }

        // Limpar stream
        stream.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      };

      // Iniciar gravação com coleta de dados a cada segundo
      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      setCurrentSegmentTime(0);
      setSegmentCount(0);

      // Timer para atualizar tempo de gravação
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
        setCurrentSegmentTime(prev => prev + 1);
      }, 1000);

      // Timer para rotação de segmentos
      const durationMinutes = config?.recordingDurationMinutes || 5;
      const durationMs = durationMinutes * 60 * 1000;
      
      console.log(`[ContinuousRecording] Duração do segmento: ${durationMinutes} minutos`);
      
      segmentTimerRef.current = setInterval(() => {
        rotateSegment();
      }, durationMs);

      toast({
        title: 'Gravação contínua iniciada',
        description: `Segmentos de ${durationMinutes} min serão enviados automaticamente`,
      });

    } catch (error) {
      console.error('[ContinuousRecording] Erro ao iniciar:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível iniciar a gravação. Verifique as permissões do microfone.',
        variant: 'destructive',
      });
    }
  }, [config, setIsRecording, toast, rotateSegment, sendAudioSegment]);

  // Parar gravação
  const stopRecording = useCallback(() => {
    console.log('[ContinuousRecording] Parando gravação...');
    
    // Limpar timers
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (segmentTimerRef.current) {
      clearInterval(segmentTimerRef.current);
      segmentTimerRef.current = null;
    }

    // Parar gravação (onstop vai processar último segmento)
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    setIsRecording(false);
    setRecordingTime(0);
    setCurrentSegmentTime(0);
    
    toast({
      title: 'Gravação finalizada',
      description: `${totalSegmentsRef.current + 1} segmento(s) processado(s)`,
    });
  }, [setIsRecording, toast]);

  // Toggle gravação
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
    currentSegmentTime,
    segmentCount,
    isAnalyzing,
    vadStatus,
    startRecording,
    stopRecording,
    toggleRecording,
  };
};
