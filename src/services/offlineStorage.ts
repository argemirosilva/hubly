import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface PendingAudio {
  id: string;
  blob: Blob;
  timestamp: number;
  hasSpeech: boolean;
  speechPercentage: number;
  retryCount: number;
}

interface PendingLocation {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  accuracy?: number;
  retryCount: number;
}

interface PendingPanic {
  id: string;
  latitude: number;
  longitude: number;
  timestamp: number;
  retryCount: number;
}

interface AmparaDB extends DBSchema {
  pendingAudios: {
    key: string;
    value: PendingAudio;
    indexes: { 'by-timestamp': number };
  };
  pendingLocations: {
    key: string;
    value: PendingLocation;
    indexes: { 'by-timestamp': number };
  };
  pendingPanics: {
    key: string;
    value: PendingPanic;
    indexes: { 'by-timestamp': number };
  };
}

const DB_NAME = 'ampara-offline-db';
const DB_VERSION = 1;

let db: IDBPDatabase<AmparaDB> | null = null;

export const initOfflineDB = async (): Promise<IDBPDatabase<AmparaDB>> => {
  if (db) return db;

  db = await openDB<AmparaDB>(DB_NAME, DB_VERSION, {
    upgrade(database) {
      // Pending audios store
      if (!database.objectStoreNames.contains('pendingAudios')) {
        const audioStore = database.createObjectStore('pendingAudios', { keyPath: 'id' });
        audioStore.createIndex('by-timestamp', 'timestamp');
      }

      // Pending locations store
      if (!database.objectStoreNames.contains('pendingLocations')) {
        const locationStore = database.createObjectStore('pendingLocations', { keyPath: 'id' });
        locationStore.createIndex('by-timestamp', 'timestamp');
      }

      // Pending panics store
      if (!database.objectStoreNames.contains('pendingPanics')) {
        const panicStore = database.createObjectStore('pendingPanics', { keyPath: 'id' });
        panicStore.createIndex('by-timestamp', 'timestamp');
      }
    },
  });

  return db;
};

export const offlineStorage = {
  // Audio methods
  async saveAudio(audio: Omit<PendingAudio, 'id' | 'retryCount'>): Promise<string> {
    const database = await initOfflineDB();
    const id = `audio-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await database.put('pendingAudios', { ...audio, id, retryCount: 0 });
    return id;
  },

  async getAudios(): Promise<PendingAudio[]> {
    const database = await initOfflineDB();
    return database.getAllFromIndex('pendingAudios', 'by-timestamp');
  },

  async deleteAudio(id: string): Promise<void> {
    const database = await initOfflineDB();
    await database.delete('pendingAudios', id);
  },

  async updateAudioRetry(id: string): Promise<void> {
    const database = await initOfflineDB();
    const audio = await database.get('pendingAudios', id);
    if (audio) {
      audio.retryCount++;
      await database.put('pendingAudios', audio);
    }
  },

  // Location methods
  async saveLocation(location: Omit<PendingLocation, 'id' | 'retryCount'>): Promise<string> {
    const database = await initOfflineDB();
    const id = `loc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await database.put('pendingLocations', { ...location, id, retryCount: 0 });
    return id;
  },

  async getLocations(): Promise<PendingLocation[]> {
    const database = await initOfflineDB();
    return database.getAllFromIndex('pendingLocations', 'by-timestamp');
  },

  async deleteLocation(id: string): Promise<void> {
    const database = await initOfflineDB();
    await database.delete('pendingLocations', id);
  },

  // Panic methods
  async savePanic(panic: Omit<PendingPanic, 'id' | 'retryCount'>): Promise<string> {
    const database = await initOfflineDB();
    const id = `panic-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    await database.put('pendingPanics', { ...panic, id, retryCount: 0 });
    return id;
  },

  async getPanics(): Promise<PendingPanic[]> {
    const database = await initOfflineDB();
    return database.getAllFromIndex('pendingPanics', 'by-timestamp');
  },

  async deletePanic(id: string): Promise<void> {
    const database = await initOfflineDB();
    await database.delete('pendingPanics', id);
  },

  // Get counts
  async getPendingCounts(): Promise<{ audios: number; locations: number; panics: number }> {
    const database = await initOfflineDB();
    const [audios, locations, panics] = await Promise.all([
      database.count('pendingAudios'),
      database.count('pendingLocations'),
      database.count('pendingPanics'),
    ]);
    return { audios, locations, panics };
  },

  async getTotalPending(): Promise<number> {
    const counts = await this.getPendingCounts();
    return counts.audios + counts.locations + counts.panics;
  },
};

export type { PendingAudio, PendingLocation, PendingPanic };
