import type { Product, ProductType, Settings } from './catalog';

export type ImportedRawSource = {
  id: number;
  rawUrl: string;
  slug: string;
  sourceTitle: string;
  rawText: string;
  highlightLines: string[];
  specificationLines: string[];
  excerpt: string;
  fetchedAt: string;
};

export type ImportedReferenceSource = {
  id: number;
  referenceUrl: string;
  title: string;
  excerpt: string;
  keywords: string[];
  fetchedAt: string;
};

export type RawImportFailure = {
  rawUrl: string;
  error: string;
};

export type ReferenceImportFailure = {
  referenceUrl: string;
  error: string;
};

const seriesList = [
  'm1', 'x1', 'x3', 'w1', 'w3', 'sm1', 'sm3', 'r1', 'r2', 'c1', 'ex1', 'ex3',
  'onthego', 'findall', 'pro hub', 'pro hub mini', 'dock5', 'quatro', 'trio', 'mobile xr', 'chargeview',
];

const colorTerms = [
  'space gray', 'space grey', 'space black', 'rymdgra', 'silver', 'svart', 'sand', 'desert rose', 'orange', 'brun', 'bla', 'blå', 'midnatt', 'guld', 'rose gold', 'transparent', 'mork', 'mörk', 'ljusgra',
];

const specMatchers: Array<{ test: (t: string) => string | null }> = [
  { test: (t) => (/(^|\b)usb-c(\b|$)|\busbc\b|type-c|typ-c/.test(t) ? 'usb-c' : null) },
  { test: (t) => (/(^|\b)usb4(\b|$)/.test(t) ? 'usb4' : null) },
  { test: (t) => (/thunderbolt[ -]?5/.test(t) ? 'thunderbolt 5' : null) },
  { test: (t) => (/thunderbolt[ -]?4/.test(t) ? 'thunderbolt 4' : null) },
  { test: (t) => (/hdmi/.test(t) ? 'hdmi' : null) },
  { test: (t) => (/displayport|dp\b/.test(t) ? 'displayport' : null) },
  { test: (t) => (/vga/.test(t) ? 'vga' : null) },
  { test: (t) => (/ethernet|rj45|gigabit/.test(t) ? 'ethernet' : null) },
  { test: (t) => (/kortlasare|kortläsare|minneskortlasare|minneskortläsare|micro ?sd|microsd|sd/.test(t) ? 'sd-kortläsare' : null) },
  { test: (t) => (/qi2/.test(t) ? 'qi2' : null) },
  { test: (t) => (/(^|\b)qi(\b|$)/.test(t) && !/qi2/.test(t) ? 'qi' : null) },
  { test: (t) => (/bluetooth/.test(t) ? 'bluetooth' : null) },
  { test: (t) => (/wifi|wi-fi/.test(t) ? 'wifi' : null) },
  { test: (t) => (/gan/.test(t) ? 'gan' : null) },
  { test: (t) => (/nvme/.test(t) ? 'nvme' : null) },
  { test: (t) => (/ssd/.test(t) ? 'ssd' : null) },
  { test: (t) => (/magsafe/.test(t) ? 'magsafe' : null) },
  { test: (t) => (/apple watch/.test(t) ? 'apple watch' : null) },
  { test: (t) => (/iphone/.test(t) ? 'iphone' : null) },
  { test: (t) => (/ipad/.test(t) ? 'ipad' : null) },
  { test: (t) => (/\b64\s?g(b)?\b|\b64gb\b/.test(t) ? '64gb' : null) },
  { test: (t) => (/ble ?5\.?2|bluetooth ?5\.?2/.test(t) ? 'bluetooth 5.2' : null) },
];

