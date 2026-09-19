import { createClient } from "@/lib/supabase/server";
import { PlanningCalendar } from "./planning-calendar";
import { weekRange, monthGridRange } from "./dates";
import type { MissionStatus } from "../missions/types";

interface MissionRow {
  id: string;
  site_id: string;
  scheduled_start: string;
  status: MissionStatus;
  is_broadcast: boolean;
  sites: { name: string } | null;
  agent: { full_name: string } | null;
}

interface UnavailabilityRow {
  id: string;
  agent_id: string;
  start_at: string;
  end_at: string;
  profiles: { full_name: string } | null;
}

export default async function PlanningPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string }>;
}) {
  const params = await searchParams;
  const view: "week" | "month" = params.view === "month" ? "month" : "week";
  const anchor = params.date && !Number.isNaN(Date.parse(params.date)) ? new Date(params.date) : new Date();
  const { start, end } = view === "week" ? weekRange(anchor) : monthGridRange(anchor);

  const supabase = await createClient();
  const [{ data: missionRows }, { data: unavailRows }, { data: sites }, { data: agents }] =
    await Promise.all([
      supabase
        .from("missions")
        .select(
          "id, site_id, scheduled_start, status, is_broadcast, sites(name), agent:profiles!missions_agent_id_fkey(full_name)"
        )
        .gte("scheduled_start", start.toISOString())
        .lt("scheduled_start", end.toISOString())
        .order("scheduled_start")
        .returns<MissionRow[]>(),
      supabase
        .from("agent_unavailability")
        .select("id, agent_id, start_at, end_at, profiles(full_name)")
        .lt("start_at", end.toISOString())
        .gt("end_at", start.toISOString())
        .returns<UnavailabilityRow[]>(),
      supabase.from("sites").select("id, name").eq("is_active", true).order("name"),
      supabase.from("profiles").select("id, full_name").eq("role", "agent").order("full_name"),
    ]);

  const missions = (missionRows ?? []).map((row) => ({
    id: row.id,
    siteId: row.site_id,
    scheduledStart: row.scheduled_start,
    status: row.status,
    isBroadcast: row.is_broadcast,
    siteName: row.sites?.name ?? "—",
    agentName: row.agent?.full_name ?? (row.is_broadcast ? "Diffusée à tous" : "—"),
  }));

  const unavailability = (unavailRows ?? []).map((row) => ({
    id: row.id,
    agentId: row.agent_id,
    agentName: row.profiles?.full_name ?? "—",
    startAt: row.start_at,
    endAt: row.end_at,
  }));

  return (
    <PlanningCalendar
      view={view}
      anchorIso={anchor.toISOString()}
      rangeStartIso={start.toISOString()}
      rangeEndIso={end.toISOString()}
      missions={missions}
      unavailability={unavailability}
      sites={(sites ?? []).map((s) => ({ id: s.id, label: s.name }))}
      agents={(agents ?? []).map((a) => ({ id: a.id, label: a.full_name }))}
    />
  );
}
