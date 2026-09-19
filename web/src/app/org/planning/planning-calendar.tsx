"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MissionForm } from "../missions/mission-form";
import { addDays, isSameDay, toDateTimeLocal } from "./dates";
import type { MissionStatus } from "../missions/types";
import { ChevronLeft, ChevronRight, Plus, Radio, ChevronDown, X } from "lucide-react";

// Matches the STATUS_COLORS convention already established in
// missions-list.tsx -- keep raw per-status colors consistent with the rest
// of the console rather than the bucketed palette used on /org/stats (that
// one exists specifically because a 7-way legend there needed to pass the
// CVD validator; a calendar chip already carries the status as a text label
// via the legend below, so the extra color-safety bar doesn't apply here).
const STATUS_COLORS: Record<MissionStatus, string> = {
  proposed: "bg-amber-500/20 text-amber-300",
  accepted: "bg-blue-500/20 text-blue-300",
  refused: "bg-red-500/20 text-red-300",
  cancelled: "bg-slate-600/30 text-slate-400",
  en_route: "bg-purple-500/20 text-purple-300",
  in_progress: "bg-emerald-500/20 text-emerald-300",
  completed: "bg-slate-500/20 text-slate-300",
};

const STATUS_DOTS: Record<MissionStatus, string> = {
  proposed: "bg-amber-400",
  accepted: "bg-blue-400",
  refused: "bg-red-400",
  cancelled: "bg-slate-500",
  en_route: "bg-purple-400",
  in_progress: "bg-emerald-400",
  completed: "bg-slate-400",
};

const STATUS_LABELS: Record<MissionStatus, string> = {
  proposed: "Proposée",
  accepted: "Acceptée",
  refused: "Refusée",
  cancelled: "Annulée",
  en_route: "En route",
  in_progress: "En cours",
  completed: "Terminée",
};

interface PlanningMission {
  id: string;
  siteId: string;
  scheduledStart: string;
  status: MissionStatus;
  isBroadcast: boolean;
  siteName: string;
  agentName: string;
}

interface PlanningUnavailability {
  id: string;
  agentId: string;
  agentName: string;
  startAt: string;
  endAt: string;
}

interface Option {
  id: string;
  label: string;
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

function MissionChip({ mission }: { mission: PlanningMission }) {
  return (
    <div
      className={`flex items-center gap-1 truncate rounded px-1.5 py-0.5 text-[11px] font-medium ${STATUS_COLORS[mission.status]}`}
      title={`${mission.agentName} · ${formatTime(mission.scheduledStart)} · ${STATUS_LABELS[mission.status]}`}
    >
      {mission.isBroadcast && <Radio size={10} className="shrink-0" />}
      <span className="truncate">
        {formatTime(mission.scheduledStart)} {mission.agentName}
      </span>
    </div>
  );
}

export function PlanningCalendar({
  view,
  anchorIso,
  rangeStartIso,
  rangeEndIso,
  missions,
  unavailability,
  sites,
  agents,
}: {
  view: "week" | "month";
  anchorIso: string;
  rangeStartIso: string;
  rangeEndIso: string;
  missions: PlanningMission[];
  unavailability: PlanningUnavailability[];
  sites: Option[];
  agents: Option[];
}) {
  const router = useRouter();
  const anchor = useMemo(() => new Date(anchorIso), [anchorIso]);
  const rangeStart = useMemo(() => new Date(rangeStartIso), [rangeStartIso]);
  const rangeEnd = useMemo(() => new Date(rangeEndIso), [rangeEndIso]);
  const today = new Date();

  const [modal, setModal] = useState<{ siteId?: string; scheduledStart: string } | null>(null);
  const [unavailOpen, setUnavailOpen] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("planning-console")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => router.refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "agent_unavailability" }, () =>
        router.refresh()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  function navigate(nextAnchor: Date, nextView: "week" | "month" = view) {
    router.push(`/org/planning?view=${nextView}&date=${nextAnchor.toISOString().slice(0, 10)}`);
  }

  function goPrev() {
    navigate(view === "week" ? addDays(anchor, -7) : new Date(anchor.getFullYear(), anchor.getMonth() - 1, 1));
  }
  function goNext() {
    navigate(view === "week" ? addDays(anchor, 7) : new Date(anchor.getFullYear(), anchor.getMonth() + 1, 1));
  }
  function goToday() {
    navigate(today);
  }

  const days = useMemo(() => {
    const list: Date[] = [];
    for (let d = new Date(rangeStart); d < rangeEnd; d = addDays(d, 1)) list.push(new Date(d));
    return list;
  }, [rangeStart, rangeEnd]);

