import products from '../data/products.json';
import { type ProductFilters } from '../engine/filterEngine';
import { initializeDatabase } from '../db/database';
import { getFilteredProducts, upsertProduct } from '../db/productRepository';
import { assignTagToProduct, upsertTag } from '../db/tagRepository';
import { validateProductBatch } from '../utils/validators';

export function getProducts(filters?: ProductFilters) {
  const db = initializeDatabase();
  try {
    return getFilteredProducts(db, filters);
  } finally {
    db.close();
  }
}

export function seedProductsFromJson() {
  const validated = validateProductBatch(products);
  if (!validated.valid) {
    throw new Error(`Invalid product dataset: ${validated.errors.join(', ')}`);
  }

  const db = initializeDatabase();

  try {
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
  } finally {
    db.close();
  }
}
