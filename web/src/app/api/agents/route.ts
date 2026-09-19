import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || !caller.organizationId || (caller.role !== "dirigeant" && caller.role !== "sub_admin")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { fullName, email, password, phone } = body as {
    fullName?: string;
    email?: string;
    password?: string;
    phone?: string;
  };

  if (!fullName || !email || !password) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      role: "agent",
      phone: phone || null,
      // Scoped to the CALLER's own organization -- never trust a client-
      // supplied organization_id for a privileged create, even though this
      // route only ever reads it from the caller's own verified profile.
      organization_id: caller.organizationId,
    },
  });

  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "Échec de création" }, { status: 500 });
  }

  return NextResponse.json({ agentId: data.user.id });
}
