import type { Database as BetterSqliteDatabase } from 'better-sqlite3';
import { normalizeTaxonomyValue } from './tagRepository';

export type ReviewQueueItem = {
  id: number;
  source_ref: string | null;
  tag_key: string;
  candidate_value: string;
  normalized_candidate: string;
  suggested_display_name: string | null;
  suggested_group: string | null;
  matched_tag_id: number | null;
  matched_alias_id: number | null;
  reason: string;
  evidence_json: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export function enqueueReviewItem(
  db: BetterSqliteDatabase,
  input: {
    sourceRef?: string;
    tagKey: string;
    candidateValue: string;
    suggestedDisplayName?: string;
    suggestedGroup?: string;
    matchedTagId?: number | null;
    matchedAliasId?: number | null;
    reason: string;
    evidence?: Record<string, unknown> | null;
  }
) {
  const normalizedCandidate = normalizeTaxonomyValue(input.candidateValue);
  const evidenceJson = input.evidence ? JSON.stringify(input.evidence) : null;
  const result = db.prepare(`
    INSERT INTO review_queue (
      source_ref,
      tag_key,
      candidate_value,
      normalized_candidate,
      suggested_display_name,
      suggested_group,
      matched_tag_id,
      matched_alias_id,
      reason,
      evidence_json,
      status
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')
  `).run(
    input.sourceRef ?? null,
    input.tagKey,
    input.candidateValue,
    normalizedCandidate,
    input.suggestedDisplayName ?? null,
    input.suggestedGroup ?? null,
    input.matchedTagId ?? null,
    input.matchedAliasId ?? null,
    input.reason,
    evidenceJson
  );

  return db.prepare(`
    SELECT
      id,
      source_ref,
      tag_key,
      candidate_value,
      normalized_candidate,
      suggested_display_name,
      suggested_group,
      matched_tag_id,
      matched_alias_id,
      reason,
      evidence_json,
      status,
      created_at
    FROM review_queue
    WHERE id = ?
  `).get(result.lastInsertRowid) as ReviewQueueItem;
}

export function listReviewQueue(db: BetterSqliteDatabase, status: ReviewQueueItem['status'] | 'all' = 'pending') {
  if (status === 'all') {
    return db.prepare(`
      SELECT
        id,
        source_ref,
        tag_key,
        candidate_value,
        normalized_candidate,
        suggested_display_name,
        suggested_group,
        matched_tag_id,
        matched_alias_id,
        reason,
        evidence_json,
        status,
        created_at
      FROM review_queue
      ORDER BY created_at DESC
    `).all() as ReviewQueueItem[];
  }

  return db.prepare(`
    SELECT
      id,
      source_ref,
      tag_key,
      candidate_value,
      normalized_candidate,
      suggested_display_name,
      suggested_group,
      matched_tag_id,
      matched_alias_id,
      reason,
      evidence_json,
      status,
      created_at
    FROM review_queue
    WHERE status = ?
    ORDER BY created_at DESC
  `).all(status) as ReviewQueueItem[];
}
