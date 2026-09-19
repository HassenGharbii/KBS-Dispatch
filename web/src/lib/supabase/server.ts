import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Server-side client for Server Components/Route Handlers: still the anon
// key, still fully subject to RLS — this is "who is the caller," not a
// privilege escalation. Use ./admin.ts only for the specific privileged
// calls that genuinely need the service role (creating auth users).
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from a Server Component render (not an action/route
            // handler) — middleware below refreshes the session instead.
          }
        },
      },
    }
  );
}