const featureMatchers: Array<{ test: (t: string) => string | null }> = [
  { test: (t) => (/tradlos|trådlös|wireless/.test(t) ? 'trådlös' : null) },
  { test: (t) => (/magnetisk|magnetic|magnetiskt/.test(t) ? 'magnetisk' : null) },
  { test: (t) => (/vikbar|foldable/.test(t) ? 'vikbar' : null) },
  { test: (t) => (/rese|travel|onthego/.test(t) ? 'resevänlig' : null) },
  { test: (t) => (/aluminium|aluminum/.test(t) ? 'aluminium' : null) },
  { test: (t) => (/vegansk|vegan/.test(t) ? 'veganskt läder' : null) },
  { test: (t) => (/vattenavvisande/.test(t) ? 'vattenavvisande' : null) },
  { test: (t) => (/skrivbord|desktop/.test(t) ? 'skrivbordssetup' : null) },
  { test: (t) => (/skarm|skärm|monitor|display/.test(t) ? 'skärmanslutning' : null) },
  { test: (t) => (/laptop|macbook/.test(t) ? 'laptop-användning' : null) },
  { test: (t) => (/ergonom/.test(t) ? 'ergonomisk' : null) },
  { test: (t) => (/uppladdningsbar|rechargeable/.test(t) ? 'uppladdningsbar' : null) },
  { test: (t) => (/transcrib|transkrib/.test(t) ? 'transkribering' : null) },
  { test: (t) => (/summary|summaries|sammanfatt/.test(t) ? 'ai-sammanfattning' : null) },
  { test: (t) => (/phone call|call recording|samtal/.test(t) ? 'samtalsinspelning' : null) },
  { test: (t) => (/in-person recording|meeting|mote|möte|lecture|interview/.test(t) ? 'mötesinspelning' : null) },
];

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function tokenize(text: string): string[] {
  return normalize(text)
    .split(/[^a-z0-9]+/i)
    .map((token) => token.trim())
    .filter((token) => token.length >= 3);
}

function detectSeries(text: string): string | null {
  const hit = seriesList.find((item) => text.includes(item));
  return hit ? hit.split(' ').map((p) => (p.length <= 3 ? p.toUpperCase() : p[0].toUpperCase() + p.slice(1))).join(' ') : null;
}

function detectColor(text: string): string | null {
  const hit = colorTerms.find((item) => text.includes(item));
  if (!hit) return null;
  const map: Record<string, string> = {
    rymdgra: 'space gray',
    'space grey': 'space gray',
    bla: 'blå',
    mork: 'mörk finish',
    ljusgra: 'ljusgrå',
  };
  return map[hit] ?? hit;
}

function detectLayout(text: string): string | null {
  if (/nordisk|nordic layout|nordic-layout/.test(text)) return 'nordisk layout';
  if (/us eng layout|us english|us-layout|us layout|amerikansk layout/.test(text)) return 'us-layout';
  return null;
}

function detectType(text: string): ProductType {
  const mentionsMonitor = /monitor|display|skarm|skärm/.test(text);
  const accessoryContext = /stand|stativ|hub|dock|adapter|hallare|hållare|kabel|cable|mount/.test(text);
  if (mentionsMonitor && !accessoryContext) return 'Monitor';
  if (/mouse|mus/.test(text)) return 'Mus';
  if (/keypad|numerisk/.test(text)) return 'Keypad';
  if (/keyboard|tangentbord/.test(text)) return 'Tangentbord';
  if (/voice recorder|rostinspelare|röstinspelare|ai note taker|note taker|transcrib|transkrib|recording mode|speaker labels/.test(text)) return 'Röstinspelare / AI-note taker';
  if (/powerbank/.test(text)) return 'Powerbank';
  if (/charger|laddare|charging/.test(text)) return 'Laddare';
  if (/dock|dockningsstation/.test(text)) return 'Dockningsstation';
  if (/hub|adapter|multiport/.test(text)) return 'Hubb / Adapter';
  if (/cable|kabel/.test(text)) return 'Kabel';
  if (/stand|stativ|hallare|hållare/.test(text)) return 'Stativ / Hållare';
  if (/fodral|case|sleeve/.test(text)) return 'Fodral / Skydd';
  if (/wallet|passfodral|bagagetagg|glasogonfodral|nyckelring|planbok/.test(text)) return 'Lifestyle';
  return 'Övrigt tillbehör';
}

