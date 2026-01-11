import { create } from 'zustand';

export interface ApiLog {
  id: string;
  timestamp: Date;
  action: string;
  method: 'POST' | 'GET';
  url: string;
  requestPayload: object;
  responseData: object | null;
  responseStatus: number | null;
  error: string | null;
  durationMs: number;
  success: boolean;
}

interface ApiLogsState {
  logs: ApiLog[];
  addLog: (log: Omit<ApiLog, 'id'>) => void;
  clearLogs: () => void;
  maxLogs: number;
}

export const useApiLogsStore = create<ApiLogsState>((set) => ({
  logs: [],
  maxLogs: 500,
  addLog: (log) => set((state) => ({
    logs: [
      { ...log, id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}` },
      ...state.logs
    ].slice(0, state.maxLogs)
  })),
  clearLogs: () => set({ logs: [] }),
}));
