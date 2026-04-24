import type { ProductFilters, ProductRecord } from '../engine/filterEngine';
import { filterProducts } from '../engine/filterEngine';
import type { Database as BetterSqliteDatabase } from 'better-sqlite3';

type ProductRow = {
  id: string;
  name: string;
  tags_json: string;
  review_status: 'approved' | 'pending_approval' | 'admin_review';
};

function parseProduct(row: ProductRow): ProductRecord & { review_status: ProductRow['review_status'] } {
  return {
    id: row.id,
    name: row.name,
    tags: JSON.parse(row.tags_json),
    review_status: row.review_status,
  };
}

export function upsertProduct(db: BetterSqliteDatabase, product: ProductRecord & { review_status?: ProductRow['review_status'] }) {
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

export function getProductById(db: BetterSqliteDatabase, productId: string) {
  const row = db.prepare('SELECT id, name, tags_json, review_status FROM products WHERE id = ?').get(productId) as ProductRow | undefined;
  return row ? parseProduct(row) : null;
}

export function getAllProducts(db: BetterSqliteDatabase) {
  const rows = db.prepare('SELECT id, name, tags_json, review_status FROM products ORDER BY name ASC').all() as ProductRow[];
  return rows.map(parseProduct);
}

export function getFilteredProducts(db: BetterSqliteDatabase, filters?: ProductFilters) {
  const products = getAllProducts(db);
  if (!filters || !Object.keys(filters).length) return products;
  return filterProducts(products, filters);
}