function collectSpecificationTags(text: string, productType: ProductType, settings: Settings): string[] {
  const tags = new Set<string>();
  for (const matcher of specMatchers) {
    const hit = matcher.test(text);
    if (hit) tags.add(hit);
  }

  const watts = text.match(/\b\d+\s?w\b/g) ?? [];
  watts.forEach((item) => tags.add(item.replace(/\s+/g, '').toLowerCase()));

  const lengths = text.match(/\b\d+\s?(cm|m)\b/g) ?? [];
  lengths.forEach((item) => tags.add(item.replace(/\s+/g, '')));

  const sizes = text.match(/\b(11|13|14|15|15\/16|16|24|27|32)\s?tum\b/g) ?? [];
  sizes.forEach((item) => tags.add(item.replace(/\s+/g, ' ')));

  const color = detectColor(text);
  if (color) tags.add(color);

  const layout = detectLayout(text);
  if (layout) tags.add(layout);

  if (productType === 'Monitor') tags.add('monitor');
  if (productType === 'Röstinspelare / AI-note taker') {
    ['usb-c', 'gan', 'hdmi', 'displayport', 'vga', 'ethernet', 'sd-kortläsare', 'magsafe'].forEach((tag) => tags.delete(tag));
  }

  return Array.from(tags).slice(0, settings.maxSpecTags);
}

function collectFeatureTags(text: string, productType: ProductType, settings: Settings): string[] {
  const tags = new Set<string>();
  for (const matcher of featureMatchers) {
    const hit = matcher.test(text);
    if (hit) tags.add(hit);
  }
  if (productType === 'Röstinspelare / AI-note taker') {
    ['magnetisk', 'aluminium', 'skrivbordssetup', 'skärmanslutning', 'laptop-användning'].forEach((tag) => tags.delete(tag));
  }
  return Array.from(tags).slice(0, settings.maxFeatureTags);
}

function recommendationTargets(text: string, type: ProductType): string[] {
  const targets = new Set<string>();
  if (type !== 'Monitor' && /monitor|display|skarm|skärm/.test(text)) targets.add('monitor');
  if (type !== 'Fodral / Skydd' && /laptop|macbook/.test(text)) targets.add('laptop');
  if (type !== 'Laddare' && /iphone/.test(text)) targets.add('iphone');
  if (type !== 'Laddare' && /ipad/.test(text)) targets.add('ipad');
  if (type !== 'Laddare' && /apple watch/.test(text)) targets.add('apple watch');
  if (type !== 'Hubb / Adapter' && /mac mini/.test(text)) targets.add('mac mini');
  if (type !== 'Hubb / Adapter' && /imac/.test(text)) targets.add('imac');
  return [...targets];
}

function matchesTarget(product: Product, target: string): boolean {
  const text = product.searchText;
  const specs = product.specificationTags;
  switch (target) {
    case 'monitor':
      return product.productType === 'Monitor' || specs.includes('monitor');
    case 'laptop':
      return /laptop|macbook/.test(text);
    case 'iphone':
      return /iphone/.test(text);
    case 'ipad':
      return /ipad/.test(text);
    case 'apple watch':
      return /apple watch/.test(text) || specs.includes('apple watch');
    case 'mac mini':
      return /mac mini/.test(text);
    case 'imac':
      return /imac/.test(text);
    default:
      return false;
  }
}

function mainCategory(product: Product): string {
  if (product.productType === 'Monitor') return 'Monitorer';
  if (product.productType === 'Röstinspelare / AI-note taker') return 'Ljud & Inspelning';
  if (product.productType === 'Laddare' || product.productType === 'Powerbank') return 'Laddning';
  if (product.productType === 'Kabel') return 'Kablar';
  if (product.productType === 'Hubb / Adapter') return 'Hubbar & Adaptrar';
  if (product.productType === 'Dockningsstation') return 'Dockningsstationer';
  if (product.productType === 'Tangentbord' || product.productType === 'Keypad') return 'Tangentbord & Inmatning';
  if (product.productType === 'Mus') return 'Möss';
  if (product.productType === 'Stativ / Hållare') return 'Stativ & Hållare';
  if (product.productType === 'Fodral / Skydd') return 'Fodral & Skydd';
  if (product.specificationTags.includes('nvme') || product.specificationTags.includes('ssd')) return 'Lagring';
  if (product.productType === 'Lifestyle') return 'Lifestyle & Find My';
  return 'Fler tillbehör';
}

