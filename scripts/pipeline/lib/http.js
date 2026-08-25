const DEFAULT_TIMEOUT_MS = 20000;

async function fetchText(url, { timeoutMs = DEFAULT_TIMEOUT_MS, userAgent } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": userAgent || "Mozilla/5.0 (compatible; RapidQuizzesBot/1.0)",
        Accept: "text/html,application/xhtml+xml,application/xml,text/xml,*/*"
      },
      redirect: "follow"
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${url}`);
    }
    return await res.text();
  } finally {
    clearTimeout(timer);
  }
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/<!\[CDATA\[([\s\S]*?)]]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&#x27;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function stripTags(html) {
  return decodeEntities(String(html || "").replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

module.exports = { fetchText, decodeEntities, stripTags };
