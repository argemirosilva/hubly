import React from 'react';
import { Mic, MicOff, Loader2, Brain, Zap } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RecordingControl: React.FC = () => {
  const { isRecording, recordingTime, isAnalyzing, vadStatus, toggleRecording } = useAudioRecorder();

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gravação de Áudio</h3>
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
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50">
            {vadStatus === 'loading' ? (
              <Loader2 className="w-3.5 h-3.5 text-muted-foreground animate-spin" />
            ) : vadStatus === 'ready' ? (
              <Brain className="w-3.5 h-3.5 text-primary" />
            ) : (
              <Zap className="w-3.5 h-3.5 text-warning" />
            )}
            <span className="text-xs text-muted-foreground">
              {vadStatus === 'loading' ? 'Carregando' : vadStatus === 'ready' ? 'VAD IA' : 'VAD Básico'}
            </span>
          </div>
          
          {isRecording && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emergency recording-pulse" />
              <span className="text-sm font-mono text-foreground">
                {formatTime(recordingTime)}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Info about VAD */}
      <div className="mb-4 p-3 bg-secondary/30 rounded-lg">
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
        className={`w-full h-20 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 disabled:opacity-50 ${
          isAnalyzing
            ? 'bg-warning/20 border-2 border-warning text-warning'
            : isRecording
              ? 'bg-emergency/20 border-2 border-emergency text-emergency'
              : 'bg-primary/10 border-2 border-primary text-primary hover:bg-primary/20'
        }`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-8 h-8 animate-spin" />
            <span className="text-lg font-medium">Analisando...</span>
          </>
        ) : isRecording ? (
          <>
            <MicOff className="w-8 h-8" />
            <span className="text-lg font-medium">Parar Gravação</span>
          </>
        ) : (
          <>
            <Mic className="w-8 h-8" />
            <span className="text-lg font-medium">Iniciar Gravação</span>
          </>
        )}
      </button>
    </div>
  );
};

export default RecordingControl;