function subCategory(product: Product, main: string): string {
  const specs = product.specificationTags;
  const text = product.searchText;
  if (main === 'Monitorer') return 'Skärmar';
  if (main === 'Ljud & Inspelning') {
    if (/phone call|samtal|call recording/.test(text)) return 'Samtalsinspelare';
    return 'AI-röstinspelare';
  }
  if (main === 'Laddning') {
    if (product.productType === 'Powerbank') return 'Powerbanks';
    if (specs.includes('qi2') || specs.includes('qi')) return 'Trådlös laddning';
    if (/bil|billaddare|car/.test(text)) return 'Billaddare';
    return 'Vägg- & reseladdare';
  }
  if (main === 'Kablar') {
    if (specs.includes('thunderbolt 5') || specs.includes('thunderbolt 4')) return 'Thunderbolt-kablar';
    if (specs.includes('hdmi')) return 'HDMI-kablar';
    return 'USB-C-kablar';
  }
  if (main === 'Hubbar & Adaptrar') {
    if (specs.includes('ethernet')) return 'Nätverksadaptrar';
    if (/multiport/.test(text)) return 'Multiportadaptrar';
    if (/mac mini|imac|ipad|surface/.test(text)) return 'Enhetsspecifika hubbar';
    if (specs.includes('hdmi') || specs.includes('vga') || product.featureTags.includes('skärmanslutning')) return 'Videoadaptrar';
    return 'USB-C-hubbar';
  }
  if (main === 'Dockningsstationer') return product.featureTags.includes('skärmanslutning') ? 'Skärmdockor' : 'Desktop docks';
  if (main === 'Tangentbord & Inmatning') {
    if (product.productType === 'Keypad') return 'Keypads';
    if (product.layout === 'nordisk layout') return 'Nordisk layout';
    if (product.layout === 'us-layout') return 'US-layout';
    return 'Övriga tangentbord';
  }
  if (main === 'Möss') return specs.includes('bluetooth') ? 'Bluetooth-möss' : 'Övriga möss';
  if (main === 'Stativ & Hållare') {
    if (/laptop|macbook/.test(text)) return 'Laptopstativ';
    if (/mobil|smartphone|iphone/.test(text)) return 'Mobilstativ';
    if (/monitor stand|skarmstativ|skarm stativ/.test(text)) return 'Monitorstativ';
    return 'Skrivbordsstativ';
  }
  if (main === 'Fodral & Skydd') return /hardshell/.test(text) ? 'Hardshell-skydd' : 'Laptopfodral';
  if (main === 'Lagring') return 'SSD & kapslingar';
  if (main === 'Lifestyle & Find My') return /find my|findall/.test(text) ? 'Find My-tillbehör' : 'Lifestyle';
  return 'Blandat';
}

function sourceSearchText(source: ImportedRawSource): string {
  return normalize([
    source.slug,
    source.sourceTitle,
    source.specificationLines.join(' '),
    source.highlightLines.join(' '),
    source.rawText,
  ].join(' '));
}

function referenceSearchText(reference: ImportedReferenceSource): string {
  return normalize([
    reference.title,
    reference.keywords.join(' '),
    reference.excerpt,
  ].join(' '));
}

export function matchReferenceSources(source: ImportedRawSource, references: ImportedReferenceSource[], maxMatches = 3) {
  const sourceTokens = new Set(tokenize(sourceSearchText(source)));

  return references
    .map((reference) => {
      const referenceTokens = Array.from(new Set(tokenize(referenceSearchText(reference))));
      const overlap = referenceTokens.filter((token) => sourceTokens.has(token));
      const score = overlap.length;
      return {
        ...reference,
        score,
        matchedTerms: overlap.slice(0, 8),
      };
    })
    .filter((reference) => reference.score > 0)
    .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title, 'sv'))
    .slice(0, maxMatches);
}

