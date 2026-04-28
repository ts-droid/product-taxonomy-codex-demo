PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_key TEXT NOT NULL,
  canonical_id TEXT NOT NULL,
  display_name TEXT NOT NULL,
  normalized_value TEXT NOT NULL,
  group_name TEXT,
  status TEXT NOT NULL DEFAULT 'approved',
  source TEXT NOT NULL DEFAULT 'seed',
  metadata_json TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tag_key, canonical_id),
  UNIQUE(tag_key, normalized_value)
);

CREATE TABLE IF NOT EXISTS tag_aliases (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_id INTEGER NOT NULL,
  alias_value TEXT NOT NULL,
  normalized_alias TEXT NOT NULL,
  alias_type TEXT NOT NULL DEFAULT 'synonym',
  confidence REAL NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'approved',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tag_id, normalized_alias),
  FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_ref TEXT,
  tag_key TEXT NOT NULL,
  candidate_value TEXT NOT NULL,
  normalized_candidate TEXT NOT NULL,
  suggested_display_name TEXT,
  suggested_group TEXT,
  matched_tag_id INTEGER,
  matched_alias_id INTEGER,
  reason TEXT NOT NULL,
  evidence_json TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(matched_tag_id) REFERENCES tags(id) ON DELETE SET NULL,
  FOREIGN KEY(matched_alias_id) REFERENCES tag_aliases(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_tags_key ON tags(tag_key);
CREATE INDEX IF NOT EXISTS idx_tags_normalized ON tags(tag_key, normalized_value);
CREATE INDEX IF NOT EXISTS idx_tag_aliases_normalized ON tag_aliases(normalized_alias);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
