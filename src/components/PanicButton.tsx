import React, { useState, useCallback } from 'react';
import { AlertTriangle, Phone, AudioWaveform, X } from 'lucide-react';
import { Geolocation } from '@capacitor/geolocation';
import { useAppStore } from '@/store/appStore';
import { apiService, type PanicPayload } from '@/services/api';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';
import { usePanicVoiceCommand } from '@/hooks/usePanicVoiceCommand';

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

  const triggerPanic = useCallback(async (tipoAcionamento: PanicPayload['tipo_acionamento'] = 'botao_panico') => {
    if (!user?.email) return;
    
    setIsTriggering(true);
    setIsPanicActive(true);

    try {
      let latitude = 0;
      let longitude = 0;
      let precisao_metros: number | undefined;

      try {
        const position = await Geolocation.getCurrentPosition({
          enableHighAccuracy: true,
        });
        latitude = position.coords.latitude;
        longitude = position.coords.longitude;
        precisao_metros = position.coords.accuracy;
      } catch (error) {
        // Try web fallback
        if ('geolocation' in navigator) {
          await new Promise<void>((resolve) => {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                latitude = pos.coords.latitude;
                longitude = pos.coords.longitude;
                precisao_metros = pos.coords.accuracy;
                resolve();
              },
              () => resolve()
            );
          });
        }
      }

      const payload: PanicPayload = {
        email_usuario: user.email,
        latitude,
        longitude,
        precisao_metros,
        tipo_acionamento: tipoAcionamento,
        bateria_percentual: await apiService.getBatteryLevel(),
      };

      if (navigator.onLine) {
        const result = await apiService.sendPanicAlert(payload);
        if (!result.success) {
          // Failed, save offline
          await syncService.saveForOffline('panic', {
            latitude,
            longitude,
            timestamp: Date.now(),
            accuracy: precisao_metros,
          });
        } else if (result.data) {
          toast({
            title: '🚨 ALERTA ENVIADO',
            description: result.data.mensagem || `Emergência acionada. Rede de apoio notificada.`,
          });
          return;
        }
      } else {
        // Offline, save for later
        await syncService.saveForOffline('panic', {
          latitude,
          longitude,
          timestamp: Date.now(),
          accuracy: precisao_metros,
        });
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
  const { isListening, isSupported, isSpeaking, isPendingPanic, countdownSeconds, lastCommand, cancelPendingPanic } = usePanicVoiceCommand({
    onPanicCommand: () => triggerPanic('palavra_codigo'),
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
      triggerPanic('botao_panico');
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
      <div className="bg-emergency/20 rounded-xl p-4 border-2 border-emergency glow-emergency">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 rounded-full bg-emergency flex items-center justify-center pulse-emergency">
            <AlertTriangle className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h3 className="text-base font-bold text-emergency">EMERGÊNCIA ATIVA</h3>
            <p className="text-xs text-muted-foreground">Alerta enviado à central</p>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => window.open('tel:190')}
            className="flex-1 h-9 rounded-lg bg-secondary flex items-center justify-center gap-1.5 text-sm text-foreground font-medium"
          >
            <Phone className="w-4 h-4" />
            Ligar 190
          </button>
          <button
            onClick={deactivatePanic}
            className="flex-1 h-9 rounded-lg bg-card border border-border text-sm text-foreground font-medium"
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
      <div className="bg-warning/20 rounded-xl p-4 border-2 border-warning animate-pulse">
        <div className="text-center mb-3">
          <div className="w-14 h-14 rounded-full bg-warning/30 border-4 border-warning flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl font-bold text-warning">{countdownSeconds}</span>
          </div>
          <h3 className="text-base font-bold text-warning">ALERTA DETECTADO</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Diga "<span className="font-semibold">{cancelCommand}</span>" para cancelar
          </p>
        </div>

        <button
          onClick={cancelPendingPanic}
          className="w-full h-10 rounded-lg bg-secondary border-2 border-border flex items-center justify-center gap-1.5 text-sm text-foreground font-medium hover:bg-secondary/80 transition-colors"
        >
          <X className="w-4 h-4" />
          <span>Cancelar Alerta</span>
        </button>
      </div>
    );
  }

  return (
    <div className="card-ampara !p-4">
      <div className="text-center mb-3">
        <h3 className="text-base font-bold text-foreground font-display">Botão de Pânico</h3>
        <p className="text-xs text-muted-foreground">Segure por 1 segundo para ativar</p>
      </div>

      {/* Voice Command Status - Always listening */}
      {isSupported && isListening && (
        <div className="mb-3 p-3 bg-emergency/10 rounded-xl border border-emergency/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              {isSpeaking ? (
                <>
                  <div className="flex items-center gap-0.5">
                    <span className="w-0.5 h-2 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" />
                    <span className="w-0.5 h-3 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.1s]" />
                    <span className="w-0.5 h-1.5 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.2s]" />
                  </div>
                  <span className="text-[10px] font-semibold text-success">Detectando fala...</span>
                </>
              ) : (
                <>
                  <AudioWaveform className="w-3 h-3 text-emergency animate-pulse" />
                  <span className="text-[10px] font-semibold text-emergency">Escutando comandos</span>
                </>
              )}
            </div>
          </div>
          
          {/* Último comando reconhecido */}
          {lastCommand && (
            <div className="mb-2 p-2 bg-background rounded-lg border border-border">
              <p className="text-[10px] text-muted-foreground mb-0.5">Último comando:</p>
              <p className="text-xs font-semibold text-foreground">"{lastCommand}"</p>
            </div>
          )}
          
          <p className="text-[10px] text-muted-foreground mb-1">Comandos:</p>
          <ul className="space-y-0.5">
            <li className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-emergency" />
              <span className="font-medium">"{panicCommand}"</span>
            </li>
            <li className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
              <span className="w-1 h-1 rounded-full bg-success" />
              <span className="font-medium">"{cancelCommand}"</span>
            </li>
          </ul>
        </div>
      )}

      <button
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseUp={handleTouchEnd}
        onMouseLeave={handleTouchEnd}
        disabled={isTriggering}
        className="relative w-full h-20 rounded-xl bg-emergency/10 border-2 border-emergency flex items-center justify-center overflow-hidden transition-all duration-300 hover:bg-emergency/20 active:scale-[0.98] shadow-soft"
      >
        {/* Progress overlay */}
        <div
          className="absolute inset-0 bg-emergency/30 transition-all duration-75"
          style={{ width: `${holdProgress}%` }}
        />
        
        <div className="relative z-10 flex items-center gap-2">
          <AlertTriangle className="w-7 h-7 text-emergency" />
          <span className="text-lg font-bold text-emergency font-display">
            {isTriggering ? 'ENVIANDO...' : 'SOS'}
          </span>
        </div>
      </button>
    </div>
  );
};

export default PanicButton;
