"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SubAdminForm } from "./sub-admin-form";
import { updateSubAdminProfile } from "./actions";
import { Modal } from "@/components/modal";
import { Plus, Phone, Search, Edit2 } from "lucide-react";

interface SubAdmin {
  id: string;
  full_name: string;
  phone: string | null;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "?";
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none";

function EditSubAdminForm({ subAdmin, onSaved }: { subAdmin: SubAdmin; onSaved: () => void }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      formData.set("subAdminId", subAdmin.id);
      const result = await updateSubAdminProfile(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      router.refresh();
      onSaved();
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Nom complet</label>
        <input name="fullName" required defaultValue={subAdmin.full_name} className={inputClass} />
      </div>
      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Téléphone</label>
        <input name="phone" defaultValue={subAdmin.phone ?? ""} className={inputClass} />
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {pending ? "Enregistrement…" : "Enregistrer"}
      </button>
    </form>
  );
}

export function SubAdminsList({ subAdmins, query }: { subAdmins: SubAdmin[]; query: string }) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<SubAdmin | null>(null);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-white">
          Sous-administrateurs <span className="text-sm font-normal text-slate-500">({subAdmins.length})</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <form action="/org/sub-admins" method="get" className="flex items-center gap-1.5">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Rechercher…"
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
                href="/org/sub-admins"
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
            Nouveau sous-administrateur
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {subAdmins.map((sa) => (
            <div key={sa.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-purple-600/20 text-xs font-semibold text-purple-400">
                {initials(sa.full_name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-100">{sa.full_name}</p>
                <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                  <Phone size={12} />
                  {sa.phone ?? "—"}
                </p>
              </div>
              <button
                onClick={() => setEditing(sa)}
                className="flex shrink-0 items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
              >
                <Edit2 size={12} />
                Modifier
              </button>
            </div>
          ))}
          {subAdmins.length === 0 && (
            <p className="px-4 py-6 text-center italic text-slate-500">
              {query ? "Aucun sous-administrateur ne correspond à cette recherche." : "Aucun sous-administrateur."}
            </p>
          )}
        </div>
      </div>

      {createOpen && (
        <Modal title="Nouveau sous-administrateur" onClose={() => setCreateOpen(false)}>
          <SubAdminForm onCreated={() => setCreateOpen(false)} />
        </Modal>
      )}

      {editing && (
        <Modal title="Modifier le sous-administrateur" onClose={() => setEditing(null)}>
          <EditSubAdminForm subAdmin={editing} onSaved={() => setEditing(null)} />
        </Modal>
      )}
    </div>
  );
}
