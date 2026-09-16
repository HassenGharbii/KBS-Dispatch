import type { CategoryCode } from '../constants/referenceList';

// sub_admin/super_admin exist server-side (web console roles) but have no
// mobile UI of their own -- RootNavigator/UnknownRoleScreen handle them as
// a "use the web console" message, not a supported app shell.
export type UserRole = 'agent' | 'dirigeant' | 'sub_admin' | 'super_admin';

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'error';
export type PhotoSyncStatus = 'pending' | 'uploading' | 'uploaded' | 'error';

export interface Profile {
  id: string;
  fullName: string;
  phone: string | null;
  role: UserRole;
  professionalCardNumber: string | null;
  geolocConsentAt: string | null;
  homeAddress: string | null;
  homeLat: number | null;
  homeLng: number | null;
}

export interface Site {
  id: string;
  name: string;
  address: string;
  sensitivityLevel: 1 | 2 | 3;
  clientName: string | null;
  isActive: boolean;
  lat: number | null;
  lng: number | null;
}

export type MissionStatus =
  | 'proposed'
  | 'accepted'
  | 'refused'
  | 'cancelled'
  | 'en_route'
  | 'in_progress'
  | 'completed';

export interface Mission {
  id: string;
  siteId: string;
  agentId: string;
  createdBy: string;
  scheduledStart: string;
  scheduledEnd: string | null;
  instructions: string | null;
  status: MissionStatus;
  respondedAt: string | null;
  currentLat: number | null;
  currentLng: number | null;
  currentLocationAt: string | null;
  createdAt: string;
}

export type ShiftStatus = 'open' | 'closed';

export interface Shift {
  id: string;
  agentId: string;
  siteId: string;
  missionId: string | null;
  status: ShiftStatus;
  startAt: string;
  startLat: number | null;
  startLng: number | null;
  startAccuracy: number | null;
  endAt: string | null;
  endLat: number | null;
  endLng: number | null;
  endAccuracy: number | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncAttempts: number;
  nextRetryAt: string | null;
}

export interface LogbookEvent {
  id: string;
  shiftId: string;
  agentId: string;
  categoryCode: CategoryCode;
  itemCodes: string[];
  comment: string | null;
  occurredAt: string;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  createdAt: string;
  updatedAt: string;
  syncStatus: SyncStatus;
  syncError: string | null;
  syncAttempts: number;
  nextRetryAt: string | null;
}

export interface Photo {
  id: string;
  eventId: string;
  agentId: string;
  localUri: string | null;
  remotePath: string | null;
  width: number | null;
  height: number | null;
  fileSizeBytes: number | null;
  takenAt: string;
  syncStatus: PhotoSyncStatus;
  syncError: string | null;
  syncAttempts: number;
  nextRetryAt: string | null;
}

export interface ShiftReport {
  shiftId: string;
  agentId: string;
  agentName: string;
  siteId: string;
  siteName: string;
  status: ShiftStatus;
  startAt: string;
  endAt: string | null;
  eventCount: number;
  photoCount: number;
}
