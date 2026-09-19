import { createClient } from "./supabase/server";

export type Role = "agent" | "dirigeant" | "sub_admin" | "super_admin";

export interface CurrentProfile {
  id: string;
  fullName: string;
  role: Role;
  organizationId: string | null;
}

/** Null if not signed in. Reads through RLS as the caller's own session. */
export async function getCurrentProfile(): Promise<CurrentProfile | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, organization_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  return {
    id: profile.id,
    fullName: profile.full_name,
    role: profile.role as Role,
    organizationId: profile.organization_id,
  };
}
