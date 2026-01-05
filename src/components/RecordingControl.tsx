import React from 'react';
import { Mic, MicOff, Loader2, Brain, Zap, AudioWaveform, Clock, Power } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRecordingVoiceCommand } from '@/hooks/useRecordingVoiceCommand';
import { useAppStore } from '@/store/appStore';
import { Switch } from '@/components/ui/switch';

const DEFAULT_START_COMMAND = 'Ampara iniciar gravação';
const DEFAULT_STOP_COMMAND = 'Ampara parar gravação';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

interface RecordingControlProps {
  voiceCommandEnabled?: boolean;
  scheduleInfo?: string;
  isInSchedule?: boolean;
  isManualOverride?: boolean;
}

const RecordingControl: React.FC<RecordingControlProps> = ({ 
  voiceCommandEnabled = true,
  scheduleInfo,
  isInSchedule = false,
  isManualOverride = false,
}) => {
  const { config, voiceCommandManualOverride, setVoiceCommandManualOverride } = useAppStore();
  const { isRecording, recordingTime, isAnalyzing, vadStatus, startRecording, stopRecording, toggleRecording } = useAudioRecorder();

  // Comandos personalizados ou padrões
  const startCommand = config?.recordingStartCommand || DEFAULT_START_COMMAND;
  const stopCommand = config?.recordingStopCommand || DEFAULT_STOP_COMMAND;

  const { isListening, isSupported, isSpeaking, lastCommand } = useRecordingVoiceCommand({
    onStartCommand: () => {
      if (!isRecording && !isAnalyzing) {
        startRecording();
      }
    },
    onStopCommand: () => {
      if (isRecording) {
        stopRecording();
      }
    },
    startKeyword: startCommand,
    stopKeyword: stopCommand,
    enabled: voiceCommandEnabled,
  });

  // Handler para toggle manual
  const handleManualToggle = (checked: boolean) => {
    if (checked) {
      // Ativar manualmente
      setVoiceCommandManualOverride(true);
    } else {
      // Desativar manualmente
      setVoiceCommandManualOverride(false);
    }
  };

  // Resetar para modo automático (seguir horário)
  const handleResetToAuto = () => {
    setVoiceCommandManualOverride(null);
  };

  return (
    <div className="card-ampara !p-4">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="text-base font-bold text-foreground font-display">Gravação de Áudio</h3>
          <p className="text-xs text-muted-foreground">
            {isAnalyzing 
              ? 'Analisando diálogo...' 
              : isRecording 
                ? 'Gravando...' 
                : 'Toque para iniciar'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* VAD Status */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-accent">
            {vadStatus === 'loading' ? (
              <Loader2 className="w-3 h-3 text-muted-foreground animate-spin" />
            ) : vadStatus === 'ready' ? (
              <Brain className="w-3 h-3 text-primary" />
            ) : (
              <Zap className="w-3 h-3 text-warning" />
            )}
            <span className="text-[10px] font-medium text-muted-foreground">
              {vadStatus === 'loading' ? 'Carregando' : vadStatus === 'ready' ? 'VAD IA' : 'VAD Básico'}
            </span>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-full bg-emergency/10">
              <span className="w-1.5 h-1.5 rounded-full bg-emergency recording-pulse" />
              <span className="text-xs font-mono font-medium text-emergency">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Voice Command Status - With manual override toggle */}
      {isSupported && (
        <div className={`mb-3 p-3 rounded-xl border ${
          voiceCommandEnabled 
            ? 'bg-primary/10 border-primary/20' 
            : 'bg-muted/50 border-border'
        }`}>
          {/* Manual Toggle Header */}
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <Power className={`w-3 h-3 ${voiceCommandEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
              <span className={`text-xs font-semibold ${voiceCommandEnabled ? 'text-primary' : 'text-muted-foreground'}`}>
                Escuta de Comandos
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isManualOverride && (
                <button
                  onClick={handleResetToAuto}
                  className="text-[10px] text-muted-foreground hover:text-primary transition-colors px-1.5 py-0.5 rounded hover:bg-primary/10"
                >
                  Auto
                </button>
              )}
              <Switch
                checked={voiceCommandEnabled}
                onCheckedChange={handleManualToggle}
                className="scale-75"
              />
            </div>
          </div>

          {/* Status info */}
          <div className="flex items-center gap-1.5 mb-2 text-[10px]">
            {isManualOverride ? (
              <span className={`px-1.5 py-0.5 rounded-full ${voiceCommandEnabled ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'}`}>
                Manual
              </span>
            ) : (
              <span className={`px-1.5 py-0.5 rounded-full ${isInSchedule ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                {isInSchedule ? 'No horário' : 'Fora do horário'}
              </span>
            )}
            {scheduleInfo && (
              <span className="text-muted-foreground">{scheduleInfo}</span>
            )}
          </div>

          {voiceCommandEnabled && isListening ? (
            <>
              <div className="flex items-center gap-1.5 mb-2">
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
                    <AudioWaveform className="w-3 h-3 text-primary animate-pulse" />
                    <span className="text-[10px] font-semibold text-primary">Escutando comandos</span>
                  </>
                )}
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
                  <span className="w-1 h-1 rounded-full bg-success" />
                  <span className="font-medium">"{startCommand}"</span>
                </li>
                <li className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                  <span className="w-1 h-1 rounded-full bg-emergency" />
                  <span className="font-medium">"{stopCommand}"</span>
                </li>
              </ul>
            </>
          ) : (
            <p className="text-[10px] text-muted-foreground">
              {voiceCommandEnabled 
                ? 'Inicializando escuta...' 
                : 'Use o switch para ativar a escuta de voz'}
            </p>
          )}
        </div>
      )}

      {/* Info about VAD */}
      <div className="mb-3 p-2.5 bg-accent/50 rounded-lg">
        <p className="text-[10px] text-muted-foreground">
          {vadStatus === 'ready' 
            ? '🧠 IA Silero ativa: Apenas áudios com diálogo serão enviados'
            : vadStatus === 'loading'
              ? '⏳ Carregando modelo de detecção de voz...'
              : '⚡ Detecção básica: Análise por energia do áudio'}
        </p>
      </div>

      <button
        onClick={toggleRecording}
        disabled={isAnalyzing}
        className={`w-full h-14 rounded-xl flex items-center justify-center gap-2 transition-all duration-300 disabled:opacity-50 shadow-soft ${
          isAnalyzing
            ? 'bg-warning/15 border-2 border-warning text-warning'
            : isRecording
              ? 'bg-emergency/15 border-2 border-emergency text-emergency'
              : 'gradient-primary text-primary-foreground hover:shadow-medium active:scale-[0.98]'
        }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm font-semibold">Analisando...</span>
          </>
        ) : isRecording ? (
          <>
            <MicOff className="w-6 h-6" />
            <span className="text-sm font-semibold">Parar Gravação</span>
          </>
        ) : (
          <>
            <Mic className="w-6 h-6" />
            <span className="text-sm font-semibold">Iniciar Gravação Manual</span>
          </>
        )}
      </button>
    </div>
  );
};

export default RecordingControl;
