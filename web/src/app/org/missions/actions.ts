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
  const scheduledEndLocal = String(formData.get("scheduledEnd") ?? "");
  const instructions = String(formData.get("instructions") ?? "").trim();

  if (!siteId || !scheduledStartLocal || !scheduledEndLocal || (!isBroadcast && !agentId)) {
    return { error: "Site, agent (ou diffusion), date de début et date de fin sont requis" };
  }

  // <input type="datetime-local"> has no timezone; treat it as the caller's
  // local wall-clock time (same assumption the mobile create form makes).
  const scheduledStart = new Date(scheduledStartLocal);
  const scheduledEnd = new Date(scheduledEndLocal);
  if (Number.isNaN(scheduledStart.getTime()) || Number.isNaN(scheduledEnd.getTime())) {
    return { error: "Date invalide" };
  }
  // Mirrors the server-side enforce_mission_create_timing trigger, which is
  // the real enforcement -- this just avoids a confusing round trip.
  if (scheduledStart.getTime() - Date.now() < 10 * 60 * 1000) {
    return { error: "Une mission doit être créée au moins 10 minutes avant son début" };
  }
  if (scheduledEnd.getTime() <= scheduledStart.getTime()) {
    return { error: "La fin de mission doit être après son début" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("missions").insert({
    site_id: siteId,
    agent_id: isBroadcast ? null : agentId,
    created_by: profile.id,
    scheduled_start: scheduledStart.toISOString(),
    scheduled_end: scheduledEnd.toISOString(),
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
