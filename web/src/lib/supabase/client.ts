import { createBrowserClient } from "@supabase/ssr";

// Browser-side client: respects RLS via the caller's own session cookie.
// Never import the service-role client (./admin.ts) from a "use client"
// component — that key must stay server-only.
//
// flowType must be explicit: GoTrue's password-recovery email link redirects
// back with a PKCE `?code=` (see reset-password/page.tsx), which only works
// if resetPasswordForEmail generated and stored a matching code_verifier at
// request time -- without this, exchangeCodeForSession always fails with
// "PKCE code verifier not found in storage", regardless of the link itself
// being valid.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { flowType: "pkce" } }
  );
}
