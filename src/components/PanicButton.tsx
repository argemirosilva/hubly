import React, { useState, useCallback } from 'react';
import { AlertTriangle, Phone, AudioLines, AudioWaveform, X } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';
import { usePanicVoiceCommand } from '@/hooks/usePanicVoiceCommand';
import type { LocationData } from '@/types/app';

const DEFAULT_PANIC_COMMAND = 'Ampara preciso de ajuda';
const DEFAULT_CANCEL_COMMAND = 'Ampara cancela ajuda';

const PanicButton: React.FC = () => {
  const { user, config, isPanicActive, setIsPanicActive } = useAppStore();
  const { toast } = useToast();
  const [isTriggering, setIsTriggering] = useState(false);
  const [holdProgress, setHoldProgress] = useState(0);
  const holdTimeRef = React.useRef<NodeJS.Timeout | null>(null);
  const progressRef = React.useRef<NodeJS.Timeout | null>(null);

  // Usa o comando personalizado do usuário ou o padrão
  const panicCommand = config?.voiceCommand || DEFAULT_PANIC_COMMAND;

  const triggerPanic = useCallback(async () => {
    setIsTriggering(true);
    setIsPanicActive(true);

    try {
      let location: LocationData = {
        latitude: 0,
        longitude: 0,
        timestamp: Date.now(),
      };

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
        });
        location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          timestamp: position.timestamp,
          accuracy: position.coords.accuracy,
        };
      } catch (error) {
        // Try web fallback
        if ('geolocation' in navigator) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                location = {
                  latitude: pos.coords.latitude,
                  longitude: pos.coords.longitude,
                  timestamp: pos.timestamp,
                  accuracy: pos.coords.accuracy,
                };
                resolve();
              },
              () => resolve()
            );
          });
        }
      }

      if (user?.token) {
        if (navigator.onLine) {
          const result = await apiService.sendPanicAlert(location, user.token);
          if (!result.success) {
            // Failed, save offline
            await syncService.saveForOffline('panic', {
              latitude: location.latitude,
              longitude: location.longitude,
              timestamp: location.timestamp,
            });
          }
        } else {
          // Offline, save for later
          await syncService.saveForOffline('panic', {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp,
          });
        }
      }

      const offlineNote = navigator.onLine ? '' : ' (salvo offline)';
      toast({
        title: '🚨 ALERTA ENVIADO',
        description: `Emergência acionada${offlineNote}. Ajuda a caminho.`,
      });
    } catch (error) {
      console.error('Error triggering panic:', error);
    } finally {
      setIsTriggering(false);
    }
  }, [user, setIsPanicActive, toast]);

  // Usa o comando de cancelamento personalizado ou padrão
  const cancelCommand = config?.panicCancelCommand || DEFAULT_CANCEL_COMMAND;

  // Hook de comando de voz para pânico
  const { isListening, isSupported, isSpeaking, isPendingPanic, countdownSeconds, lastCommand, toggleListening, cancelPendingPanic } = usePanicVoiceCommand({
    onPanicCommand: triggerPanic,
    panicKeyword: panicCommand,
    cancelKeyword: cancelCommand,
  });

  const handleTouchStart = () => {
    setHoldProgress(0);
    
    progressRef.current = setInterval(() => {
      setHoldProgress((prev) => {
        if (prev >= 100) {
          return 100;
        }
        return prev + 5;
      });
    }, 50);

    holdTimeRef.current = setTimeout(() => {
      triggerPanic();
      if (progressRef.current) clearInterval(progressRef.current);
    }, 1000);
  };

  const handleTouchEnd = () => {
    if (holdTimeRef.current) {
      clearTimeout(holdTimeRef.current);
      holdTimeRef.current = null;
    }
    if (progressRef.current) {
      clearInterval(progressRef.current);
      progressRef.current = null;
    }
    setHoldProgress(0);
  };

  const deactivatePanic = () => {
    setIsPanicActive(false);
    toast({
      title: 'Alerta desativado',
      description: 'Modo de emergência encerrado',
    });
  };

  if (isPanicActive) {
    return (
      <div className="bg-emergency/20 rounded-2xl p-6 border-2 border-emergency glow-emergency">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-emergency flex items-center justify-center pulse-emergency">
            <AlertTriangle className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-emergency">EMERGÊNCIA ATIVA</h3>
            <p className="text-sm text-muted-foreground">Alerta enviado à central</p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => window.open('tel:190')}
            className="flex-1 h-12 rounded-xl bg-secondary flex items-center justify-center gap-2 text-foreground font-medium"
          >
            <Phone className="w-5 h-5" />
            Ligar 190
          </button>
          <button
            onClick={deactivatePanic}
            className="flex-1 h-12 rounded-xl bg-card border border-border text-foreground font-medium"
          >
            Desativar
          </button>
        </div>
      </div>
    );
  }

  // Tela de contagem regressiva
  if (isPendingPanic && countdownSeconds !== null) {
    return (
      <div className="bg-warning/20 rounded-2xl p-6 border-2 border-warning animate-pulse">
        <div className="text-center mb-4">
          <div className="w-20 h-20 rounded-full bg-warning/30 border-4 border-warning flex items-center justify-center mx-auto mb-4">
            <span className="text-4xl font-bold text-warning">{countdownSeconds}</span>
          </div>
          <h3 className="text-lg font-bold text-warning">ALERTA DETECTADO</h3>
          <p className="text-sm text-muted-foreground mt-2">
            Diga "<span className="font-semibold">{cancelCommand}</span>" para cancelar
          </p>
        </div>

        <button
          onClick={cancelPendingPanic}
          className="w-full h-14 rounded-xl bg-secondary border-2 border-border flex items-center justify-center gap-2 text-foreground font-medium hover:bg-secondary/80 transition-colors"
        >
          <X className="w-5 h-5" />
          <span>Cancelar Alerta</span>
        </button>
      </div>
    );
  }

  return (
    <div className="card-ampara">
      <div className="text-center mb-4">
        <h3 className="text-lg font-bold text-foreground font-display">Botão de Pânico</h3>
        <p className="text-sm text-muted-foreground">Segure por 1 segundo para ativar</p>
      </div>

      {/* Voice Command Button */}
      {isSupported && (
        <div className="mb-4">
          <button
            onClick={toggleListening}
            className={`w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl transition-all duration-300 ${
              isSpeaking
                ? 'bg-success/20 border-2 border-success text-success shadow-soft'
                : isListening
                  ? 'bg-emergency/15 border-2 border-emergency text-emergency shadow-soft'
                  : 'bg-accent border border-border text-muted-foreground hover:bg-accent/80 hover:text-primary'
            }`}
          >
            {isSpeaking ? (
              <>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-4 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" />
                  <span className="w-1 h-6 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.1s]" />
                  <span className="w-1 h-3 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.2s]" />
                  <span className="w-1 h-5 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.3s]" />
                </div>
                <span className="text-sm font-semibold">Detectando fala...</span>
              </>
            ) : isListening ? (
              <>
                <AudioWaveform className="w-5 h-5 animate-pulse" />
                <span className="text-sm font-semibold">Escutando...</span>
              </>
            ) : (
              <>
                <AudioLines className="w-5 h-5" />
                <span className="text-sm font-medium">Ativar comando de voz</span>
              </>
            )}
          </button>
          
          {/* Lista de comandos disponíveis */}
          {isListening && (
            <div className="mt-3 p-4 bg-emergency/10 rounded-2xl border border-emergency/20 animate-fade-in">
              {/* Último comando reconhecido */}
              {lastCommand && (
                <div className="mb-3 p-2.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Último comando detectado:</p>
                  <p className="text-sm font-semibold text-foreground">"{lastCommand}"</p>
                </div>
              )}
              
              <p className="text-xs font-semibold text-emergency mb-2">Comandos de emergência:</p>
              <ul className="space-y-2">
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-emergency" />
                  <span className="font-semibold">"{panicCommand}"</span>
                  <span className="opacity-70">- Acionar pânico</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-2 h-2 rounded-full bg-success" />
                  <span className="font-semibold">"{cancelCommand}"</span>
                  <span className="opacity-70">- Cancelar alerta</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      )}

      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        disabled={isTriggering}
        className="relative w-full h-28 rounded-2xl bg-emergency/10 border-2 border-emergency flex items-center justify-center overflow-hidden transition-all duration-300 hover:bg-emergency/20 active:scale-[0.98] shadow-soft"
      >
        {/* Progress overlay */}
        <div
          className="absolute inset-0 bg-emergency/30 transition-all duration-75"
          style={{ width: `${holdProgress}%` }}
        />
        
        <div className="relative z-10 flex items-center gap-3">
          <AlertTriangle className="w-10 h-10 text-emergency" />
          <span className="text-xl font-bold text-emergency font-display">
            {isTriggering ? 'ENVIANDO...' : 'SOS'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default PanicButton;
