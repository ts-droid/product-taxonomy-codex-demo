import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

export type TagStatus = 'approved' | 'pending_approval' | 'admin_review';

export type StoredTag = {
  id: number;
  tag_key: string;
  canonical_id: string;
  display_name: string;
  normalized_value: string;
  group_name: string | null;
  status: TagStatus;
  source: string;
  metadata_json: string | null;
  created_at: string;
};

export type StoredTagAlias = {
  id: number;
  tag_id: number;
  alias_value: string;
  normalized_alias: string;
  alias_type: string;
  confidence: number;
  status: 'approved' | 'pending' | 'rejected';
  created_at: string;
};

export type UpsertCanonicalTagInput = {
  tagKey: string;
  canonicalId: string;
  displayName: string;
  groupName?: string | null;
  normalizedValue?: string;
  status?: TagStatus;
  source?: string;
  metadata?: Record<string, unknown> | null;
};

export function normalizeTaxonomyValue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9.+/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function upsertCanonicalTag(db: BetterSqliteDatabase, input: UpsertCanonicalTagInput) {
  const normalizedValue = input.normalizedValue ?? normalizeTaxonomyValue(input.displayName);
  const metadataJson = input.metadata ? JSON.stringify(input.metadata) : null;

  db.prepare(`
    INSERT INTO tags (
      tag_key,
      canonical_id,
      display_name,
      normalized_value,
      group_name,
      status,
      source,
      metadata_json
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(tag_key, canonical_id) DO UPDATE SET
      display_name = excluded.display_name,
      normalized_value = excluded.normalized_value,
      group_name = excluded.group_name,
      status = excluded.status,
      source = excluded.source,
      metadata_json = excluded.metadata_json
  `).run(
    input.tagKey,
    input.canonicalId,
    input.displayName,
    normalizedValue,
    input.groupName ?? null,
    input.status ?? 'approved',
    input.source ?? 'seed',
    metadataJson
  );

  return db.prepare(`
    SELECT id, tag_key, canonical_id, display_name, normalized_value, group_name, status, source, metadata_json, created_at
    FROM tags
    WHERE tag_key = ? AND canonical_id = ?
  `).get(input.tagKey, input.canonicalId) as StoredTag;
}

export function upsertTagAlias(
  db: BetterSqliteDatabase,
  input: {
    tagId: number;
    aliasValue: string;
    aliasType?: string;
    confidence?: number;
    status?: StoredTagAlias['status'];
  }
) {
  const normalizedAlias = normalizeTaxonomyValue(input.aliasValue);

  db.prepare(`
    INSERT INTO tag_aliases (tag_id, alias_value, normalized_alias, alias_type, confidence, status)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(tag_id, normalized_alias) DO UPDATE SET
      alias_value = excluded.alias_value,
      alias_type = excluded.alias_type,
      confidence = excluded.confidence,
      status = excluded.status
  `).run(
    input.tagId,
    input.aliasValue,
    normalizedAlias,
    input.aliasType ?? 'synonym',
    input.confidence ?? 1,
    input.status ?? 'approved'
  );

  return db.prepare(`
    SELECT id, tag_id, alias_value, normalized_alias, alias_type, confidence, status, created_at
    FROM tag_aliases
    WHERE tag_id = ? AND normalized_alias = ?
  `).get(input.tagId, normalizedAlias) as StoredTagAlias;
}

export function upsertTag(
  db: BetterSqliteDatabase,
  tagKey: string,
  tagValue: string,
  status: TagStatus = 'approved',
  source = 'seed'
) {
  return upsertCanonicalTag(db, {
    tagKey,
    canonicalId: tagValue,
    displayName: tagValue,
    normalizedValue: normalizeTaxonomyValue(tagValue),
    status,
    source,
  });
}

export function getTagsByKey(db: BetterSqliteDatabase, tagKey: string) {
  return db.prepare(`
    SELECT id, tag_key, canonical_id, display_name, normalized_value, group_name, status, source, metadata_json, created_at
    FROM tags
    WHERE tag_key = ?
    ORDER BY display_name ASC
  `).all(tagKey) as StoredTag[];
}

export function getAllTags(db: BetterSqliteDatabase) {
  return db.prepare(`
    SELECT id, tag_key, canonical_id, display_name, normalized_value, group_name, status, source, metadata_json, created_at
    FROM tags
    ORDER BY tag_key ASC, display_name ASC
  `).all() as StoredTag[];
}

export function getAliasesForTag(db: BetterSqliteDatabase, tagId: number) {
  return db.prepare(`
    SELECT id, tag_id, alias_value, normalized_alias, alias_type, confidence, status, created_at
    FROM tag_aliases
    WHERE tag_id = ?
    ORDER BY confidence DESC, alias_value ASC
  `).all(tagId) as StoredTagAlias[];
}

export function findTagByAlias(db: BetterSqliteDatabase, tagKey: string, rawValue: string) {
  const normalized = normalizeTaxonomyValue(rawValue);
  return db.prepare(`
    SELECT
      tags.id,
      tags.tag_key,
      tags.canonical_id,
      tags.display_name,
      tags.normalized_value,
      tags.group_name,
      tags.status,
      tags.source,
      tags.metadata_json,
      tags.created_at
    FROM tags
    LEFT JOIN tag_aliases ON tag_aliases.tag_id = tags.id
    WHERE tags.tag_key = ?
      AND (tags.normalized_value = ? OR tag_aliases.normalized_alias = ?)
    ORDER BY
      CASE WHEN tags.normalized_value = ? THEN 0 ELSE 1 END,
      tag_aliases.confidence DESC
    LIMIT 1
  `).get(tagKey, normalized, normalized, normalized) as StoredTag | undefined;
}
