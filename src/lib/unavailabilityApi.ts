import { supabase } from './supabase';
import type { AgentUnavailability } from '../types/domain';

interface UnavailabilityRow {
  id: string;
  agent_id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
  created_at: string;
  profiles?: { full_name: string } | null;
}

export interface AgentUnavailabilityWithName extends AgentUnavailability {
  agentName: string;
}

function toUnavailability(row: UnavailabilityRow): AgentUnavailabilityWithName {
  return {
    id: row.id,
    agentId: row.agent_id,
    startAt: row.start_at,
    endAt: row.end_at,
    reason: row.reason,
    createdAt: row.created_at,
    agentName: row.profiles?.full_name ?? '—',
  };
}

export async function createUnavailability(
  agentId: string,
  startAt: string,
  endAt: string,
  reason?: string | null
): Promise<{ error: string | null }> {
  const { error } = await supabase.from('agent_unavailability').insert({
    agent_id: agentId,
    start_at: startAt,
    end_at: endAt,
    reason: reason ?? null,
  });
  return { error: error?.message ?? null };
}

export async function listMyUnavailability(agentId: string): Promise<AgentUnavailabilityWithName[]> {
  const { data, error } = await supabase
    .from('agent_unavailability')
    .select('*, profiles(full_name)')
    .eq('agent_id', agentId)
    .order('start_at', { ascending: true });
  if (error || !data) return [];
  return (data as unknown as UnavailabilityRow[]).map(toUnavailability);
}

/** Org-admin view: every agent's unavailability windows, purely informational. */
export async function listUnavailabilityForOrg(): Promise<AgentUnavailabilityWithName[]> {
  const { data, error } = await supabase
    .from('agent_unavailability')
    .select('*, profiles(full_name)')
    .order('start_at', { ascending: true });
  if (error || !data) return [];
  return (data as unknown as UnavailabilityRow[]).map(toUnavailability);
}

export async function deleteUnavailability(id: string): Promise<{ error: string | null }> {
  const { error } = await supabase.from('agent_unavailability').delete().eq('id', id);
  return { error: error?.message ?? null };
}
