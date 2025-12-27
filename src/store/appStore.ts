import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppConfig, User } from '@/types/app';

interface AppState {
  user: User | null;
  config: AppConfig | null;
  isRecording: boolean;
  isTracking: boolean;
  isPanicActive: boolean;
  
  setUser: (user: User | null) => void;
  setConfig: (config: AppConfig | null) => void;
  setIsRecording: (isRecording: boolean) => void;
  setIsTracking: (isTracking: boolean) => void;
  setIsPanicActive: (isPanicActive: boolean) => void;
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
      
      setUser: (user) => set({ user }),
      setConfig: (config) => set({ config }),
      setIsRecording: (isRecording) => set({ isRecording }),
      setIsTracking: (isTracking) => set({ isTracking }),
      setIsPanicActive: (isPanicActive) => set({ isPanicActive }),
      logout: () => set({ user: null, config: null, isRecording: false, isTracking: false, isPanicActive: false }),
    }),
    {
      name: 'monitor-app-storage',
      partialize: (state) => ({ user: state.user, config: state.config }),
    }
  )
);
