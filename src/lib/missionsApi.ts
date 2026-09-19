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
  agent_id: string | null;
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
  is_broadcast: boolean;
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
    isBroadcast: row.is_broadcast,
    siteName: row.sites?.name ?? '—',
    siteLat: row.sites?.lat ?? null,
    siteLng: row.sites?.lng ?? null,
    agentName: row.agent?.full_name ?? (row.is_broadcast ? 'Diffusée à tous' : '—'),
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
  // null only when isBroadcast is true -- diffused to every org agent
  // instead of one named agent (RLS/CHECK enforce this pairing server-side).
  agentId: string | null;
  createdBy: string;
  scheduledStart: string;
  scheduledEnd?: string | null;
  instructions?: string | null;
  isBroadcast?: boolean;
}

export async function createMission(input: CreateMissionInput): Promise<{ error: string | null }> {
  const { error } = await supabase.from('missions').insert({
    site_id: input.siteId,
    agent_id: input.agentId,
    created_by: input.createdBy,
    scheduled_start: input.scheduledStart,
    scheduled_end: input.scheduledEnd ?? null,
    instructions: input.instructions ?? null,
    is_broadcast: input.isBroadcast ?? false,
  });
  return { error: error?.message ?? null };
}

/** Broadcast missions open to any org agent (unclaimed: agent_id is null). */
export async function listBroadcastMissions(): Promise<MissionWithNames[]> {
  const { data, error } = await supabase
    .from('missions')
    .select(MISSION_SELECT_WITH_NAMES)
    .eq('is_broadcast', true)
    .is('agent_id', null)
    .eq('status', 'proposed')
    .order('scheduled_start', { ascending: true });
  if (error || !data) return [];
  return (data as unknown as MissionRow[]).map(toMission);
}

/**
 * Race-safe "first to accept wins" claim: a plain conditional UPDATE, not an
 * RPC -- Postgres's own row-locking + EvalPlanQual re-check on concurrent
 * UPDATEs to the same row is what makes this atomic. `.select().single()`
 * forces PostgREST to error (PGRST116) when the WHERE clause matches 0 rows,
 * which is how we detect "someone else already claimed it."
 */
export async function claimBroadcastMission(
  missionId: string,
  agentId: string
): Promise<{ error: string | null; alreadyClaimed: boolean }> {
  const { error } = await supabase
    .from('missions')
    .update({ agent_id: agentId, status: 'accepted', responded_at: new Date().toISOString() })
    .eq('id', missionId)
    .is('agent_id', null)
    .eq('status', 'proposed')
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') return { error: null, alreadyClaimed: true };
    return { error: error.message, alreadyClaimed: false };
  }
  return { error: null, alreadyClaimed: false };
}

export interface ReassignMissionInput {
  agentId: string | null;
  isBroadcast: boolean;
}

/** Reopens a cancelled/refused mission -- to a newly-named agent, or back to broadcast. */
export async function reassignMission(
  missionId: string,
  input: ReassignMissionInput
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('missions')
    .update({
      agent_id: input.agentId,
      is_broadcast: input.isBroadcast,
      status: 'proposed',
      responded_at: null,
    })
    .eq('id', missionId);
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
