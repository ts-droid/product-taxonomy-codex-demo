import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { initializeDatabase } from '../src/db/database.js';
import { upsertCanonicalTag, upsertTagAlias } from '../src/db/tagRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function readJson(relativePath) {
  const filePath = path.resolve(__dirname, relativePath);
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

const specifications = readJson('../src/taxonomy/specifications.json');
const compatibilityTargets = readJson('../src/taxonomy/compatibility_targets.json');
const featureRegistry = readJson('../src/taxonomy/feature_registry.json');

const db = initializeDatabase();

for (const specification of specifications.specifications) {
  const stored = upsertCanonicalTag(db, {
    tagKey: 'specification',
    canonicalId: specification.id,
    displayName: specification.label,
    groupName: specification.group,
    status: 'approved',
    source: 'taxonomy_seed',
  });
  specification.aliases.forEach((alias) => upsertTagAlias(db, { tagId: stored.id, aliasValue: alias }));
}

for (const target of compatibilityTargets.compatibility_targets) {
  const stored = upsertCanonicalTag(db, {
    tagKey: 'compatibility',
    canonicalId: target.id,
    displayName: target.label,
    groupName: target.group,
    status: 'approved',
    source: 'taxonomy_seed',
  });
  target.aliases.forEach((alias) => upsertTagAlias(db, { tagId: stored.id, aliasValue: alias }));
}

for (const feature of featureRegistry.features) {
  const stored = upsertCanonicalTag(db, {
    tagKey: 'feature',
    canonicalId: feature.id,
    displayName: feature.label,
    groupName: feature.group,
    status: 'approved',
    source: 'taxonomy_seed',
  });
  feature.aliases.forEach((alias) => upsertTagAlias(db, { tagId: stored.id, aliasValue: alias }));
}

db.close();
console.log('Database seeded from canonical specification, compatibility and feature registries');
