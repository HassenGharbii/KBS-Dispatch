import Link from "next/link";
import { Radar, Bell } from "lucide-react";
import { OrgUserMenu } from "./org-user-menu";

export function OrgHeader({
  fullName,
  role,
  pendingMissionsCount,
}: {
  fullName: string;
  role: string;
  pendingMissionsCount: number;
}) {
  return (
    <header className="no-print flex h-16 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-900/40">
          <Radar size={20} />
        </div>
        <span className="text-lg font-semibold text-white">KBS Main Courante</span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
          Système en ligne
        </div>

        <Link
          href="/org/missions"
          className="relative rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-100"
        >
          <Bell size={20} />
          {pendingMissionsCount > 0 && (
            <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500" />
          )}
        </Link>

        <OrgUserMenu fullName={fullName} role={role} />
      </div>
    </header>
  );
}
