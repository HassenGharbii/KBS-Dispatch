import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthStore } from '../../../store/useAuthStore';
import { useMissionTrackingStore } from '../../../store/useMissionTrackingStore';
import { startWatching, stopWatching } from '../../../location/missionLocationEngine';

/**
 * Mirrors useLiveLocationTracking but for the pre-shift commute: keyed off
 * useMissionTrackingStore's local "Naviguer was tapped" intent rather than
 * server-confirmed mission status (see that store's doc comment), plus
 * foreground-only via AppState, matching the same scope decision as shift
 * tracking.
 */
export function useMissionLocationTracking(): void {
  const profile = useAuthStore((s) => s.profile);
  const isAgent = profile?.role === 'agent';
  const activeMissionId = useMissionTrackingStore((s) => s.activeMissionId);

  useEffect(() => {
    if (!isAgent || !activeMissionId) {
      stopWatching();
      return;
    }

    function sync(appState: string) {
      if (appState === 'active') {
        startWatching(activeMissionId as string);
      } else {
        stopWatching();
      }
    }
    sync(AppState.currentState);

    const subscription = AppState.addEventListener('change', sync);

    return () => {
      subscription.remove();
      stopWatching();
    };
  }, [isAgent, activeMissionId]);
}
