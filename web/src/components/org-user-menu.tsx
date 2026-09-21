"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, LogOut, UserCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

const ROLE_LABELS: Record<string, string> = {
  dirigeant: "Dirigeant",
  sub_admin: "Sous-administrateur",
};

export function OrgUserMenu({ fullName, role }: { fullName: string; role: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-slate-200 hover:bg-slate-800"
      >
        <UserCircle size={22} className="text-slate-400" />
        <span className="hidden font-medium sm:inline">{fullName}</span>
        <ChevronDown size={16} className="text-slate-500" />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-2 w-56 rounded-lg border border-slate-700 bg-slate-800 py-1 shadow-xl shadow-black/40">
          <div className="border-b border-slate-700 px-3 py-2">
            <p className="text-sm font-medium text-slate-100">{fullName}</p>
            <p className="text-xs text-slate-400">{ROLE_LABELS[role] ?? role}</p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
          >
            <LogOut size={16} />
            Déconnexion
          </button>
        </div>
      )}
    </div>
  );
}
