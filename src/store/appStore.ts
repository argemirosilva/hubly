import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, User, LoginTipo } from '@/types/app';

interface AppState {
  user: User | null;
  config: AppConfig | null;
  isRecording: boolean;
  isTracking: boolean;
  isPanicActive: boolean;
  soundEnabled: boolean;
  loginTipo: LoginTipo;
  isCoercionMode: boolean; // Modo coação ativo
  voiceCommandManualOverride: boolean | null; // null = seguir horário, true/false = manual
  microphoneEnabled: boolean; // Flag para ativar/desativar microfone (testes)
  
  setUser: (user: User | null) => void;
  setConfig: (config: AppConfig | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsTracking: (isTracking: boolean) => void;
  setIsPanicActive: (isPanicActive: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setLoginTipo: (tipo: LoginTipo) => void;
  setCoercionMode: (active: boolean) => void;
  setVoiceCommandManualOverride: (override: boolean | null) => void;
  setMicrophoneEnabled: (enabled: boolean) => void;
  logout: () => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      user: null,
      config: null,
      isRecording: false,
      isTracking: false,
      isPanicActive: false,
      soundEnabled: true,
      loginTipo: 'normal' as LoginTipo,
      isCoercionMode: false,
      voiceCommandManualOverride: null,
      microphoneEnabled: false, // Desativado por padrão para testes
      
      setUser: (user) => set({ user }),
      setConfig: (config) => set({ config }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsTracking: (isTracking) => set({ isTracking }),
      setIsPanicActive: (isPanicActive) => set({ isPanicActive }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setLoginTipo: (tipo) => set({ loginTipo: tipo }),
      setCoercionMode: (active) => set({ isCoercionMode: active }),
      setVoiceCommandManualOverride: (override) => set({ voiceCommandManualOverride: override }),
      setMicrophoneEnabled: (enabled) => set({ microphoneEnabled: enabled }),
      logout: () => set({ 
        user: null, 
        config: null, 
        isRecording: false, 
        isTracking: false, 
        isPanicActive: false, 
        soundEnabled: true,
        loginTipo: 'normal' as LoginTipo,
        isCoercionMode: false,
        voiceCommandManualOverride: null,
        // microphoneEnabled mantém o valor para testes
      }),
    }),
    {
      name: 'ampara-storage',
      partialize: (state) => ({ 
        user: state.user, 
        config: state.config, 
        soundEnabled: state.soundEnabled,
        loginTipo: state.loginTipo,
        isCoercionMode: state.isCoercionMode,
        voiceCommandManualOverride: state.voiceCommandManualOverride,
        microphoneEnabled: state.microphoneEnabled,
      }),
    }
  )
);
