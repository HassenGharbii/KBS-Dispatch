import * as Crypto from 'expo-crypto';
import { getDb } from '../client';
import type { Photo, PhotoSyncStatus } from '../../types/domain';

interface PhotoRow {
  id: string;
  event_id: string;
  agent_id: string;
  local_uri: string | null;
  remote_path: string | null;
  width: number | null;
  height: number | null;
  file_size_bytes: number | null;
  taken_at: string;
  sync_status: PhotoSyncStatus;
  sync_error: string | null;
  sync_attempts: number;
  next_retry_at: string | null;
}

function toPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    eventId: row.event_id,
    agentId: row.agent_id,
    localUri: row.local_uri,
    remotePath: row.remote_path,
    width: row.width,
    height: row.height,
    fileSizeBytes: row.file_size_bytes,
    takenAt: row.taken_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    syncAttempts: row.sync_attempts,
    nextRetryAt: row.next_retry_at,
  };
}

export interface CreatePhotoInput {
  eventId: string;
  agentId: string;
  localUri: string;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
}

export async function createPhoto(input: CreatePhotoInput): Promise<Photo> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO photos (id, event_id, agent_id, local_uri, width, height, file_size_bytes, taken_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [id, input.eventId, input.agentId, input.localUri, input.width, input.height, input.fileSizeBytes, now]
  );
  const photo = await getPhotoById(id);
  if (!photo) throw new Error('Failed to read back newly created photo');
  return photo;
}

export async function getPhotoById(id: string): Promise<Photo | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<PhotoRow>('SELECT * FROM photos WHERE id = ?', [id]);
  return row ? toPhoto(row) : null;
}

export async function listPhotosForEvent(eventId: string): Promise<Photo[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos WHERE event_id = ? ORDER BY taken_at ASC',
    [eventId]
  );
  return rows.map(toPhoto);
}

export async function countPhotosForEvent(eventId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM photos WHERE event_id = ?',
    [eventId]
  );
  return row?.count ?? 0;
}

/** Batched count, avoids one query per event when rendering a shift's event list. */
export async function countPhotosForEvents(eventIds: string[]): Promise<Record<string, number>> {
  if (eventIds.length === 0) return {};
  const db = await getDb();
  const placeholders = eventIds.map(() => '?').join(',');
  const rows = await db.getAllAsync<{ event_id: string; count: number }>(
    `SELECT event_id, COUNT(*) as count FROM photos WHERE event_id IN (${placeholders}) GROUP BY event_id`,
    eventIds
  );
  const map: Record<string, number> = {};
  for (const row of rows) map[row.event_id] = row.count;
  return map;
}

/** Photos whose parent event has already synced (FK must exist server-side first). */
export async function listPendingPhotosForSyncedEvents(): Promise<Photo[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const rows = await db.getAllAsync<PhotoRow>(
    `SELECT p.* FROM photos p
     JOIN events e ON e.id = p.event_id
     WHERE p.sync_status IN ('pending', 'error')
       AND (p.next_retry_at IS NULL OR p.next_retry_at <= ?)
       AND e.sync_status = 'synced'`,
    [now]
  );
  return rows.map(toPhoto);
}

/** See resetStuckSyncingShifts — same recovery, same idempotent-upload reasoning. */
export async function resetStuckUploadingPhotos(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE photos SET sync_status = 'pending' WHERE sync_status = 'uploading'`);
}

export async function markPhotosUploading(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(`UPDATE photos SET sync_status = 'uploading' WHERE id = ?`, [id]);
    }
  });
}

export async function markPhotoUploaded(id: string, remotePath: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE photos SET sync_status = 'uploaded', remote_path = ?, sync_error = NULL WHERE id = ?`,
    [remotePath, id]
  );
}

export async function markPhotoSyncError(
  id: string,
  error: string,
  nextRetryAt: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE photos SET sync_status = 'error', sync_error = ?, sync_attempts = sync_attempts + 1, next_retry_at = ? WHERE id = ?`,
    [error, nextRetryAt, id]
  );
}
