import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { playConfirmationSound, playActivationSound } from '@/utils/audioFeedback';

interface UseRecordingVoiceCommandOptions {
  onStartCommand: () => void;
  onStopCommand: () => void;
  startKeyword?: string;
  stopKeyword?: string;
  enabled?: boolean;
}

export const useRecordingVoiceCommand = ({
  onStartCommand,
  onStopCommand,
  startKeyword = 'ampara iniciar gravação',
  stopKeyword = 'ampara parar gravação',
  enabled = true,
}: UseRecordingVoiceCommandOptions) => {
  const { toast } = useToast();
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [lastCommand, setLastCommand] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const isListeningRef = useRef(false);
  const onStartCommandRef = useRef(onStartCommand);
  const onStopCommandRef = useRef(onStopCommand);
  const startKeywordRef = useRef(startKeyword);
  const stopKeywordRef = useRef(stopKeyword);

  // Atualiza refs quando as props mudam
  useEffect(() => {
    onStartCommandRef.current = onStartCommand;
    onStopCommandRef.current = onStopCommand;
    startKeywordRef.current = startKeyword;
    stopKeywordRef.current = stopKeyword;
  }, [onStartCommand, onStopCommand, startKeyword, stopKeyword]);

  // Sincroniza ref com state
  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  // Verifica suporte ao SpeechRecognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    setIsSupported(!!SpeechRecognition);
  }, []);

  // Gerencia o ciclo de vida do recognition baseado em enabled
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    // Se não há suporte ou não está habilitado, limpa tudo
    if (!SpeechRecognition || !enabled) {
      // Para e limpa recognition existente
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
        recognitionRef.current = null;
      }
      setIsListening(false);
      setIsSpeaking(false);
      console.log('Voice command disabled - microphone access stopped');
      return;
    }

    // Só cria novo recognition se enabled=true
    console.log('Voice command enabled - requesting microphone access');
    
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
        console.log('Recording voice command detected:', transcript);
        setLastCommand(transcript);

        // Detecta comandos de forma flexível (não precisa de contexto "gravação")
        const hasStopWords = 
          transcript.includes('parar') || 
          transcript.includes('para') || 
          transcript.includes('stop') || 
          transcript.includes('encerrar') || 
          transcript.includes('finalizar') ||
          transcript.includes('terminar');
        
        const hasStartWords = 
          transcript.includes('iniciar') || 
          transcript.includes('começar') || 
          transcript.includes('start') || 
          transcript.includes('gravar') || 
          transcript.includes('inicía') ||
          transcript.includes('começá') ||
          transcript.includes('começa');

        // Também aceita palavra-chave exata
        const normalizedStart = startKeywordRef.current.toLowerCase();
        const normalizedStop = stopKeywordRef.current.toLowerCase();
        const hasExactStart = transcript.includes(normalizedStart);
        const hasExactStop = transcript.includes(normalizedStop);

        if (hasStopWords || hasExactStop) {
          playConfirmationSound('stop');
          toast({
            title: '🎤 Comando reconhecido',
            description: `"${transcript}" - Parando gravação`,
          });
          onStopCommandRef.current();
        } else if (hasStartWords || hasExactStart) {
          playConfirmationSound('start');
          toast({
            title: '🎤 Comando reconhecido',
            description: `"${transcript}" - Iniciando gravação`,
          });
          onStartCommandRef.current();
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
          if (isListeningRef.current && recognitionRef.current && enabled) {
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
      console.log('Speech recognition ended, isListening:', isListeningRef.current);
      // Só reinicia se ainda estiver enabled e listening
      if (isListeningRef.current && enabled && recognitionRef.current) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current && enabled) {
            try {
              recognitionRef.current.start();
              console.log('Speech recognition restarted');
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
      recognitionRef.current = null;
      setIsListening(false);
    };
  }, [enabled, toast]);

  const startListening = useCallback(() => {
    if (!recognitionRef.current || !isSupported) {
      return;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
      console.log('Recording voice command started');
    } catch (e) {
      console.error('Failed to start recognition:', e);
    }
  }, [isSupported]);

  // Auto-start listening when enabled and supported
  useEffect(() => {
    // Só inicia se enabled=true e há recognition disponível
    if (enabled && isSupported && recognitionRef.current && !isListening) {
      const timer = setTimeout(() => {
        if (enabled && recognitionRef.current) {
          startListening();
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [enabled, isSupported, startListening, isListening]);

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
    isSpeaking,
    startListening,
    stopListening,
    toggleListening,
  };
};
