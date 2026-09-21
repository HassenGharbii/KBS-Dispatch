"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Map as MapIcon,
  Calendar,
  ClipboardList,
  FileText,
  BarChart3,
  Building2,
  Users,
  Network,
  Settings,
  History,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  badge?: number;
}

export function OrgSidebar({
  showSubAdmins,
  pendingMissionsCount,
  reportsCount,
  open,
  onClose,
}: {
  showSubAdmins: boolean;
  pendingMissionsCount: number;
  reportsCount: number;
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();

  const items: NavItem[] = [
    { href: "/org/map", label: "Carte", icon: MapIcon },
    { href: "/org/planning", label: "Planning", icon: Calendar },
    { href: "/org/missions", label: "Missions", icon: ClipboardList, badge: pendingMissionsCount },
    { href: "/org/reports", label: "Rapports", icon: FileText, badge: reportsCount },
    { href: "/org/stats", label: "Statistiques", icon: BarChart3 },
    { href: "/org/activity", label: "Activité", icon: History },
    { href: "/org/sites", label: "Sites", icon: Building2 },
    { href: "/org/agents", label: "Agents", icon: Users },
  ];
  if (showSubAdmins) {
    items.push({ href: "/org/sub-admins", label: "Sous-administrateurs", icon: Network });
    items.push({ href: "/org/settings", label: "Paramètres", icon: Settings });
  }

  return (
    <>
      {open && (
        <div
          // Above Leaflet's own z-[1000] controls/legend (see leaflet-map.tsx)
          // so the drawer never appears to render "under" the live map.
          className="fixed inset-0 z-[1100] bg-black/60 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-[1101] flex w-64 shrink-0 -translate-x-full flex-col border-r border-slate-800 bg-slate-900 transition-transform duration-200 md:static md:z-0 md:w-48 md:translate-x-0 ${
          open ? "translate-x-0" : ""
        }`}
      >
        <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
          {items.map((item) => {
            const active = pathname === item.href || pathname?.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-600 text-white shadow-sm shadow-blue-900/50"
                    : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                }`}
              >
                <Icon size={17} className={active ? "text-white" : "text-slate-500"} />
                <span className="flex-1 truncate">{item.label}</span>
                {!!item.badge && item.badge > 0 && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                      active ? "bg-blue-800 text-blue-100" : "bg-red-500/90 text-white"
                    }`}
                  >
                    {item.badge > 99 ? "99+" : item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
