"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { createSite, updateSite } from "./actions";

const LocationPicker = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  { ssr: false }
);

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none";

export interface SiteFormValue {
  id: string;
  name: string;
  address: string;
  clientName: string | null;
  sensitivityLevel: number;
  lat: number | null;
  lng: number | null;
}

export function SiteForm({
  site,
  onSaved,
}: {
  site?: SiteFormValue;
  onSaved?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    site?.lat != null && site?.lng != null ? { lat: site.lat, lng: site.lng } : null
  );

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    setError(null);
    const result = site ? await updateSite(formData) : await createSite(formData);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!site) {
      formRef.current?.reset();
      setLocation(null);
    }
    onSaved?.();
  }

  return (
    <form
      ref={formRef}
      action={handleSubmit}
      className="space-y-4 rounded-lg border border-slate-800 bg-slate-900 p-6"
    >
      <h2 className="text-sm font-semibold text-slate-100">{site ? "Modifier le site" : "Nouveau site"}</h2>
      {site && <input type="hidden" name="siteId" value={site.id} />}

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Nom</label>
          <input name="name" required defaultValue={site?.name} className={inputClass} />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Client</label>
          <input name="clientName" defaultValue={site?.clientName ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Adresse</label>
        <input name="address" required defaultValue={site?.address} className={inputClass} />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Niveau de sensibilité</label>
        <select name="sensitivityLevel" defaultValue={String(site?.sensitivityLevel ?? 1)} className={inputClass}>
          <option value="1">1 — Standard</option>
          <option value="2">2 — Sensible</option>
          <option value="3">3 — Critique</option>
        </select>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">
          Localisation {location ? "" : "(optionnel — cliquez sur la carte pour positionner le site)"}
        </label>
        <LocationPicker value={location} onChange={(lat, lng) => setLocation({ lat, lng })} />
        <input type="hidden" name="lat" value={location?.lat ?? ""} />
        <input type="hidden" name="lng" value={location?.lng ?? ""} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : site ? "Enregistrer" : "Créer le site"}
      </button>
    </form>
  );
}
