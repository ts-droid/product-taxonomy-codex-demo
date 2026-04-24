export type Settings = {
  maxTotalTags: number;
  maxSpecTags: number;
  maxFeatureTags: number;
  mainMax: number;
  subMax: number;
  customerGridCols: number;
};

export type ProductType =
  | 'Monitor'
  | 'Mus'
  | 'Tangentbord'
  | 'Keypad'
  | 'Röstinspelare / AI-note taker'
  | 'Powerbank'
  | 'Laddare'
  | 'Dockningsstation'
  | 'Hubb / Adapter'
  | 'Kabel'
  | 'Stativ / Hållare'
  | 'Fodral / Skydd'
  | 'Lifestyle'
  | 'Övrigt tillbehör';

export type Product = {
  id: number;
  rawUrl: string;
  slug: string;
  title: string;
  searchText: string;
  productType: ProductType;
  series: string | null;
  color: string | null;
  layout: string | null;
  specificationTags: string[];
  featureTags: string[];
  filterTags: string[];
  recommendationTargets: string[];
  recommendationMatches: { target: string; productId: number; title: string }[];
  dynamicMainCategory: string;
  dynamicSubCategory: string;
};

export type TaxonomyGroup = {
  name: string;
  count: number;
  products: Product[];
  subGroups: { name: string; count: number; products: Product[] }[];
};

export type Taxonomy = {
  mainGroups: TaxonomyGroup[];
  topSpecificationTags: { tag: string; count: number }[];
  topFeatureTags: { tag: string; count: number }[];
};

const seriesList = [
  'm1', 'x1', 'x3', 'w1', 'w3', 'sm1', 'sm3', 'r1', 'r2', 'c1', 'ex1', 'ex3',
  'onthego', 'findall', 'pro hub', 'pro hub mini', 'dock5', 'quatro', 'trio', 'mobile xr', 'chargeview',
];

const colorTerms = [
  'space gray', 'space grey', 'space black', 'rymdgra', 'silver', 'svart', 'sand', 'desert rose', 'orange', 'brun', 'bla', 'blå', 'midnatt', 'guld', 'rose gold', 'transparent', 'mork', 'mörk', 'ljusgra'
];

