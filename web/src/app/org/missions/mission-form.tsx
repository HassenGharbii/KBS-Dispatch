"use client";

import { useRef, useState } from "react";
import { createMission } from "./actions";

interface Option {
  id: string;
  label: string;
}

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none";

export function MissionForm({
  sites,
  agents,
  initialSiteId,
  initialScheduledStart,
  onCreated,
}: {
  sites: Option[];
  agents: Option[];
  initialSiteId?: string;
  initialScheduledStart?: string;
  onCreated?: () => void;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const submittingRef = useRef(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [isBroadcast, setIsBroadcast] = useState(false);

  async function handleSubmit(formData: FormData) {
    // Ref, not state: a fast double-click/double-tap fires two submit events
    // before the `saving` state re-render lands and disables the button.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);
    const result = await createMission(formData);
    submittingRef.current = false;
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    formRef.current?.reset();
    setIsBroadcast(false);
    onCreated?.();
  }

  return (
    <form ref={formRef} action={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Site</label>
          <select name="siteId" required defaultValue={initialSiteId ?? ""} className={inputClass}>
            <option value="" disabled>
              Choisir…
            </option>
            {sites.map((site) => (
              <option key={site.id} value={site.id}>
                {site.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Agent</label>
          <select
            name="agentId"
            required={!isBroadcast}
            disabled={isBroadcast}
            defaultValue=""
            className={`${inputClass} disabled:opacity-40`}
          >
            <option value="" disabled>
              Choisir…
            </option>
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input
          type="checkbox"
          name="isBroadcast"
          checked={isBroadcast}
          onChange={(e) => setIsBroadcast(e.target.checked)}
          className="h-4 w-4 rounded border-slate-600 bg-slate-800"
        />
        Diffuser à tous les agents (premier arrivé, premier servi)
      </label>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Date et heure de prise de service</label>
        <input
          type="datetime-local"
          name="scheduledStart"
          required
          defaultValue={initialScheduledStart}
          className={inputClass}
        />
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Consignes particulières</label>
        <textarea name="instructions" rows={3} className={inputClass} />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Création…" : "Créer la mission"}
      </button>
    </form>
  );
}
