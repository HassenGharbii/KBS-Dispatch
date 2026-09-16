import { watchLocation, ensureLocationPermission, type LocationFix } from '../lib/location';
import { updateMissionLocation } from '../lib/missionsApi';

// Mirrors src/location/liveLocationEngine.ts but targets a mission's
// current_lat/lng during the pre-shift commute ("en route"), rather than a
// shift. Kept separate rather than a shared "table-agnostic" abstraction --
// the two write targets (missions vs shifts) and status semantics differ
// enough that a generic engine would just be indirection over two call
// sites.

const MIN_PUSH_INTERVAL_MS = 15_000;

type LocationSubscription = Awaited<ReturnType<typeof watchLocation>>;

let subscription: LocationSubscription | null = null;
let currentMissionId: string | null = null;
let lastPushedAt = 0;

async function pushLocation(missionId: string, fix: LocationFix): Promise<void> {
  const now = Date.now();
  if (now - lastPushedAt < MIN_PUSH_INTERVAL_MS) return;
  lastPushedAt = now;

  const { error } = await updateMissionLocation(
    missionId,
    fix.lat,
    fix.lng,
    new Date(fix.timestamp).toISOString()
  );

  if (error) {
    // Expected, harmless cases: the mission was cancelled/completed just
    // before this ping landed, or a transient network blip. Never retried --
    // a stale ping is worse than a missing one; the next callback tries again.
    console.log('[missionLocationEngine] push skipped:', error);
  }
}

export async function startWatching(missionId: string): Promise<void> {
  if (currentMissionId === missionId && subscription) return;
  await stopWatching();

  const granted = await ensureLocationPermission();
  if (!granted) return;

  currentMissionId = missionId;
  const sub = await watchLocation((fix) => {
    if (currentMissionId === missionId) {
      pushLocation(missionId, fix);
    }
  });

  // Guard against a stop() that happened while the subscription was being set up.
  if (currentMissionId === missionId) {
    subscription = sub;
  } else {
    sub.remove();
  }
}

export async function stopWatching(): Promise<void> {
  currentMissionId = null;
  if (subscription) {
    subscription.remove();
    subscription = null;
  }
}
