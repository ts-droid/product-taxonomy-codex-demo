import { normalizeTaxonomyValue } from './tagRepository.js';

export function enqueueReviewItem(db, input) {
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
  `).get(result.lastInsertRowid);
}

export function listReviewQueue(db, status = 'pending') {
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
    `).all();
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
  `).all(status);
}
