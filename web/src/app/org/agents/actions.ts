"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function updateAgentProfile(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const agentId = String(formData.get("agentId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!agentId || !fullName) return { error: "Nom requis" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", agentId)
    .eq("role", "agent");

  if (error) return { error: error.message };

  revalidatePath("/org/agents");
  return { error: null };
}
