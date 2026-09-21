"use client";

import { useState } from "react";
import { OrgHeader } from "./org-header";
import { OrgSidebar } from "./org-sidebar";

export function OrgShell({
  fullName,
  role,
  pendingMissionsCount,
  reportsCount,
  showSubAdmins,
  children,
}: {
  fullName: string;
  role: string;
  pendingMissionsCount: number;
  reportsCount: number;
  showSubAdmins: boolean;
  children: React.ReactNode;
}) {
  const [navOpen, setNavOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col bg-slate-950 print:h-auto print:bg-white">
      <div className="no-print">
        <OrgHeader
          fullName={fullName}
          role={role}
          pendingMissionsCount={pendingMissionsCount}
          onMenuClick={() => setNavOpen(true)}
        />
      </div>
      <div className="flex min-h-0 flex-1 print:block">
        <div className="no-print">
          <OrgSidebar
            showSubAdmins={showSubAdmins}
            pendingMissionsCount={pendingMissionsCount}
            reportsCount={reportsCount}
            open={navOpen}
            onClose={() => setNavOpen(false)}
          />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto p-3 sm:p-4 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
