import { createClient } from "@/lib/supabase/server";
import { SitesList } from "./sites-list";

export default async function SitesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  let request = supabase
    .from("sites")
    .select("id, name, address, client_name, sensitivity_level, icon, is_active, lat, lng")
    .order("name");
  if (query) request = request.ilike("name", `%${query}%`);

  const { data: sites } = await request;

  return (
    <div className="h-full">
      <SitesList sites={sites ?? []} query={query} />
    </div>
  );
}
