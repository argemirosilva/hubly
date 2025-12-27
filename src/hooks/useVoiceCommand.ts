import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

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
          toast({
            title: '🎤 Comando de voz',
            description: `"${transcript}" - Iniciando gravação`,
          });
          onStartCommand();
        } else if (hasStopCommand) {
          toast({
            title: '🎤 Comando de voz',
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
      toast({
        title: 'Comando de voz ativado',
        description: 'Diga "iniciar" ou "parar" para controlar a gravação',
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
