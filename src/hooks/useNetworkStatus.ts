import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '@/store/appStore';
import { syncService } from '@/services/syncService';
import { useToast } from '@/hooks/use-toast';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingSync, setPendingSync] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const { user } = useAppStore();
  const { toast } = useToast();

  // Update pending count
  const updatePendingCount = useCallback(async () => {
    const count = await syncService.getPendingCount();
    setPendingSync(count);
  }, []);

  // Sync pending items
  const syncPending = useCallback(async () => {
    if (!user?.email || isSyncing || !isOnline) return;

    setIsSyncing(true);
    try {
      const result = await syncService.syncAll();
      
      if (result.success > 0) {
        toast({
          title: 'Sincronização concluída',
          description: `${result.success} item(ns) enviado(s)`,
        });
      }

      await updatePendingCount();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      setIsSyncing(false);
    }
  }, [user, isSyncing, isOnline, toast, updatePendingCount]);

  // Listen for network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      toast({
        title: 'Conexão restaurada',
        description: 'Sincronizando dados pendentes...',
      });
      // Auto sync when back online
      setTimeout(syncPending, 1000);
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast({
        title: 'Sem conexão',
        description: 'Dados serão salvos localmente',
        variant: 'destructive',
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast, syncPending]);

  // Listen for pending count changes
  useEffect(() => {
    const listener = (count: number) => setPendingSync(count);
    syncService.addSyncListener(listener);
    updatePendingCount();

    return () => {
      syncService.removeSyncListener(listener);
    };
  }, [updatePendingCount]);

  // Periodic sync check
  useEffect(() => {
    if (!isOnline || !user) return;

    const interval = setInterval(() => {
      if (pendingSync > 0) {
        syncPending();
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [isOnline, user, pendingSync, syncPending]);

  return {
    isOnline,
    pendingSync,
    isSyncing,
    syncPending,
    updatePendingCount,
  };
};
