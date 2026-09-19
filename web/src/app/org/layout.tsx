import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrgHeader } from "@/components/org-header";
import { OrgSidebar } from "@/components/org-sidebar";

export default async function OrgLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "dirigeant" && profile.role !== "sub_admin") redirect("/");

  const supabase = await createClient();
  const [{ count: pendingMissionsCount }, { count: reportsCount }] = await Promise.all([
    supabase.from("missions").select("id", { count: "exact", head: true }).eq("status", "proposed"),
    supabase.from("shift_reports").select("shift_id", { count: "exact", head: true }),
  ]);

  return (
    <div className="flex h-screen flex-col bg-slate-950 print:h-auto print:bg-white">
      <div className="no-print">
        <OrgHeader
          fullName={profile.fullName}
          role={profile.role}
          pendingMissionsCount={pendingMissionsCount ?? 0}
        />
      </div>
      <div className="flex min-h-0 flex-1 print:block">
        <div className="no-print">
          <OrgSidebar
            showSubAdmins={profile.role === "dirigeant"}
            pendingMissionsCount={pendingMissionsCount ?? 0}
            reportsCount={reportsCount ?? 0}
          />
        </div>
        <main className="min-w-0 flex-1 overflow-y-auto p-4 print:overflow-visible print:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