  function missionsOnDay(day: Date) {
    return missions.filter((m) => isSameDay(new Date(m.scheduledStart), day));
  }

  const title =
    view === "week"
      ? `Semaine du ${days[0]?.toLocaleDateString("fr-FR", { day: "2-digit", month: "long" })}`
      : anchor.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });

  return (
    <div className="flex h-full flex-col gap-2.5">
      {/* Header: title, view toggle, nav, quick-add -- all in one compact row */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-base font-semibold capitalize text-white">{title}</h1>
        <div className="flex items-center gap-1.5">
          <div className="flex rounded-md border border-slate-700 bg-slate-900 p-0.5 text-xs">
            <button
              onClick={() => navigate(anchor, "week")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${view === "week" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              Semaine
            </button>
            <button
              onClick={() => navigate(anchor, "month")}
              className={`rounded px-2.5 py-1 font-medium transition-colors ${view === "month" ? "bg-blue-600 text-white" : "text-slate-400 hover:text-slate-200"}`}
            >
              Mois
            </button>
          </div>
          <div className="flex items-center rounded-md border border-slate-700 bg-slate-900">
            <button onClick={goPrev} className="rounded-l-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <ChevronLeft size={15} />
            </button>
            <button
              onClick={goToday}
              className="border-x border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Aujourd&apos;hui
            </button>
            <button onClick={goNext} className="rounded-r-md p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white">
              <ChevronRight size={15} />
            </button>
          </div>
          <button
            onClick={() => {
              const start = new Date();
              start.setMinutes(0, 0, 0);
              start.setHours(start.getHours() + 1);
              setModal({ scheduledStart: toDateTimeLocal(start) });
            }}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            <Plus size={14} />
            Mission
          </button>
        </div>
      </div>

      {/* Status legend -- color is the only channel on a chip, so name every
          hue once here rather than relying on hover alone. */}
      <div className="flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
        {(Object.keys(STATUS_LABELS) as MissionStatus[]).map((status) => (
          <span key={status} className="flex items-center gap-1">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status]}`} />
            {STATUS_LABELS[status]}
          </span>
        ))}
        <span className="flex items-center gap-1">
          <Radio size={10} />
          Diffusion
        </span>
      </div>

      {unavailability.length > 0 && (
        <UnavailabilityStrip
          unavailability={unavailability}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          open={unavailOpen}
          onToggle={() => setUnavailOpen((v) => !v)}
        />
      )}

      <div className="min-h-0 flex-1 overflow-auto rounded-xl border border-slate-800">
        {view === "week" ? (
          <WeekGrid days={days} sites={sites} missions={missions} onCellClick={setModal} />
        ) : (
          <MonthGrid days={days} anchor={anchor} missionsOnDay={missionsOnDay} onCellClick={setModal} />
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setModal(null)}
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
              >
                <X size={14} />
                Fermer
              </button>
            </div>
            <MissionForm
              sites={sites}
              agents={agents}
              initialSiteId={modal.siteId}
              initialScheduledStart={modal.scheduledStart}
              onCreated={() => setModal(null)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function WeekGrid({
  days,
  sites,
  missions,
  onCellClick,
}: {
  days: Date[];
  sites: Option[];
  missions: PlanningMission[];
  onCellClick: (v: { siteId: string; scheduledStart: string }) => void;
}) {
  const today = new Date();

  function cellMissions(day: Date, siteId: string) {
    return missions.filter((m) => m.siteId === siteId && isSameDay(new Date(m.scheduledStart), day));
  }

  return (
    <table className="w-full border-collapse text-sm">
      <thead>
        <tr>
          <th className="sticky left-0 top-0 z-20 w-36 border-b border-r border-slate-800 bg-slate-900 p-2 text-left text-xs font-medium text-slate-400">
            Site
          </th>
          {days.map((day) => (
            <th
              key={day.toISOString()}
              className={`sticky top-0 z-10 min-w-[130px] border-b border-slate-800 bg-slate-900 p-2 text-xs font-medium ${
                isSameDay(day, today) ? "text-blue-400" : "text-slate-400"
              }`}
            >
              {day.toLocaleDateString("fr-FR", { weekday: "short", day: "2-digit", month: "2-digit" })}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {sites.map((site) => (
          <tr key={site.id}>
            <td className="sticky left-0 z-10 border-r border-b border-slate-800 bg-slate-900/95 p-2 text-xs font-medium text-slate-300">
              {site.label}
            </td>
            {days.map((day) => {
              const dayStart = new Date(day);
              dayStart.setHours(9, 0, 0, 0);
              const isToday = isSameDay(day, today);
              return (
                <td
                  key={day.toISOString()}
                  onClick={() => onCellClick({ siteId: site.id, scheduledStart: toDateTimeLocal(dayStart) })}
                  className={`cursor-pointer space-y-1 border-b border-slate-800 p-1.5 align-top hover:bg-slate-800/40 ${
                    isToday ? "bg-blue-500/5" : ""
                  }`}
                >
                  {cellMissions(day, site.id).map((m) => (
                    <MissionChip key={m.id} mission={m} />
                  ))}
                </td>
              );
            })}
          </tr>
        ))}
        {sites.length === 0 && (
          <tr>
            <td colSpan={days.length + 1} className="p-6 text-center italic text-slate-500">
              Aucun site actif.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}

function MonthGrid({
  days,
  anchor,
  missionsOnDay,
  onCellClick,
}: {
  days: Date[];
  anchor: Date;
  missionsOnDay: (day: Date) => PlanningMission[];
  onCellClick: (v: { siteId?: string; scheduledStart: string }) => void;
}) {
  const today = new Date();
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-10 grid grid-cols-7 border-b border-slate-800 bg-slate-900">
        {["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"].map((d) => (
          <div key={d} className="p-1.5 text-center text-xs font-medium text-slate-400">
            {d}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-rows-6">
        {weeks.map((week, wi) => (
          <div key={wi} className="grid grid-cols-7">
            {week.map((day) => {
              const inMonth = day.getMonth() === anchor.getMonth();
              const dayMissions = missionsOnDay(day);
              const visible = dayMissions.slice(0, 3);
              const overflow = dayMissions.length - visible.length;
              const dayStart = new Date(day);
              dayStart.setHours(9, 0, 0, 0);
              const isToday = isSameDay(day, today);
              return (
                <div
                  key={day.toISOString()}
                  onClick={() => onCellClick({ scheduledStart: toDateTimeLocal(dayStart) })}
                  className={`min-h-[80px] cursor-pointer space-y-1 border-b border-r border-slate-800 p-1.5 align-top last:border-r-0 hover:bg-slate-800/40 ${
                    inMonth ? "" : "opacity-40"
                  } ${isToday ? "bg-blue-500/5" : ""}`}
                >
                  <p className={`text-xs font-medium ${isToday ? "text-blue-400" : "text-slate-400"}`}>
                    {day.getDate()}
                  </p>
                  {visible.map((m) => (
                    <MissionChip key={m.id} mission={m} />
                  ))}
                  {overflow > 0 && <p className="text-[11px] text-slate-500">+{overflow}</p>}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

function UnavailabilityStrip({
  unavailability,
  rangeStart,
  rangeEnd,
  open,
  onToggle,
}: {
  unavailability: PlanningUnavailability[];
  rangeStart: Date;
  rangeEnd: Date;
  open: boolean;
  onToggle: () => void;
}) {
  const byAgent = new Map<string, { agentName: string; windows: PlanningUnavailability[] }>();
  for (const u of unavailability) {
    const entry = byAgent.get(u.agentId) ?? { agentName: u.agentName, windows: [] };
    entry.windows.push(u);
    byAgent.set(u.agentId, entry);
  }
  const totalMs = rangeEnd.getTime() - rangeStart.getTime();
  const agentEntries = Array.from(byAgent.values());

  return (
    <div className="shrink-0 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2">
      <button onClick={onToggle} className="flex w-full items-center justify-between text-left">
        <p className="text-xs font-semibold text-slate-400">
          Indisponibilités <span className="text-slate-500">({agentEntries.length})</span>
        </p>
        <ChevronDown size={14} className={`text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="mt-2 max-h-24 space-y-1.5 overflow-y-auto pr-1">
          {agentEntries.map(({ agentName, windows }) => (
            <div key={agentName} className="flex items-center gap-3">
              <span className="w-28 shrink-0 truncate text-[11px] text-slate-300">{agentName}</span>
              <div className="relative h-3 flex-1 rounded bg-slate-800">
                {windows.map((w) => {
                  const start = Math.max(new Date(w.startAt).getTime(), rangeStart.getTime());
                  const end = Math.min(new Date(w.endAt).getTime(), rangeEnd.getTime());
                  const left = ((start - rangeStart.getTime()) / totalMs) * 100;
                  const width = ((end - start) / totalMs) * 100;
                  return (
                    <div
                      key={w.id}
                      className="absolute top-0 h-full rounded bg-amber-500/60"
                      style={{ left: `${left}%`, width: `${Math.max(width, 1)}%` }}
                      title={`${new Date(w.startAt).toLocaleDateString("fr-FR")} → ${new Date(w.endAt).toLocaleDateString("fr-FR")}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
