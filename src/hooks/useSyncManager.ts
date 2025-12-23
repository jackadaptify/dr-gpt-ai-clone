import { useState, useEffect } from 'react';
import { offlineStorage } from '../services/offline-storage';

export function useSyncManager() {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const checkPending = async () => {
        const pending = await offlineStorage.getPendingRecordings();
        setPendingCount(pending.length);
        return pending;
    };

    const sync = async () => {
        if (!isOnline || isSyncing) return;

        try {
            setIsSyncing(true);
            const pending = await checkPending();

            console.log(`[SyncManager] Found ${pending.length} pending items.`);

            for (const item of pending) {
                try {
                    // Here we would trigger the actual upload logic
                    // For now we will simulate it or expect the calling code to handle the upload
                    // Ideally, this hook or a service should call the API

                    console.log(`[SyncManager] Syncing item ${item.id}...`);
                    // simulate upload success for now until integrated with real API
                    // In real implementation: await uploadService.upload(item.blob)

                    // await offlineStorage.markRecordingSynced(item.id);
                } catch (error) {
                    console.error(`[SyncManager] Failed to sync item ${item.id}`, error);
                    await offlineStorage.markRecordingFailed(item.id);
                }
            }

            // Update count after sync attempt
            await checkPending();

        } catch (error) {
            console.error('[SyncManager] Sync error', error);
        } finally {
            setIsSyncing(false);
        }
    };

    // Auto-sync when coming online
    useEffect(() => {
        if (isOnline) {
            sync();
        }
    }, [isOnline]);

    // Initial check
    useEffect(() => {
        checkPending();
    }, []);

    return {
        isOnline,
        isSyncing,
        pendingCount,
        syncNow: sync,
        checkPending
    };
}