const specMatchers: Array<{ test: (t: string) => string | null }> = [
  { test: (t) => (/(^|\b)usb-c(\b|$)|\busbc\b/.test(t) ? 'usb-c' : null) },
  { test: (t) => (/(^|\b)usb4(\b|$)/.test(t) ? 'usb4' : null) },
  { test: (t) => (/thunderbolt[ -]?5/.test(t) ? 'thunderbolt 5' : null) },
  { test: (t) => (/thunderbolt[ -]?4/.test(t) ? 'thunderbolt 4' : null) },
  { test: (t) => (/hdmi/.test(t) ? 'hdmi' : null) },
  { test: (t) => (/vga/.test(t) ? 'vga' : null) },
  { test: (t) => (/ethernet|rj45|gigabit/.test(t) ? 'ethernet' : null) },
  { test: (t) => (/kortlasare|kortlasare|minneskortlasare|micro ?sd|microsd|sd/.test(t) ? 'sd-kortläsare' : null) },
  { test: (t) => (/qi2/.test(t) ? 'qi2' : null) },
  { test: (t) => (/(^|\b)qi(\b|$)/.test(t) && !/qi2/.test(t) ? 'qi' : null) },
  { test: (t) => (/bluetooth/.test(t) ? 'bluetooth' : null) },
  { test: (t) => (/wifi/.test(t) ? 'wifi' : null) },
  { test: (t) => (/gan/.test(t) ? 'gan' : null) },
  { test: (t) => (/nvme/.test(t) ? 'nvme' : null) },
  { test: (t) => (/ssd/.test(t) ? 'ssd' : null) },
  { test: (t) => (/magsafe/.test(t) ? 'magsafe' : null) },
  { test: (t) => (/apple watch/.test(t) ? 'apple watch' : null) },
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

function toDisplayTitle(slug: string): string {
  return decodeURIComponent(slug)
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .map((word) => {
      const w = word.toLowerCase();
      if (['usb', 'hdmi', 'ssd', 'nvme', 'qi', 'qi2', 'm1', 'x1', 'x3', 'w1', 'w3', 'r1', 'r2', 'c1', 'sm1', 'sm3', 'ex1', 'ex3'].includes(w)) {
        return w === 'qi2' ? 'Qi2' : w.toUpperCase();
      }
      if (/^\d+[wmkg]?$/.test(w)) return w.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function extractSlug(url: string): string {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').map((part) => decodeURIComponent(part)).filter(Boolean);
    const cleaned = parts.filter((part) => !/^raw$/i.test(part));
    return cleaned.at(-1)?.trim() ?? '';
  } catch {
    return url.match(/\/products\/([^/?#]+)\/raw/i)?.[1] ?? '';
  }
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
  const mentionsMonitor = /monitor|display|skarm|skarm/.test(text);
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

  const sizes = text.match(/\b(13|14|15\/16|24)\s?tum\b/g) ?? [];
  sizes.forEach((item) => tags.add(item.replace(/\s+/g, ' ')));

  const color = detectColor(text);
  if (color) tags.add(color);

  const layout = detectLayout(text);
  if (layout) tags.add(layout);

  if (productType === 'Monitor') tags.add('monitor');

  return Array.from(tags).slice(0, settings.maxSpecTags);
}

function collectFeatureTags(text: string, settings: Settings): string[] {
  const tags = new Set<string>();
  for (const matcher of featureMatchers) {
    const hit = matcher.test(text);
    if (hit) tags.add(hit);
  }
  return Array.from(tags).slice(0, settings.maxFeatureTags);
}

function recommendationTargets(text: string, type: ProductType): string[] {
  const targets = new Set<string>();
  if (type !== 'Monitor' && /monitor|display|skarm|skarm/.test(text)) targets.add('monitor');
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

export function parseProducts(rawUrls: string, settings: Settings): Product[] {
  const urls = Array.from(new Set(rawUrls.split(/\n+/).map((v) => v.trim()).filter(Boolean)));

  const base = urls.map((url, index) => {
    const slug = extractSlug(url) || `produkt-${index + 1}`;
    const title = toDisplayTitle(slug);
    const searchText = normalize(`${slug} ${title}`);
    const productType = detectType(searchText);
    const layout = detectLayout(searchText);
    const series = detectSeries(searchText);
    const color = detectColor(searchText);
    const specificationTags = collectSpecificationTags(searchText, productType, settings);
    const featureTags = collectFeatureTags(searchText, settings);
    const filterTags = [...specificationTags];

    const product: Product = {
      id: index + 1,
      rawUrl: url,
      slug,
      title,
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

export function buildTaxonomy(products: Product[], settings: Settings): Taxonomy {
  const mainMap = new Map<string, { name: string; products: Product[]; subMap: Map<string, Product[]> }>();
  for (const product of products) {
    if (!mainMap.has(product.dynamicMainCategory)) {
      mainMap.set(product.dynamicMainCategory, { name: product.dynamicMainCategory, products: [], subMap: new Map() });
    }
    const entry = mainMap.get(product.dynamicMainCategory)!;
    entry.products.push(product);
    if (!entry.subMap.has(product.dynamicSubCategory)) entry.subMap.set(product.dynamicSubCategory, []);
    entry.subMap.get(product.dynamicSubCategory)!.push(product);
  }

  let mainGroups: TaxonomyGroup[] = [...mainMap.values()]
    .map((entry) => ({
      name: entry.name,
      count: entry.products.length,
      products: entry.products,
      subGroups: [...entry.subMap.entries()]
        .map(([name, groupProducts]) => ({ name, count: groupProducts.length, products: groupProducts }))
        .sort((a, b) => b.count - a.count),
    }))
    .sort((a, b) => b.count - a.count);

  if (mainGroups.length > settings.mainMax) {
    const keep = mainGroups.slice(0, settings.mainMax - 1);
    const overflowProducts = mainGroups.slice(settings.mainMax - 1).flatMap((g) => g.products);
    keep.push({
      name: 'Fler tillbehör',
      count: overflowProducts.length,
      products: overflowProducts,
      subGroups: [{ name: 'Blandat', count: overflowProducts.length, products: overflowProducts }],
    });
    mainGroups = keep;
  }

  mainGroups = mainGroups.map((group) => {
    if (group.subGroups.length <= settings.subMax) return group;
    const keep = group.subGroups.slice(0, settings.subMax - 1);
    const overflowProducts = group.subGroups.slice(settings.subMax - 1).flatMap((g) => g.products);
    return {
      ...group,
      subGroups: [...keep, { name: 'Fler undergrupper', count: overflowProducts.length, products: overflowProducts }],
    };
  });

  const specFreq = new Map<string, number>();
  const featureFreq = new Map<string, number>();
  for (const product of products) {
    product.specificationTags.forEach((tag) => specFreq.set(tag, (specFreq.get(tag) || 0) + 1));
    product.featureTags.forEach((tag) => featureFreq.set(tag, (featureFreq.get(tag) || 0) + 1));
  }

  return {
    mainGroups,
    topSpecificationTags: [...specFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([tag, count]) => ({ tag, count })),
    topFeatureTags: [...featureFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 24).map(([tag, count]) => ({ tag, count })),
  };
}
