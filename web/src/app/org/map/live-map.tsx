"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Users, Clock, AlertTriangle, Activity } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { ActiveShift, EnRouteMission } from "./types";
import type { MapMarker, TileStyle, FlyToTarget } from "./leaflet-map";

const LeafletMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletMap), {
  ssr: false,
});

interface ShiftRow {
  id: string;
  agent_id: string;
  status: string;
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
  status: string;
  current_lat: number | null;
  current_lng: number | null;
  current_location_at: string | null;
  agent: { full_name: string } | null;
  sites: { name: string } | null;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.max(0, Math.round(diffMs / 60_000));
  if (minutes < 1) return "à l'instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  return `il y a ${hours} h`;
}

export interface SiteLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export function LiveMap({
  initialActive,
  initialEnRoute,
  sites,
  totalAgents,
  missionsEnCours,
  incidentsRecents,
  lastActivityAt,
}: {
  initialActive: ActiveShift[];
  initialEnRoute: EnRouteMission[];
  sites: SiteLocation[];
  totalAgents: number;
  missionsEnCours: number;
  incidentsRecents: number;
  lastActivityAt: string | null;
}) {
  const [tileStyle, setTileStyle] = useState<TileStyle>("plan");
  const [flyTo, setFlyTo] = useState<FlyToTarget | null>(null);
  const [activeByAgent, setActiveByAgent] = useState<Map<string, ActiveShift>>(
    () => new Map(initialActive.map((s) => [s.agentId, s]))
  );
  const [enRouteByAgent, setEnRouteByAgent] = useState<Map<string, EnRouteMission>>(
    () => new Map(initialEnRoute.map((m) => [m.agentId, m]))
  );

  useEffect(() => {
    const supabase = createClient();

    // Unfiltered subscription -- a server-side eq.open filter would miss the
    // closing transition (filters evaluate post-change), which is exactly the
    // "pin never disappears on clock-out" footgun to avoid. Same reasoning as
    // the mobile LiveMapScreen.
    const shiftsChannel = supabase
      .channel("active-shifts-console")
      .on("postgres_changes", { event: "*", schema: "public", table: "shifts" }, (payload) => {
        const row = payload.new as Partial<ShiftRow> & { id?: string };
        if (!row || !row.agent_id) return;

        setActiveByAgent((prev) => {
          const next = new Map(prev);
          if (row.status === "closed") {
            next.delete(row.agent_id!);
            return next;
          }
          if (row.status === "open") {
            const existing = next.get(row.agent_id!);
            next.set(row.agent_id!, {
              shiftId: row.id ?? existing?.shiftId ?? "",
              agentId: row.agent_id!,
              agentName: existing?.agentName ?? "—",
              siteName: existing?.siteName ?? "—",
              startAt: row.start_at ?? existing?.startAt ?? new Date().toISOString(),
              currentLat: row.current_lat ?? existing?.currentLat ?? row.start_lat ?? null,
              currentLng: row.current_lng ?? existing?.currentLng ?? row.start_lng ?? null,
              currentLocationAt: row.current_location_at ?? existing?.currentLocationAt ?? null,
            });
          }
          return next;
        });
      })
      .subscribe();

    // Mirrors the shifts subscription above, for the pre-shift commute
    // window: a mission in 'en_route' gets its own marker, distinct from an
    // on-shift agent, until clock-in flips it to 'in_progress'.
    const missionsChannel = supabase
      .channel("en-route-missions-console")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, (payload) => {
        const row = payload.new as Partial<MissionRow> & { id?: string };
        if (!row || !row.agent_id) return;

        setEnRouteByAgent((prev) => {
          const next = new Map(prev);
          if (row.status !== "en_route") {
            next.delete(row.agent_id!);
            return next;
          }
          const existing = next.get(row.agent_id!);
          next.set(row.agent_id!, {
            missionId: row.id ?? existing?.missionId ?? "",
            agentId: row.agent_id!,
            agentName: existing?.agentName ?? "—",
            siteName: existing?.siteName ?? "—",
            currentLat: row.current_lat ?? existing?.currentLat ?? null,
            currentLng: row.current_lng ?? existing?.currentLng ?? null,
            currentLocationAt: row.current_location_at ?? existing?.currentLocationAt ?? null,
          });
          return next;
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(shiftsChannel);
      supabase.removeChannel(missionsChannel);
    };
  }, []);

  const activeList = useMemo(() => Array.from(activeByAgent.values()), [activeByAgent]);
  const enRouteList = useMemo(
    () => Array.from(enRouteByAgent.values()).filter((m) => !activeByAgent.has(m.agentId)),
    [enRouteByAgent, activeByAgent]
  );

  const markers: MapMarker[] = useMemo(() => {
    const onShift: MapMarker[] = activeList
      .filter((s) => s.currentLat != null && s.currentLng != null)
      .map((s) => ({
        id: s.agentId,
        lat: s.currentLat as number,
        lng: s.currentLng as number,
        label: s.agentName,
        kind: "on_shift",
      }));
    const enRoute: MapMarker[] = enRouteList
      .filter((m) => m.currentLat != null && m.currentLng != null)
      .map((m) => ({
        id: m.agentId,
        lat: m.currentLat as number,
        lng: m.currentLng as number,
        label: m.agentName,
        kind: "en_route",
      }));
    return [...onShift, ...enRoute];
  }, [activeList, enRouteList]);

  const siteMarkers: MapMarker[] = useMemo(
    () => sites.map((s) => ({ id: s.id, lat: s.lat, lng: s.lng, label: s.name, kind: "site" })),
    [sites]
  );

  const activeAgentsCount = activeList.length + enRouteList.length;

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex shrink-0 flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
            <MapPin size={18} />
          </div>
          <div>
            <h1 className="text-base font-semibold text-white">Carte en direct</h1>
            <p className="text-xs text-slate-400">
              Suivez la position des agents et l&apos;état des missions en temps réel
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-slate-700 bg-slate-900 p-1 text-sm">
            <button
              onClick={() => setTileStyle("plan")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                tileStyle === "plan" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Plan
            </button>
            <button
              onClick={() => setTileStyle("satellite")}
              className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
                tileStyle === "satellite" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Satellite
            </button>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-500/10 px-3 py-1.5 text-sm font-medium text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Temps réel
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 grid-rows-[60vh_auto] gap-3 lg:grid-cols-[1fr_300px] lg:grid-rows-1">
        <div className="min-h-0 overflow-hidden rounded-xl border border-slate-800">
          <LeafletMap markers={markers} siteMarkers={siteMarkers} tileStyle={tileStyle} flyTo={flyTo} />
        </div>

        <div className="flex min-h-0 flex-col rounded-xl border border-slate-800 bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
            <div className="flex items-center gap-2">
              <Users size={16} className="text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Agents actifs ({activeAgentsCount})</h2>
            </div>
            <Link href="/org/agents" className="text-xs font-medium text-blue-400 hover:text-blue-300">
              Voir tout →
            </Link>
          </div>
          <div className="flex-1 divide-y divide-slate-800 overflow-y-auto">
            {activeList.map((item) => {
              const locatable = item.currentLat != null && item.currentLng != null;
              return (
                <div
                  key={item.agentId}
                  onClick={() =>
                    locatable &&
                    setFlyTo({ id: item.agentId, lat: item.currentLat as number, lng: item.currentLng as number })
                  }
                  className={`px-4 py-3 transition-colors ${
                    locatable ? "cursor-pointer hover:bg-slate-800/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                    <span className="font-medium text-slate-100">{item.agentName}</span>
                    <span className="ml-auto rounded-full bg-blue-500/15 px-2 py-0.5 text-xs font-medium text-blue-400">
                      En service
                    </span>
                  </div>
                  <p className="mt-1 pl-4 text-xs text-slate-400">
                    {item.siteName} ·{" "}
                    {item.currentLocationAt
                      ? `position ${formatRelative(item.currentLocationAt)}`
                      : `depuis ${formatTime(item.startAt)}`}
                  </p>
                </div>
              );
            })}
            {enRouteList.map((item) => {
              const locatable = item.currentLat != null && item.currentLng != null;
              return (
                <div
                  key={item.agentId}
                  onClick={() =>
                    locatable &&
                    setFlyTo({ id: item.agentId, lat: item.currentLat as number, lng: item.currentLng as number })
                  }
                  className={`px-4 py-3 transition-colors ${
                    locatable ? "cursor-pointer hover:bg-slate-800/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full bg-purple-500" />
                    <span className="font-medium text-slate-100">{item.agentName}</span>
                    <span className="ml-auto rounded-full bg-purple-500/15 px-2 py-0.5 text-xs font-medium text-purple-400">
                      En route
                    </span>
                  </div>
                  <p className="mt-1 pl-4 text-xs text-slate-400">
                    {item.siteName}
                    {item.currentLocationAt ? ` · position ${formatRelative(item.currentLocationAt)}` : ""}
                  </p>
                </div>
              );
            })}
            {activeAgentsCount === 0 && (
              <p className="px-4 py-6 text-center text-sm italic text-slate-500">
                Aucun agent en service actuellement.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid shrink-0 grid-cols-2 gap-3 md:grid-cols-4">
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
            <Users size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Agents actifs</p>
            <p className="text-base font-semibold text-white">
              {activeAgentsCount} / {totalAgents}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Missions en cours</p>
            <p className="text-base font-semibold text-white">{missionsEnCours}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-600/20 text-red-400">
            <AlertTriangle size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Événements (24h)</p>
            <p className="text-base font-semibold text-white">{incidentsRecents}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-700/50 text-slate-300">
            <Activity size={16} />
          </div>
          <div>
            <p className="text-xs text-slate-400">Dernière activité</p>
            <p className="text-sm font-semibold text-white">
              {lastActivityAt
                ? `${new Date(lastActivityAt).toLocaleDateString("fr-FR")} ${formatTime(lastActivityAt)}`
                : "—"}
            </p>
            <p className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Système opérationnel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
