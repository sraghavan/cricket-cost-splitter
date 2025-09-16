import { AppData } from '../types';
import { FirebaseStorage, createFirebaseStorage, isFirebaseConfigured } from './firebaseStorage';
import { loadData, saveData } from './storage';

// Storage interface
interface StorageAdapter {
  saveData(data: AppData): Promise<void> | void;
  loadData(): Promise<AppData | null> | AppData | null;
  onDataChange?(callback: (data: AppData | null) => void): () => void;
  isOnline?(): boolean;
}

// Local storage adapter
class LocalStorageAdapter implements StorageAdapter {
  saveData(data: AppData): void {
    saveData(data);
  }

  loadData(): AppData {
    return loadData();
  }

  isOnline(): boolean {
    return false; // Local storage is always "offline"
  }
}

// Hybrid storage adapter (Firebase + localStorage)
class HybridStorageAdapter implements StorageAdapter {
  private firebaseStorage: FirebaseStorage;
  private localStorageAdapter: LocalStorageAdapter;
  private isOnlineMode: boolean = navigator.onLine;

  constructor(userId?: string) {
    this.firebaseStorage = createFirebaseStorage(userId);
    this.localStorageAdapter = new LocalStorageAdapter();
    
    // Listen for online/offline events
    window.addEventListener('online', () => {
      this.isOnlineMode = true;
      this.syncData();
    });
    window.addEventListener('offline', () => {
      this.isOnlineMode = false;
    });
  }

  async saveData(data: AppData): Promise<void> {
    // Always save to localStorage first (immediate)
    this.localStorageAdapter.saveData(data);
    
    // Save to Firebase if online and configured
    if (this.isOnlineMode && isFirebaseConfigured()) {
      try {
        await this.firebaseStorage.saveData(data);
      } catch (error) {
        console.warn('Failed to save to Firebase, data saved locally:', error);
      }
    }
  }

  async loadData(): Promise<AppData> {
    // If online and Firebase is configured, try Firebase first
    if (this.isOnlineMode && isFirebaseConfigured()) {
      try {
        const firebaseData = await this.firebaseStorage.loadData();
        if (firebaseData) {
          // Also update localStorage with the latest Firebase data
          this.localStorageAdapter.saveData(firebaseData);
          return firebaseData;
        }
      } catch (error) {
        console.warn('Failed to load from Firebase, falling back to localStorage:', error);
      }
    }
    
    // Fall back to localStorage
    return this.localStorageAdapter.loadData();
  }

  onDataChange(callback: (data: AppData | null) => void): () => void {
    if (isFirebaseConfigured()) {
      return this.firebaseStorage.onDataChange((data) => {
        if (data) {
          // Update localStorage when Firebase data changes
          this.localStorageAdapter.saveData(data);
        }
        callback(data);
      });
    } else {
      // For localStorage, we can't really listen for changes from other tabs
      // but we can return a no-op function
      return () => {};
    }
  }

  isOnline(): boolean {
    return this.isOnlineMode && isFirebaseConfigured();
  }

  private async syncData(): Promise<void> {
    if (!this.isOnlineMode || !isFirebaseConfigured()) return;

    try {
      const localData = this.localStorageAdapter.loadData();
      const firebaseData = await this.firebaseStorage.loadData();
      
      // Simple sync strategy: Firebase data takes precedence if it exists
      if (firebaseData && localData) {
        // Could implement more sophisticated conflict resolution here
        this.localStorageAdapter.saveData(firebaseData);
      } else if (localData && !firebaseData) {
        // Upload local data to Firebase
        await this.firebaseStorage.saveData(localData);
      }
    } catch (error) {
      console.error('Error syncing data:', error);
    }
  }

  async createBackup(): Promise<string> {
    if (isFirebaseConfigured()) {
      return this.firebaseStorage.createBackup();
    }
    throw new Error('Backup requires Firebase configuration');
  }

  async listBackups(): Promise<Array<{id: string, createdAt: Date}>> {
    if (isFirebaseConfigured()) {
      return this.firebaseStorage.listBackups();
    }
    return [];
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    if (isFirebaseConfigured()) {
      await this.firebaseStorage.restoreFromBackup(backupId);
      // Reload data to localStorage after restore
      const restoredData = await this.firebaseStorage.loadData();
      if (restoredData) {
        this.localStorageAdapter.saveData(restoredData);
      }
    } else {
      throw new Error('Restore requires Firebase configuration');
    }
  }
}

// Storage instance (singleton)
let storageInstance: StorageAdapter;

// Initialize storage
export const initializeEnhancedStorage = (userId?: string): StorageAdapter => {
  if (isFirebaseConfigured()) {
    console.log('Initializing hybrid storage (Firebase + localStorage)');
    storageInstance = new HybridStorageAdapter(userId);
  } else {
    console.log('Initializing localStorage only (Firebase not configured)');
    storageInstance = new LocalStorageAdapter();
  }
  return storageInstance;
};

// Get storage instance
export const getEnhancedStorage = (): StorageAdapter => {
  if (!storageInstance) {
    storageInstance = initializeEnhancedStorage();
  }
  return storageInstance;
};

// Enhanced functions
export const saveAppDataEnhanced = async (data: AppData): Promise<void> => {
  return getEnhancedStorage().saveData(data);
};

export const loadAppDataEnhanced = async (): Promise<AppData> => {
  const data = await getEnhancedStorage().loadData();
  return data || loadData(); // Fallback to original storage function
};

export const setupDataSync = (callback: (data: AppData | null) => void): () => void => {
  const storage = getEnhancedStorage();
  if (storage.onDataChange) {
    return storage.onDataChange(callback);
  }
  return () => {};
};

export const isOnlineSync = (): boolean => {
  const storage = getEnhancedStorage();
  return storage.isOnline ? storage.isOnline() : false;
};