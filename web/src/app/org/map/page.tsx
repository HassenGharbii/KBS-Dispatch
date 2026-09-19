import { createClient } from "@/lib/supabase/server";
import { LiveMap, type SiteLocation } from "./live-map";
import type { ActiveShift, EnRouteMission } from "./types";

interface SiteRow {
  id: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

interface ShiftRow {
  id: string;
  agent_id: string;
  start_at: string;
  start_lat: number | null;
  start_lng: number | null;
  current_lat: number | null;
  current_lng: number | null;
  current_location_at: string | null;
  profiles: { full_name: string } | null;
  sites: { name: string } | null;
}

interface MissionRow {
  id: string;
  agent_id: string;
  current_lat: number | null;
  current_lng: number | null;
  current_location_at: string | null;
  agent: { full_name: string } | null;
  sites: { name: string } | null;
}

export default async function MapPage() {
  const supabase = await createClient();

  const [
    { data: shiftRows },
    { data: missionRows },
    { data: siteRows },
    { count: totalAgents },
    { count: missionsEnCours },
    { count: incidentsRecents },
    { data: latestEvent },
  ] = await Promise.all([
    supabase
      .from("shifts")
      .select(
        "id, agent_id, start_at, start_lat, start_lng, current_lat, current_lng, current_location_at, profiles(full_name), sites(name)"
      )
      .eq("status", "open")
      .returns<ShiftRow[]>(),
    supabase
      .from("missions")
      .select(
        "id, agent_id, current_lat, current_lng, current_location_at, agent:profiles!missions_agent_id_fkey(full_name), sites(name)"
      )
      .eq("status", "en_route")
      .returns<MissionRow[]>(),
    supabase.from("sites").select("id, name, lat, lng").eq("is_active", true).returns<SiteRow[]>(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
    supabase
      .from("missions")
      .select("id", { count: "exact", head: true })
      .in("status", ["en_route", "in_progress"]),
    supabase
      .from("events")
      .select("id", { count: "exact", head: true })
      .gte("occurred_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("events")
      .select("occurred_at")
      .order("occurred_at", { ascending: false })
      .limit(1)
      .maybeSingle<{ occurred_at: string }>(),
  ]);

  const initialActive: ActiveShift[] = (shiftRows ?? []).map((row) => ({
    shiftId: row.id,
    agentId: row.agent_id,
    agentName: row.profiles?.full_name ?? "—",
    siteName: row.sites?.name ?? "—",
    startAt: row.start_at,
    // Fall back to the clock-in fix: a live ping only lands once the agent
    // has moved ~30m (see src/lib/location.ts distanceInterval on mobile),
    // so a stationary agent would otherwise never get a marker at all.
    currentLat: row.current_lat ?? row.start_lat,
    currentLng: row.current_lng ?? row.start_lng,
    currentLocationAt: row.current_location_at,
  }));

  const initialEnRoute: EnRouteMission[] = (missionRows ?? []).map((row) => ({
    missionId: row.id,
    agentId: row.agent_id,
    agentName: row.agent?.full_name ?? "—",
    siteName: row.sites?.name ?? "—",
    currentLat: row.current_lat,
    currentLng: row.current_lng,
    currentLocationAt: row.current_location_at,
  }));

  const sites: SiteLocation[] = (siteRows ?? [])
    .filter((s): s is SiteRow & { lat: number; lng: number } => s.lat != null && s.lng != null)
    .map((s) => ({ id: s.id, name: s.name, lat: s.lat, lng: s.lng }));

  return (
    <LiveMap
      initialActive={initialActive}
      initialEnRoute={initialEnRoute}
      sites={sites}
      totalAgents={totalAgents ?? 0}
      missionsEnCours={missionsEnCours ?? 0}
      incidentsRecents={incidentsRecents ?? 0}
      lastActivityAt={latestEvent?.occurred_at ?? null}
    />
  );
}
