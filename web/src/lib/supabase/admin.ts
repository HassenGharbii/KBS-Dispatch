import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client: bypasses RLS entirely. Only ever call this from a
// Route Handler, and only after the caller's own session/role has already
// been checked with the regular server client (see server.ts) — this file
// importing "server-only" makes it a build error to ever pull it into a
// client component or a page rendered without that check.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
