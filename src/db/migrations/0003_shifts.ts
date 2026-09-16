export const sql = `
CREATE TABLE shifts (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  site_id TEXT NOT NULL REFERENCES sites(id),
  status TEXT NOT NULL CHECK (status IN ('open', 'closed')),
  start_at TEXT NOT NULL,
  start_lat REAL,
  start_lng REAL,
  start_accuracy REAL,
  end_at TEXT,
  end_lat REAL,
  end_lng REAL,
  end_accuracy REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  sync_error TEXT,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT
);

CREATE INDEX idx_shifts_pending ON shifts(id) WHERE sync_status != 'synced';
CREATE INDEX idx_shifts_agent ON shifts(agent_id);
`;
