"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AgentForm } from "./agent-form";
import { updateAgentProfile } from "./actions";
import { Plus, Phone, IdCard, X, Search, Edit2 } from "lucide-react";

interface Agent {
  id: string;
  full_name: string;
  phone: string | null;
  professional_card_number: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none";

function EditAgentForm({ agent, onSaved }: { agent: Agent; onSaved: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.set("agentId", agent.id);
      const result = await updateAgentProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6">
      <h2 className="text-sm font-semibold text-slate-100">Modifier l&apos;agent</h2>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Nom complet</label>
        <input name="fullName" required defaultValue={agent.full_name} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Téléphone</label>
        <input name="phone" defaultValue={agent.phone ?? ""} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

export function AgentsList({ agents, query }: { agents: Agent[]; query: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Agent | null>(null);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-white">
          Agents <span className="text-sm font-normal text-slate-500">({agents.length})</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <form action="/org/agents" method="get" className="flex items-center gap-1.5">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Rechercher un agent…"
                className="rounded-md border border-slate-700 bg-slate-800 py-1 pl-7 pr-2 text-xs text-slate-100 placeholder:text-slate-500"
              />
            </div>
            <button
              type="submit"
              className="rounded-md border border-slate-700 px-2.5 py-1 text-xs font-medium text-slate-300 hover:bg-slate-800"
            >
              Rechercher
            </button>
            {query && (
              <Link
                href="/org/agents"
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Réinitialiser
              </Link>
            )}
          </form>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            <Plus size={14} />
            Nouvel agent
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-600/20 text-xs font-semibold text-blue-400">
                {initials(agent.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-100">{agent.full_name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <Phone size={12} />
                    {agent.phone ?? "—"}
                  </span>
                  {agent.professional_card_number && (
                    <span className="flex items-center gap-1">
                      <IdCard size={12} />
                      {agent.professional_card_number}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => setEditing(agent)}
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                <Edit2 size={12} />
                Modifier
              </button>
            </div>
          ))}
          {agents.length === 0 && (
            <p className="px-4 py-6 text-center italic text-slate-500">
              {query ? "Aucun agent ne correspond à cette recherche." : "Aucun agent."}
            </p>
          )}
        </div>
      </div>

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setCreateOpen(false)}
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
              >
                <X size={14} />
                Fermer
              </button>
            </div>
            <AgentForm onCreated={() => setCreateOpen(false)} />
          </div>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md">
            <div className="mb-2 flex justify-end">
              <button
                onClick={() => setEditing(null)}
                className="flex items-center gap-1 rounded-lg bg-slate-800 px-3 py-1 text-sm text-slate-300 hover:bg-slate-700"
              >
                <X size={14} />
                Fermer
              </button>
            </div>
            <EditAgentForm agent={editing} onSaved={() => setEditing(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
