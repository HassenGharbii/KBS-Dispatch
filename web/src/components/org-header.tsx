import Link from "next/link";
import { Radar, Bell, Menu } from "lucide-react";
import { OrgUserMenu } from "./org-user-menu";

export function OrgHeader({
  fullName,
  role,
  pendingMissionsCount,
  onMenuClick,
}: {
  fullName: string;
  role: string;
  pendingMissionsCount: number;
  onMenuClick?: () => void;
}) {
  return (
    <header className="no-print flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-900 px-3 sm:h-16 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          onClick={onMenuClick}
          className="-ml-1 rounded-lg p-2 text-slate-300 hover:bg-slate-800 md:hidden"
          aria-label="Ouvrir le menu"
        >
          <Menu size={22} />
        </button>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-lg shadow-blue-900/40 sm:h-9 sm:w-9">
          <Radar size={18} className="sm:hidden" />
          <Radar size={20} className="hidden sm:block" />
        </div>
        <span className="truncate text-base font-semibold text-white sm:text-lg">
          KBS Main Courante
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-5">
        <div className="hidden items-center gap-2 text-sm text-slate-300 sm:flex">
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
