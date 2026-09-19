import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "./formatting";
import { Building2, ClipboardList, Camera } from "lucide-react";
import { DownloadCsvButton } from "@/components/download-csv-button";

interface ShiftReportRow {
  shift_id: string;
  agent_id: string;
  agent_name: string;
  site_id: string;
  site_name: string;
  status: "open" | "closed";
  start_at: string;
  event_count: number;
  photo_count: number;
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ siteId?: string; agentId?: string; status?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const siteId = params.siteId || "";
  const agentId = params.agentId || "";
  const status = params.status === "open" || params.status === "closed" ? params.status : "";
  const from = params.from || "";
  const to = params.to || "";

  const supabase = await createClient();

  let query = supabase.from("shift_reports").select("*").order("start_at", { ascending: false }).limit(200);
  if (siteId) query = query.eq("site_id", siteId);
  if (agentId) query = query.eq("agent_id", agentId);
  if (status) query = query.eq("status", status);
  if (from) query = query.gte("start_at", new Date(from).toISOString());
  if (to) query = query.lt("start_at", new Date(new Date(to).getTime() + 24 * 60 * 60 * 1000).toISOString());

  const [{ data }, { data: sites }, { data: agents }] = await Promise.all([
    query.returns<ShiftReportRow[]>(),
    supabase.from("sites").select("id, name").eq("is_active", true).order("name"),
    supabase.from("profiles").select("id, full_name").eq("role", "agent").order("full_name"),
  ]);

  const reports = data ?? [];
  const hasFilters = Boolean(siteId || agentId || status || from || to);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold text-white">
            Rapports <span className="text-sm font-normal text-slate-500">({reports.length})</span>
          </h1>
          <DownloadCsvButton
            filename="rapports.csv"
            rows={reports.map((r) => ({
              agent: r.agent_name,
              site: r.site_name,
              statut: r.status === "open" ? "En cours" : "Terminé",
              debut: formatDateTime(r.start_at),
              evenements: r.event_count,
              photos: r.photo_count,
            }))}
          />
        </div>
        <form action="/org/reports" method="get" className="flex flex-wrap items-center gap-1.5">
          <select
            name="siteId"
            defaultValue={siteId}
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
            defaultValue={agentId}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="">Tous les agents</option>
            {(agents ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.full_name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={status}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          >
            <option value="">Tous les statuts</option>
            <option value="open">En cours</option>
            <option value="closed">Terminé</option>
          </select>
          <input
            type="date"
            name="from"
            defaultValue={from}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
          <span className="text-xs text-slate-500">→</span>
          <input
            type="date"
            name="to"
            defaultValue={to}
            className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
          />
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500"
          >
            Filtrer
          </button>
          {hasFilters && (
            <Link
              href="/org/reports"
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
            >
              Réinitialiser
            </Link>
          )}
        </form>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {reports.map((report) => (
            <Link
              key={report.shift_id}
              href={`/org/reports/${report.shift_id}`}
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 hover:bg-slate-800/60"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-100">{report.agent_name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-400">
                  <Building2 size={13} className="shrink-0 text-slate-500" />
                  <span className="truncate">{report.site_name}</span>
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <span>{formatDateTime(report.start_at)}</span>
                  <span className="flex items-center gap-1">
                    <ClipboardList size={12} />
                    {report.event_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <Camera size={12} />
                    {report.photo_count}
                  </span>
                </p>
              </div>
              {report.status === "open" && (
                <span className="shrink-0 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                  En cours
                </span>
              )}
            </Link>
          ))}
          {reports.length === 0 && (
            <p className="px-4 py-6 text-center italic text-slate-500">
              {hasFilters ? "Aucun compte rendu pour ces filtres." : "Aucun compte rendu pour le moment."}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
