"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });
    if (error) {
      setError(error.message);
      setStatus("error");
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm space-y-4 rounded-lg border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-xl font-semibold text-gray-900">Mot de passe oublié</h1>
        <p className="text-sm text-gray-500">
          Saisissez votre email professionnel : un lien de réinitialisation vous sera envoyé.
        </p>

        <div className="space-y-1">
          <label className="text-sm font-medium text-gray-700">Email</label>
          <input
            type="email"
            required
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
        </div>

        {status === "sent" && (
          <p className="text-sm text-emerald-700">Email envoyé, vérifiez votre boîte de réception.</p>
        )}
        {status === "error" && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={status === "sending" || !email.trim()}
          className="w-full rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white hover:bg-blue-800 disabled:opacity-50"
        >
          {status === "sending" ? "Envoi…" : "Envoyer le lien"}
        </button>

        <a href="/login" className="block text-center text-sm text-blue-700 hover:text-blue-800">
          Retour à la connexion
        </a>
      </form>
    </main>
  );
}
