"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Dirigeant-only -- renaming the organization is the owner's call, same
// trust tier as creating sub-admins.
export async function updateOrganizationName(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "dirigeant" || !profile.organizationId) {
    return { error: "Non autorisé" };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { error: "Le nom est requis" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({ name })
    .eq("id", profile.organizationId);

  if (error) return { error: error.message };

  revalidatePath("/org/settings");
  revalidatePath("/org");
  return { error: null };
}
