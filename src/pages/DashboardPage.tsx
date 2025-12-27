import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, Shield } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import RecordingControl from '@/components/RecordingControl';
import GPSControl from '@/components/GPSControl';
import PanicButton from '@/components/PanicButton';
import { useToast } from '@/hooks/use-toast';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, config, logout } = useAppStore();
  const { toast } = useToast();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    toast({
      title: 'Desconectado',
      description: 'Sessão encerrada com sucesso',
    });
    navigate('/');
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-lg border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Ampara</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {user.username}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-muted-foreground hover:text-emergency transition-colors"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Status Bar */}
      <div className="px-4 py-3 bg-card/50 border-b border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Gravação: <span className="text-foreground font-medium">{config?.recordingDurationMinutes || 5} min</span>
          </span>
          <span className="text-muted-foreground">
            GPS: <span className="text-foreground font-medium">cada {config?.gpsIntervalSeconds || 30}s</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-primary" />
            <span className="text-primary font-medium">Online</span>
          </span>
        </div>
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-4 pb-8">
        {/* Panic Button - Most prominent */}
        <PanicButton />

        {/* Recording Control */}
        <RecordingControl />

        {/* GPS Control */}
        <GPSControl />

        {/* Config Info */}
        <div className="bg-card/50 rounded-xl p-4 border border-border">
          <h4 className="text-sm font-medium text-foreground mb-2">Configurações Ativas</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Detecção de diálogo</span>
              <span className={config?.dialogueDetectionEnabled ? 'text-primary' : 'text-muted-foreground'}>
                {config?.dialogueDetectionEnabled ? 'Ativado' : 'Desativado'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Gravação automática</span>
              <span className={config?.autoStartRecording ? 'text-primary' : 'text-muted-foreground'}>
                {config?.autoStartRecording ? 'Sim' : 'Não'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Servidor</span>
              <span className="text-foreground truncate max-w-[200px]">
                {config?.apiBaseUrl || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardPage;
