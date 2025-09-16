import { 
  doc, 
  getDoc, 
  setDoc, 
  onSnapshot, 
  Timestamp,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  getDocs
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { AppData, Player, Weekend, Match } from '../types';

const COLLECTION_NAME = 'cricket-cost-splitter';

export class FirebaseStorage {
  private userId: string;
  private docRef: any;

  constructor(userId: string = 'default-user') {
    this.userId = userId;
    this.docRef = doc(db, COLLECTION_NAME, this.userId);
  }

  // Save data to Firebase
  async saveData(data: AppData): Promise<void> {
    try {
      const firestoreData = {
        ...data,
        lastUpdated: Timestamp.now(),
        version: '1.0'
      };
      
      await setDoc(this.docRef, firestoreData, { merge: true });
      console.log('Data saved to Firebase successfully');
    } catch (error) {
      console.error('Error saving data to Firebase:', error);
      throw error;
    }
  }

  // Load data from Firebase
  async loadData(): Promise<AppData | null> {
    try {
      const docSnap = await getDoc(this.docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data() as any;
        // Remove Firebase-specific fields
        const { lastUpdated, version, ...appData } = data;
        console.log('Data loaded from Firebase successfully');
        return appData as AppData;
      } else {
        console.log('No data found in Firebase');
        return null;
      }
    } catch (error) {
      console.error('Error loading data from Firebase:', error);
      throw error;
    }
  }

  // Set up real-time listener for data changes
  onDataChange(callback: (data: AppData | null) => void): () => void {
    const unsubscribe = onSnapshot(this.docRef, (doc: any) => {
      if (doc.exists()) {
        const data = doc.data() as any;
        const { lastUpdated, version, ...appData } = data;
        callback(appData as AppData);
      } else {
        callback(null);
      }
    }, (error: any) => {
      console.error('Error listening to Firebase changes:', error);
      callback(null);
    });

    return unsubscribe;
  }

  // Backup/restore functionality
  async createBackup(): Promise<string> {
    try {
      const data = await this.loadData();
      if (!data) throw new Error('No data to backup');

      const backupRef = collection(db, `${COLLECTION_NAME}-backups`);
      const backupDoc = await addDoc(backupRef, {
        userId: this.userId,
        data,
        createdAt: Timestamp.now(),
        type: 'manual-backup'
      });

      return backupDoc.id;
    } catch (error) {
      console.error('Error creating backup:', error);
      throw error;
    }
  }

  async listBackups(): Promise<Array<{id: string, createdAt: Date}>> {
    try {
      const backupsRef = collection(db, `${COLLECTION_NAME}-backups`);
      const q = query(
        backupsRef,
        orderBy('createdAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        createdAt: doc.data().createdAt.toDate()
      }));
    } catch (error) {
      console.error('Error listing backups:', error);
      throw error;
    }
  }

  async restoreFromBackup(backupId: string): Promise<void> {
    try {
      const backupDoc = await getDoc(doc(db, `${COLLECTION_NAME}-backups`, backupId));
      
      if (!backupDoc.exists()) {
        throw new Error('Backup not found');
      }

      const backupData = backupDoc.data();
      await this.saveData(backupData.data);
      console.log('Data restored from backup successfully');
    } catch (error) {
      console.error('Error restoring from backup:', error);
      throw error;
    }
  }
}

// Factory function to create storage instance
export const createFirebaseStorage = (userId?: string) => {
  return new FirebaseStorage(userId);
};

// Helper function to check if Firebase is configured
export const isFirebaseConfigured = (): boolean => {
  return !!(
    process.env.REACT_APP_FIREBASE_API_KEY &&
    process.env.REACT_APP_FIREBASE_PROJECT_ID
  );
};