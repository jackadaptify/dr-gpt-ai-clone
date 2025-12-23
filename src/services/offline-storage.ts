import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface DrGPTDB extends DBSchema {
    recordings: {
        key: string;
        value: {
            id: string;
            blob: Blob;
            timestamp: number;
            consultationId?: string;
            status: 'pending' | 'synced' | 'failed';
        };
        indexes: { 'by-status': string };
    };
    pending_transcriptions: {
        key: string;
        value: {
            id: string;
            recordingId: string;
            timestamp: number;
            retryCount: number;
        };
    };
}

const DB_NAME = 'dr-gpt-db';
const DB_VERSION = 1;

class OfflineStorageService {
    private dbPromise: Promise<IDBPDatabase<DrGPTDB>>;

    constructor() {
        this.dbPromise = openDB<DrGPTDB>(DB_NAME, DB_VERSION, {
            upgrade(db) {
                // Store for raw audio recordings
                const recordingStore = db.createObjectStore('recordings', { keyPath: 'id' });
                recordingStore.createIndex('by-status', 'status');

                // Store for queueing sync tasks
                db.createObjectStore('pending_transcriptions', { keyPath: 'id' });
            },
        });
    }

    async saveRecording(id: string, blob: Blob, consultationId?: string) {
        const db = await this.dbPromise;
        await db.put('recordings', {
            id,
            blob,
            timestamp: Date.now(),
            consultationId,
            status: 'pending',
        });
    }

    async getPendingRecordings() {
        const db = await this.dbPromise;
        return db.getAllFromIndex('recordings', 'by-status', 'pending');
    }

    async markRecordingSynced(id: string) {
        const db = await this.dbPromise;
        const recording = await db.get('recordings', id);
        if (recording) {
            recording.status = 'synced';
            await db.put('recordings', recording);
        }
    }

    async markRecordingFailed(id: string) {
        const db = await this.dbPromise;
        const recording = await db.get('recordings', id);
        if (recording) {
            recording.status = 'failed';
            await db.put('recordings', recording);
        }
    }

    async getRecording(id: string) {
        const db = await this.dbPromise;
        return db.get('recordings', id);
    }

    async deleteRecording(id: string) {
        const db = await this.dbPromise;
        await db.delete('recordings', id);
    }
}

export const offlineStorage = new OfflineStorageService();
