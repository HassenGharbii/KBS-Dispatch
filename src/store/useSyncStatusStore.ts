import { create } from 'zustand';

interface SyncStatusState {
  pendingCount: number;
  isSyncing: boolean;
  lastSyncError: string | null;
  lastSyncedAt: string | null;
  setPendingCount: (count: number) => void;
  setSyncing: (isSyncing: boolean) => void;
  setLastSyncError: (error: string | null) => void;
  setLastSyncedAt: (at: string) => void;
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  pendingCount: 0,
  isSyncing: false,
  lastSyncError: null,
  lastSyncedAt: null,
  setPendingCount: (count) => set({ pendingCount: count }),
  setSyncing: (isSyncing) => set({ isSyncing }),
  setLastSyncError: (error) => set({ lastSyncError: error }),
  setLastSyncedAt: (at) => set({ lastSyncedAt: at }),
}));
