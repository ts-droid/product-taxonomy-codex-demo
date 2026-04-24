import products from '../data/products.json';
import { filterProducts, type ProductFilters } from '../engine/filterEngine';
import { validateProductBatch } from '../utils/validators';

export function getProducts(filters?: ProductFilters) {
  const validated = validateProductBatch(products);
  if (!validated.valid) {
    throw new Error(`Invalid product dataset: ${validated.errors.join(', ')}`);
  }

  if (!filters || !Object.keys(filters).length) return products;
  return filterProducts(products, filters);
}
