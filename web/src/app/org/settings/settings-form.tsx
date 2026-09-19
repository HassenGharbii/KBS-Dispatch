"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationName } from "./actions";
import { Check, Building2 } from "lucide-react";

export function SettingsForm({ organizationName }: { organizationName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setSaved(false);
    startTransition(async () => {
      const result = await updateOrganizationName(formData);
      if (result.error) {
        setError(result.error);
        return;
      }
      setError(null);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="max-w-lg rounded-lg border border-slate-800 bg-slate-900 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Building2 size={16} className="text-blue-400" />
        <h2 className="text-sm font-semibold text-white">Organisation</h2>
      </div>
      <form action={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Nom de l&apos;organisation</label>
          <input
            name="name"
            required
            defaultValue={organizationName}
            className="w-full rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 focus:border-blue-500 focus:outline-none"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {pending ? "Enregistrement…" : "Enregistrer"}
          </button>
          {saved && !pending && (
            <span className="flex items-center gap-1 text-sm text-emerald-400">
              <Check size={14} />
              Enregistré
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
