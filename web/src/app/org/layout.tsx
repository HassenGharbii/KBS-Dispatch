import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { OrgShell } from "@/components/org-shell";

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
    <OrgShell
      fullName={profile.fullName}
      role={profile.role}
      pendingMissionsCount={pendingMissionsCount ?? 0}
      reportsCount={reportsCount ?? 0}
      showSubAdmins={profile.role === "dirigeant"}
    >
      {children}
    </OrgShell>
  );
}
