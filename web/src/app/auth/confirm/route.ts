import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// GoTrue's recovery/magic-link emails redirect here with a PKCE `?code=`.
// The exchange must happen server-side (real HTTP Set-Cookie via
// next/headers) rather than in the browser -- doing it client-side hit a
// real "PKCE code verifier not found in storage" failure in testing, a
// known rough edge of @supabase/ssr's cookie-based code-verifier storage
// interacting with client-side exchangeCodeForSession. This is also the
// pattern Supabase's own Next.js docs recommend.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(`${origin}/reset-password?error_description=${encodeURIComponent(error.message)}`);
  }

  return NextResponse.redirect(`${origin}/reset-password?error_description=Lien+invalide`);
}
