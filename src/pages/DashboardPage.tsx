import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, Shield, Volume2, VolumeX, Clock } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { apiService } from '@/services/api';
import RecordingControl from '@/components/RecordingControl';
import GPSControl from '@/components/GPSControl';
import PanicButton from '@/components/PanicButton';
import NetworkStatusBar from '@/components/NetworkStatusBar';
import NotificationSettings from '@/components/NotificationSettings';
import { AudioUploadTest } from '@/components/AudioUploadTest';
import { useToast } from '@/hooks/use-toast';
import { initOfflineDB } from '@/services/offlineStorage';
import { pushNotificationService } from '@/services/pushNotifications';
import { useScheduledRecording } from '@/hooks/useScheduledRecording';
import { usePingService } from '@/hooks/usePingService';
import { useConfigRefresh } from '@/hooks/useConfigRefresh';
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, config, logout, soundEnabled, setSoundEnabled } = useAppStore();
  const { toast } = useToast();
  
  // Hook para controle automático da escuta de comandos de voz por horário
  const { isInSchedule, nextScheduleInfo, scheduledStart, scheduledEnd, scheduledDays, voiceCommandEnabled, isManualOverride } = useScheduledRecording();
  
  // Hook para serviço de ping (mantém status online)
  const { stop: stopPingService } = usePingService();
  
  // Hook para atualizar configurações a cada 15 min
  useConfigRefresh();

  useEffect(() => {
    if (!user) {
      navigate('/');
    }
  }, [user, navigate]);

  // Initialize offline database and push notifications
  useEffect(() => {
    initOfflineDB().catch(console.error);
    pushNotificationService.initialize().catch(console.error);
  }, []);

  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (isLoggingOut) return;
    
    setIsLoggingOut(true);
    
    try {
      // Parar serviço de ping ANTES do logout
      await stopPingService();
      console.log('[Logout] Serviço de ping parado');
      
      // Notificar a API sobre o logout
      if (user?.email) {
        await apiService.logout(user.email, user.sessionToken);
      }
    } catch (error) {
      console.error('[Logout] Erro ao notificar servidor:', error);
    } finally {
      // Sempre limpar estado local, mesmo se a API falhar
      logout();
      toast({
        title: 'Desconectado',
        description: 'Sessão encerrada com sucesso',
      });
      navigate('/');
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl gradient-primary flex items-center justify-center shadow-soft">
              <Shield className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground font-display">Ampara</h1>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <User className="w-3 h-3" />
                {user.nome || user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                toast({
                  title: soundEnabled ? 'Sons desativados' : 'Sons ativados',
                  description: soundEnabled 
                    ? 'O app respeitará o modo silencioso' 
                    : 'Alertas sonoros habilitados',
                });
              }}
              className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-soft ${
                soundEnabled 
                  ? 'bg-accent text-primary hover:bg-accent/80' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            >
              {soundEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center text-primary hover:bg-accent/80 transition-all duration-300 shadow-soft"
            >
              <Settings className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center text-primary hover:text-emergency hover:bg-emergency/10 transition-all duration-300"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Network Status Bar */}
      <NetworkStatusBar />

      {/* Status Bar */}
      <div className="px-4 py-3 bg-accent/50 border-b border-border">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Gravação: <span className="text-primary font-semibold">{config?.recordingDurationMinutes || 5} min</span>
          </span>
          <span className="text-muted-foreground">
            GPS: <span className="text-primary font-semibold">cada {config?.gpsIntervalSeconds || 30}s</span>
          </span>
        </div>
        
        {/* Horário Programado */}
        {scheduledStart && scheduledEnd && (
          <div className="mt-2 flex items-center gap-2 text-xs">
            <Clock className="w-3 h-3 text-muted-foreground" />
            <span className={isInSchedule ? 'text-success font-semibold' : 'text-muted-foreground'}>
              {isInSchedule ? '● Escuta ativa' : 'Agendado:'} {scheduledStart} - {scheduledEnd}
            </span>
            {scheduledDays.length > 0 && (
              <span className="text-muted-foreground">
                ({scheduledDays.join(', ')})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Main Content */}
      <main className="p-4 space-y-4 pb-8">
        {/* Panic Button - Most prominent */}
        <PanicButton />

        {/* Recording Control */}
        <RecordingControl 
          voiceCommandEnabled={voiceCommandEnabled} 
          scheduleInfo={nextScheduleInfo}
          isInSchedule={isInSchedule}
          isManualOverride={isManualOverride}
        />

        {/* GPS Control */}
        <GPSControl />

        {/* Notification Settings */}
        <NotificationSettings />

        {/* Teste de Upload de Áudio - REMOVER APÓS TESTES */}
        <AudioUploadTest />

        {/* Config Info */}
        <div className="card-ampara">
          <h4 className="text-sm font-semibold text-foreground mb-3 font-display">Configurações Ativas</h4>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Detecção de diálogo</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.dialogueDetectionEnabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {config?.dialogueDetectionEnabled ? 'Ativado' : 'Desativado'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Gravação automática</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config?.autoStartRecording ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'}`}>
                {config?.autoStartRecording ? 'Sim' : 'Não'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Modo offline</span>
              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-success/10 text-success">Ativado</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Servidor</span>
              <span className="text-foreground truncate max-w-[180px] text-xs font-mono">
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
