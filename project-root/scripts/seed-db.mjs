import products from '../src/data/products.json' with { type: 'json' };
import connectors from '../src/taxonomy/connectors.json' with { type: 'json' };
import protocols from '../src/taxonomy/protocols.json' with { type: 'json' };
import features from '../src/taxonomy/features.json' with { type: 'json' };
import { initializeDatabase } from '../src/db/database.js';
import { upsertProduct } from '../src/db/productRepository.js';
import { assignTagToProduct, upsertTag } from '../src/db/tagRepository.js';

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

for (const product of products) {
  upsertProduct(db, product);

  for (const connectorId of product.tags.connector ?? []) {
    const storedTag = upsertTag(db, 'connector', connectorId, 'approved', 'product_seed');
    assignTagToProduct(db, product.id, storedTag.id);
  }

  for (const protocolId of product.tags.protocol ?? []) {
    const storedTag = upsertTag(db, 'protocol', protocolId, 'approved', 'product_seed');
    assignTagToProduct(db, product.id, storedTag.id);
  }

  for (const featureId of product.tags.features ?? []) {
    const storedTag = upsertTag(db, 'features', featureId, 'approved', 'product_seed');
    assignTagToProduct(db, product.id, storedTag.id);
  }
}

db.close();
console.log('Database seeded from taxonomy and products.json');
