"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Lock, Eye, EyeOff, Sparkles, Copy, Check } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-slate-700 bg-slate-800 py-2 pl-9 pr-3 text-sm text-slate-100 focus:border-blue-500 focus:outline-none";

function generatePassword(length = 12): string {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => charset[b % charset.length]).join("");
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="flex shrink-0 items-center gap-1 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 hover:bg-slate-800"
    >
      {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      {copied ? "Copié" : "Copier"}
    </button>
  );
}

export function AgentForm({ onCreated }: { onCreated?: () => void }) {
  const router = useRouter();
  const submittingRef = useRef(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ email: string; password: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Ref, not state: a fast double-click/double-tap fires two submit events
    // before the `saving` state re-render lands and disables the button.
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSaving(true);
    setError(null);

    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, email, phone, password }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Erreur inconnue");
      submittingRef.current = false;
      setSaving(false);
      return;
    }

    submittingRef.current = false;
    setSaving(false);
    router.refresh();
    // Shown once so the dirigeant can hand the password off -- especially
    // needed when it was auto-generated rather than typed by hand.
    setCreated({ email, password });
  }

  if (created) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-emerald-400">
          <Check size={18} />
          <h3 className="text-sm font-semibold">Agent créé</h3>
        </div>
        <p className="text-sm text-slate-400">
          Transmettez ces identifiants à l&apos;agent — ils ne seront plus affichés ensuite.
        </p>
        <div className="space-y-2 rounded-md bg-slate-800/60 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Email</p>
              <p className="truncate text-sm text-slate-100">{created.email}</p>
            </div>
            <CopyButton value={created.email} />
          </div>
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-slate-500">Mot de passe</p>
              <p className="truncate font-mono text-sm text-slate-100">{created.password}</p>
            </div>
            <CopyButton value={created.password} />
          </div>
        </div>
        <button
          type="button"
          onClick={() => onCreated?.()}
          className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
        >
          Terminé
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} autoComplete="off" className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Nom complet</label>
          <div className="relative">
            <User size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium text-slate-300">Téléphone</label>
          <div className="relative">
            <Phone size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
          </div>
        </div>
      </div>

      <div className="space-y-1">
        <label className="text-sm font-medium text-slate-300">Email</label>
        <div className="relative">
          <Mail size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium text-slate-300">Mot de passe initial</label>
          <button
            type="button"
            onClick={() => {
              setPassword(generatePassword());
              setShowPassword(true);
            }}
            className="flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300"
          >
            <Sparkles size={12} />
            Générer
          </button>
        </div>
        <div className="relative">
          <Lock size={15} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type={showPassword ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`${inputClass} pr-9`}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500 disabled:opacity-50"
      >
        {saving ? "Création…" : "Créer l'agent"}
      </button>
    </form>
  );
}
