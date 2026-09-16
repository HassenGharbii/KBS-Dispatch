export const sql = `
CREATE TABLE photos (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  agent_id TEXT NOT NULL,
  local_uri TEXT,
  remote_path TEXT,
  width INTEGER,
  height INTEGER,
  file_size_bytes INTEGER,
  taken_at TEXT NOT NULL,
  sync_status TEXT NOT NULL DEFAULT 'pending' CHECK (sync_status IN ('pending', 'uploading', 'uploaded', 'error')),
  sync_error TEXT,
  sync_attempts INTEGER NOT NULL DEFAULT 0,
  next_retry_at TEXT
);

CREATE INDEX idx_photos_pending ON photos(event_id) WHERE sync_status != 'uploaded';
CREATE INDEX idx_photos_event ON photos(event_id);
`;
