// Phase 3: site coordinates (needed for route/ETA math) and the optional
// link from a shift back to the mission it was clocked in from. Missions
// themselves are not mirrored locally (see src/lib/missionsApi.ts) -- accept/
// refuse/cancel are direct, connectivity-required Supabase calls, so there's
// no local `missions` table for mission_id to reference here.
export const sql = `
ALTER TABLE sites ADD COLUMN lat REAL;
ALTER TABLE sites ADD COLUMN lng REAL;
ALTER TABLE shifts ADD COLUMN mission_id TEXT;
`;
