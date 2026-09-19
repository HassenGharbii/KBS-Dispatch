import { createClient } from "@/lib/supabase/server";
import { StatTile } from "./stat-tile";
import { BarList, type BarListItem } from "./bar-list";
import { PeakHoursChart } from "./peak-hours-chart";
import { StatusBar, type StatusSegment } from "./status-bar";
import { Users, Clock, CheckCircle2, Target, BarChart3, MapPin } from "lucide-react";
import { DownloadCsvButton } from "@/components/download-csv-button";

interface HoursSummaryRow {
  agent_id: string;
  agent_name: string;
  site_id: string;
  site_name: string;
  total_hours: number;
  shift_count: number;
}

interface PunctualityRow {
  scheduled_start: string;
  shifts: { start_at: string }[] | null;
}

// Buckets rather than the 7 raw mission statuses: keeps the legend to 4
// entries and validated CVD-safe (see the dataviz skill's palette script) --
// blue+amber+emerald+red all pass together, while the raw 7-status set can't
// avoid putting blue ("accepted") next to purple ("en_route"), which the
// validator already failed hard elsewhere in this dashboard.
const STATUS_BUCKETS: { id: string; label: string; color: string; statuses: string[] }[] = [
  { id: "en_attente", label: "En attente", color: "#c98500", statuses: ["proposed"] },
  { id: "en_cours", label: "En cours", color: "#3987e5", statuses: ["accepted", "en_route", "in_progress"] },
  { id: "terminees", label: "Terminées", color: "#1f9d6b", statuses: ["completed"] },
  { id: "annulees", label: "Annulées / refusées", color: "#d64545", statuses: ["cancelled", "refused"] },
];

const MONTH_NAMES = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

// Same 5-minute threshold already used for the DelayBadge convention on
// /org/missions -- keeps "on time" meaning consistent across the console.
const LATE_THRESHOLD_MIN = 5;

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/** Hour-of-day in Europe/Paris, matching the timezone convention already
 * used server-side for push-notification copy (`at time zone 'Europe/Paris'`). */
function hourInParis(iso: string): number {
  const formatted = new Intl.DateTimeFormat("fr-FR", {
    hour: "2-digit",
    hour12: false,
    timeZone: "Europe/Paris",
  }).format(new Date(iso));
  return parseInt(formatted, 10) % 24;
}

