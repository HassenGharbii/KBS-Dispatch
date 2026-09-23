"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cancelMission, reassignMission } from "./actions";
import { MissionForm } from "./mission-form";
import { Modal } from "@/components/modal";
import type { MissionWithNames, MissionStatus } from "./types";
import { Plus, Radio } from "lucide-react";

const STATUS_LABELS: Record<MissionStatus, string> = {
  proposed: "Proposée",
  accepted: "Acceptée",
  refused: "Refusée",
  cancelled: "Annulée",
  en_route: "En route",
  in_progress: "En cours",
  completed: "Terminée",
};

// Same status hues as the planning calendar (missions-list is the other
// place these statuses render) -- a filled pill rather than bold text reads
// better as a scannable status chip in a dense list.
const STATUS_PILLS: Record<MissionStatus, string> = {
  proposed: "bg-amber-500/15 text-amber-400",
  accepted: "bg-blue-500/15 text-blue-400",
  refused: "bg-red-500/15 text-red-400",
  cancelled: "bg-slate-600/20 text-slate-400",
  en_route: "bg-purple-500/15 text-purple-400",
  in_progress: "bg-emerald-500/15 text-emerald-400",
  completed: "bg-slate-500/15 text-slate-300",
};

const CANCELLABLE: MissionStatus[] = ["proposed", "accepted", "en_route"];
const REASSIGNABLE: MissionStatus[] = ["cancelled", "refused"];
const LATE_THRESHOLD_MIN = 5;

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function DelayBadge({ scheduledStart, actualStartAt }: { scheduledStart: string; actualStartAt: string }) {
  const delayMin = Math.round(
    (new Date(actualStartAt).getTime() - new Date(scheduledStart).getTime()) / 60_000
  );
  const isLate = delayMin > LATE_THRESHOLD_MIN;
  return (
    <p className={`mt-0.5 text-xs font-medium ${isLate ? "text-red-400" : "text-emerald-400"}`}>
      Prise de service {formatDateTime(actualStartAt)}
      {isLate ? ` · en retard de ${delayMin} min` : " · à l'heure"}
    </p>
  );
}

function CancelButton({ missionId }: { missionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() => startTransition(async () => { await cancelMission(missionId); })}
      disabled={pending}
      className="text-xs font-medium text-red-400 hover:text-red-300 disabled:opacity-50"
    >
      Annuler
    </button>
  );
}

function ReassignForm({
  missionId,
  agents,
  onDone,
}: {
  missionId: string;
  agents: { id: string; label: string }[];
  onDone: () => void;
}) {
  const [isBroadcast, setIsBroadcast] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.set("missionId", missionId);
      const result = await reassignMission(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form action={handleSubmit} className="mt-2 flex flex-wrap items-center gap-2 rounded-md bg-slate-800/60 p-2.5">
      <select
        name="agentId"
        required={!isBroadcast}
        disabled={isBroadcast}
        defaultValue=""
        className="rounded-md border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100 disabled:opacity-40"
      >
        <option value="" disabled>
          Choisir un agent…
        </option>
        {agents.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.label}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1 text-xs text-slate-300">
        <input
          type="checkbox"
          checked={isBroadcast}
          onChange={(e) => setIsBroadcast(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-slate-600 bg-slate-800"
        />
        Diffuser à tous
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "…" : "Confirmer"}
      </button>
      {error && <p className="w-full text-xs text-red-400">{error}</p>}
    </form>
  );
}

function ReassignButton({ missionId, agents }: { missionId: string; agents: { id: string; label: string }[] }) {
  const [open, setOpen] = useState(false);
  if (open) {
    return <ReassignForm missionId={missionId} agents={agents} onDone={() => setOpen(false)} />;
  }
  return (
    <button
      onClick={() => setOpen(true)}
      className="text-xs font-medium text-blue-400 hover:text-blue-300"
    >
      Réaffecter
    </button>
  );
}

export function MissionsList({
  missions,
  agents,
  sites,
}: {
  missions: MissionWithNames[];
  agents: { id: string; label: string }[];
  sites: { id: string; label: string }[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);

  // Unfiltered subscription, branch client-side -- same reasoning as the
  // mobile app's LiveMapScreen: a server-side status filter would miss
  // exactly the transitions (e.g. accepted -> en_route) this list exists to
  // show live. router.refresh() re-runs the server component's query
  // rather than reconciling a local copy -- missions change a handful of
  // times an hour, so the extra round trip is not worth avoiding.
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel("missions-org-console")
      .on("postgres_changes", { event: "*", schema: "public", table: "missions" }, () => {
        router.refresh();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex shrink-0 items-center justify-between">
        <h1 className="text-lg font-semibold text-white">
          Missions <span className="text-sm font-normal text-slate-500">({missions.length})</span>
        </h1>
        <button
          onClick={() => setCreateOpen(true)}
          className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
        >
          <Plus size={14} />
          Nouvelle mission
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {missions.map((mission) => (
            <div key={mission.id} className="flex items-start justify-between gap-3 px-3.5 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-medium text-slate-100">{mission.siteName}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${STATUS_PILLS[mission.status]}`}>
                    {STATUS_LABELS[mission.status]}
                  </span>
                  {mission.isBroadcast && (
                    <span className="flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[11px] font-medium text-purple-400">
                      <Radio size={10} />
                      Diffusion
                    </span>
                  )}
                </div>
                <p className="mt-0.5 text-sm text-slate-400">
                  {mission.agentName} · {formatDateTime(mission.scheduledStart)}
                </p>
                {mission.instructions && (
                  <p className="mt-0.5 text-sm italic text-slate-500">{mission.instructions}</p>
                )}
                {mission.actualStartAt && (
                  <DelayBadge scheduledStart={mission.scheduledStart} actualStartAt={mission.actualStartAt} />
                )}
                {REASSIGNABLE.includes(mission.status) && (
                  <ReassignButton missionId={mission.id} agents={agents} />
                )}
              </div>
              {CANCELLABLE.includes(mission.status) && (
                <div className="shrink-0">
                  <CancelButton missionId={mission.id} />
                </div>
              )}
            </div>
          ))}
          {missions.length === 0 && (
            <p className="px-4 py-6 text-center italic text-slate-500">Aucune mission créée.</p>
          )}
        </div>
      </div>

      {createOpen && (
        <Modal title="Nouvelle mission" onClose={() => setCreateOpen(false)}>
          <MissionForm sites={sites} agents={agents} onCreated={() => setCreateOpen(false)} />
        </Modal>
      )}
    </div>
  );
}
