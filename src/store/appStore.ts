import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, User } from '@/types/app';

interface AppState {
  user: User | null;
  config: AppConfig | null;
  isRecording: boolean;
  isTracking: boolean;
  isPanicActive: boolean;
  soundEnabled: boolean;
  
  setUser: (user: User | null) => void;
  setConfig: (config: AppConfig | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsTracking: (isTracking: boolean) => void;
  setIsPanicActive: (isPanicActive: boolean) => void;
  setSoundEnabled: (enabled: boolean) => void;
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
      
      setUser: (user) => set({ user }),
      setConfig: (config) => set({ config }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsTracking: (isTracking) => set({ isTracking }),
      setIsPanicActive: (isPanicActive) => set({ isPanicActive }),
      setSoundEnabled: (enabled) => set({ soundEnabled: enabled }),
      logout: () => set({ user: null, config: null, isRecording: false, isTracking: false, isPanicActive: false, soundEnabled: true }),
    }),
    {
      name: 'ampara-storage',
      partialize: (state) => ({ user: state.user, config: state.config, soundEnabled: state.soundEnabled }),
    }
  )
);
