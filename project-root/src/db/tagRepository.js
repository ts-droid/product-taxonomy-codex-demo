export function upsertTag(db, tagKey, tagValue, status = 'approved', source = 'seed') {
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
  `).get(tagKey, tagValue);
}

export function assignTagToProduct(db, productId, tagId) {
  db.prepare(`
    INSERT OR IGNORE INTO product_tag_assignments (product_id, tag_id)
    VALUES (?, ?)
  `).run(productId, tagId);
}

export function getTagsByKey(db, tagKey) {
  return db.prepare(`
    SELECT id, tag_key, tag_value, status, source, created_at
    FROM tags
    WHERE tag_key = ?
    ORDER BY tag_value ASC
  `).all(tagKey);
}

export function getAllTags(db) {
  return db.prepare(`
    SELECT id, tag_key, tag_value, status, source, created_at
    FROM tags
    ORDER BY tag_key ASC, tag_value ASC
  `).all();
}
