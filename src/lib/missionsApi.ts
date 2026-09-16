import { supabase } from './supabase';
import type { Mission, MissionStatus } from '../types/domain';

// All mission access is direct-to-Supabase, deliberately outside the
// SQLite/sync-engine world (see plan §5): accept/refuse/cancel are small,
// infrequent, dirigeant-visible-in-real-time actions -- queuing them for
// later offline delivery would delay that real-time visibility, unlike
// main-courante entries which are expected to happen from dead-zone sites.

export interface AgentOption {
  id: string;
  fullName: string;
}

interface MissionRow {
  id: string;
  site_id: string;
  agent_id: string;
  created_by: string;
  scheduled_start: string;
  scheduled_end: string | null;
  instructions: string | null;
  status: MissionStatus;
  responded_at: string | null;
  current_lat: number | null;
  current_lng: number | null;
  current_location_at: string | null;
  created_at: string;
  sites?: { name: string; lat: number | null; lng: number | null } | null;
  agent?: { full_name: string } | null;
  shifts?: { start_at: string }[] | null;
}

export interface MissionWithNames extends Mission {
  siteName: string;
  siteLat: number | null;
  siteLng: number | null;
  agentName: string;
  actualStartAt: string | null;
}

function toMission(row: MissionRow): MissionWithNames {
  return {
    id: row.id,
    siteId: row.site_id,
    agentId: row.agent_id,
    createdBy: row.created_by,
    scheduledStart: row.scheduled_start,
    scheduledEnd: row.scheduled_end,
    instructions: row.instructions,
    status: row.status,
    respondedAt: row.responded_at,
    currentLat: row.current_lat,
    currentLng: row.current_lng,
    currentLocationAt: row.current_location_at,
    createdAt: row.created_at,
    siteName: row.sites?.name ?? '—',
    siteLat: row.sites?.lat ?? null,
    siteLng: row.sites?.lng ?? null,
    agentName: row.agent?.full_name ?? '—',
    actualStartAt: row.shifts?.[0]?.start_at ?? null,
  };
}

const MISSION_SELECT_WITH_NAMES = '*, sites(name, lat, lng), agent:profiles!missions_agent_id_fkey(full_name)';
const MISSION_SELECT_FOR_DIRIGEANT = `${MISSION_SELECT_WITH_NAMES}, shifts(start_at)`;

export async function listAgents(): Promise<AgentOption[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name')
    .eq('role', 'agent')
    .order('full_name', { ascending: true });
  if (error || !data) return [];
  return data.map((row) => ({ id: row.id, fullName: row.full_name }));
}

export interface CreateMissionInput {
  siteId: string;
  agentId: string;
  createdBy: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  instructions?: string | null;
}

export async function createMission(input: CreateMissionInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('missions').insert({
    site_id: input.siteId,
    agent_id: input.agentId,
    created_by: input.createdBy,
    scheduled_start: input.scheduledStart,
    scheduled_end: input.scheduledEnd ?? null,
    instructions: input.instructions ?? null,
  });
  return { error: error?.message ?? null };
}

export async function listAllMissions(): Promise<MissionWithNames[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_SELECT_FOR_DIRIGEANT)
    .order('scheduled_start', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as MissionRow[]).map(toMission);
}

export async function listMissionsForAgent(agentId: string): Promise<MissionWithNames[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_SELECT_WITH_NAMES)
    .eq('agent_id', agentId)
    .order('scheduled_start', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as MissionRow[]).map(toMission);
}

export async function respondToMission(
  missionId: string,
  status: 'accepted' | 'refused'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('missions')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', missionId);
  return { error: error?.message ?? null };
}

export async function cancelMission(missionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('missions').update({ status: 'cancelled' }).eq('id', missionId);
  return { error: error?.message ?? null };
}

export async function updateMissionLocation(
  missionId: string,
  lat: number,
  lng: number,
  timestamp: string
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('missions')
    .update({ status: 'en_route', current_lat: lat, current_lng: lng, current_location_at: timestamp })
    .eq('id', missionId);
  return { error: error?.message ?? null };
}

export async function completeMission(missionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('missions').update({ status: 'completed' }).eq('id', missionId);
  return { error: error?.message ?? null };
}

export async function startMissionProgress(missionId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('missions').update({ status: 'in_progress' }).eq('id', missionId);
  return { error: error?.message ?? null };
}
