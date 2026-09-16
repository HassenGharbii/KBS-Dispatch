import { useLiveLocationTracking } from './hooks/useLiveLocationTracking';

/**
 * Side-effect-only component: mounted once inside AgentStack so live
 * tracking starts/stops automatically for as long as the agent shell is
 * mounted, and disappears on sign-out via RootNavigator's existing
 * conditional rendering — no extra cleanup needed.
 */
export function LiveLocationTrackerMount() {
  useLiveLocationTracking();
  return null;
}
