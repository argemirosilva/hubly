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
  
  setUser: (user: User | null) => void;
  setConfig: (config: AppConfig | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsTracking: (isTracking: boolean) => void;
  setIsPanicActive: (isPanicActive: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
  setLoginTipo: (tipo: LoginTipo) => void;
  setCoercionMode: (active: boolean) => void;
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
      
      setUser: (user) => set({ user }),
      setConfig: (config) => set({ config }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsTracking: (isTracking) => set({ isTracking }),
      setIsPanicActive: (isPanicActive) => set({ isPanicActive }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      setLoginTipo: (tipo) => set({ loginTipo: tipo }),
      setCoercionMode: (active) => set({ isCoercionMode: active }),
      logout: () => set({ 
        user: null, 
        config: null, 
        isRecording: false, 
        isTracking: false, 
        isPanicActive: false, 
        soundEnabled: true,
        loginTipo: 'normal' as LoginTipo,
        isCoercionMode: false,
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
      }),
    }
  )
);
