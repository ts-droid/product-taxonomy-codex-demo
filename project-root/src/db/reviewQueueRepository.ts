import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

export type ReviewQueueItem = {
  id: number;
  product_id: string | null;
  tag_key: string;
  tag_value: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export function enqueueReviewItem(
  db: BetterSqliteDatabase,
  input: {
    productId?: string;
    tagKey: string;
    tagValue: string;
    reason: string;
  }
) {
  const result = db.prepare(`
    INSERT INTO review_queue (product_id, tag_key, tag_value, reason, status)
    VALUES (?, ?, ?, ?, 'pending')
  `).run(input.productId ?? null, input.tagKey, input.tagValue, input.reason);

  return db.prepare(`
    SELECT id, product_id, tag_key, tag_value, reason, status, created_at
    FROM review_queue
    WHERE id = ?
  `).get(result.lastInsertRowid) as ReviewQueueItem;
}

export function listReviewQueue(db: BetterSqliteDatabase, status: ReviewQueueItem['status'] | 'all' = 'pending') {
  if (status === 'all') {
    return db.prepare(`
      SELECT id, product_id, tag_key, tag_value, reason, status, created_at
      FROM review_queue
      ORDER BY created_at DESC
    `).all() as ReviewQueueItem[];
  }

  return db.prepare(`
    SELECT id, product_id, tag_key, tag_value, reason, status, created_at
    FROM review_queue
    WHERE status = ?
    ORDER BY created_at DESC
  `).all(status) as ReviewQueueItem[];
}
