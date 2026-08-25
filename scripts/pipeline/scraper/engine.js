const cheerio = require("cheerio");
const { fetchText, stripTags } = require("../lib/http");

function cleanText(text, maxLen = 400) {
  return String(text || "").replace(/\s+/g, " ").trim().slice(0, maxLen);
}

function extractTag(block, tag) {
  const match = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, "i"));
  return match ? match[1] : "";
}

function parseRss(xml) {
  const items = [];
  const blocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of blocks) {
    const title = cleanText(stripTags(extractTag(block, "title")));
    if (!title || title.length < 20) continue;
    const summary = cleanText(stripTags(extractTag(block, "description")));
    items.push({ title, summary });
  }
  if (items.length === 0) {
    const entries = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
    for (const block of entries) {
      const title = cleanText(stripTags(extractTag(block, "title")));
      if (!title || title.length < 20) continue;
      const rawSummary =
        extractTag(block, "summary") ||
        extractTag(block, "content") ||
        "";
      items.push({ title, summary: cleanText(stripTags(rawSummary)) });
    }
  }
  return items;
}

function parseHtml(html, source) {
  const $ = cheerio.load(html);
  const seen = new Set();
  const items = [];

  const pushItem = (titleEl, scope) => {
    const title = cleanText($(titleEl).text(), 300);
    if (!title || title.length < 25 || title.length > 300) return;
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, "");
    if (seen.has(key)) return;

    let summary = "";
    if (scope && scope.length) {
      summary = cleanText(scope.find("p").first().text());
    }

    seen.add(key);
    items.push({ title, summary });
  };

  if (source.itemSelector) {
    $(source.itemSelector).each((_, el) => {
      const scope = $(el);
      const heading = scope.find("h1, h2, h3, h4").first();
      if (heading.length) {
        pushItem(heading, scope);
      } else {
        const link = scope.find("a").first();
        if (link.length && cleanText(link.text()).length >= 25) pushItem(link, null);
      }
      if (items.length >= (source.maxItems || 6)) return false;
    });
  }

  if (items.length < 3) {
    $("h2 a, h3 a").each((_, el) => {
      pushItem(el, null);
    });
  }

  return items.slice(0, source.maxItems || 6);
}

async function scrapeSource(source, defaults) {
  const errors = [];
  for (const url of source.urls || []) {
    try {
      const body = await fetchText(url, {
        timeoutMs: defaults.requestTimeoutMs,
        userAgent: defaults.userAgent
      });
      const parsed = source.type === "rss" ? parseRss(body) : parseHtml(body, source);
      if (parsed.length > 0) {
        return parsed.map((item) => ({
          sourceId: source.id,
          sourceName: source.name,
          category: source.category,
          ...item
        }));
      }
      errors.push(`${source.id}: parsed 0 items from ${url}`);
    } catch (err) {
      errors.push(`${source.id}: ${err.message}`);
    }
  }
  throw new Error(errors.join(" | "));
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index], index).catch((err) => ({ error: err }));
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}

async function scrapeAll(config) {
  const sources = config.sources || [];
  const defaults = config.defaults || {};
  const settled = await mapLimit(sources, defaults.concurrency || 6, (source) =>
    scrapeSource(source, defaults)
  );

  const pool = [];
  const failures = [];
  settled.forEach((result, i) => {
    if (result instanceof Error || (result && result.error)) {
      const err = result.error || result;
      failures.push({ sourceId: sources[i].id, message: err.message });
    } else if (Array.isArray(result)) {
      pool.push(...result);
    }
  });

  return { pool, failures };
}

module.exports = { scrapeAll };
