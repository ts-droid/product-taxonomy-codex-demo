import specifications from '../taxonomy/specifications.json';
import compatibilityTargets from '../taxonomy/compatibility_targets.json';
import featureRegistry from '../taxonomy/feature_registry.json';
import { initializeDatabase } from '../db/database';
import { findTagByAlias, getAllTags, getTagsByKey } from '../db/tagRepository';
import { enqueueReviewItem, listReviewQueue } from '../db/reviewQueueRepository';

export function getTaxonomy() {
  return {
    specifications: specifications.specifications,
    compatibility_targets: compatibilityTargets.compatibility_targets,
    features: featureRegistry.features,
  };
}

export function getStoredTaxonomyTags(tagKey?: string) {
  const db = initializeDatabase();
  try {
    return tagKey ? getTagsByKey(db, tagKey) : getAllTags(db);
  } finally {
    db.close();
  }
}

export function queueCandidateTag(input: {
  sourceRef?: string;
  tagKey: string;
  candidateValue: string;
  suggestedDisplayName?: string;
  suggestedGroup?: string;
  reason: string;
  evidence?: Record<string, unknown>;
}) {
  const db = initializeDatabase();
  try {
    const matchedTag = findTagByAlias(db, input.tagKey, input.candidateValue);
    return enqueueReviewItem(db, {
      ...input,
      matchedTagId: matchedTag?.id ?? null,
    });
  } finally {
    db.close();
  }
}

export function getReviewQueue(status: 'pending' | 'approved' | 'rejected' | 'all' = 'pending') {
  const db = initializeDatabase();
  try {
    return listReviewQueue(db, status);
  } finally {
    db.close();
  }
}
