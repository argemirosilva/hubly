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
        console.log('Recording voice command detected:', transcript);
        setLastCommand(transcript);

        // Detecta comandos de forma flexível
        const hasStopWords = 
          (transcript.includes('parar') || transcript.includes('para') || transcript.includes('stop') || transcript.includes('encerrar') || transcript.includes('finalizar')) &&
          (transcript.includes('gravação') || transcript.includes('gravar') || transcript.includes('áudio') || transcript.includes('audio'));
        
        const hasStartWords = 
          (transcript.includes('iniciar') || transcript.includes('começar') || transcript.includes('start') || transcript.includes('gravar') || transcript.includes('inicía')) &&
          (transcript.includes('gravação') || transcript.includes('gravar') || transcript.includes('áudio') || transcript.includes('audio'));

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
      console.log('Speech recognition ended, isListening:', isListeningRef.current);
      if (isListeningRef.current && enabled) {
        setTimeout(() => {
          if (isListeningRef.current && recognitionRef.current) {
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
    };
  }, [enabled, toast]);

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
        title: 'Comando de gravação ativado',
        description: 'Aguardando comando...',
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
    isSpeaking,
    startListening,
    stopListening,
    toggleListening,
  };
};
