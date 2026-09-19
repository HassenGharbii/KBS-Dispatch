import { createClient } from "@/lib/supabase/server";
import { AgentsList } from "./agents-list";

export default async function AgentsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const supabase = await createClient();
  let request = supabase
    .from("profiles")
    .select("id, full_name, phone, professional_card_number")
    .eq("role", "agent")
    .order("full_name");
  if (query) request = request.ilike("full_name", `%${query}%`);

  const { data: agents } = await request;

  return (
    <div className="h-full">
      <AgentsList agents={agents ?? []} query={query} />
    </div>
  );
}
