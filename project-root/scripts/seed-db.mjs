import connectors from '../src/taxonomy/connectors.json' with { type: 'json' };
import protocols from '../src/taxonomy/protocols.json' with { type: 'json' };
import features from '../src/taxonomy/features.json' with { type: 'json' };
import powerProfiles from '../src/taxonomy/power_profiles.json' with { type: 'json' };
import { initializeDatabase } from '../src/db/database.js';
import { upsertTag } from '../src/db/tagRepository.js';

const db = initializeDatabase();

for (const connector of connectors.connectors) {
  upsertTag(db, 'connector', connector.id, 'approved', 'taxonomy_seed');
}

for (const protocol of protocols.protocols) {
  upsertTag(db, 'protocol', protocol.id, 'approved', 'taxonomy_seed');
}

for (const feature of features.features) {
  upsertTag(db, 'features', feature, 'approved', 'taxonomy_seed');
}

for (const profile of powerProfiles.power_profiles) {
  upsertTag(db, 'power_profile', profile.id, 'approved', 'taxonomy_seed');
}

db.close();
console.log('Database seeded from taxonomy master data only');
