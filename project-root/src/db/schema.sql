PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS tags (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tag_key TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  source TEXT NOT NULL DEFAULT 'seed',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(tag_key, tag_value)
);

CREATE TABLE IF NOT EXISTS review_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source_ref TEXT,
  tag_key TEXT NOT NULL,
  tag_value TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tags_key ON tags(tag_key);
CREATE INDEX IF NOT EXISTS idx_review_queue_status ON review_queue(status);
