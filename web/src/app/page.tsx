import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/login");
  if (profile.role === "super_admin") redirect("/admin/organizations");
  if (profile.role === "dirigeant" || profile.role === "sub_admin") redirect("/org");

  // Agents have no web surface -- the mobile app is their only client.
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login?error=agent_no_web_access");
}
