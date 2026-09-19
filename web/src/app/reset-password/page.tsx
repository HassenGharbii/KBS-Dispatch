"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ready, setReady] = useState(false);
  const [linkError, setLinkError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    // By the time the browser lands here, /auth/confirm has already
    // exchanged the recovery code for a session server-side (real HTTP
    // Set-Cookie via next/headers) -- this page only needs to confirm that
    // session actually exists, not perform the exchange itself.
    const urlError = searchParams.get("error_description");
    if (urlError) {
      setLinkError(urlError.replace(/\+/g, " "));
      return;
    }
    const supabase = createClient();
    supabase.auth.getSession().then(({ data, error }) => {
      if (error || !data.session) {
        setLinkError("Lien de réinitialisation invalide ou expiré.");
        return;
      }
      setReady(true);
    });
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    setDone(true);
    setTimeout(() => router.replace("/login"), 1500);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Nouveau mot de passe</h1>

        {linkError ? (
          <>
            <p className="text-sm text-red-600">{linkError}</p>
            <a href="/forgot-password" className="block text-center text-sm text-blue-700 hover:text-blue-800">
              Demander un nouveau lien
            </a>
          </>
        ) : done ? (
          <p className="text-sm text-emerald-700">Mot de passe mis à jour, redirection…</p>
        ) : (
          <>
            {!ready && <p className="text-sm text-gray-500">Vérification du lien de réinitialisation…</p>}

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Nouveau mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={!ready}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Confirmer le mot de passe</label>
              <input
                type="password"
                required
                minLength={6}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                disabled={!ready}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none disabled:bg-gray-100"
              />
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <button
              type="submit"
              disabled={!ready || saving}
              className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
            >
              {saving ? "Enregistrement…" : "Enregistrer"}
            </button>
          </>
        )}
      </form>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordForm />
    </Suspense>
  );
}
