import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, Settings, User, Shield, Volume2, VolumeX, Clock, Eye, EyeOff, Radio } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { apiService, SESSION_EXPIRED_EVENT } from '@/services/api';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, config, logout, soundEnabled, setSoundEnabled, setCoercionMode } = useAppStore();
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

  // Listener para sessão expirada
  useEffect(() => {
    const handleSessionExpired = () => {
      console.warn('[Dashboard] Sessão expirada, fazendo logout automático');
      logout();
      toast({
        title: 'Sessão expirada',
        description: 'Faça login novamente para continuar',
        variant: 'destructive',
      });
      navigate('/');
    };

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => {
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [logout, navigate, toast]);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [logoutPassword, setLogoutPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const API_URL = 'https://amparamulher.lovable.app';

  const handleConfirmLogout = async () => {
    if (isLoggingOut) return;
    
    if (!logoutPassword.trim()) {
      setPasswordError('Digite sua senha para confirmar');
      return;
    }
    
    setIsLoggingOut(true);
    setPasswordError('');
    
    try {
      // Verificar a senha via API
      const result = await apiService.login(
        user?.email || '',
        logoutPassword,
        API_URL,
        'login'
      );

      if (!result.success) {
        setPasswordError('Senha incorreta');
        setIsLoggingOut(false);
        return;
      }

      // Se for senha de coação, iniciar modo coação
      if (result.data?.loginTipo === 'coacao') {
        setCoercionMode(true);
        setShowLogoutConfirm(false);
        setLogoutPassword('');
        // Navegar para tela falsa de desinstalação
        navigate('/uninstall');
        return;
      }

      // Parar serviço de ping ANTES do logout
      await stopPingService();
      console.log('[Logout] Serviço de ping parado');
      
      // Notificar a API sobre o logout
      if (user?.email) {
        await apiService.logout(user.email, user.sessionToken);
      }
      
      // Limpar estado local
      logout();
      toast({
        title: 'Desconectado',
        description: 'Sessão encerrada com sucesso',
      });
      navigate('/');
    } catch (error) {
      console.error('[Logout] Erro:', error);
      setPasswordError('Erro ao verificar senha. Tente novamente.');
    } finally {
      setIsLoggingOut(false);
    }
  };

  const handleCloseLogoutDialog = () => {
    setShowLogoutConfirm(false);
    setLogoutPassword('');
    setPasswordError('');
    setShowPassword(false);
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background safe-area-inset">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-soft ${
              isInSchedule ? 'gradient-primary' : 'bg-muted'
            }`}>
              <Shield className={`w-5 h-5 ${isInSchedule ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-lg font-bold text-foreground font-display">Ampara</h1>
                {isInSchedule && (
                  <div className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-success/20">
                    <Radio className="w-2.5 h-2.5 text-success animate-pulse" />
                    <span className="text-[8px] font-bold text-success uppercase">Ativo</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                <User className="w-2.5 h-2.5" />
                {user.nome || user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
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
              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-300 shadow-soft ${
                soundEnabled 
                  ? 'bg-accent text-primary hover:bg-accent/80' 
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
              title={soundEnabled ? 'Desativar sons' : 'Ativar sons'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-primary hover:bg-accent/80 transition-all duration-300 shadow-soft"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-9 h-9 rounded-xl bg-accent flex items-center justify-center text-primary hover:text-emergency hover:bg-emergency/10 transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Network Status Bar */}
      <NetworkStatusBar />

      {/* Status Bar */}
      <div className="px-3 py-2 bg-accent/50 border-b border-border">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">
            Gravação: <span className="text-primary font-semibold">{config?.recordingDurationMinutes || 5} min</span>
          </span>
          <span className="text-muted-foreground">
            GPS: <span className="text-primary font-semibold">cada {config?.gpsIntervalSeconds || 30}s</span>
          </span>
        </div>
        
        {/* Horário Programado */}
        {scheduledStart && scheduledEnd && (
          <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
            <Clock className="w-2.5 h-2.5 text-muted-foreground" />
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
      <main className="p-3 space-y-3 pb-6">
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

      </main>

      {/* Logout Confirmation Dialog with Password */}
      <Dialog open={showLogoutConfirm} onOpenChange={handleCloseLogoutDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar saída</DialogTitle>
            <DialogDescription>
              Digite sua senha para confirmar a saída do aplicativo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="logout-password" className="text-sm font-medium">
                Senha
              </Label>
              <div className="relative">
                <Input
                  id="logout-password"
                  type={showPassword ? 'text' : 'password'}
                  value={logoutPassword}
                  onChange={(e) => {
                    setLogoutPassword(e.target.value);
                    if (passwordError) setPasswordError('');
                  }}
                  placeholder="Digite sua senha"
                  className={`pr-12 ${passwordError ? 'border-destructive' : ''}`}
                  disabled={isLoggingOut}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoggingOut}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button
              variant="outline"
              onClick={handleCloseLogoutDialog}
              disabled={isLoggingOut}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmLogout}
              disabled={isLoggingOut}
              variant="destructive"
            >
              {isLoggingOut ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin" />
                  Verificando...
                </span>
              ) : (
                'Confirmar saída'
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
export default DashboardPage;
