import { useMissionLocationTracking } from './hooks/useMissionLocationTracking';

/**
 * Side-effect-only component: mounted once inside AgentStack, mirroring
 * LiveLocationTrackerMount, so en-route tracking starts/stops for as long
 * as the agent shell is mounted.
 */
export function MissionLocationTrackerMount() {
  useMissionLocationTracking();
  return null;
}
