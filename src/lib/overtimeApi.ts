import { supabase } from './supabase';
import type { MissionOvertimeRequest, MissionOvertimeStatus } from '../types/domain';

// Mirrors swapApi.ts's reasoning: direct-to-Supabase, not queued through the
// offline sync engine -- small, infrequent, needs to be immediately visible
// to the dirigeant/sub_admin who must act on it before the agent's service
// actually ends.

interface OvertimeRequestRow {
  id: string;
  mission_id: string;
  agent_id: string;
  requested_minutes: number;
  status: MissionOvertimeStatus;
  responded_at: string | null;
  created_at: string;
  agent?: { full_name: string } | null;
  missions?: {
    scheduled_end: string | null;
    sites: { name: string } | null;
  } | null;
}

export interface MissionOvertimeRequestWithNames extends MissionOvertimeRequest {
  agentName: string;
  siteName: string;
  scheduledEnd: string | null;
}

function toOvertimeRequest(row: OvertimeRequestRow): MissionOvertimeRequestWithNames {
  return {
    id: row.id,
    missionId: row.mission_id,
    agentId: row.agent_id,
    requestedMinutes: row.requested_minutes,
    status: row.status,
    respondedAt: row.responded_at,
    createdAt: row.created_at,
    agentName: row.agent?.full_name ?? '—',
    siteName: row.missions?.sites?.name ?? '—',
    scheduledEnd: row.missions?.scheduled_end ?? null,
  };
}

const OVERTIME_SELECT =
  '*, agent:profiles!mission_overtime_requests_agent_id_fkey(full_name), missions(scheduled_end, sites(name))';

export async function requestOvertime(
  missionId: string,
  agentId: string,
  requestedMinutes: number
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('mission_overtime_requests').insert({
    mission_id: missionId,
    agent_id: agentId,
    requested_minutes: requestedMinutes,
  });
  return { error: error?.message ?? null };
}

export async function listOvertimeRequestsForAgent(
  agentId: string
): Promise<MissionOvertimeRequestWithNames[]> {
  const { data, error } = await supabase
    .from('mission_overtime_requests')
    .select(OVERTIME_SELECT)
    .eq('agent_id', agentId)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as OvertimeRequestRow[]).map(toOvertimeRequest);
}

export async function listOvertimeRequestsForOrg(): Promise<MissionOvertimeRequestWithNames[]> {
  const { data, error } = await supabase
    .from('mission_overtime_requests')
    .select(OVERTIME_SELECT)
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as unknown as OvertimeRequestRow[]).map(toOvertimeRequest);
}

export async function respondToOvertimeRequest(
  overtimeRequestId: string,
  status: 'accepted' | 'refused'
): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('mission_overtime_requests')
    .update({ status, responded_at: new Date().toISOString() })
    .eq('id', overtimeRequestId);
  return { error: error?.message ?? null };
}
