"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [organizationName, setOrganizationName] = useState("");
  const [dirigeantFullName, setDirigeantFullName] = useState("");
  const [dirigeantEmail, setDirigeantEmail] = useState("");
  const [dirigeantPassword, setDirigeantPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const res = await fetch("/api/organizations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ organizationName, dirigeantFullName, dirigeantEmail, dirigeantPassword }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur inconnue");
      setSaving(false);
      return;
    }

    setOrganizationName("");
    setDirigeantFullName("");
    setDirigeantEmail("");
    setDirigeantPassword("");
    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-sm font-semibold text-gray-900">Créer une organisation</h2>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Nom de l&apos;organisation</label>
        <input
          required
          value={organizationName}
          onChange={(e) => setOrganizationName(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Nom du dirigeant</label>
          <input
            required
            value={dirigeantFullName}
            onChange={(e) => setDirigeantFullName(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Email du dirigeant</label>
          <input
            type="email"
            required
            value={dirigeantEmail}
            onChange={(e) => setDirigeantEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-gray-700">Mot de passe initial</label>
        <input
          type="password"
          required
          minLength={6}
          value={dirigeantPassword}
          onChange={(e) => setDirigeantPassword(e.target.value)}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
      >
        {saving ? "Création…" : "Créer l'organisation"}
      </button>
    </form>
  );
}
