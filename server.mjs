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
  return url.match(/\/products\/([^/?#]+)\/raw/i)?.[1] ?? `produkt-${index + 1}`;
}

function makeLines(text) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function collectSpecificationLines(lines) {
  const headingIndex = lines.findIndex((line) => /specifikationer for produkten|specifikationer för produkten|product specifications/i.test(line));
  const source = headingIndex >= 0 ? lines.slice(headingIndex + 1, headingIndex + 16) : lines;
  const pairs = source.filter((line) => /:/.test(line) && line.split(':')[0].trim().length <= 40);
  return (pairs.length ? pairs : lines.filter((line) => /:/.test(line)).slice(0, 12)).slice(0, 12);
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

    return {
      id: index + 1,
      rawUrl: url,
      slug,
      sourceTitle: extractTitle(html, slug),
      rawText: text,
      highlightLines: collectHighlightLines(lines),
      specificationLines: collectSpecificationLines(lines),
      excerpt: excerpt(text),
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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, now: new Date().toISOString() });
});

app.post('/api/import-raw', async (req, res) => {
  const rawUrls = String(req.body?.rawUrls ?? '');
  const urls = Array.from(new Set(rawUrls.split(/\n+/).map((value) => value.trim()).filter(Boolean))).slice(0, 50);

  if (!urls.length) {
    return res.status(400).json({ error: 'Ingen RAW-länk skickades in.' });
  }

  const sources = [];
  const failures = [];

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

  return res.json({
    importedAt: new Date().toISOString(),
    sources,
    failures,
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
