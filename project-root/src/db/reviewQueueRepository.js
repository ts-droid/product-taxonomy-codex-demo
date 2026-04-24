export function enqueueReviewItem(db, input) {
  const result = db.prepare(`
    INSERT INTO review_queue (product_id, tag_key, tag_value, reason, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(input.productId ?? null, input.tagKey, input.tagValue, input.reason);

  return db.prepare(`
    SELECT id, product_id, tag_key, tag_value, reason, status, created_at
    FROM review_queue
    WHERE id = ?
  `).get(result.lastInsertRowid);
}

export function listReviewQueue(db, status = 'pending') {
  if (status === 'all') {
    return db.prepare(`
      SELECT id, product_id, tag_key, tag_value, reason, status, created_at
      FROM review_queue
      ORDER BY created_at DESC
    `).all();
  }

  return db.prepare(`
    SELECT id, product_id, tag_key, tag_value, reason, status, created_at
    FROM review_queue
    WHERE status = ?
    ORDER BY created_at DESC
  `).all(status);
}
