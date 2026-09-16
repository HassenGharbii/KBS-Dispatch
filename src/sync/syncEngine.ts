import { pushShifts } from './push/pushShifts';
import { pushEvents } from './push/pushEvents';
import { pushPhotos } from './push/pushPhotos';
import { pullReferenceData } from './pull/pullReferenceData';
import {
  listPendingShifts,
  resetStuckSyncingShifts,
} from '../db/repositories/shiftsRepo';
import {
  listPendingEventsForSyncedShifts,
  resetStuckSyncingEvents,
} from '../db/repositories/eventsRepo';
import {
  listPendingPhotosForSyncedEvents,
  resetStuckUploadingPhotos,
} from '../db/repositories/photosRepo';
import { useSyncStatusStore } from '../store/useSyncStatusStore';
import { useConnectivityStore } from '../store/useConnectivityStore';

let isRunning = false;

/**
 * If the app was killed mid-request, some rows can be stuck in
 * 'syncing'/'uploading' — a state the sync engine never re-queries, so
 * they'd otherwise sit forever without being retried. Call once at app
 * startup, before the first runSync(). Safe because every push is an
 * idempotent id-keyed upsert.
 */
export async function recoverInterruptedSync(): Promise<void> {
  await Promise.all([
    resetStuckSyncingShifts(),
    resetStuckSyncingEvents(),
    resetStuckUploadingPhotos(),
  ]);
}

export async function computePendingCount(): Promise<number> {
  const [shifts, events, photos] = await Promise.all([
    listPendingShifts(),
    listPendingEventsForSyncedShifts(),
    listPendingPhotosForSyncedEvents(),
  ]);
  return shifts.length + events.length + photos.length;
}

export async function refreshPendingCount(): Promise<void> {
  const count = await computePendingCount();
  useSyncStatusStore.getState().setPendingCount(count);
}

/** In-flight guarded: safe to call from multiple triggers firing at once. */
export async function runSync(): Promise<void> {
  if (isRunning) return;
  if (!useConnectivityStore.getState().isConnected) return;

  isRunning = true;
  useSyncStatusStore.getState().setSyncing(true);

  try {
    await pullReferenceData();
    // FK-respecting order: shifts must exist server-side before events, and
    // events before photos.
    await pushShifts();
    await pushEvents();
    await pushPhotos();
    useSyncStatusStore.getState().setLastSyncError(null);
    useSyncStatusStore.getState().setLastSyncedAt(new Date().toISOString());
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    useSyncStatusStore.getState().setLastSyncError(message);
  } finally {
    await refreshPendingCount();
    useSyncStatusStore.getState().setSyncing(false);
    isRunning = false;
  }
}
