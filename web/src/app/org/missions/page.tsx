import { createClient } from "@/lib/supabase/server";
import { MissionsList } from "./missions-list";
import type { MissionWithNames } from "./types";

interface MissionRow {
  id: string;
  scheduled_start: string;
  instructions: string | null;
  status: MissionWithNames["status"];
  is_broadcast: boolean;
  sites: { name: string } | null;
  agent: { full_name: string } | null;
  shifts: { start_at: string }[] | null;
}

export default async function MissionsPage() {
  const supabase = await createClient();

  const [{ data: missionRows }, { data: sites }, { data: agents }] = await Promise.all([
    supabase
      .from("missions")
      .select(
        "id, scheduled_start, instructions, status, is_broadcast, sites(name), agent:profiles!missions_agent_id_fkey(full_name), shifts(start_at)"
      )
      .order("scheduled_start", { ascending: false })
      .returns<MissionRow[]>(),
    supabase.from("sites").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "agent").order("full_name"),
  ]);

  const missions: MissionWithNames[] = (missionRows ?? []).map((row) => ({
    id: row.id,
    siteName: row.sites?.name ?? "—",
    agentName: row.agent?.full_name ?? (row.is_broadcast ? "Diffusée à tous" : "—"),
    scheduledStart: row.scheduled_start,
    instructions: row.instructions,
    status: row.status,
    actualStartAt: row.shifts?.[0]?.start_at ?? null,
    isBroadcast: row.is_broadcast,
  }));

  const agentOptions = (agents ?? []).map((a) => ({ id: a.id, label: a.full_name }));
  const siteOptions = (sites ?? []).map((s) => ({ id: s.id, label: s.name }));

  return (
    <div className="h-full">
      <MissionsList missions={missions} agents={agentOptions} sites={siteOptions} />
    </div>
  );
}
