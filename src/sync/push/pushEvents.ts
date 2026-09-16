import { supabase } from '../../lib/supabase';
import {
  listPendingEventsForSyncedShifts,
  markEventsSyncing,
  markEventsSynced,
  markEventSyncError,
} from '../../db/repositories/eventsRepo';
import { computeNextRetryAt } from '../backoff';

export async function pushEvents(): Promise<void> {
  const events = await listPendingEventsForSyncedShifts();
  if (events.length === 0) return;

  await markEventsSyncing(events.map((e) => e.id));

  const rows = events.map((e) => ({
    id: e.id,
    shift_id: e.shiftId,
    agent_id: e.agentId,
    category_code: e.categoryCode,
    item_codes: e.itemCodes,
    comment: e.comment,
    occurred_at: e.occurredAt,
    lat: e.lat,
    lng: e.lng,
    accuracy: e.accuracy,
    client_created_at: e.createdAt,
  }));

  const { error } = await supabase.from('events').upsert(rows, { onConflict: 'id' });

  if (error) {
    await Promise.all(
      events.map((e) =>
        markEventSyncError(e.id, error.message, computeNextRetryAt(e.syncAttempts))
      )
    );
    return;
  }

  await markEventsSynced(events.map((e) => e.id));
}
