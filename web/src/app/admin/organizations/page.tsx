import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "./create-organization-form";

export default async function OrganizationsPage() {
  const supabase = await createClient();

  const [{ data: organizations }, { data: profiles }] = await Promise.all([
    supabase.from("organizations").select("id, name, created_at").order("created_at", { ascending: false }),
    supabase.from("profiles").select("organization_id, role"),
  ]);

  const counts = new Map<string, { dirigeants: number; agents: number }>();
  for (const p of profiles ?? []) {
    if (!p.organization_id) continue;
    const entry = counts.get(p.organization_id) ?? { dirigeants: 0, agents: 0 };
    if (p.role === "dirigeant" || p.role === "sub_admin") entry.dirigeants += 1;
    if (p.role === "agent") entry.agents += 1;
    counts.set(p.organization_id, entry);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-lg font-semibold text-gray-900">Organisations</h1>
        <div className="mt-4 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium uppercase text-gray-500">
              <tr>
                <th className="px-4 py-2">Nom</th>
                <th className="px-4 py-2">Admins</th>
                <th className="px-4 py-2">Agents</th>
                <th className="px-4 py-2">Créée le</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(organizations ?? []).map((org) => (
                <tr key={org.id}>
                  <td className="px-4 py-3 font-medium text-gray-900">{org.name}</td>
                  <td className="px-4 py-3 text-gray-600">{counts.get(org.id)?.dirigeants ?? 0}</td>
                  <td className="px-4 py-3 text-gray-600">{counts.get(org.id)?.agents ?? 0}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(org.created_at).toLocaleDateString("fr-FR")}
                  </td>
                </tr>
              ))}
              {(organizations ?? []).length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center italic text-gray-400">
                    Aucune organisation.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CreateOrganizationForm />
    </div>
  );
}
