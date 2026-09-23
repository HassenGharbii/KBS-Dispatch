"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { MapPin } from "lucide-react";
import { createSite, updateSite, geocodeAddress } from "./actions";
import { SITE_ICONS, SITE_ICON_LABELS } from "./site-icons";

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
  icon: string;
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
  const addressRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    site?.lat != null && site?.lng != null ? { lat: site.lat, lng: site.lng } : null
  );
  const [icon, setIcon] = useState(site?.icon ?? "building");

  async function handleLocate() {
    const address = addressRef.current?.value.trim();
    if (!address) return;
    setLocating(true);
    setLocateError(null);
    const result = await geocodeAddress(address);
    setLocating(false);
    if (!result) {
      setLocateError("Adresse introuvable — placez le point manuellement sur la carte.");
      return;
    }
    setLocation(result);
  }

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
      setIcon("building");
    }
    onSaved?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      {site && <input type="hidden" name="siteId" value={site.id} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            ref={addressRef}
            name="address"
            required
            defaultValue={site?.address}
            className={inputClass}
          />
          <button
            type="button"
            onClick={handleLocate}
            disabled={locating}
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-md border border-slate-700 px-3 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            <MapPin size={14} />
            {locating ? "Recherche…" : "Localiser"}
          </button>
        </div>
        {locateError && <p className="text-xs text-red-400">{locateError}</p>}
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Icône</label>
        <input type="hidden" name="icon" value={icon} />
        <div className="flex flex-wrap gap-2">
          {Object.entries(SITE_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              title={SITE_ICON_LABELS[key]}
              aria-label={SITE_ICON_LABELS[key]}
              className={`flex h-10 w-10 items-center justify-center rounded-md border transition-colors ${
                icon === key
                  ? "border-blue-500 bg-blue-600/20 text-blue-400"
                  : "border-slate-700 text-slate-400 hover:bg-slate-800"
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
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
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : site ? "Enregistrer" : "Créer le site"}
      </button>
    </form>
  );
}
