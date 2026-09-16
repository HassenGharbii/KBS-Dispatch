import * as Crypto from 'expo-crypto';
import { getDb } from '../client';
import type { Shift, SyncStatus } from '../../types/domain';

interface ShiftRow {
  id: string;
  agent_id: string;
  site_id: string;
  mission_id: string | null;
  status: 'open' | 'closed';
  start_at: string;
  start_lat: number | null;
  start_lng: number | null;
  start_accuracy: number | null;
  end_at: string | null;
  end_lat: number | null;
  end_lng: number | null;
  end_accuracy: number | null;
  created_at: string;
  updated_at: string;
  sync_status: SyncStatus;
  sync_error: string | null;
  sync_attempts: number;
  next_retry_at: string | null;
}

function toShift(row: ShiftRow): Shift {
  return {
    id: row.id,
    agentId: row.agent_id,
    siteId: row.site_id,
    missionId: row.mission_id,
    status: row.status,
    startAt: row.start_at,
    startLat: row.start_lat,
    startLng: row.start_lng,
    startAccuracy: row.start_accuracy,
    endAt: row.end_at,
    endLat: row.end_lat,
    endLng: row.end_lng,
    endAccuracy: row.end_accuracy,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    syncStatus: row.sync_status,
    syncError: row.sync_error,
    syncAttempts: row.sync_attempts,
    nextRetryAt: row.next_retry_at,
  };
}

export interface StartShiftInput {
  agentId: string;
  siteId: string;
  missionId?: string | null;
  startLat: number | null;
  startLng: number | null;
  startAccuracy: number | null;
}

export async function startShift(input: StartShiftInput): Promise<Shift> {
  const db = await getDb();
  const id = Crypto.randomUUID();
  const now = new Date().toISOString();
  await db.runAsync(
    `INSERT INTO shifts (id, agent_id, site_id, mission_id, status, start_at, start_lat, start_lng, start_accuracy, created_at, updated_at, sync_status)
     VALUES (?, ?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, 'pending')`,
    [
      id,
      input.agentId,
      input.siteId,
      input.missionId ?? null,
      now,
      input.startLat,
      input.startLng,
      input.startAccuracy,
      now,
      now,
    ]
  );
  const shift = await getShiftById(id);
  if (!shift) throw new Error('Failed to read back newly created shift');
  return shift;
}

/** Fills in a start-location GPS fix that resolved after clock-in already proceeded. */
export async function backfillShiftStartLocation(
  id: string,
  lat: number,
  lng: number,
  accuracy: number | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE shifts SET start_lat = ?, start_lng = ?, start_accuracy = ?, updated_at = ?,
       sync_status = CASE WHEN sync_status = 'synced' THEN 'pending' ELSE sync_status END
     WHERE id = ? AND start_lat IS NULL`,
    [lat, lng, accuracy, new Date().toISOString(), id]
  );
}

export async function endShift(
  id: string,
  endLat: number | null,
  endLng: number | null,
  endAccuracy: number | null
): Promise<void> {
  const db = await getDb();
  const now = new Date().toISOString();
  await db.runAsync(
    `UPDATE shifts SET status = 'closed', end_at = ?, end_lat = ?, end_lng = ?, end_accuracy = ?, updated_at = ?,
       sync_status = CASE WHEN sync_status = 'synced' THEN 'pending' ELSE sync_status END
     WHERE id = ?`,
    [now, endLat, endLng, endAccuracy, now, id]
  );
}

// Deliberately never flips sync_status back to 'pending': if the shift's
// initial close already synced, the row is closed server-side, and
// prevent_closed_shift_update (see migrations) rejects any further change
// from a non-dirigeant -- re-queuing this backfill would poison the sync
// batch (a single rejected row fails the whole multi-row upsert, so every
// *other* pending shift in that batch gets marked 'error' too). A late GPS
// fix improving end-location precision after the fact is a nice-to-have;
// silently keeping it local-only is far safer than that failure mode.
export async function backfillShiftEndLocation(
  id: string,
  lat: number,
  lng: number,
  accuracy: number | null
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE shifts SET end_lat = ?, end_lng = ?, end_accuracy = ?, updated_at = ?
     WHERE id = ? AND end_lat IS NULL`,
    [lat, lng, accuracy, new Date().toISOString(), id]
  );
}

