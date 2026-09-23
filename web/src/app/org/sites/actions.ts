"use server";

import { revalidatePath } from "next/cache";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

// Free geocoding via OpenStreetMap's Nominatim, matching the free-tiles-only
// convention already used for the map itself. Must run server-side: Nominatim's
// usage policy requires a real identifying User-Agent, which a browser fetch
// can't set (the header is reserved/overridden by the browser itself).
export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  const trimmed = address.trim();
  if (!trimmed) return null;

  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(trimmed)}`;
  const res = await fetch(url, {
    headers: { "User-Agent": "KBS-Dispatch/1.0 (self-hosted security dispatch console)" },
  });
  if (!res.ok) return null;

  const results = (await res.json()) as Array<{ lat: string; lon: string }>;
  const first = results[0];
  if (!first) return null;

  return { lat: Number(first.lat), lng: Number(first.lon) };
}

export async function createSite(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || !profile.organizationId) return { error: "Non autorisé" };
  if (profile.role !== "dirigeant" && profile.role !== "sub_admin") {
    return { error: "Non autorisé" };
  }

  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const sensitivityLevel = Number(formData.get("sensitivityLevel") ?? 1);
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();

  if (!name || !address) return { error: "Nom et adresse requis" };

  const supabase = await createClient();
  // organization_id is set explicitly (not inferred by a trigger) so the
  // insert visibly matches the RLS check (sites_insert_org_admin) rather
  // than relying on a default -- same explicitness as every other
  // org-scoped write in this console.
  const { error } = await supabase.from("sites").insert({
    name,
    address,
    client_name: clientName || null,
    sensitivity_level: sensitivityLevel,
    organization_id: profile.organizationId,
    lat: latRaw ? Number(latRaw) : null,
    lng: lngRaw ? Number(lngRaw) : null,
  });

  if (error) return { error: error.message };

  revalidatePath("/org/sites");
  revalidatePath("/org/map");
  return { error: null };
}

export async function updateSite(formData: FormData) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const siteId = String(formData.get("siteId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const clientName = String(formData.get("clientName") ?? "").trim();
  const sensitivityLevel = Number(formData.get("sensitivityLevel") ?? 1);
  const latRaw = String(formData.get("lat") ?? "").trim();
  const lngRaw = String(formData.get("lng") ?? "").trim();

  if (!siteId || !name || !address) return { error: "Nom et adresse requis" };

  const supabase = await createClient();
  const { error } = await supabase
    .from("sites")
    .update({
      name,
      address,
      client_name: clientName || null,
      sensitivity_level: sensitivityLevel,
      lat: latRaw ? Number(latRaw) : null,
      lng: lngRaw ? Number(lngRaw) : null,
    })
    .eq("id", siteId);

  if (error) return { error: error.message };

  revalidatePath("/org/sites");
  revalidatePath("/org/map");
  return { error: null };
}

export async function deactivateSite(siteId: string) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sites").update({ is_active: false }).eq("id", siteId);
  if (error) return { error: error.message };

  revalidatePath("/org/map");

  revalidatePath("/org/sites");
  return { error: null };
}

export async function reactivateSite(siteId: string) {
  const profile = await getCurrentProfile();
  if (!profile || (profile.role !== "dirigeant" && profile.role !== "sub_admin")) {
    return { error: "Non autorisé" };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("sites").update({ is_active: true }).eq("id", siteId);
  if (error) return { error: error.message };

  revalidatePath("/org/map");
  revalidatePath("/org/sites");
  return { error: null };
}
