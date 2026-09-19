"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export async function createMission(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const siteId = String(formData.get("siteId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  const isBroadcast = formData.get("isBroadcast") === "on";
  const scheduledStartLocal = String(formData.get("scheduledStart") ?? ""); // "YYYY-MM-DDTHH:mm"
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!siteId || !scheduledStartLocal || (!isBroadcast && !agentId)) {
    return { error: "Site, agent (ou diffusion) et date sont requis" };
  }

  // <input type="datetime-local"> has no timezone; treat it as the caller's
  // local wall-clock time (same assumption the mobile create form makes).
  const scheduledStart = new Date(scheduledStartLocal);
  if (Number.isNaN(scheduledStart.getTime())) return { error: "Date invalide" };

  const supabase = await createClient();
  const { error } = await supabase.from("missions").insert({
    site_id: siteId,
    agent_id: isBroadcast ? null : agentId,
    created_by: profile.id,
    scheduled_start: scheduledStart.toISOString(),
    instructions: instructions || null,
    is_broadcast: isBroadcast,
  });

  if (error) return { error: error.message };

  revalidatePath("/org/missions");
  revalidatePath("/org/planning");
  return { error: null };
}

export async function reassignMission(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const missionId = String(formData.get("missionId") ?? "");
  const agentId = String(formData.get("agentId") ?? "");
  const isBroadcast = formData.get("isBroadcast") === "on";

  if (!missionId || (!isBroadcast && !agentId)) {
    return { error: "Agent (ou diffusion) requis" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("missions")
    .update({
      agent_id: isBroadcast ? null : agentId,
      is_broadcast: isBroadcast,
      status: "proposed",
      responded_at: null,
    })
    .eq("id", missionId);

  if (error) return { error: error.message };

  revalidatePath("/org/missions");
  revalidatePath("/org/planning");
  return { error: null };
}

export async function cancelMission(missionId: string) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("missions").update({ status: "cancelled" }).eq("id", missionId);
  if (error) return { error: error.message };

  revalidatePath("/org/missions");
  revalidatePath("/org/planning");
  return { error: null };
}
