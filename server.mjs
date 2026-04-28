import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.join(__dirname, 'dist');

const app = express();
app.use(express.json({ limit: '1mb' }));

function decodeHtmlEntities(text) {
  return text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&ndash;/g, '-')
    .replace(/&mdash;/g, '-')
    .replace(/&ouml;/g, 'ö')
    .replace(/&aring;/g, 'å')
    .replace(/&auml;/g, 'ä')
    .replace(/&Ouml;/g, 'Ö')
    .replace(/&Aring;/g, 'Å')
    .replace(/&Auml;/g, 'Ä')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)));
}

function stripHtml(html) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|section|article|header|footer|aside|main|ul|ol|li|h1|h2|h3|h4|h5|h6)>/gi, '\n')
      .replace(/<li[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractMetaContent(html, key, attr = 'property') {
  const pattern = new RegExp(`<meta[^>]+${attr}=["']${key}["'][^>]+content=["']([^"']+)["'][^>]*>`, 'i');
  const reversePattern = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+${attr}=["']${key}["'][^>]*>`, 'i');
  return decodeHtmlEntities(html.match(pattern)?.[1] ?? html.match(reversePattern)?.[1] ?? '');
}

function extractTitle(html, fallback) {
  const candidates = [
    extractMetaContent(html, 'og:title'),
    decodeHtmlEntities(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? ''),
    decodeHtmlEntities(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? ''),
    fallback,
  ];

  return candidates.map((item) => item.replace(/\s+/g, ' ').trim()).find(Boolean) ?? fallback;
}

function extractSlug(url, index) {
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').map((part) => decodeURIComponent(part)).filter(Boolean);
    const cleaned = parts.filter((part) => !/^raw$/i.test(part));
    return cleaned.at(-1)?.trim() || `produkt-${index + 1}`;
  } catch {
    return url.match(/\/products\/([^/?#]+)\/raw/i)?.[1] ?? `produkt-${index + 1}`;
  }
}

function makeLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function removeLowSignalLines(text) {
  const lowSignalPattern = /mått|dimension|storlek|size|height|width|depth|bredd|höjd|hojd|djup|tjocklek|vikt|weight|f[aä]rg|color|colour|material|finish|warranty|garanti/i;
  return makeLines(text)
    .filter((line) => !lowSignalPattern.test(line))
    .join('\n');
}

function extractJsonLdObjects(html) {
  const matches = [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const result = [];

  for (const match of matches) {
    const raw = decodeHtmlEntities(match[1] ?? '').trim();
    if (!raw) continue;
    try {
      const parsed = JSON.parse(raw);
      result.push(parsed);
    } catch {
      continue;
    }
  }

  return result;
}

function flattenJsonLd(node) {
  if (!node) return [];
  if (Array.isArray(node)) return node.flatMap(flattenJsonLd);
  if (typeof node === 'object') {
    const graph = Array.isArray(node['@graph']) ? node['@graph'].flatMap(flattenJsonLd) : [];
    return [node, ...graph];
  }
  return [];
}

function hasType(node, typeName) {
  const value = node?.['@type'];
  if (Array.isArray(value)) return value.includes(typeName);
  return value === typeName;
}

function extractStructuredProduct(html) {
  const product = extractJsonLdObjects(html)
    .flatMap(flattenJsonLd)
    .find((node) => node && typeof node === 'object' && hasType(node, 'Product'));

  if (!product) return null;

  const name = decodeHtmlEntities(String(product.name ?? '')).trim();
  const rawDescription = decodeHtmlEntities(String(product.description ?? ''));
  const descriptionHtml = rawDescription.replace(
    /<h2[^>]*>\s*(how to use|how does|who are|is plaud|do i have to pay|can plaud|what about consent|what languages|what is the best|what is the difference|how can i locate|how do i update|does the plaud note support|how to reset)[\s\S]*/i,
    ''
  );
  const description = stripHtml(descriptionHtml);
  const brand = typeof product.brand === 'object'
    ? decodeHtmlEntities(String(product.brand?.name ?? '')).trim()
    : decodeHtmlEntities(String(product.brand ?? '')).trim();

  return {
    name,
    description,
    brand,
  };
}

function collectSpecificationLines(lines) {
  const techSignalPattern = /bluetooth|wi-?fi|usb|type-c|typ-c|thunderbolt|hdmi|displayport|ethernet|rj45|sd|micro ?sd|lightning|gan|power delivery|\bpd ?3\.[01]\b|\b\d{1,3}\s?w\b|qi2?|magsafe|nvme|ssd|3[.,]5\s?mm|audio jack|kortl[aä]sare|kabel|cable/i;
  const allowedLabelPattern = /anslutning|connectivity|wireless|bluetooth|wi-?fi|port(ar)?|interface|protocol|thunderbolt|usb|hdmi|displayport|ethernet|rj45|sd|micro ?sd|kortl[aä]sare|laddning|charging|charge|power|watt|effekt|pd|power delivery|gan|qi2?|magsafe|kabel|cable|connector|anslutningstyp|storage|lagring|nvme|ssd/i;
  const compatibilityPattern = /kompatibilitet|compatible|compatibility|works with|passar (till|med)|supports?|macbook|ipad|iphone|apple watch|windows laptop|pc laptop/i;
  const lowSignalPattern = /mått|dimension|storlek|size|height|width|depth|bredd|höjd|hojd|djup|tjocklek|vikt|weight|f[aä]rg|color|colour|material|finish|warranty|garanti/i;

  const isUsefulSpecLine = (line) => {
    if (!/:/.test(line)) return false;
    if (line.length > 180) return false;
    if (lowSignalPattern.test(line)) return false;
    if (compatibilityPattern.test(line)) return false;

    const [label = ''] = line.split(':');
    return allowedLabelPattern.test(label) || techSignalPattern.test(line);
  };

  const headingIndex = lines.findIndex((line) => /^(specification|specifications|teknisk specifikation|specifikationer)$/i.test(line));
  if (headingIndex >= 0) {
    const scoped = [];
    for (const line of lines.slice(headingIndex + 1)) {
      if (/^(faq|reviews|what'?s included|how to use|how does|who are|is plaud|do i have to pay|can plaud|professional ai note taker|maximize productivity)$/i.test(line)) break;
      scoped.push(line);
      if (scoped.length >= 20) break;
    }
    const pairs = scoped.filter(isUsefulSpecLine);
    if (pairs.length) return pairs.slice(0, 14);
  }

  const fallbackIndex = lines.findIndex((line) => /specifikationer for produkten|specifikationer för produkten|product specifications/i.test(line));
  const source = fallbackIndex >= 0 ? lines.slice(fallbackIndex + 1, fallbackIndex + 16) : lines;
  const pairs = source.filter((line) => isUsefulSpecLine(line) && line.split(':')[0].trim().length <= 40);
  return (pairs.length ? pairs : lines.filter(isUsefulSpecLine).slice(0, 12)).slice(0, 12);
}

function collectCompatibilityLines(lines) {
  const compatibilityPattern = /kompatibilitet|compatible|compatibility|works with|passar (till|med)|supports?/i;
  const targetPattern = /macbook|ipad|iphone|apple watch|imac|mac mini|windows laptop|pc laptop|usb-c devices?/i;

  const headingIndex = lines.findIndex((line) => /^(compatibility|kompatibilitet)$/i.test(line));
  if (headingIndex >= 0) {
    const scoped = [];
    for (const line of lines.slice(headingIndex + 1)) {
      if (/^(faq|reviews|what'?s included|how to use|support|manual)$/i.test(line)) break;
      if (compatibilityPattern.test(line) || targetPattern.test(line)) scoped.push(line);
      if (scoped.length >= 12) break;
    }
    if (scoped.length) return scoped.slice(0, 12);
  }

  return lines
    .filter((line) => line.length <= 180)
    .filter((line) => compatibilityPattern.test(line) || (/:/.test(line) && targetPattern.test(line)))
    .slice(0, 12);
}

function collectHighlightLines(lines) {
  const bullets = lines.filter((line) => line.startsWith('- ')).map((line) => line.replace(/^- /, '').trim());
  if (bullets.length) return bullets.slice(0, 8);
  return lines
    .filter((line) => line.length >= 24 && line.length <= 180 && !/:/.test(line))
    .slice(1, 9);
}

function excerpt(text, maxChars = 1400) {
  return text.length <= maxChars ? text : `${text.slice(0, maxChars).trim()}...`;
}

function collectDescriptionHighlights(text) {
  const lines = makeLines(text);
  const bullets = lines
    .map((line) => line.replace(/^[-*]\s*/, '').trim())
    .filter((line) => line.length >= 18 && line.length <= 220);
  return bullets.slice(0, 8);
}

function collectKeywords(text, maxKeywords = 12) {
  const stopwords = new Set([
    'the', 'and', 'for', 'with', 'that', 'this', 'from', 'your', 'you', 'are', 'but', 'not',
    'att', 'och', 'med', 'som', 'det', 'den', 'har', 'för', 'till', 'från', 'eller', 'på',
    'product', 'products', 'plaud', 'satechi', 'apple',
  ]);

  const freq = new Map();
  for (const token of text.toLowerCase().match(/[a-z0-9åäö-]{3,}/g) ?? []) {
    if (stopwords.has(token)) continue;
    freq.set(token, (freq.get(token) || 0) + 1);
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, maxKeywords)
    .map(([token]) => token);
}

function detectReferenceSourceType(url, text) {
  const pathname = url.pathname.toLowerCase();
  const haystack = `${pathname}\n${text.toLowerCase()}`;
  if (/\/products?\//.test(pathname) || /\b(product|specifications|what'?s included)\b/.test(haystack)) return 'product';
  if (/\/collections?\//.test(pathname) || /\/categories?\//.test(pathname) || /\b(collection|category|shop all)\b/.test(haystack)) return 'category';
  if (/\/support\//.test(pathname) || /\/faq/.test(pathname) || /\/help\//.test(pathname) || /\b(faq|support|guide|manual)\b/.test(haystack)) return 'support';
  if (pathname === '/' || pathname === '') return 'brand';
  return 'unknown';
}

function isBlockedHostname(hostname) {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local')) return true;
  if (/^127\./.test(host)) return true;
  if (/^10\./.test(host)) return true;
  if (/^192\.168\./.test(host)) return true;
  if (/^172\.(1[6-9]|2\d|3[0-1])\./.test(host)) return true;
  return false;
}

async function fetchRawSource(url, index) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Ogiltig URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Endast http/https stöds');
  if (isBlockedHostname(parsed.hostname)) throw new Error('Privata eller lokala adresser blockeras');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(parsed, {
      headers: {
        'user-agent': 'product-taxonomy-codex-demo/1.0',
        accept: 'text/html, text/plain;q=0.9, */*;q=0.1',
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const text = stripHtml(html);
    const lines = makeLines(text);
    const slug = extractSlug(url, index);
    const structured = extractStructuredProduct(html);
    const metaDescription = extractMetaContent(html, 'description', 'name');
    const descriptionText = removeLowSignalLines(structured?.description || metaDescription || '');
    const specificationLines = collectSpecificationLines(lines);
    const compatibilityLines = collectCompatibilityLines(lines);
    const highlightLines = descriptionText
      ? collectDescriptionHighlights(descriptionText)
      : collectHighlightLines(lines);
    const focusedText = [
      structured?.name,
      structured?.brand,
      metaDescription,
      descriptionText,
      specificationLines.join('\n'),
      compatibilityLines.join('\n'),
      highlightLines.join('\n'),
    ].filter(Boolean).join('\n\n');

    return {
      id: index + 1,
      rawUrl: url,
      slug,
      sourceTitle: structured?.name || extractTitle(html, slug),
      rawText: focusedText || text,
      highlightLines,
      specificationLines,
      compatibilityLines,
      excerpt: excerpt(focusedText || text),
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout vid hämtning av RAW-sidan');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchReferenceSource(url, index) {
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('Ogiltig URL');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Endast http/https stöds');
  if (isBlockedHostname(parsed.hostname)) throw new Error('Privata eller lokala adresser blockeras');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(parsed, {
      headers: {
        'user-agent': 'product-taxonomy-codex-demo/1.0',
        accept: 'text/html, text/plain;q=0.9, */*;q=0.1',
      },
      signal: controller.signal,
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const html = await response.text();
    const structured = extractStructuredProduct(html);
    const metaDescription = extractMetaContent(html, 'description', 'name');
    const title = structured?.name || extractTitle(html, parsed.hostname);
    const text = stripHtml(html);
    const lines = makeLines(text);
    const highlightLines = structured?.description
      ? collectDescriptionHighlights(structured.description)
      : collectHighlightLines(lines);
    const sourceType = detectReferenceSourceType(parsed, [title, metaDescription, structured?.description, text].filter(Boolean).join('\n'));
    const focusedText = [title, metaDescription, structured?.description, highlightLines.join('\n'), text].filter(Boolean).join('\n\n');

    return {
      id: index + 1,
      referenceUrl: url,
      title,
      domain: parsed.hostname,
      sourceType,
      excerpt: excerpt(focusedText, 600),
      keywords: collectKeywords(focusedText),
      highlightLines,
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Timeout vid hämtning av referenssidan');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.post('/api/import-raw', async (req, res) => {
  const rawUrls = String(req.body?.rawUrls ?? '');
  const referenceUrls = String(req.body?.references ?? '');
  const urls = Array.from(new Set(rawUrls.split(/\n+/).map((value) => value.trim()).filter(Boolean))).slice(0, 50);
  const references = Array.from(new Set(referenceUrls.split(/\n+/).map((value) => value.trim()).filter(Boolean))).slice(0, 20);

  if (!urls.length) {
    return res.status(400).json({ error: 'Ingen RAW-länk skickades in.' });
  }

  const sources = [];
  const failures = [];
  const referenceSources = [];
  const referenceFailures = [];

  for (const [index, url] of urls.entries()) {
    try {
      sources.push(await fetchRawSource(url, index));
    } catch (error) {
      failures.push({
        rawUrl: url,
        error: error instanceof Error ? error.message : 'Okänt fel vid hämtning',
      });
    }
  }

  for (const [index, url] of references.entries()) {
    try {
      referenceSources.push(await fetchReferenceSource(url, index));
    } catch (error) {
      referenceFailures.push({
        referenceUrl: url,
        error: error instanceof Error ? error.message : 'Okänt fel vid hämtning',
      });
    }
  }

  return res.json({
    importedAt: new Date().toISOString(),
    sources,
    failures,
    referenceSources,
    referenceFailures,
  });
});

app.use(express.static(distDir));
app.use((_req, res) => {
  res.sendFile(path.join(distDir, 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
