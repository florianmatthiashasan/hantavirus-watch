import { createServerFn } from "@tanstack/react-start";

export type LiveNewsItem = {
  time: string;
  iso: string;
  source: string;
  severity: "CRITICAL" | "HIGH" | "INFO";
  headline: string;
  body: string;
  url: string;
};

const FEEDS: { source: string; url: string; severity: LiveNewsItem["severity"] }[] = [
  {
    source: "WHO",
    url: "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
    severity: "CRITICAL",
  },
  {
    source: "CDC",
    url: "https://tools.cdc.gov/api/v2/resources/media/132608.rss",
    severity: "HIGH",
  },
  {
    source: "Google News",
    url: "https://news.google.com/rss/search?q=hantavirus&hl=en-US&gl=US&ceid=US:en",
    severity: "INFO",
  },
];

const KEYWORDS = ["hanta", "hantavirus", "andes virus", "sin nombre", "puumala", "hcps", "hfrs"];

function stripTags(s: string) {
  const decoded = s
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, "$1")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");

  return decoded
    .replace(/<[^>]*>/g, " ")
    .replace(/<[^>\n]*$/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanDescription(s: string) {
  return s
    .replace(/https?:\/\/\S+/gi, "")
    .replace(/\bwww\.\S+/gi, "")
    .replace(/\bhref\s*=\s*["']?[^"'\s>]+["']?/gi, "")
    .replace(/[<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseRss(xml: string) {
  const items: { title: string; link: string; description: string; pubDate: string }[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  let m: RegExpExecArray | null;
  while ((m = itemRegex.exec(xml)) !== null) {
    const block = m[1];
    const get = (tag: string) => {
      const r = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(block);
      return r ? stripTags(r[1]) : "";
    };
    items.push({
      title: get("title"),
      link: get("link"),
      description: get("description"),
      pubDate: get("pubDate"),
    });
  }
  return items;
}

function fmtTime(iso: string) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  return d.toISOString().replace("T", " ").slice(0, 16) + " UTC";
}

export const getLiveHantaNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: LiveNewsItem[]; fetchedAt: string; sources: number }> => {
    const results: LiveNewsItem[] = [];

    await Promise.all(
      FEEDS.map(async (feed) => {
        try {
          const res = await fetch(feed.url, {
            headers: { "User-Agent": "HantaER/1.0" },
            signal: AbortSignal.timeout(8000),
          });
          if (!res.ok) return;
          const xml = await res.text();
          const items = parseRss(xml);
          for (const it of items) {
            const hay = `${it.title} ${it.description}`.toLowerCase();
            if (!KEYWORDS.some((k) => hay.includes(k))) continue;
            const iso = new Date(it.pubDate || Date.now()).toISOString();
            results.push({
              time: fmtTime(iso),
              iso,
              source: feed.source,
              severity: feed.severity,
              headline: it.title || "(untitled)",
              body: cleanDescription(it.description).slice(0, 240),
              url: it.link,
            });
          }
        } catch (e) {
          console.error(`Feed failed: ${feed.source}`, e);
        }
      }),
    );

    // de-dupe by URL, sort newest first
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      const k = r.url || r.headline;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });
    unique.sort((a, b) => b.iso.localeCompare(a.iso));

    return {
      items: unique.slice(0, 12),
      fetchedAt: new Date().toISOString(),
      sources: FEEDS.length,
    };
  },
);
