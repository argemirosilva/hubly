import { offlineStorage } from './offlineStorage';
import { apiService } from './api';

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

  async syncAll(token: string): Promise<{ success: number; failed: number }> {
    if (this.isSyncing) {
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

        const result = await apiService.sendPanicAlert(
          {
            latitude: panic.latitude,
            longitude: panic.longitude,
            timestamp: panic.timestamp,
          },
          token
        );

        if (result.success) {
          await offlineStorage.deletePanic(panic.id);
          success++;
        } else {
          failed++;
        }
      }

      // Sync audios
      const audios = await offlineStorage.getAudios();
      for (const audio of audios) {
        if (audio.retryCount >= MAX_RETRIES) {
          await offlineStorage.deleteAudio(audio.id);
          failed++;
          continue;
        }

        const result = await apiService.sendAudio(audio.blob, token);

        if (result.success) {
          await offlineStorage.deleteAudio(audio.id);
          success++;
        } else {
          await offlineStorage.updateAudioRetry(audio.id);
          failed++;
        }
      }

      // Sync locations (batch if many)
      const locations = await offlineStorage.getLocations();
      for (const location of locations) {
        const result = await apiService.sendLocation(
          {
            latitude: location.latitude,
            longitude: location.longitude,
            timestamp: location.timestamp,
            accuracy: location.accuracy,
          },
          token
        );

        if (result.success) {
          await offlineStorage.deleteLocation(location.id);
          success++;
        } else {
          failed++;
        }
      }

      await this.notifyListeners();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
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
