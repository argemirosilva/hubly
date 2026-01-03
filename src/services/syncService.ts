import { offlineStorage } from './offlineStorage';
import { apiService, type GPSPayload, type PanicPayload } from './api';
import { useAppStore } from '@/store/appStore';

const MAX_RETRIES = 5;

class SyncService {
  private isSyncing = false;
  private syncListeners: Set<(pending: number) => void> = new Set();

  addSyncListener(listener: (pending: number) => void) {
    this.syncListeners.add(listener);
  }

  removeSyncListener(listener: (pending: number) => void) {
    this.syncListeners.delete(listener);
  }

  private async notifyListeners() {
    const pending = await offlineStorage.getTotalPending();
    this.syncListeners.forEach((listener) => listener(pending));
  }

  async syncAll(): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
      return { success: 0, failed: 0 };
    }

    const user = useAppStore.getState().user;
    if (!user?.email) {
      return { success: 0, failed: 0 };
    }

    this.isSyncing = true;
    let success = 0;
    let failed = 0;

    try {
      // Sync panics first (most important)
      const panics = await offlineStorage.getPanics();
      for (const panic of panics) {
        if (panic.retryCount >= MAX_RETRIES) {
          await offlineStorage.deletePanic(panic.id);
          failed++;
          continue;
        }

        const payload: PanicPayload = {
          email_usuario: user.email,
          latitude: panic.latitude,
          longitude: panic.longitude,
          tipo_acionamento: 'botao_panico',
          bateria_percentual: await apiService.getBatteryLevel(),
        };

        const result = await apiService.sendPanicAlert(payload);

        if (result.success) {
          await offlineStorage.deletePanic(panic.id);
          success++;
        } else {
          failed++;
        }
      }

      // Sync audios - skip for now as they need storage upload
      const audios = await offlineStorage.getAudios();
      for (const audio of audios) {
        if (audio.retryCount >= MAX_RETRIES) {
          await offlineStorage.deleteAudio(audio.id);
          failed++;
          continue;
        }
        // Mark as failed for now - need storage implementation
        await offlineStorage.updateAudioRetry(audio.id);
        failed++;
      }

      // Sync locations
      const locations = await offlineStorage.getLocations();
      for (const location of locations) {
        const payload: GPSPayload = {
          email_usuario: user.email,
          latitude: location.latitude,
          longitude: location.longitude,
          precisao_metros: location.accuracy,
          timestamp_gps: new Date(location.timestamp).toISOString(),
          tipo_localizacao: 'automatico',
        };

        const result = await apiService.sendLocation(payload);

        if (result.success) {
          await offlineStorage.deleteLocation(location.id);
          success++;
        } else {
          failed++;
        }
      }

      // Clear stale entries after sync attempt
      await offlineStorage.clearStaleEntries();

      await this.notifyListeners();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }

    // Log sync results
    if (success > 0 || failed > 0) {
      console.log(`[Sync] Concluído: ${success} enviados, ${failed} falharam`);
    }

    return { success, failed };
  }

  async saveForOffline(
    type: 'audio' | 'location' | 'panic',
    data: any
  ): Promise<string> {
    let id: string;

    switch (type) {
      case 'audio':
        id = await offlineStorage.saveAudio(data);
        break;
      case 'location':
        id = await offlineStorage.saveLocation(data);
        break;
      case 'panic':
        id = await offlineStorage.savePanic(data);
        break;
    }

    await this.notifyListeners();
    return id;
  }

  async getPendingCount(): Promise<number> {
    return offlineStorage.getTotalPending();
  }
}

export const syncService = new SyncService();
