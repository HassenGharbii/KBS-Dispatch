import { Linking, Platform } from 'react-native';

export interface LatLng {
  lat: number;
  lng: number;
}

export interface RouteInfo {
  distanceMeters: number;
  durationSeconds: number;
}

// Nominatim's usage policy requires a real identifying User-Agent (or
// Referer) and no more than ~1 request/second -- fine here since this only
// runs when an agent sets/changes their home address, never in a loop.
const NOMINATIM_USER_AGENT = 'kbs-main-courante/1.0 (contact: hassane.gharbi@waycon.com)';

export async function geocodeAddress(address: string): Promise<LatLng | null> {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': NOMINATIM_USER_AGENT } });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{ lat: string; lon: string }>;
    if (data.length === 0) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null;
  }
}

// Free public OSRM demo server -- fine for a pilot, not a production SLA;
// swap to a self-hosted/paid router later without touching call sites.
export async function getRoute(from: LatLng, to: LatLng): Promise<RouteInfo | null> {
  const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const route = data?.routes?.[0];
    if (!route) return null;
    return { distanceMeters: route.distance, durationSeconds: route.duration };
  } catch {
    return null;
  }
}

/**
 * Opens the device's own maps app for turn-by-turn navigation -- this is the
 * literal mechanism the spec's tech section describes ("navigation via
 * deep-link Google Maps"); only the route/ETA math above is a free
 * substitute for the paid Directions API, not this part.
 *
 * Deliberately skips Linking.canOpenURL: on Android 11+ that check goes
 * through package-visibility rules and can false-negative for an installed
 * app we don't declare in a <queries> manifest block, whereas actually
 * dispatching the intent (openURL) still reaches any app registered for the
 * scheme regardless of our own visibility. So: try the preferred scheme,
 * fall through to the next on failure.
 */
export async function openNavigation(lat: number, lng: number, label: string): Promise<void> {
  const encodedLabel = encodeURIComponent(label);
  const candidates =
    Platform.OS === 'ios'
      ? [`comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving`, `http://maps.apple.com/?daddr=${lat},${lng}`]
      : [`google.navigation:q=${lat},${lng}&mode=d`, `geo:0,0?q=${lat},${lng}(${encodedLabel})`];

  for (const url of candidates) {
    try {
      await Linking.openURL(url);
      return;
    } catch {
      // try the next candidate
    }
  }
}
