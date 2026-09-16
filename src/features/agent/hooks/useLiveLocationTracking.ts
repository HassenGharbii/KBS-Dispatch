import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../../store/useAuthStore';
import { getOpenShift } from '../../../db/repositories/shiftsRepo';
import { startWatching, stopWatching } from '../../../location/liveLocationEngine';

/**
 * Decides *when* to run live location tracking: agent role, an open shift,
 * and the app in the foreground. Shares the same ['openShift', agentId]
 * query key ServiceScreen already uses, so this costs no extra DB read and
 * automatically picks up clock-in/out via ServiceScreen's existing
 * invalidateQueries calls.
 */
export function useLiveLocationTracking(): void {
  const profile = useAuthStore((s) => s.profile);
  const agentId = profile?.id ?? '';
  const isAgent = profile?.role === 'agent';

  const openShiftQuery = useQuery({
    queryKey: ['openShift', agentId],
    queryFn: () => getOpenShift(agentId),
    enabled: Boolean(agentId) && isAgent,
  });

  const shiftId = openShiftQuery.data?.id ?? null;

  useEffect(() => {
    if (!isAgent || !shiftId) {
      stopWatching();
      return;
    }

    function sync(appState: string) {
      if (appState === 'active') {
        startWatching(shiftId as string);
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
  }, [isAgent, shiftId]);
}