export function parseImportedProducts(sources: ImportedRawSource[], settings: Settings): Product[] {
  const base = sources.map((source, index) => {
    const searchText = sourceSearchText(source);
    const productType = detectType(searchText);
    const layout = detectLayout(searchText);
    const series = detectSeries(searchText);
    const color = detectColor(searchText);
    const specificationTags = collectSpecificationTags(searchText, productType, settings);
    const featureTags = collectFeatureTags(searchText, productType, settings);
    const filterTags = [...specificationTags];

    const product: Product = {
      id: source.id || index + 1,
      rawUrl: source.rawUrl,
      slug: source.slug,
      title: source.sourceTitle,
      searchText,
      productType,
      series,
      color,
      layout,
      specificationTags,
      featureTags,
      filterTags,
      recommendationTargets: recommendationTargets(searchText, productType),
      recommendationMatches: [],
      dynamicMainCategory: '',
      dynamicSubCategory: '',
    };

    product.dynamicMainCategory = mainCategory(product);
    product.dynamicSubCategory = subCategory(product, product.dynamicMainCategory);
    return product;
  });

  return base.map((product) => ({
    ...product,
    recommendationMatches: product.recommendationTargets.flatMap((target) =>
      base
        .filter((candidate) => candidate.id !== product.id && matchesTarget(candidate, target))
        .slice(0, 6)
        .map((candidate) => ({ target, productId: candidate.id, title: candidate.title }))
    ),
  }));
}

export function buildTaggingPrompt(source: ImportedRawSource, settings: Settings, references: ImportedReferenceSource[] = []): string {
  const specificationLines = source.specificationLines.length
    ? source.specificationLines.map((line) => `- ${line}`).join('\n')
    : '- Inga explicita specifikationsrader hittades';

  const highlightLines = source.highlightLines.length
    ? source.highlightLines.map((line) => `- ${line}`).join('\n')
    : '- Inga separata highlight-rader hittades';

  const matchedReferences = matchReferenceSources(source, references, 3);
  const referenceContext = matchedReferences.length
    ? matchedReferences.map((reference) => `- ${reference.title} (${reference.referenceUrl})
  matchedTerms: ${reference.matchedTerms.join(', ') || 'inga explicita matchningar'}
  excerpt: ${reference.excerpt}`).join('\n')
    : '- Inga relevanta externa referenser matchade den här produkten';

  return `Du klassificerar en e-handelsprodukt utifrån verkligt RAW-innehåll.

Mål:
- identifiera productType
- föreslå mainCategory och subCategory
- extrahera specificationTags för filtrering
- extrahera featureTags för navigation, rekommendationer och merchandising

Viktiga regler:
- använd bara fakta som stöds av RAW-innehållet
- prioritera explicita specs före marknadsföringstext
- använd externa referenser som benchmark och normaliseringsstöd, men låt aldrig referenser överskriva tydliga fakta i produktens egna RAW-data
- specificationTags ska vara korta, normaliserade och konkreta
- featureTags ska beskriva användningsfall, egenskaper eller kontext
- max ${settings.maxSpecTags} specificationTags
- max ${settings.maxFeatureTags} featureTags
- om något är osäkert, utelämna det hellre än att gissa

Returnera JSON i detta schema:
{
  "productType": "Monitor | Mus | Tangentbord | Keypad | Röstinspelare / AI-note taker | Powerbank | Laddare | Dockningsstation | Hubb / Adapter | Kabel | Stativ / Hållare | Fodral / Skydd | Lifestyle | Övrigt tillbehör",
  "mainCategory": "string",
  "subCategory": "string",
  "series": "string | null",
  "color": "string | null",
  "layout": "string | null",
  "specificationTags": ["string"],
  "featureTags": ["string"],
  "reasoning": {
    "evidenceLines": ["string"],
    "notes": "kort förklaring"
  }
}

INPUT
rawUrl: ${source.rawUrl}
slug: ${source.slug}
title: ${source.sourceTitle}

highlightLines:
${highlightLines}

specificationLines:
${specificationLines}

referenceContext:
${referenceContext}

rawExcerpt:
${source.excerpt}`;
}