export async function getOpenShift(agentId: string): Promise<Shift | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ShiftRow>(
    `SELECT * FROM shifts WHERE agent_id = ? AND status = 'open' ORDER BY start_at DESC LIMIT 1`,
    [agentId]
  );
  return row ? toShift(row) : null;
}

export async function getShiftById(id: string): Promise<Shift | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<ShiftRow>('SELECT * FROM shifts WHERE id = ?', [id]);
  return row ? toShift(row) : null;
}

export async function listShiftsForAgent(agentId: string): Promise<Shift[]> {
  const db = await getDb();
  const rows = await db.getAllAsync<ShiftRow>(
    'SELECT * FROM shifts WHERE agent_id = ? ORDER BY start_at DESC',
    [agentId]
  );
  return rows.map(toShift);
}

export interface MonthlySiteHours {
  siteId: string;
  siteName: string;
  hours: number;
}

export interface MonthlyStats {
  totalHours: number;
  daysWorked: number;
  distinctSiteCount: number;
  bySite: MonthlySiteHours[];
}

/** Open shifts count partial hours toward the total via `now()` as a floating end. */
export async function getMonthlyStatsForAgent(
  agentId: string,
  year: number,
  month: number // 1-12
): Promise<MonthlyStats> {
  const db = await getDb();
  const monthStart = new Date(Date.UTC(year, month - 1, 1)).toISOString();
  const monthEnd = new Date(Date.UTC(year, month, 1)).toISOString();

  const rows = await db.getAllAsync<{
    site_id: string;
    site_name: string;
    start_at: string;
    end_at: string | null;
  }>(
    `SELECT s.site_id as site_id, sites.name as site_name, s.start_at as start_at, s.end_at as end_at
     FROM shifts s
     JOIN sites ON sites.id = s.site_id
     WHERE s.agent_id = ? AND s.start_at >= ? AND s.start_at < ?`,
    [agentId, monthStart, monthEnd]
  );

  let totalHours = 0;
  const daysWorked = new Set<string>();
  const bySite = new Map<string, MonthlySiteHours>();

  for (const row of rows) {
    const startMs = new Date(row.start_at).getTime();
    const endMs = row.end_at ? new Date(row.end_at).getTime() : Date.now();
    const hours = Math.max(0, (endMs - startMs) / 3_600_000);

    totalHours += hours;
    daysWorked.add(row.start_at.slice(0, 10)); // overnight shifts count on their start date

    const existing = bySite.get(row.site_id);
    if (existing) {
      existing.hours += hours;
    } else {
      bySite.set(row.site_id, { siteId: row.site_id, siteName: row.site_name, hours });
    }
  }

  return {
    totalHours,
    daysWorked: daysWorked.size,
    distinctSiteCount: bySite.size,
    bySite: Array.from(bySite.values()).sort((a, b) => b.hours - a.hours),
  };
}

export async function listPendingShifts(): Promise<Shift[]> {
  const db = await getDb();
  const now = new Date().toISOString();
  const rows = await db.getAllAsync<ShiftRow>(
    `SELECT * FROM shifts WHERE sync_status IN ('pending', 'error') AND (next_retry_at IS NULL OR next_retry_at <= ?)`,
    [now]
  );
  return rows.map(toShift);
}

/**
 * Recovers rows left in 'syncing' by an interrupted app (killed mid-request,
 * so we never learned whether the upsert actually landed server-side).
 * Safe to re-queue as 'pending': every push is an idempotent id-keyed
 * upsert, so a redundant retry is harmless. Call once at app startup,
 * before the sync engine's first run.
 */
export async function resetStuckSyncingShifts(): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE shifts SET sync_status = 'pending' WHERE sync_status = 'syncing'`);
}

export async function markShiftsSyncing(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(`UPDATE shifts SET sync_status = 'syncing' WHERE id = ?`, [id]);
    }
  });
}

export async function markShiftsSynced(ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    for (const id of ids) {
      await db.runAsync(
        `UPDATE shifts SET sync_status = 'synced', sync_error = NULL WHERE id = ?`,
        [id]
      );
    }
  });
}

export async function markShiftSyncError(
  id: string,
  error: string,
  nextRetryAt: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE shifts SET sync_status = 'error', sync_error = ?, sync_attempts = sync_attempts + 1, next_retry_at = ? WHERE id = ?`,
    [error, nextRetryAt, id]
  );
}
