import { AppState } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { runSync, refreshPendingCount } from './syncEngine';
import { useSyncStatusStore } from '../store/useSyncStatusStore';

const FOREGROUND_INTERVAL_MS = 75_000;

let started = false;

export function startSyncTriggers(): void {
  if (started) return;
  started = true;

  refreshPendingCount();

  NetInfo.addEventListener((state) => {
    if (state.isConnected && state.isInternetReachable !== false) {
      runSync();
    }
  });

  AppState.addEventListener('change', (next) => {
    if (next === 'active') {
      runSync();
    }
  });

  setInterval(() => {
    if (useSyncStatusStore.getState().pendingCount > 0) {
      runSync();
    }
  }, FOREGROUND_INTERVAL_MS);
}
