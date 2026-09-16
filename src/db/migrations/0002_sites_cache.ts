// Read-only local cache of Supabase `sites`, refreshed on login/sync.
export const sql = `
CREATE TABLE sites (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  sensitivity_level INTEGER NOT NULL,
  client_name TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  cached_at TEXT NOT NULL
);
`;
