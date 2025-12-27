import React from 'react';
import { Wifi, WifiOff, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

const NetworkStatusBar: React.FC = () => {
  const { isOnline, pendingSync, isSyncing, syncPending } = useNetworkStatus();

  return (
    <div className={`flex items-center justify-between text-xs px-4 py-2 transition-colors ${
      isOnline ? 'bg-card/50' : 'bg-emergency/10'
    } border-b border-border`}>
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-primary" />
            <span className="text-primary font-medium">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-emergency" />
            <span className="text-emergency font-medium">Offline</span>
          </>
        )}
      </div>

      {/* Pending Sync */}
      {pendingSync > 0 && (
        <button
          onClick={syncPending}
          disabled={!isOnline || isSyncing}
          className="flex items-center gap-2 px-2 py-1 rounded-lg bg-secondary/50 hover:bg-secondary transition-colors disabled:opacity-50"
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
              <span className="text-muted-foreground">Sincronizando...</span>
            </>
          ) : isOnline ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-warning" />
              <span className="text-warning font-medium">{pendingSync} pendente(s)</span>
            </>
          ) : (
            <>
              <CloudOff className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">{pendingSync} salvo(s) localmente</span>
            </>
          )}
        </button>
      )}

      {/* All synced */}
      {pendingSync === 0 && isOnline && (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <Cloud className="w-3.5 h-3.5" />
          <span>Sincronizado</span>
        </div>
      )}
    </div>
  );
};

export default NetworkStatusBar;
