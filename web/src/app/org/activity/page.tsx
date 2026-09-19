import { createClient } from "@/lib/supabase/server";
import { DownloadCsvButton } from "@/components/download-csv-button";
import { XCircle, Repeat, CheckCircle2, XOctagon, Activity } from "lucide-react";

interface AuditRow {
  id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string;
  summary: string;
  created_at: string;
  actor: { full_name: string } | null;
}

const ACTION_META: Record<string, { icon: typeof XCircle; className: string }> = {
  mission_cancelled: { icon: XCircle, className: "bg-red-500/15 text-red-400" },
  mission_reassigned: { icon: Repeat, className: "bg-blue-500/15 text-blue-400" },
  swap_accepted: { icon: CheckCircle2, className: "bg-emerald-500/15 text-emerald-400" },
  swap_refused: { icon: XOctagon, className: "bg-slate-600/20 text-slate-400" },
};

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" });
}

export default async function ActivityPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_log")
    .select("id, actor_id, action, entity_type, entity_id, summary, created_at, actor:profiles!audit_log_actor_id_fkey(full_name)")
    .order("created_at", { ascending: false })
    .limit(200)
    .returns<AuditRow[]>();

  const entries = data ?? [];

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex shrink-0 items-center gap-2">
        <h1 className="text-lg font-semibold text-white">
          Activité <span className="text-sm font-normal text-slate-500">({entries.length})</span>
        </h1>
        <DownloadCsvButton
          filename="activite.csv"
          rows={entries.map((e) => ({
            date: formatDateTime(e.created_at),
            action: e.action,
            resume: e.summary,
            acteur: e.actor?.full_name ?? "—",
          }))}
        />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {entries.map((entry) => {
            const meta = ACTION_META[entry.action] ?? { icon: Activity, className: "bg-slate-700/40 text-slate-300" };
            const Icon = meta.icon;
            return (
              <div key={entry.id} className="flex items-start gap-3 px-3.5 py-2.5">
                <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${meta.className}`}>
                  <Icon size={15} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-100">{entry.summary}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{formatDateTime(entry.created_at)}</p>
                </div>
              </div>
            );
          })}
          {entries.length === 0 && (
            <p className="px-4 py-6 text-center italic text-slate-500">Aucune activité enregistrée.</p>
          )}
        </div>
      </div>
    </div>
  );
}
