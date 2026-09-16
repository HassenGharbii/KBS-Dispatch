import { supabase } from '../../lib/supabase';
import {
  listPendingShifts,
  markShiftsSyncing,
  markShiftsSynced,
  markShiftSyncError,
} from '../../db/repositories/shiftsRepo';
import { computeNextRetryAt } from '../backoff';

export async function pushShifts(): Promise<void> {
  const shifts = await listPendingShifts();
  if (shifts.length === 0) return;

  await markShiftsSyncing(shifts.map((s) => s.id));

  const rows = shifts.map((s) => ({
    id: s.id,
    agent_id: s.agentId,
    site_id: s.siteId,
    mission_id: s.missionId,
    status: s.status,
    start_at: s.startAt,
    start_lat: s.startLat,
    start_lng: s.startLng,
    start_accuracy: s.startAccuracy,
    end_at: s.endAt,
    end_lat: s.endLat,
    end_lng: s.endLng,
    end_accuracy: s.endAccuracy,
    client_created_at: s.createdAt,
  }));

  const { error } = await supabase.from('shifts').upsert(rows, { onConflict: 'id' });

  if (!error) {
    await markShiftsSynced(shifts.map((s) => s.id));
    return;
  }

  // A multi-row upsert is one statement server-side: if any single row is
  // rejected (e.g. prevent_closed_shift_update firing for a stale backfill
  // retry), the whole batch rolls back and every *other* shift in it would
  // otherwise get marked 'error' too, even though only one row was actually
  // bad. Fall back to per-row upserts so a single poisoned shift can't block
  // its batch-mates from syncing.
  await Promise.all(
    shifts.map(async (shift, i) => {
      const { error: rowError } = await supabase.from('shifts').upsert([rows[i]], { onConflict: 'id' });
      if (rowError) {
        await markShiftSyncError(shift.id, rowError.message, computeNextRetryAt(shift.syncAttempts));
      } else {
        await markShiftsSynced([shift.id]);
      }
    })
  );
}
