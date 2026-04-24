import { filterProducts } from '../engine/filterEngine.js';

function parseProduct(row) {
  return {
    id: row.id,
    name: row.name,
    tags: JSON.parse(row.tags_json),
    review_status: row.review_status,
  };
}

export function upsertProduct(db, product) {
  const statement = db.prepare(`
    INSERT INTO products (id, name, tags_json, review_status, updated_at)
    VALUES (@id, @name, @tags_json, @review_status, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      name = excluded.name,
      tags_json = excluded.tags_json,
      review_status = excluded.review_status,
      updated_at = CURRENT_TIMESTAMP
  `);

  statement.run({
    id: product.id,
    name: product.name,
    tags_json: JSON.stringify(product.tags),
    review_status: product.review_status ?? 'approved',
  });

  return getProductById(db, product.id);
}

export function getProductById(db, productId) {
  const row = db.prepare('SELECT id, name, tags_json, review_status FROM products WHERE id = ?').get(productId);
  return row ? parseProduct(row) : null;
}

export function getAllProducts(db) {
  const rows = db.prepare('SELECT id, name, tags_json, review_status FROM products ORDER BY name ASC').all();
  return rows.map(parseProduct);
}

export function getFilteredProducts(db, filters = undefined) {
  const products = getAllProducts(db);
  if (!filters || !Object.keys(filters).length) return products;
  return filterProducts(products, filters);
}
