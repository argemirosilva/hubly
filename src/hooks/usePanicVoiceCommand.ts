import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { 
  playCountdownBeep, 
  playPanicConfirmedSound, 
  playCancelSound, 
  playActivationSound 
} from '@/utils/audioFeedback';

const COUNTDOWN_SECONDS = 5;
const CANCEL_KEYWORD = 'ampara cancela ajuda';

interface UsePanicVoiceCommandOptions {
  onPanicCommand: () => void;
  panicKeyword?: string;
  cancelKeyword?: string;
  enabled?: boolean;
}

export const usePanicVoiceCommand = ({
  onPanicCommand,
  panicKeyword = 'ampara preciso de ajuda',
  cancelKeyword = CANCEL_KEYWORD,
  enabled = true,
}: UsePanicVoiceCommandOptions) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  const [isPendingPanic, setIsPendingPanic] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const panicTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isListeningRef = useRef(false);
  const isPendingPanicRef = useRef(false);
  const panicKeywordRef = useRef(panicKeyword);
  const cancelKeywordRef = useRef(cancelKeyword);

  // Atualiza refs quando as props mudam
  useEffect(() => {
    panicKeywordRef.current = panicKeyword;
    cancelKeywordRef.current = cancelKeyword;
  }, [panicKeyword, cancelKeyword]);

  // Sincroniza refs com state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    isPendingPanicRef.current = isPendingPanic;
  }, [isPendingPanic]);

  const cancelPendingPanic = useCallback(() => {
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (panicTimeoutRef.current) {
      clearTimeout(panicTimeoutRef.current);
      panicTimeoutRef.current = null;
    }
    setCountdownSeconds(null);
    setIsPendingPanic(false);
  }, []);

  const startPanicCountdown = useCallback(() => {
    setIsPendingPanic(true);
    setCountdownSeconds(COUNTDOWN_SECONDS);
    
    // Primeiro bipe imediato
    playCountdownBeep(COUNTDOWN_SECONDS, COUNTDOWN_SECONDS);
    
    toast({
      title: '⚠️ ALERTA DETECTADO',
      description: `Diga "${cancelKeywordRef.current}" para cancelar. ${COUNTDOWN_SECONDS}s restantes...`,
      variant: 'destructive',
    });

    let remaining = COUNTDOWN_SECONDS - 1;
    
    countdownIntervalRef.current = setInterval(() => {
      if (remaining > 0) {
        setCountdownSeconds(remaining);
        playCountdownBeep(remaining, COUNTDOWN_SECONDS);
        remaining--;
      } else {
        // Countdown terminou - acionar pânico
        cancelPendingPanic();
        playPanicConfirmedSound();
        toast({
          title: '🚨 EMERGÊNCIA ACIONADA',
          description: 'Alerta de pânico enviado!',
          variant: 'destructive',
        });
        onPanicCommand();
      }
    }, 1000);
  }, [onPanicCommand, toast, cancelPendingPanic]);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition || !enabled) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    (recognition as any).onspeechstart = () => {
      setIsSpeaking(true);
    };

    (recognition as any).onspeechend = () => {
      setIsSpeaking(false);
    };

    recognition.onresult = (event) => {
      setIsSpeaking(false);
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.toLowerCase().trim();
        console.log('Voice command detected:', transcript);
        setLastCommand(transcript);

        // Detecta cancelamento de forma flexível
        const hasCancelWords = 
          (transcript.includes('cancelar') || transcript.includes('cancela') || transcript.includes('cancel') || transcript.includes('parar') || transcript.includes('para'));
        
        // Detecta pânico de forma flexível
        const hasPanicWords = 
          transcript.includes('ajuda') || 
          transcript.includes('socorro') || 
          transcript.includes('emergência') || 
          transcript.includes('emergencia') ||
          transcript.includes('help') ||
          transcript.includes('perigo');

        // Também aceita palavra-chave exata
        const normalizedPanicKeyword = panicKeywordRef.current.toLowerCase();
        const normalizedCancelKeyword = cancelKeywordRef.current.toLowerCase();
        const hasExactCancel = transcript.includes(normalizedCancelKeyword);
        const hasExactPanic = transcript.includes(normalizedPanicKeyword);

        // Prioridade para cancelamento
        if ((hasCancelWords || hasExactCancel) && isPendingPanicRef.current) {
          cancelPendingPanic();
          playCancelSound();
          toast({
            title: '✅ Alerta cancelado',
            description: 'O alerta de emergência foi cancelado.',
          });
          return;
        }

        // Iniciar contagem se comando de pânico detectado
        if ((hasPanicWords || hasExactPanic) && !isPendingPanicRef.current) {
          startPanicCountdown();
        }
      }
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        toast({
          title: 'Microfone negado',
          description: 'Permita o acesso ao microfone para comandos de voz',
          variant: 'destructive',
        });
        setIsListening(false);
      } else if (event.error === 'aborted' || event.error === 'network') {
        // Tenta reiniciar em caso de erro de rede
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
            } catch (e) {
              console.log('Recognition restart after error failed:', e);
            }
          }
        }, 1000);
      }
    };

    recognition.onend = () => {
      console.log('Panic speech recognition ended, isListening:', isListeningRef.current);
      if (isListeningRef.current && enabled) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
            try {
              recognitionRef.current.start();
              console.log('Panic speech recognition restarted');
            } catch (e) {
              console.log('Recognition restart failed:', e);
            }
          }
        }, 100);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.stop();
      } catch (e) {
        // ignore
      }
      cancelPendingPanic();
    };
  }, [enabled, toast, startPanicCountdown, cancelPendingPanic]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      toast({
        title: 'Não suportado',
        description: 'Reconhecimento de voz não disponível neste navegador',
        variant: 'destructive',
      });
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      playActivationSound();
      toast({
        title: 'Comando de emergência ativado',
        description: 'Aguardando comando de pânico...',
      });
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [isSupported, toast]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    cancelPendingPanic();
  }, [cancelPendingPanic]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    lastCommand,
    isSpeaking,
    isPendingPanic,
    countdownSeconds,
    startListening,
    stopListening,
    toggleListening,
    cancelPendingPanic,
  };
};
