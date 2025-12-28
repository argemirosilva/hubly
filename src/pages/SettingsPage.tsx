import React, { useState, useEffect } from 'react';
import { ArrowLeft, Mic, AlertTriangle, Save, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/store/appStore';
import { useToast } from '@/hooks/use-toast';
import type { AppConfig } from '@/types/app';

// Comandos padrão
const DEFAULT_COMMANDS = {
  recordingStart: 'Ampara iniciar gravação',
  recordingStop: 'Ampara parar gravação',
  panic: 'Ampara preciso de ajuda',
  panicCancel: 'Ampara cancela ajuda',
};

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { config, setConfig, soundEnabled, setSoundEnabled } = useAppStore();
  const { toast } = useToast();

  // Estados locais para edição
  const [recordingStartCommand, setRecordingStartCommand] = useState(
    config?.recordingStartCommand || DEFAULT_COMMANDS.recordingStart
  );
  const [recordingStopCommand, setRecordingStopCommand] = useState(
    config?.recordingStopCommand || DEFAULT_COMMANDS.recordingStop
  );
  const [panicCommand, setPanicCommand] = useState(
    config?.voiceCommand || DEFAULT_COMMANDS.panic
  );
  const [panicCancelCommand, setPanicCancelCommand] = useState(
    config?.panicCancelCommand || DEFAULT_COMMANDS.panicCancel
  );
  const [recordingDuration, setRecordingDuration] = useState(
    config?.recordingDurationMinutes || 5
  );

  // Sincroniza com store quando config muda
  useEffect(() => {
    if (config) {
      setRecordingStartCommand(config.recordingStartCommand || DEFAULT_COMMANDS.recordingStart);
      setRecordingStopCommand(config.recordingStopCommand || DEFAULT_COMMANDS.recordingStop);
      setPanicCommand(config.voiceCommand || DEFAULT_COMMANDS.panic);
      setPanicCancelCommand(config.panicCancelCommand || DEFAULT_COMMANDS.panicCancel);
      setRecordingDuration(config.recordingDurationMinutes || 5);
    }
  }, [config]);

  const handleSave = () => {
    const newConfig: AppConfig = {
      ...config,
      recordingDurationMinutes: recordingDuration,
      gpsIntervalSeconds: config?.gpsIntervalSeconds || 30,
      apiBaseUrl: config?.apiBaseUrl || '',
      dialogueDetectionEnabled: config?.dialogueDetectionEnabled ?? true,
      autoStartRecording: config?.autoStartRecording ?? false,
      recordingStartCommand,
      recordingStopCommand,
      voiceCommand: panicCommand,
      panicCancelCommand,
    };

    setConfig(newConfig);
    toast({
      title: 'Configurações salvas',
      description: 'Seus comandos de voz foram atualizados',
    });
  };

  const handleReset = () => {
    setRecordingStartCommand(DEFAULT_COMMANDS.recordingStart);
    setRecordingStopCommand(DEFAULT_COMMANDS.recordingStop);
    setPanicCommand(DEFAULT_COMMANDS.panic);
    setPanicCancelCommand(DEFAULT_COMMANDS.panicCancel);
    setRecordingDuration(5);
    toast({
      title: 'Valores restaurados',
      description: 'Comandos voltaram ao padrão (salve para aplicar)',
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center hover:bg-accent/80 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-foreground font-display">Configurações</h1>
            <p className="text-sm text-muted-foreground">Personalize seus comandos de voz</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-6 pb-24">
        {/* Som */}
        <section className="card-ampara">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-primary" />
              ) : (
                <VolumeX className="w-5 h-5 text-muted-foreground" />
              )}
              <div>
                <h3 className="font-semibold text-foreground">Sons do app</h3>
                <p className="text-xs text-muted-foreground">Alertas e confirmações sonoras</p>
              </div>
            </div>
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`w-14 h-8 rounded-full transition-colors ${
                soundEnabled ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full bg-white shadow-md transform transition-transform ${
                  soundEnabled ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </section>

        {/* Gravação */}
        <section className="card-ampara">
          <div className="flex items-center gap-2 mb-4">
            <Mic className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground font-display">Comandos de Gravação</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Comando para iniciar gravação
              </label>
              <input
                type="text"
                value={recordingStartCommand}
                onChange={(e) => setRecordingStartCommand(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={DEFAULT_COMMANDS.recordingStart}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: "iniciar", "começar", "gravar"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Comando para parar gravação
              </label>
              <input
                type="text"
                value={recordingStopCommand}
                onChange={(e) => setRecordingStopCommand(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder={DEFAULT_COMMANDS.recordingStop}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: "parar", "para", "encerrar"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Duração da gravação (minutos)
              </label>
              <input
                type="number"
                min={1}
                max={30}
                value={recordingDuration}
                onChange={(e) => setRecordingDuration(Number(e.target.value))}
                className="w-full px-4 py-3 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>
        </section>

        {/* Pânico */}
        <section className="card-ampara">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-emergency" />
            <h2 className="text-lg font-bold text-foreground font-display">Comandos de Pânico</h2>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Comando para acionar pânico
              </label>
              <input
                type="text"
                value={panicCommand}
                onChange={(e) => setPanicCommand(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-emergency"
                placeholder={DEFAULT_COMMANDS.panic}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: "ajuda", "socorro", "emergência"
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                Comando para cancelar pânico
              </label>
              <input
                type="text"
                value={panicCancelCommand}
                onChange={(e) => setPanicCancelCommand(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-accent border border-border text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-success"
                placeholder={DEFAULT_COMMANDS.panicCancel}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Ex: "cancelar", "cancela", "parar"
              </p>
            </div>
          </div>
        </section>

        {/* Dica */}
        <div className="p-4 bg-primary/10 rounded-2xl border border-primary/20">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-primary">💡 Dica:</span> Os comandos são reconhecidos de forma flexível. 
            Você pode dizer apenas parte do comando configurado, como "parar" ou "ajuda".
          </p>
        </div>
      </main>

      {/* Footer Actions */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t border-border">
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 h-12 rounded-xl bg-secondary border border-border flex items-center justify-center gap-2 text-foreground font-medium hover:bg-secondary/80 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar
          </button>
          <button
            onClick={handleSave}
            className="flex-1 h-12 rounded-xl gradient-primary text-primary-foreground flex items-center justify-center gap-2 font-semibold shadow-soft hover:shadow-medium transition-all"
          >
            <Save className="w-4 h-4" />
            Salvar
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
