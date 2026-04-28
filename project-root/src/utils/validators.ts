type ProductShape = {
  id?: unknown;
  name?: unknown;
  tags?: {
    specification?: unknown;
    compatibility?: unknown;
    power_watt?: unknown;
    features?: unknown;
  };
};

type ValidationResult = {
  valid: boolean;
  errors: string[];
};

function isStringArray(value: unknown) {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.trim().length > 0);
}

export function validateProduct(product: ProductShape): ValidationResult {
  const errors: string[] = [];

  if (typeof product.id !== 'string' || !product.id.trim()) {
    errors.push('missing id');
  }

  if (typeof product.name !== 'string' || !product.name.trim()) {
    errors.push('missing name');
  }

  if (!product.tags || typeof product.tags !== 'object') {
    errors.push('missing tags');
  } else {
    if (!isStringArray(product.tags.specification)) {
      errors.push('specification is required and must be a non-empty string array');
    }

    if (product.tags.power_watt !== undefined && typeof product.tags.power_watt !== 'number') {
      errors.push('power_watt must be a number');
    }

    if (product.tags.specification !== undefined && !isStringArray(product.tags.specification)) {
      errors.push('specification must be a non-empty string array');
    }

    if (product.tags.compatibility !== undefined && !isStringArray(product.tags.compatibility)) {
      errors.push('compatibility must be a non-empty string array');
    }

    if (product.tags.features !== undefined && !isStringArray(product.tags.features)) {
      errors.push('features must be a non-empty string array');
    }

    const hasEmptyArray = [product.tags.specification, product.tags.compatibility, product.tags.features]
      .some((value) => Array.isArray(value) && value.length === 0);
    if (hasEmptyArray) {
      errors.push('no_empty_tags violated');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateProductBatch(products: ProductShape[]): ValidationResult {
  const errors = products.flatMap((product, index) => {
    const result = validateProduct(product);
    return result.valid ? [] : result.errors.map((error) => `products[${index}]: ${error}`);
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
