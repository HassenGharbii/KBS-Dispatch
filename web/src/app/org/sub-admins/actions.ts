"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Dirigeant-only -- mirrors the create restriction (sub_admin cannot manage
// other sub-admins).
export async function updateSubAdminProfile(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || profile.role !== "dirigeant") {
    return { error: "Non autorisé" };
  }

  const subAdminId = String(formData.get("subAdminId") ?? "");
  const fullName = String(formData.get("fullName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!subAdminId || !fullName) return { error: "Nom requis" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: phone || null })
    .eq("id", subAdminId)
    .eq("role", "sub_admin");

  if (error) return { error: error.message };

  revalidatePath("/org/sub-admins");
  return { error: null };
}
