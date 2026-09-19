import { redirect } from "next/navigation";
import { getCurrentProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { SubAdminsList } from "./sub-admins-list";

export default async function SubAdminsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const profile = await getCurrentProfile();
  if (profile?.role !== "dirigeant") redirect("/org");

  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  let request = supabase.from("profiles").select("id, full_name, phone").eq("role", "sub_admin").order("full_name");
  if (query) request = request.ilike("full_name", `%${query}%`);

  const { data: subAdmins } = await request;

  return (
    <div className="h-full">
      <SubAdminsList subAdmins={subAdmins ?? []} query={query} />
    </div>
  );
}
