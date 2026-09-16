import { supabase } from '../lib/supabase';
import { watchLocation, ensureLocationPermission, type LocationFix } from '../lib/location';

// Deliberately separate from src/sync/: a location ping is disposable
// current-state that becomes actively wrong if delivered late, the opposite
// of the sync engine's durable/retryable design. No SQLite table, no
// sync-status bookkeeping, no participation in runSync().

const MIN_PUSH_INTERVAL_MS = 15_000;

type LocationSubscription = Awaited<ReturnType<typeof watchLocation>>;

let subscription: LocationSubscription | null = null;
let currentShiftId: string | null = null;
let lastPushedAt = 0;

async function pushLocation(shiftId: string, fix: LocationFix): Promise<void> {
  const now = Date.now();
  if (now - lastPushedAt < MIN_PUSH_INTERVAL_MS) return;
  lastPushedAt = now;

  const { error } = await supabase
    .from('shifts')
    .update({
      current_lat: fix.lat,
      current_lng: fix.lng,
      current_accuracy: fix.accuracy,
      current_location_at: new Date(fix.timestamp).toISOString(),
    })
    .eq('id', shiftId);

  if (error) {
    // Expected, harmless cases: the shift just closed (prevent_closed_shift_update
    // trigger rejects the update) or a transient network blip. Never retried —
    // a stale ping is worse than a missing one; the next callback tries again.
    console.log('[liveLocationEngine] push skipped:', error.message);
  }
}

export async function startWatching(shiftId: string): Promise<void> {
  if (currentShiftId === shiftId && subscription) return;
  await stopWatching();

  const granted = await ensureLocationPermission();
  if (!granted) return;

  currentShiftId = shiftId;
  const sub = await watchLocation((fix) => {
    if (currentShiftId === shiftId) {
      pushLocation(shiftId, fix);
    }
  });

  // Guard against a stop() that happened while the subscription was being set up.
  if (currentShiftId === shiftId) {
    subscription = sub;
  } else {
    sub.remove();
  }
}

export async function stopWatching(): Promise<void> {
  currentShiftId = null;
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
