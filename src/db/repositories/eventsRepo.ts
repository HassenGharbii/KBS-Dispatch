import * as Crypto from 'expo-crypto';
import { getDb } from '../client';
import type { CategoryCode } from '../../constants/referenceList';
import type { LogbookEvent, SyncStatus } from '../../types/domain';

interface EventRow {
  id: string;
  shift_id: string;
  agent_id: string;
  category_code: string;
  item_codes: string; // JSON array
  comment: string | null;
  occurred_at: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
  sync_error: string | null;
  sync_attempts: number;
  next_retry_at: string | null;
}

function toEvent(row: EventRow): LogbookEvent {
  return {
    id: row.id,
    shiftId: row.shift_id,
    agentId: row.agent_id,
    categoryCode: row.category_code as CategoryCode,
    itemCodes: JSON.parse(row.item_codes) as string[],
    comment: row.comment,
    occurredAt: row.occurred_at,
    lat: row.lat,
    lng: row.lng,
    accuracy: row.accuracy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    syncAttempts: row.sync_attempts,
    nextRetryAt: row.next_retry_at,
  };
}

export interface CreateEventInput {
  shiftId: string;
  agentId: string;
  categoryCode: CategoryCode;
  itemCodes: string[];
  comment: string | null;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
}

export async function createEvent(input: CreateEventInput): Promise<LogbookEvent> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO events (id, shift_id, agent_id, category_code, item_codes, comment, occurred_at, lat, lng, accuracy, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      input.shiftId,
      input.agentId,
      input.categoryCode,
      JSON.stringify(input.itemCodes),
      input.comment,
      now,
      input.lat,
      input.lng,
      input.accuracy,
      now,
      now,
    ]
  );
  const event = await getEventById(id);
  if (!event) throw new Error('Failed to read back newly created event');
  return event;
}

export interface UpdateEventInput {
  categoryCode: CategoryCode;
  itemCodes: string[];
  comment: string | null;
}

/** Only affects rows not yet synced — matches the "editable before sync only" rule. */
export async function updateEventIfNotSynced(
  id: string,
  input: UpdateEventInput
): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync(
    `UPDATE events SET category_code = ?, item_codes = ?, comment = ?, updated_at = ?
     WHERE id = ? AND sync_status != 'synced'`,
    [input.categoryCode, JSON.stringify(input.itemCodes), input.comment, new Date().toISOString(), id]
  );
  return result.changes > 0;
}

/** Only deletes rows not yet synced — matches the "editable before sync only" rule. */
export async function deleteEventIfNotSynced(id: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.runAsync(
    `DELETE FROM events WHERE id = ? AND sync_status != 'synced'`,
    [id]
  );
  return result.changes > 0;
}

export async function getEventById(id: string): Promise<LogbookEvent | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<EventRow>('SELECT * FROM events WHERE id = ?', [id]);
  return row ? toEvent(row) : null;
}

export async function listEventsForShift(shiftId: string): Promise<LogbookEvent[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<EventRow>(
    'SELECT * FROM events WHERE shift_id = ? ORDER BY occurred_at ASC',
    [shiftId]
  );
  return rows.map(toEvent);
}

/** Events whose parent shift has already synced (FK must exist server-side first). */
export async function listPendingEventsForSyncedShifts(): Promise<LogbookEvent[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const rows = await db.getAllAsync<EventRow>(
    `SELECT e.* FROM events e
     JOIN shifts s ON s.id = e.shift_id
     WHERE e.sync_status IN ('pending', 'error')
       AND (e.next_retry_at IS NULL OR e.next_retry_at <= ?)
       AND s.sync_status = 'synced'`,
    [now]
  );
  return rows.map(toEvent);
}

/** See resetStuckSyncingShifts — same recovery, same idempotent-upsert reasoning. */
export async function resetStuckSyncingEvents(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE events SET sync_status = 'pending' WHERE sync_status = 'syncing'`);
}

export async function markEventsSyncing(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(`UPDATE events SET sync_status = 'syncing' WHERE id = ?`, [id]);
    }
  });
}

export async function markEventsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        `UPDATE events SET sync_status = 'synced', sync_error = NULL WHERE id = ?`,
        [id]
      );
    }
  });
}

export async function markEventSyncError(
  id: string,
  error: string,
  nextRetryAt: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE events SET sync_status = 'error', sync_error = ?, sync_attempts = sync_attempts + 1, next_retry_at = ? WHERE id = ?`,
    [error, nextRetryAt, id]
  );
}
