export const sql = `
CREATE TABLE events (
  id TEXT PRIMARY KEY,
  shift_id TEXT NOT NULL REFERENCES shifts(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  category_code TEXT NOT NULL,
  item_codes TEXT NOT NULL DEFAULT '[]',
  comment TEXT,
  occurred_at TEXT NOT NULL,
  lat REAL,
  lng REAL,
  accuracy REAL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'synced', 'error')),
  sync_error TEXT,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT
);

CREATE INDEX idx_events_pending ON events(shift_id) WHERE sync_status != 'synced';
CREATE INDEX idx_events_shift ON events(shift_id);
`;
