import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export default async function SettingsPage() {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "dirigeant") redirect("/org");

  const supabase = await createClient();
  const { data: organization } = await supabase
    .from("organizations")
    .select("id, name")
    .eq("id", profile.organizationId!)
    .single();

  return (
    <div className="space-y-4">
      <h1 className="text-lg font-semibold text-white">Paramètres</h1>
      <SettingsForm organizationName={organization?.name ?? ""} />
    </div>
  );
}
