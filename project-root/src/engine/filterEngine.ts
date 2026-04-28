export type ProductTags = {
  specification?: string[];
  compatibility?: string[];
  power_watt?: number;
  features?: string[];
  [key: string]: unknown;
};

export type ProductRecord = {
  id: string;
  name: string;
  tags: ProductTags;
};

export type RangeFilter = {
  min?: number;
  max?: number;
};

export type ProductFilters = Record<string, string[] | string | number | RangeFilter>;

function isRangeFilter(value: unknown): value is RangeFilter {
  return typeof value === 'object' && value !== null && ('min' in value || 'max' in value);
}

export function filterProducts(products: ProductRecord[], filters: ProductFilters) {
  return products.filter((product) => {
    return Object.entries(filters).every(([key, value]) => {
      const productValue = product.tags[key];

      if (productValue === undefined || productValue === null) return false;

      if (Array.isArray(value)) {
        if (!Array.isArray(productValue)) return false;
        return value.every((item) => productValue.includes(item));
      }

      if (isRangeFilter(value)) {
        if (typeof productValue !== 'number') return false;
        const minOk = value.min === undefined || productValue >= value.min;
        const maxOk = value.max === undefined || productValue <= value.max;
        return minOk && maxOk;
      }

      if (Array.isArray(productValue)) {
        return productValue.includes(String(value));
      }

      return productValue === value;
    });
  });
}