export default async function StatsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string; siteId?: string; agentId?: string }>;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear();
  const month = params.month ? parseInt(params.month, 10) : now.getMonth() + 1;
  const siteId = params.siteId || null;
  const agentId = params.agentId || null;

  const monthStart = new Date(Date.UTC(year, month - 1, 1));
  const monthEnd = new Date(Date.UTC(year, month, 1));

  const supabase = await createClient();

  const [
    { data: hoursRows },
    { count: completedMissions },
    { data: punctualityRows },
    { data: peakHoursRows },
    { data: statusRows },
    { data: openShiftRows },
    { data: enRouteRows },
    { count: totalAgents },
    { data: sites },
    { data: agents },
  ] = await Promise.all([
    supabase.rpc("dirigeant_hours_summary", {
      p_year: year,
      p_month: month,
      p_site_id: siteId,
      p_agent_id: agentId,
    }),
    (() => {
      let q = supabase
        .from("missions")
        .select("id", { count: "exact", head: true })
        .eq("status", "completed")
        .gte("scheduled_start", monthStart.toISOString())
        .lt("scheduled_start", monthEnd.toISOString());
      if (siteId) q = q.eq("site_id", siteId);
      if (agentId) q = q.eq("agent_id", agentId);
      return q;
    })(),
    (() => {
      let q = supabase
        .from("missions")
        .select("scheduled_start, shifts(start_at)")
        .gte("scheduled_start", monthStart.toISOString())
        .lt("scheduled_start", monthEnd.toISOString());
      if (siteId) q = q.eq("site_id", siteId);
      if (agentId) q = q.eq("agent_id", agentId);
      return q.returns<PunctualityRow[]>();
    })(),
    (() => {
      let q = supabase
        .from("shifts")
        .select("start_at, site_id, agent_id")
        .gte("start_at", monthStart.toISOString())
        .lt("start_at", monthEnd.toISOString());
      if (siteId) q = q.eq("site_id", siteId);
      if (agentId) q = q.eq("agent_id", agentId);
      return q.returns<{ start_at: string; site_id: string; agent_id: string }[]>();
    })(),
    (() => {
      let q = supabase
        .from("missions")
        .select("status")
        .gte("scheduled_start", monthStart.toISOString())
        .lt("scheduled_start", monthEnd.toISOString());
      if (siteId) q = q.eq("site_id", siteId);
      if (agentId) q = q.eq("agent_id", agentId);
      return q.returns<{ status: string }[]>();
    })(),
    supabase.from("shifts").select("agent_id").eq("status", "open"),
    supabase.from("missions").select("agent_id").eq("status", "en_route"),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("role", "agent"),
    supabase.from("sites").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "agent").order("full_name"),
  ]);

  const rows = (hoursRows ?? []) as HoursSummaryRow[];

  // --- Heures par agent (nominal categories -> single hue, sorted desc) ---
  const hoursByAgent = new Map<string, BarListItem>();
  for (const row of rows) {
    const existing = hoursByAgent.get(row.agent_id);
    if (existing) existing.value += row.total_hours;
    else hoursByAgent.set(row.agent_id, { id: row.agent_id, label: row.agent_name, value: row.total_hours });
  }
  const hoursByAgentList = Array.from(hoursByAgent.values()).sort((a, b) => b.value - a.value);
  const totalHours = rows.reduce((sum, r) => sum + r.total_hours, 0);

  // --- Sites les plus visités (visit count = shift_count, not hours) ---
  const visitsBySite = new Map<string, BarListItem>();
  for (const row of rows) {
    const existing = visitsBySite.get(row.site_id);
    if (existing) existing.value += row.shift_count;
    else visitsBySite.set(row.site_id, { id: row.site_id, label: row.site_name, value: row.shift_count });
  }
  let visitsBySiteList = Array.from(visitsBySite.values()).sort((a, b) => b.value - a.value);
  if (visitsBySiteList.length > 8) {
    const top = visitsBySiteList.slice(0, 7);
    const rest = visitsBySiteList.slice(7).reduce((sum, s) => sum + s.value, 0);
    visitsBySiteList = [...top, { id: "other", label: "Autres sites", value: rest }];
  }

  // --- Ponctualité (only missions with a recorded clock-in shift count) ---
  const punctualityInRange = (punctualityRows ?? []).filter((r) => r.shifts && r.shifts.length > 0);
  const onTimeCount = punctualityInRange.filter((r) => {
    const actualStartAt = r.shifts![0].start_at;
    const delayMin = (new Date(actualStartAt).getTime() - new Date(r.scheduled_start).getTime()) / 60_000;
    return delayMin <= LATE_THRESHOLD_MIN;
  }).length;
  const punctualityPct =
    punctualityInRange.length > 0 ? Math.round((onTimeCount / punctualityInRange.length) * 100) : null;

  // --- Missions par statut (bucketed, filtered period) ---
  const missionStatusSegments: StatusSegment[] = STATUS_BUCKETS.map((bucket) => ({
    id: bucket.id,
    label: bucket.label,
    color: bucket.color,
    value: (statusRows ?? []).filter((r) => bucket.statuses.includes(r.status)).length,
  }));

  // --- Heures de pointe (hour-of-day histogram, Europe/Paris) ---
  const peakHoursCounts = new Array(24).fill(0);
  for (const row of peakHoursRows ?? []) {
    peakHoursCounts[hourInParis(row.start_at)] += 1;
  }

  // --- Live: current agent status distribution ---
  const openAgentIds = new Set((openShiftRows ?? []).map((r) => r.agent_id));
  const enRouteAgentIds = new Set(
    (enRouteRows ?? []).map((r) => r.agent_id).filter((id) => !openAgentIds.has(id))
  );
  const onShiftCount = openAgentIds.size;
  const enRouteCount = enRouteAgentIds.size;
  const availableCount = Math.max(0, (totalAgents ?? 0) - onShiftCount - enRouteCount);
  const activeNow = onShiftCount + enRouteCount;

  // Validated (see the dataviz skill's palette validator) as a genuinely
  // CVD-safe trio for this dark surface -- blue+violet (this app's map-marker
  // colors) failed the check (ΔE ~2, way below the safety floor), so "en
  // route" uses amber here instead of the map's purple.
  const statusSegments: StatusSegment[] = [
    { id: "on_shift", label: "En service", value: onShiftCount, color: "#3987e5" },
    { id: "en_route", label: "En route", value: enRouteCount, color: "#c98500" },
    { id: "available", label: "Disponible", value: availableCount, color: "#64748b" },
  ];

  const years = Array.from({ length: 5 }, (_, i) => now.getFullYear() - i);

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header + filters in one compact bar. The live "Agents actifs" figure
          right of the title deliberately ignores the filters (it answers
          "right now", not "over this period") -- the form below scopes
          everything else on the page. */}
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-white">Statistiques</h1>
            <DownloadCsvButton
              filename={`stats-${year}-${String(month).padStart(2, "0")}.csv`}
              rows={rows.map((r) => ({
                agent: r.agent_name,
                site: r.site_name,
                heures: r.total_hours,
                services: r.shift_count,
              }))}
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Users size={15} className="text-blue-400" />
            <span className="font-medium text-white">{activeNow}</span>
            <span className="text-slate-500">/ {totalAgents ?? 0} actifs</span>
          </div>
        </div>
        <form action="/org/stats" method="get" className="flex flex-wrap items-center gap-1.5">
          <select
            name="month"
            defaultValue={month}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            {MONTH_NAMES.map((name, i) => (
              <option key={name} value={i + 1}>
                {name}
              </option>
            ))}
          </select>
          <select
            name="year"
            defaultValue={year}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select
            name="siteId"
            defaultValue={siteId ?? ""}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="">Tous les sites</option>
            {(sites ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <select
            name="agentId"
            defaultValue={agentId ?? ""}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="">Tous les agents</option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
          >
            Appliquer
          </button>
        </form>
      </div>

      {/* KPI strip -- all scoped to the filters above, in one row */}
      <div className="grid shrink-0 grid-cols-2 gap-2.5 sm:grid-cols-4">
        <StatTile
          icon={<Clock size={16} />}
          iconClassName="bg-blue-600/20 text-blue-400"
          label={`Heures — ${MONTH_NAMES[month - 1].slice(0, 3)} ${year}`}
          value={formatHours(totalHours)}
        />
        <StatTile
          icon={<CheckCircle2 size={16} />}
          iconClassName="bg-emerald-600/20 text-emerald-400"
          label="Missions terminées"
          value={String(completedMissions ?? 0)}
        />
        <StatTile
          icon={<Target size={16} />}
          iconClassName="bg-amber-600/20 text-amber-400"
          label="Ponctualité"
          value={punctualityPct != null ? `${punctualityPct}%` : "—"}
        />
        <div className="flex flex-col justify-center rounded-lg border border-slate-800 bg-slate-900 px-3 py-2.5">
          <p className="mb-1 text-[11px] leading-tight text-slate-400">Statuts — en ce moment</p>
          <StatusBar segments={statusSegments} />
        </div>
      </div>

      {/* Charts -- 2x2, filling the rest of the viewport (no leftover
          empty space below the fold, matching the rest of the console). */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-2.5 lg:grid-cols-2 lg:grid-rows-2">
        <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="mb-1.5 flex shrink-0 items-center gap-1.5">
            <BarChart3 size={14} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-white">Heures par agent</h2>
          </div>
          <div className="min-h-0 flex-1">
            <BarList
              items={hoursByAgentList}
              color="#3987e5"
              format="hours"
              emptyLabel="Aucune heure sur la période."
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="mb-1.5 flex shrink-0 items-center gap-1.5">
            <MapPin size={14} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-white">Sites les plus visités</h2>
          </div>
          <div className="min-h-0 flex-1">
            <BarList
              items={visitsBySiteList}
              color="#3987e5"
              format="services"
              emptyLabel="Aucune visite sur la période."
            />
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="mb-1.5 flex shrink-0 items-center gap-1.5">
            <Clock size={14} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-white">Heures de pointe</h2>
          </div>
          <div className="min-h-0 flex-1">
            <PeakHoursChart counts={peakHoursCounts} color="#3987e5" />
          </div>
        </div>

        <div className="flex min-h-0 flex-col rounded-lg border border-slate-800 bg-slate-900 p-3">
          <div className="mb-1.5 flex shrink-0 items-center gap-1.5">
            <Target size={14} className="text-blue-400" />
            <h2 className="text-xs font-semibold text-white">Missions par statut — période</h2>
          </div>
          <div className="flex min-h-0 flex-1 flex-col justify-center">
            <StatusBar segments={missionStatusSegments} />
          </div>
        </div>
      </div>
    </div>
  );
}
