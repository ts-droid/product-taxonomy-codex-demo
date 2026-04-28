import type { Product } from './catalog';
import type { ImportedRawSource } from './rawPipeline';

export type AdminTagKey = 'specification' | 'compatibility' | 'feature';

export type AdminStoredTag = {
  id: number;
  tagKey: AdminTagKey;
  canonicalId: string;
  displayName: string;
  normalizedValue: string;
  groupName: string | null;
  status: 'approved' | 'pending_approval' | 'admin_review';
  source: string;
  aliases: string[];
  createdAt: string;
};

export type AdminReviewItem = {
  id: number;
  sourceRef: string | null;
  tagKey: AdminTagKey;
  candidateValue: string;
  normalizedCandidate: string;
  suggestedDisplayName: string | null;
  suggestedGroup: string | null;
  matchedTagId: number | null;
  matchedAliasId: number | null;
  reason: string;
  evidence: Record<string, unknown> | null;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
};

export type TaxonomyAdminState = {
  summary: {
    totalTags: number;
    totalAliases: number;
    pendingReview: number;
    byKey: Record<AdminTagKey, number>;
  };
  sourceTaxonomy: {
    specifications: Array<Record<string, unknown>>;
    compatibility_targets: Array<Record<string, unknown>>;
    features: Array<Record<string, unknown>>;
  };
  storedTags: AdminStoredTag[];
  reviewQueue: AdminReviewItem[];
};

export type CandidateSuggestion = {
  key: AdminTagKey;
  candidateValue: string;
  suggestedDisplayName: string;
  suggestedGroup: string;
  sourceTitle: string;
  sourceRef: string;
  evidence: string;
  reason: string;
};

export function normalizeTaxonomyValue(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9.+/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function humanizeCandidate(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .split(/\s+/)
    .map((part) => (part.length <= 3 ? part.toUpperCase() : part[0].toUpperCase() + part.slice(1)))
    .join(' ');
}

function inferSpecificationGroup(value: string): string {
  const normalized = normalizeTaxonomyValue(value);
  if (/usb|hdmi|displayport|rj45|ethernet|sd|lightning|3.5 mm|3.5mm/.test(normalized)) return 'connector';
  if (/wifi|bluetooth/.test(normalized)) return 'wireless';
  if (/thunderbolt|usb4/.test(normalized)) return 'protocol';
  if (/pd|power delivery|w$|gan|qi|magsafe/.test(normalized)) return 'power';
  if (/nvme|ssd/.test(normalized)) return 'storage';
  return 'general';
}

function inferCompatibilityGroup(value: string): string {
  const normalized = normalizeTaxonomyValue(value);
  if (/macbook|windows laptop|pc laptop/.test(normalized)) return 'laptop';
  if (/ipad/.test(normalized)) return 'tablet';
  if (/iphone/.test(normalized)) return 'phone';
  if (/apple watch/.test(normalized)) return 'wearable';
  if (/imac|mac mini/.test(normalized)) return 'desktop';
  return 'generic';
}

function inferFeatureGroup(value: string): string {
  const normalized = normalizeTaxonomyValue(value);
  if (/ergonom/.test(normalized)) return 'usability';
  if (/tradlos|trådlös|wireless/.test(normalized)) return 'connectivity';
  if (/uppladdningsbar|rechargeable/.test(normalized)) return 'power';
  if (/portable|travel|rese/.test(normalized)) return 'mobility';
  if (/transkrib|transcrib|sammanfatt|summary|ai/.test(normalized)) return 'ai';
  if (/record|inspelning|mote|möte|call/.test(normalized)) return 'recording';
  return 'general';
}

function buildKnownSet(tags: AdminStoredTag[], key: AdminTagKey) {
  const set = new Set<string>();
  tags
    .filter((tag) => tag.tagKey === key)
    .forEach((tag) => {
      set.add(tag.normalizedValue);
      tag.aliases.forEach((alias) => set.add(normalizeTaxonomyValue(alias)));
    });
  return set;
}

function dedupeSuggestions(input: CandidateSuggestion[]) {
  const seen = new Set<string>();
  return input.filter((item) => {
    const key = `${item.key}:${normalizeTaxonomyValue(item.candidateValue)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function deriveCompatibilityCandidates(source: ImportedRawSource, knownSet: Set<string>) {
  const candidates: CandidateSuggestion[] = [];

  source.compatibilityLines.forEach((line) => {
    const tail = line.includes(':') ? line.split(':').slice(1).join(':') : line;
    tail
      .split(/[,/;|]/)
      .map((segment) => segment.replace(/\([^)]*\)/g, ' ').trim())
      .filter((segment) => /[a-zåäö]/i.test(segment))
      .filter((segment) => segment.length >= 4)
      .forEach((segment) => {
        const normalized = normalizeTaxonomyValue(segment);
        if (!normalized || /^\d/.test(normalized) || knownSet.has(normalized)) return;
        candidates.push({
          key: 'compatibility',
          candidateValue: segment,
          suggestedDisplayName: humanizeCandidate(segment),
          suggestedGroup: inferCompatibilityGroup(segment),
          sourceTitle: source.sourceTitle,
          sourceRef: source.rawUrl,
          evidence: line,
          reason: 'Kompatibilitetsrad från RAW-import som inte matchade känd canonical tag eller alias.',
        });
      });
  });

  return candidates;
}

export function deriveCandidateSuggestions(
  products: Product[],
  importedSources: ImportedRawSource[],
  storedTags: AdminStoredTag[]
) {
  const specificationSet = buildKnownSet(storedTags, 'specification');
  const compatibilitySet = buildKnownSet(storedTags, 'compatibility');
  const featureSet = buildKnownSet(storedTags, 'feature');
  const sourceById = new Map(importedSources.map((source) => [source.id, source]));

  const suggestions: CandidateSuggestion[] = [];

  products.forEach((product) => {
    const source = sourceById.get(product.id);
    if (!source) return;

    product.specificationTags.forEach((tag) => {
      const normalized = normalizeTaxonomyValue(tag);
      if (!normalized || specificationSet.has(normalized)) return;
      suggestions.push({
        key: 'specification',
        candidateValue: tag,
        suggestedDisplayName: humanizeCandidate(tag),
        suggestedGroup: inferSpecificationGroup(tag),
        sourceTitle: product.title,
        sourceRef: product.rawUrl,
        evidence: source.specificationLines.find((line) => normalizeTaxonomyValue(line).includes(normalized)) ?? source.specificationLines[0] ?? source.excerpt,
        reason: 'Genererad specificationTag saknar match i känd taxonomy eller aliaslista.',
      });
    });

    product.featureTags.forEach((tag) => {
      const normalized = normalizeTaxonomyValue(tag);
      if (!normalized || featureSet.has(normalized)) return;
      suggestions.push({
        key: 'feature',
        candidateValue: tag,
        suggestedDisplayName: humanizeCandidate(tag),
        suggestedGroup: inferFeatureGroup(tag),
        sourceTitle: product.title,
        sourceRef: product.rawUrl,
        evidence: source.highlightLines.find((line) => normalizeTaxonomyValue(line).includes(normalized)) ?? source.highlightLines[0] ?? source.excerpt,
        reason: 'Genererad featureTag saknar match i känd taxonomy eller aliaslista.',
      });
    });

    suggestions.push(...deriveCompatibilityCandidates(source, compatibilitySet));
  });

  return dedupeSuggestions(suggestions);
}
