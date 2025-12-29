import React from 'react';
import { Mic, MicOff, Loader2, Brain, Zap, AudioWaveform, Clock } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';
import { useRecordingVoiceCommand } from '@/hooks/useRecordingVoiceCommand';
import { useAppStore } from '@/store/appStore';

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
}

const RecordingControl: React.FC<RecordingControlProps> = ({ 
  voiceCommandEnabled = true,
  scheduleInfo 
}) => {
  const { config } = useAppStore();
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

  return (
    <div className="card-ampara">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground font-display">Gravação de Áudio</h3>
          <p className="text-sm text-muted-foreground">
            {isAnalyzing 
              ? 'Analisando diálogo...' 
              : isRecording 
                ? 'Gravando...' 
                : 'Toque para iniciar'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* VAD Status */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent">
            {vadStatus === 'loading' ? (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            ) : vadStatus === 'ready' ? (
              <Brain className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-warning" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {vadStatus === 'loading' ? 'Carregando' : vadStatus === 'ready' ? 'VAD IA' : 'VAD Básico'}
            </span>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emergency/10">
              <span className="w-2 h-2 rounded-full bg-emergency recording-pulse" />
              <span className="text-sm font-mono font-medium text-emergency">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Voice Command Status - Based on schedule */}
      {isSupported && (
        <div className={`mb-4 p-4 rounded-2xl border ${
          voiceCommandEnabled 
            ? 'bg-primary/10 border-primary/20' 
            : 'bg-muted/50 border-border'
        }`}>
          {voiceCommandEnabled && isListening ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  {isSpeaking ? (
                    <>
                      <div className="flex items-center gap-0.5">
                        <span className="w-1 h-3 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite]" />
                        <span className="w-1 h-4 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.1s]" />
                        <span className="w-1 h-2 bg-success rounded-full animate-[soundwave_0.5s_ease-in-out_infinite_0.2s]" />
                      </div>
                      <span className="text-xs font-semibold text-success">Detectando fala...</span>
                    </>
                  ) : (
                    <>
                      <AudioWaveform className="w-4 h-4 text-primary animate-pulse" />
                      <span className="text-xs font-semibold text-primary">Escutando comandos</span>
                    </>
                  )}
                </div>
                {scheduleInfo && (
                  <span className="text-xs text-muted-foreground">{scheduleInfo}</span>
                )}
              </div>
              
              {/* Último comando reconhecido */}
              {lastCommand && (
                <div className="mb-3 p-2.5 bg-background rounded-xl border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Último comando:</p>
                  <p className="text-sm font-semibold text-foreground">"{lastCommand}"</p>
                </div>
              )}
              
              <p className="text-xs text-muted-foreground mb-2">Comandos disponíveis:</p>
              <ul className="space-y-1.5">
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-success" />
                  <span className="font-medium">"{startCommand}"</span>
                </li>
                <li className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="w-1.5 h-1.5 rounded-full bg-emergency" />
                  <span className="font-medium">"{stopCommand}"</span>
                </li>
              </ul>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">
                Escuta de comandos desativada - fora do horário programado
              </span>
            </div>
          )}
        </div>
      )}

      {/* Info about VAD */}
      <div className="mb-4 p-4 bg-accent/50 rounded-2xl">
        <p className="text-xs text-muted-foreground">
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
        className={`w-full h-20 rounded-2xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 shadow-soft ${
          isAnalyzing
            ? 'bg-warning/15 border-2 border-warning text-warning'
            : isRecording
              ? 'bg-emergency/15 border-2 border-emergency text-emergency'
              : 'gradient-primary text-primary-foreground hover:shadow-medium active:scale-[0.98]'
        }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-lg font-semibold">Analisando...</span>
          </>
        ) : isRecording ? (
          <>
            <MicOff className="w-8 h-8" />
            <span className="text-lg font-semibold">Parar Gravação</span>
          </>
        ) : (
          <>
            <Mic className="w-8 h-8" />
            <span className="text-lg font-semibold">Iniciar Gravação</span>
          </>
        )}
      </button>
    </div>
  );
};

export default RecordingControl;
