"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { MapPin, ShieldCheck, ShieldAlert, ShieldX, ArrowRight } from "lucide-react";
import { createSite, updateSite, geocodeAddress } from "./actions";
import { SITE_ICONS, SITE_ICON_LABELS } from "./site-icons";

const LocationPicker = dynamic(
  () => import("./location-picker").then((m) => m.LocationPicker),
  { ssr: false }
);

const inputClass =
  "w-full rounded-lg border border-slate-700/80 bg-slate-800/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 transition-all duration-150 focus:border-blue-500/70 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/25";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
      <span className="h-3 w-0.5 rounded-full bg-gradient-to-b from-blue-400 to-cyan-400" />
      {children}
    </label>
  );
}

const SENSITIVITY_LEVELS = [
  { value: 1, label: "Standard", Icon: ShieldCheck, activeClass: "border-slate-500 bg-slate-700/50 text-slate-200" },
  {
    value: 2,
    label: "Sensible",
    Icon: ShieldAlert,
    activeClass:
      "border-amber-500/60 bg-amber-500/15 text-amber-300 shadow-[0_0_16px_-4px_rgba(245,158,11,0.7)]",
  },
  {
    value: 3,
    label: "Critique",
    Icon: ShieldX,
    activeClass: "border-red-500/60 bg-red-500/15 text-red-300 shadow-[0_0_16px_-4px_rgba(239,68,68,0.7)]",
  },
] as const;

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
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const addressRef = useRef<HTMLInputElement>(null);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    site?.lat != null && site?.lng != null ? { lat: site.lat, lng: site.lng } : null
  );
  const [icon, setIcon] = useState(site?.icon ?? "building");
  const [sensitivityLevel, setSensitivityLevel] = useState(site?.sensitivityLevel ?? 1);

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
    // Ref, not state: a fast double-click/double-tap fires two submit events
    // before the `saving` state re-render lands and disables the button.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    const result = site ? await updateSite(formData) : await createSite(formData);
    submittingRef.current = false;
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    if (!site) {
      formRef.current?.reset();
      setLocation(null);
      setIcon("building");
      setSensitivityLevel(1);
    }
    router.refresh();
    onSaved?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-5">
      {site && <input type="hidden" name="siteId" value={site.id} />}
      <input type="hidden" name="sensitivityLevel" value={sensitivityLevel} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <FieldLabel>Nom</FieldLabel>
          <input name="name" required defaultValue={site?.name} className={inputClass} />
        </div>
        <div className="space-y-1.5">
          <FieldLabel>Client</FieldLabel>
          <input name="clientName" defaultValue={site?.clientName ?? ""} className={inputClass} />
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Adresse</FieldLabel>
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
            className="flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-blue-500/40 bg-blue-500/5 px-3 py-2 text-sm font-medium text-blue-300 transition-colors hover:bg-blue-500/15 disabled:opacity-50"
          >
            <MapPin size={14} />
            {locating ? "Recherche…" : "Localiser"}
          </button>
        </div>
        {locateError && <p className="text-xs text-red-400">{locateError}</p>}
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Icône</FieldLabel>
        <input type="hidden" name="icon" value={icon} />
        <div className="flex flex-wrap gap-2">
          {Object.entries(SITE_ICONS).map(([key, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setIcon(key)}
              title={SITE_ICON_LABELS[key]}
              aria-label={SITE_ICON_LABELS[key]}
              className={`flex h-10 w-10 items-center justify-center rounded-lg border transition-all duration-150 ${
                icon === key
                  ? "scale-105 border-transparent bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-[0_0_16px_-2px_rgba(56,189,248,0.7)]"
                  : "border-slate-700/70 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              <Icon size={18} />
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>Niveau de sensibilité</FieldLabel>
        <div className="grid grid-cols-3 gap-2">
          {SENSITIVITY_LEVELS.map(({ value, label, Icon, activeClass }) => (
            <button
              key={value}
              type="button"
              onClick={() => setSensitivityLevel(value)}
              className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-2.5 text-xs font-medium transition-all duration-150 ${
                sensitivityLevel === value
                  ? activeClass
                  : "border-slate-700/70 bg-slate-800/40 text-slate-500 hover:border-slate-600 hover:text-slate-300"
              }`}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <FieldLabel>
          Localisation {location ? "" : "(optionnel — cliquez sur la carte pour positionner le site)"}
        </FieldLabel>
        <div className="rounded-lg bg-gradient-to-br from-blue-500/30 via-slate-700/20 to-cyan-500/20 p-[1px]">
          <LocationPicker value={location} onChange={(lat, lng) => setLocation({ lat, lng })} />
        </div>
        <input type="hidden" name="lat" value={location?.lat ?? ""} />
        <input type="hidden" name="lng" value={location?.lng ?? ""} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-cyan-500 px-4 py-2.5 text-sm font-semibold tracking-wide text-white shadow-lg shadow-blue-950/50 transition-all hover:from-blue-500 hover:to-cyan-400 hover:shadow-blue-900/60 disabled:opacity-50"
      >
        {saving ? "Enregistrement…" : site ? "Enregistrer" : "Créer le site"}
        {!saving && <ArrowRight size={15} />}
      </button>
    </form>
  );
}
