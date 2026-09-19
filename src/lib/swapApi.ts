import { supabase } from './supabase';
import type { MissionSwapRequest, MissionSwapStatus } from '../types/domain';

// Mirrors missionsApi.ts's reasoning: direct-to-Supabase, not queued through
// the offline sync engine -- a swap request is small, infrequent, and needs
// to be immediately visible to the target colleague and the dirigeant.

export interface OrgColleague {
  id: string;
  fullName: string;
}

interface SwapRequestRow {
  id: string;
  mission_id: string;
  from_agent_id: string;
  to_agent_id: string;
  status: MissionSwapStatus;
  message: string | null;
  responded_at: string | null;
  created_at: string;
  from_agent?: { full_name: string } | null;
  to_agent?: { full_name: string } | null;
  missions?: {
    scheduled_start: string;
    sites: { name: string } | null;
  } | null;
}

export interface MissionSwapRequestWithNames extends MissionSwapRequest {
  fromAgentName: string;
  toAgentName: string;
  siteName: string;
  scheduledStart: string | null;
}

function toSwapRequest(row: SwapRequestRow): MissionSwapRequestWithNames {
  return {
    id: row.id,
    missionId: row.mission_id,
    fromAgentId: row.from_agent_id,
    toAgentId: row.to_agent_id,
    status: row.status,
    message: row.message,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    fromAgentName: row.from_agent?.full_name ?? '—',
    toAgentName: row.to_agent?.full_name ?? '—',
    siteName: row.missions?.sites?.name ?? '—',
    scheduledStart: row.missions?.scheduled_start ?? null,
  };
}

const SWAP_SELECT =
  '*, from_agent:profiles!mission_swap_requests_from_agent_id_fkey(full_name), to_agent:profiles!mission_swap_requests_to_agent_id_fkey(full_name), missions(scheduled_start, sites(name))';

export async function listOrgColleagues(): Promise<OrgColleague[]> {
  const { data, error } = await supabase.rpc('list_org_colleagues');
  if (error || !data) return [];
  return (data as { id: string; full_name: string }[]).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }));
}

export async function createSwapRequest(
  missionId: string,
  fromAgentId: string,
  toAgentId: string,
  message?: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('mission_swap_requests').insert({
    mission_id: missionId,
    from_agent_id: fromAgentId,
    to_agent_id: toAgentId,
    message: message ?? null,
  });
  return { error: error?.message ?? null };
}

/** Requests I sent and requests sent to me, so both roles render from one query. */
export async function listSwapRequestsForAgent(agentId: string): Promise<MissionSwapRequestWithNames[]> {
  const { data, error } = await supabase
    .from('mission_swap_requests')
    .select(SWAP_SELECT)
    .or(`from_agent_id.eq.${agentId},to_agent_id.eq.${agentId}`)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as SwapRequestRow[]).map(toSwapRequest);
}

export async function listSwapRequestsForOrg(): Promise<MissionSwapRequestWithNames[]> {
  const { data, error } = await supabase
    .from('mission_swap_requests')
    .select(SWAP_SELECT)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as SwapRequestRow[]).map(toSwapRequest);
}

export async function respondToSwapRequest(
  swapRequestId: string,
  status: 'accepted' | 'refused'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('mission_swap_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', swapRequestId);
  return { error: error?.message ?? null };
}

export async function cancelSwapRequest(swapRequestId: string): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('mission_swap_requests')
    .update({ status: 'cancelled' })
    .eq('id', swapRequestId);
  return { error: error?.message ?? null };
}
