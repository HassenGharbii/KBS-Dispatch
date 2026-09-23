"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { SiteForm, type SiteFormValue } from "./site-form";
import { deactivateSite, reactivateSite, deleteSite } from "./actions";
import { siteIconOrDefault } from "./site-icons";
import { Modal } from "@/components/modal";
import { Plus, Search, MapPin, ShieldAlert, Edit2, Power, Trash2 } from "lucide-react";

interface Site {
  id: string;
  name: string;
  address: string;
  client_name: string | null;
  sensitivity_level: number;
  icon: string;
  is_active: boolean;
  lat: number | null;
  lng: number | null;
}

const SENSITIVITY_LABELS: Record<number, string> = {
  1: "Standard",
  2: "Sensible",
  3: "Critique",
};

const SENSITIVITY_STYLES: Record<number, string> = {
  1: "bg-slate-700/50 text-slate-300",
  2: "bg-amber-500/15 text-amber-400",
  3: "bg-red-500/15 text-red-400",
};

function toFormValue(site: Site): SiteFormValue {
  return {
    id: site.id,
    name: site.name,
    address: site.address,
    clientName: site.client_name,
    sensitivityLevel: site.sensitivity_level,
    icon: site.icon,
    lat: site.lat,
    lng: site.lng,
  };
}

function ToggleActiveButton({ siteId, isActive }: { siteId: string; isActive: boolean }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      onClick={() =>
        startTransition(async () => {
          await (isActive ? deactivateSite(siteId) : reactivateSite(siteId));
        })
      }
      disabled={pending}
      className={`flex items-center gap-1 text-xs font-medium disabled:opacity-50 ${
        isActive ? "text-red-400 hover:text-red-300" : "text-emerald-400 hover:text-emerald-300"
      }`}
    >
      <Power size={12} />
      {isActive ? "Désactiver" : "Réactiver"}
    </button>
  );
}

function DeleteSiteButton({ siteId, siteName }: { siteId: string; siteName: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!window.confirm(`Supprimer définitivement le site « ${siteName} » ?`)) return;
    startTransition(async () => {
      const result = await deleteSite(siteId);
      setError(result.error);
    });
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={pending}
        className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-400 disabled:opacity-50"
      >
        <Trash2 size={12} />
        Supprimer
      </button>
      {error && (
        <p className="absolute right-0 top-full z-10 mt-1 w-56 rounded-md border border-red-800 bg-slate-900 p-2 text-[11px] text-red-400 shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
}

export function SitesList({ sites, query }: { sites: Site[]; query: string }) {
  const [modal, setModal] = useState<"create" | Site | null>(null);

  return (
    <div className="flex h-full flex-col gap-2.5">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2">
        <h1 className="text-lg font-semibold text-white">
          Sites <span className="text-sm font-normal text-slate-500">({sites.length})</span>
        </h1>
        <div className="flex items-center gap-1.5">
          <form action="/org/sites" method="get" className="flex items-center gap-1.5">
            <div className="relative">
              <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Rechercher un site…"
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
                href="/org/sites"
                className="rounded-md border border-slate-700 px-2.5 py-1 text-xs text-slate-400 hover:bg-slate-800"
              >
                Réinitialiser
              </Link>
            )}
          </form>
          <button
            onClick={() => setModal("create")}
            className="flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-500"
          >
            <Plus size={14} />
            Nouveau site
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-slate-800 bg-slate-900">
        <div className="divide-y divide-slate-800">
          {sites.map((site) => {
            const SiteIcon = siteIconOrDefault(site.icon);
            return (
            <div key={site.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-600/20 text-blue-400">
                <SiteIcon size={16} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate font-medium text-slate-100">{site.name}</span>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${SENSITIVITY_STYLES[site.sensitivity_level] ?? SENSITIVITY_STYLES[1]}`}>
                    <ShieldAlert size={10} />
                    {SENSITIVITY_LABELS[site.sensitivity_level] ?? site.sensitivity_level}
                  </span>
                  <span
                    className={
                      site.is_active
                        ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-medium text-emerald-400"
                        : "rounded-full bg-slate-700/50 px-2 py-0.5 text-[11px] font-medium text-slate-400"
                    }
                  >
                    {site.is_active ? "Actif" : "Inactif"}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-500">
                  <span className="flex items-center gap-1">
                    <MapPin size={11} />
                    {site.address}
                  </span>
                  {site.client_name && <span>{site.client_name}</span>}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <button
                  onClick={() => setModal(site)}
                  className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
                >
                  <Edit2 size={12} />
                  Modifier
                </button>
                <ToggleActiveButton siteId={site.id} isActive={site.is_active} />
                <DeleteSiteButton siteId={site.id} siteName={site.name} />
              </div>
            </div>
            );
          })}
          {sites.length === 0 && (
            <p className="px-4 py-6 text-center italic text-slate-500">
              {query ? "Aucun site ne correspond à cette recherche." : "Aucun site."}
            </p>
          )}
        </div>
      </div>

      {modal && (
        <Modal title={modal === "create" ? "Nouveau site" : "Modifier le site"} onClose={() => setModal(null)}>
          <SiteForm site={modal === "create" ? undefined : toFormValue(modal)} onSaved={() => setModal(null)} />
        </Modal>
      )}
    </div>
  );
}
