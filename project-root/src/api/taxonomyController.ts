import connectors from '../taxonomy/connectors.json';
import protocols from '../taxonomy/protocols.json';
import features from '../taxonomy/features.json';
import powerProfiles from '../taxonomy/power_profiles.json';
import { initializeDatabase } from '../db/database';
import { getAllTags, getTagsByKey, upsertTag } from '../db/tagRepository';
import { enqueueReviewItem, listReviewQueue } from '../db/reviewQueueRepository';

export function getTaxonomy() {
  return {
    connectors: connectors.connectors,
    protocols: protocols.protocols,
    features: features.features,
    power_profiles: powerProfiles.power_profiles,
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
  productId?: string;
  tagKey: string;
  tagValue: string;
  reason: string;
}) {
  const db = initializeDatabase();
  try {
    upsertTag(db, input.tagKey, input.tagValue, 'pending_approval', 'ai_candidate');
    return enqueueReviewItem(db, input);
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
