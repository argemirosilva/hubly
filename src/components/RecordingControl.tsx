import React from 'react';
import { Mic, MicOff } from 'lucide-react';
import { useAudioRecorder } from '@/hooks/useAudioRecorder';

const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

const RecordingControl: React.FC = () => {
  const { isRecording, recordingTime, toggleRecording } = useAudioRecorder();

  return (
    <div className="bg-card rounded-2xl p-6 border border-border">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">Gravação de Áudio</h3>
          <p className="text-sm text-muted-foreground">
            {isRecording ? 'Gravando...' : 'Toque para iniciar'}
          </p>
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

      <button
        onClick={toggleRecording}
        className={`w-full h-20 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 ${
          isRecording
            ? 'bg-emergency/20 border-2 border-emergency text-emergency'
            : 'bg-primary/10 border-2 border-primary text-primary hover:bg-primary/20'
        }`}
      >
        {isRecording ? (
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
