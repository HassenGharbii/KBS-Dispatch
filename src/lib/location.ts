import * as Location from 'expo-location';

export interface LocationFix {
  lat: number;
  lng: number;
  accuracy: number | null;
  timestamp: number;
}

function toFix(pos: Location.LocationObject): LocationFix {
  return {
    lat: pos.coords.latitude,
    lng: pos.coords.longitude,
    accuracy: pos.coords.accuracy,
    timestamp: pos.timestamp,
  };
}

export async function ensureLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.status === 'granted') return true;
  const requested = await Location.requestForegroundPermissionsAsync();
  return requested.status === 'granted';
}

/** Kicks off a single GPS fix request; resolves null (never rejects) on failure. */
export function beginLocationFix(): Promise<LocationFix | null> {
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
    .then(toFix)
    .catch(() => null);
}

/**
 * Continuous position subscription for live tracking (Phase 2), as opposed
 * to beginLocationFix's one-shot Promise shape. expo-location only delivers
 * these callbacks while the app is foregrounded — exactly the "foreground
 * only" tracking scope agreed for this phase, with no extra permission.
 */
export async function watchLocation(
  onUpdate: (fix: LocationFix) => void,
  opts?: { timeInterval?: number; distanceInterval?: number }
): Promise<Location.LocationSubscription> {
  return Location.watchPositionAsync(
    {
      accuracy: Location.Accuracy.Balanced,
      timeInterval: opts?.timeInterval ?? 25_000,
      distanceInterval: opts?.distanceInterval ?? 30,
    },
    (pos) => onUpdate(toFix(pos))
  );
}

/**
 * Races a promise against a timeout without cancelling it, so a slow GPS fix
 * can still be awaited afterwards (see beginLocationFix usage at clock-in:
 * proceed with `fix === null` after ~8s rather than blocking, then backfill
 * if `fixPromise` resolves shortly after).
 */
export function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
  ]);
}
