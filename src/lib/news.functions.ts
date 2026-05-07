import { createServerFn } from "@tanstack/react-start";

export type SourceType = "OFFICIAL" | "MEDIA" | "AGGREGATOR" | "SOCIAL";
export type CaseStatus = "CONFIRMED" | "PROBABLE" | "SUSPECTED" | "ADVISORY";

export type LiveNewsItem = {
  time: string;
  iso: string;
  source: string;
  sourceType: SourceType;
  severity: "CRITICAL" | "HIGH" | "INFO";
  headline: string;
  body: string;
  url: string;
  caseStatus: CaseStatus;
  confidenceScore: number;
  confidenceLabel: "HIGH" | "MEDIUM" | "LOW";
  signalReason: string;
  lastVerifiedAt: string;
};

type FeedConfig = {
  source: string;
  url: string;
  severity: LiveNewsItem["severity"];
  sourceType: LiveNewsItem["sourceType"];
};

type SourceHealth = {
  source: string;
  status: "ok" | "error";
  lastCheckedAt: string;
  detail?: string;
};

const FEEDS: FeedConfig[] = [
  {
    source: "WHO",
    url: "https://www.who.int/feeds/entity/csr/don/en/rss.xml",
    severity: "CRITICAL",
    sourceType: "OFFICIAL",
  },
  {
    source: "CDC",
    url: "https://tools.cdc.gov/api/v2/resources/media/132608.rss",
    severity: "HIGH",
    sourceType: "OFFICIAL",
  },
  {
    source: "Google News",
    url: "https://news.google.com/rss/search?q=hantavirus&hl=en-US&gl=US&ceid=US:en",
    severity: "INFO",
    sourceType: "AGGREGATOR",
  },
];

const KEYWORDS = ["hanta", "hantavirus", "andes virus", "sin nombre", "puumala", "hcps", "hfrs"];
const CONFIRMED_RE = /\b(confirmed|lab-confirmed|laborconfirmed|rt-pcr positive|pcr positive)\b/i;
const PROBABLE_RE = /\b(probable|likely|under verification|investigation ongoing)\b/i;
const SUSPECTED_RE = /\b(suspect|suspected|possible|potential|unconfirmed|mutmasslich|verdacht)\b/i;

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

function normalizeHeadline(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

function classifyCaseStatus(text: string): CaseStatus {
  if (CONFIRMED_RE.test(text)) return "CONFIRMED";
  if (PROBABLE_RE.test(text)) return "PROBABLE";
  if (SUSPECTED_RE.test(text)) return "SUSPECTED";
  return "ADVISORY";
}

function scoreConfidence(sourceType: SourceType, caseStatus: CaseStatus) {
  const sourceBase: Record<SourceType, number> = {
    OFFICIAL: 88,
    MEDIA: 64,
    AGGREGATOR: 50,
    SOCIAL: 35,
  };
  const statusAdjust: Record<CaseStatus, number> = {
    CONFIRMED: 8,
    PROBABLE: 2,
    SUSPECTED: -10,
    ADVISORY: -14,
  };

  const value = Math.max(5, Math.min(99, sourceBase[sourceType] + statusAdjust[caseStatus]));
  const label = value >= 75 ? "HIGH" : value >= 50 ? "MEDIUM" : "LOW";
  return { value, label: label as "HIGH" | "MEDIUM" | "LOW" };
}

function pickSignalReason(text: string, caseStatus: CaseStatus) {
  const keyword = KEYWORDS.find((k) => text.includes(k));
  return `keyword=${keyword ?? "hantavirus"}; class=${caseStatus.toLowerCase()}`;
}

export const getLiveHantaNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ items: LiveNewsItem[]; fetchedAt: string; sources: number; sourceHealth: SourceHealth[] }> => {
    const results: LiveNewsItem[] = [];
    const sourceHealth: SourceHealth[] = [];

    await Promise.all(
      FEEDS.map(async (feed) => {
        const checkedAt = new Date().toISOString();
        try {
          const res = await fetch(feed.url, {
            headers: { "User-Agent": "HantaER/1.0" },
            signal: AbortSignal.timeout(8000),
          });

          if (!res.ok) {
            sourceHealth.push({
              source: feed.source,
              status: "error",
              lastCheckedAt: checkedAt,
              detail: `HTTP ${res.status}`,
            });
            return;
          }

          const xml = await res.text();
          const items = parseRss(xml);
          for (const it of items) {
            const hay = `${it.title} ${it.description}`.toLowerCase();
            if (!KEYWORDS.some((k) => hay.includes(k))) continue;

            const caseStatus = classifyCaseStatus(hay);
            const confidence = scoreConfidence(feed.sourceType, caseStatus);
            const iso = new Date(it.pubDate || Date.now()).toISOString();

            results.push({
              time: fmtTime(iso),
              iso,
              source: feed.source,
              sourceType: feed.sourceType,
              severity: feed.severity,
              headline: it.title || "(untitled)",
              body: cleanDescription(it.description).slice(0, 240),
              url: it.link,
              caseStatus,
              confidenceScore: confidence.value,
              confidenceLabel: confidence.label,
              signalReason: pickSignalReason(hay, caseStatus),
              lastVerifiedAt: checkedAt,
            });
          }

          sourceHealth.push({ source: feed.source, status: "ok", lastCheckedAt: checkedAt });
        } catch (e) {
          sourceHealth.push({
            source: feed.source,
            status: "error",
            lastCheckedAt: checkedAt,
            detail: e instanceof Error ? e.message : String(e),
          });
          console.error(`Feed failed: ${feed.source}`, e);
        }
      }),
    );

    // de-dupe by URL + normalized headline
    const seen = new Set<string>();
    const unique = results.filter((r) => {
      const k = `${r.url || ""}|${normalizeHeadline(r.headline)}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    unique.sort((a, b) => b.iso.localeCompare(a.iso));

    return {
      items: unique.slice(0, 12),
      fetchedAt: new Date().toISOString(),
      sources: FEEDS.length,
      sourceHealth,
    };
  },
);
