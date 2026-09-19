import { NextResponse } from "next/server";
import { getCurrentProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const caller = await getCurrentProfile();
  if (!caller || caller.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { organizationName, dirigeantFullName, dirigeantEmail, dirigeantPassword } = body as {
    organizationName?: string;
    dirigeantFullName?: string;
    dirigeantEmail?: string;
    dirigeantPassword?: string;
  };

  if (!organizationName || !dirigeantFullName || !dirigeantEmail || !dirigeantPassword) {
    return NextResponse.json({ error: "Champs manquants" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: organizationName })
    .select()
    .single();
  if (orgError || !org) {
    return NextResponse.json({ error: orgError?.message ?? "Échec de création" }, { status: 500 });
  }

  const { data: userData, error: userError } = await admin.auth.admin.createUser({
    email: dirigeantEmail,
    password: dirigeantPassword,
    email_confirm: true,
    user_metadata: {
      full_name: dirigeantFullName,
      role: "dirigeant",
      organization_id: org.id,
    },
  });
  if (userError || !userData.user) {
    // Roll back the organization row so a failed dirigeant creation doesn't
    // leave an orphaned, admin-less organization behind.
    await admin.from("organizations").delete().eq("id", org.id);
    return NextResponse.json(
      { error: userError?.message ?? "Échec de création du dirigeant" },
      { status: 500 }
    );
  }

  return NextResponse.json({ organization: org, dirigeantId: userData.user.id });
}
