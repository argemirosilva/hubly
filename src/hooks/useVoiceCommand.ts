import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

// Vibração para feedback tátil em dispositivos móveis
const vibrate = (pattern: number | number[]) => {
  try {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  } catch (e) {
    console.log('Vibration not available:', e);
  }
};

// Gera um tom de confirmação usando Web Audio API
const playConfirmationSound = (type: 'start' | 'stop') => {
  // Vibração: curta para start, dupla para stop
  if (type === 'start') {
    vibrate(100); // Uma vibração curta
  } else {
    vibrate([100, 50, 100]); // Duas vibrações curtas
  }
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    if (type === 'start') {
      // Som ascendente para iniciar (dois tons rápidos)
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime + 0.1); // A5
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } else {
      // Som descendente para parar
      oscillator.frequency.setValueAtTime(880, audioContext.currentTime); // A5
      oscillator.frequency.setValueAtTime(440, audioContext.currentTime + 0.1); // A4
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    }
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};

// Som de ativação do modo de escuta
const playActivationSound = () => {
  vibrate([50, 30, 50, 30, 50]); // Padrão de ativação: três vibrações rápidas
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Três tons curtos ascendentes
    oscillator.frequency.setValueAtTime(523, audioContext.currentTime); // C5
    oscillator.frequency.setValueAtTime(659, audioContext.currentTime + 0.08); // E5
    oscillator.frequency.setValueAtTime(784, audioContext.currentTime + 0.16); // G5
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.24);
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.24);
  } catch (e) {
    console.log('Audio feedback not available:', e);
  }
};

interface UseVoiceCommandOptions {
  onStartCommand: () => void;
  onStopCommand: () => void;
  startKeywords?: string[];
  stopKeywords?: string[];
  enabled?: boolean;
}

export const useVoiceCommand = ({
  onStartCommand,
  onStopCommand,
  startKeywords = ['iniciar', 'gravar', 'começar', 'start', 'record'],
  stopKeywords = ['parar', 'stop', 'encerrar', 'finalizar'],
  enabled = true,
}: UseVoiceCommandOptions) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);

    if (!SpeechRecognition || !enabled) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const last = event.results[event.results.length - 1];
      if (last.isFinal) {
        const transcript = last[0].transcript.toLowerCase().trim();
        console.log('Voice command detected:', transcript);
        setLastCommand(transcript);

        // Check for start commands
        const hasStartCommand = startKeywords.some(keyword => 
          transcript.includes(keyword.toLowerCase())
        );
        
        // Check for stop commands
        const hasStopCommand = stopKeywords.some(keyword => 
          transcript.includes(keyword.toLowerCase())
        );

        if (hasStartCommand && !hasStopCommand) {
          playConfirmationSound('start');
          toast({
            title: '🎤 Comando reconhecido',
            description: `"${transcript}" - Iniciando gravação`,
          });
          onStartCommand();
        } else if (hasStopCommand) {
          playConfirmationSound('stop');
          toast({
            title: '🎤 Comando reconhecido',
            description: `"${transcript}" - Parando gravação`,
          });
          onStopCommand();
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
      }
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening
      if (isListening && enabled) {
        try {
          recognition.start();
        } catch (e) {
          console.log('Recognition restart failed:', e);
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.stop();
    };
  }, [enabled, startKeywords, stopKeywords, onStartCommand, onStopCommand, toast, isListening]);

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
        title: 'Comando de voz ativado',
        description: 'Aguardando seu comando...',
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
  }, []);

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
    startListening,
    stopListening,
    toggleListening,
  };
};
