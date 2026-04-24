function isRangeFilter(value) {
  return typeof value === 'object' && value !== null && ('min' in value || 'max' in value);
}

export function filterProducts(products, filters) {
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
