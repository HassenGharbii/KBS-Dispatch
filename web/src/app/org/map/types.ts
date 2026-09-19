export interface ActiveShift {
  shiftId: string;
  agentId: string;
  agentName: string;
  siteName: string;
  startAt: string;
  currentLat: number | null;
  currentLng: number | null;
  currentLocationAt: string | null;
}

export interface EnRouteMission {
  missionId: string;
  agentId: string;
  agentName: string;
  siteName: string;
  currentLat: number | null;
  currentLng: number | null;
  currentLocationAt: string | null;
}
