export type TaxonomyCollections = Record<string, string[]>;

export type TaggableProduct = {
  id: string;
  name: string;
  tags: Record<string, string[] | number | undefined>;
  review?: {
    status: 'approved' | 'pending_approval' | 'admin_review';
    createdTags?: Array<{ key: string; value: string }>;
  };
};

export function addTag(
  product: TaggableProduct,
  tagKey: string,
  tagValue: string,
  taxonomy: TaxonomyCollections,
  reviewStatus: 'approved' | 'pending_approval' | 'admin_review' = 'pending_approval'
) {
  if (!taxonomy[tagKey]) {
    taxonomy[tagKey] = [];
  }

  if (!taxonomy[tagKey].includes(tagValue)) {
    taxonomy[tagKey].push(tagValue);
  }

  const current = product.tags[tagKey];
  const nextValues = Array.isArray(current) ? current : [];

  if (!nextValues.includes(tagValue)) {
    product.tags[tagKey] = [...nextValues, tagValue];
  }

  product.review = {
    status: reviewStatus,
    createdTags: [...(product.review?.createdTags ?? []), { key: tagKey, value: tagValue }],
  };

  return product;
}
