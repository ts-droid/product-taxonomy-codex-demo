import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

export type StoredTag = {
  id: number;
  tag_key: string;
  tag_value: string;
  status: 'approved' | 'pending_approval' | 'admin_review';
  source: string;
  created_at: string;
};

export function upsertTag(
  db: BetterSqliteDatabase,
  tagKey: string,
  tagValue: string,
  status: StoredTag['status'] = 'approved',
  source = 'seed'
) {
  db.prepare(`
    INSERT INTO tags (tag_key, tag_value, status, source)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(tag_key, tag_value) DO UPDATE SET
      status = excluded.status,
      source = excluded.source
  `).run(tagKey, tagValue, status, source);

  return db.prepare(`
    SELECT id, tag_key, tag_value, status, source, created_at
    FROM tags
    WHERE tag_key = ? AND tag_value = ?
  `).get(tagKey, tagValue) as StoredTag;
}

export function assignTagToProduct(db: BetterSqliteDatabase, productId: string, tagId: number) {
  db.prepare(`
    INSERT OR IGNORE INTO product_tag_assignments (product_id, tag_id)
    VALUES (?, ?)
  `).run(productId, tagId);
}

export function getTagsByKey(db: BetterSqliteDatabase, tagKey: string) {
  return db.prepare(`
    SELECT id, tag_key, tag_value, status, source, created_at
    FROM tags
    WHERE tag_key = ?
    ORDER BY tag_value ASC
  `).all(tagKey) as StoredTag[];
}

export function getAllTags(db: BetterSqliteDatabase) {
  return db.prepare(`
    SELECT id, tag_key, tag_value, status, source, created_at
    FROM tags
    ORDER BY tag_key ASC, tag_value ASC
  `).all() as StoredTag[];
}
