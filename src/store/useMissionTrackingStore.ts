import { create } from 'zustand';

/**
 * Tracks "the agent tapped Naviguer for this mission" locally, independent
 * of the mission's server-side status. The status only flips to 'en_route'
 * once the first location push succeeds -- gating tracking on that status
 * would be a chicken-and-egg problem, so this local intent is the source of
 * truth for when useMissionLocationTracking should be watching.
 */
interface MissionTrackingState {
  activeMissionId: string | null;
  start: (missionId: string) => void;
  stop: () => void;
}

export const useMissionTrackingStore = create<MissionTrackingState>((set) => ({
  activeMissionId: null,
  start: (missionId) => set({ activeMissionId: missionId }),
  stop: () => set({ activeMissionId: null }),
}));
