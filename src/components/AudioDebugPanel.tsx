import React, { useState, useEffect } from 'react';
import { Bug, Trash2, ChevronDown, ChevronUp, User, Wifi, WifiOff } from 'lucide-react';
import { useAppStore } from '@/store/appStore';
import { Button } from '@/components/ui/button';

interface DebugLog {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'error' | 'warning';
  message: string;
  data?: any;
}

// Event bus para logs de debug
export const audioDebugEvents = {
  logs: [] as DebugLog[],
  listeners: new Set<() => void>(),
  
  addLog(type: DebugLog['type'], message: string, data?: any) {
    const log: DebugLog = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      type,
      message,
      data
    };
    this.logs.unshift(log);
    // Keep only last 50 logs
    if (this.logs.length > 50) {
      this.logs = this.logs.slice(0, 50);
    }
    this.notify();
  },
  
  clear() {
    this.logs = [];
    this.notify();
  },
  
  subscribe(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  },
  
  notify() {
    this.listeners.forEach(l => l());
  }
};

// Helper functions to log from anywhere
export const debugLog = {
  info: (msg: string, data?: any) => audioDebugEvents.addLog('info', msg, data),
  success: (msg: string, data?: any) => audioDebugEvents.addLog('success', msg, data),
  error: (msg: string, data?: any) => audioDebugEvents.addLog('error', msg, data),
  warning: (msg: string, data?: any) => audioDebugEvents.addLog('warning', msg, data),
};

export const AudioDebugPanel: React.FC = () => {
  const { user } = useAppStore();
  const [logs, setLogs] = useState<DebugLog[]>([]);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const unsubscribe = audioDebugEvents.subscribe(() => {
      setLogs([...audioDebugEvents.logs]);
    });
    
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      unsubscribe();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const getTypeColor = (type: DebugLog['type']) => {
    switch (type) {
      case 'success': return 'text-green-400 bg-green-500/20';
      case 'error': return 'text-red-400 bg-red-500/20';
      case 'warning': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-blue-400 bg-blue-500/20';
    }
  };

  const formatTime = (date: Date) => {
    const time = date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
    });
    const ms = date.getMilliseconds().toString().padStart(3, '0');
    return `${time}.${ms}`;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div 
        className="flex items-center justify-between p-3 bg-muted/50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-orange-500" />
          <span className="font-semibold text-sm">Debug Áudio</span>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {logs.length} logs
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isExpanded && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                audioDebugEvents.clear();
              }}
              className="h-6 px-2 text-xs"
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Limpar
            </Button>
          )}
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {isExpanded && (
        <>
          {/* Status Info */}
          <div className="px-3 py-2 bg-muted/30 border-b border-border text-xs space-y-1">
            <div className="flex items-center gap-2">
              <User className="w-3 h-3 text-muted-foreground" />
              <span className="text-muted-foreground">Usuário:</span>
              <span className={user?.email ? 'text-green-400 font-mono' : 'text-red-400'}>
                {user?.email || 'NÃO LOGADO'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {isOnline ? (
                <Wifi className="w-3 h-3 text-green-400" />
              ) : (
                <WifiOff className="w-3 h-3 text-red-400" />
              )}
              <span className="text-muted-foreground">Status:</span>
              <span className={isOnline ? 'text-green-400' : 'text-red-400'}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
          </div>

          {/* Logs */}
          <div className="max-h-64 overflow-y-auto">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground text-sm">
                Nenhum log ainda. Tente gravar um áudio.
              </div>
            ) : (
              <div className="divide-y divide-border/50">
                {logs.map((log) => (
                  <div key={log.id} className="p-2 text-xs hover:bg-muted/30">
                    <div className="flex items-start gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${getTypeColor(log.type)}`}>
                        {log.type}
                      </span>
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {formatTime(log.timestamp)}
                      </span>
                    </div>
                    <p className="mt-1 text-foreground">{log.message}</p>
                    {log.data && (
                      <pre className="mt-1 p-2 bg-muted/50 rounded text-[10px] font-mono overflow-x-auto text-muted-foreground">
                        {typeof log.data === 'string' 
                          ? log.data 
                          : JSON.stringify(log.data, null, 2)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
