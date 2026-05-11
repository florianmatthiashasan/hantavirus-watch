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

export type SourceHealth = {
  source: string;
  status: "ok" | "error";
  lastCheckedAt: string;
  detail?: string;
};

export type ArcgisCaseStats = {
  deceased: number;
  confirmed: number;
  suspected: number;
  monitoring: number;
  total: number;
  fetchedAt: string;
  source: string;
};

export type ArcgisCasePoint = {
  id: number;
  caseNumber: number | null;
  status: string;
  lastLocation: string;
  details: string;
  lat: number;
  lng: number;
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
const ARCGIS_CASE_LAYER_URL =
  "https://services1.arcgis.com/wb4Og4gH5mvzQAIV/arcgis/rest/services/Tracking_Hantavirus_2026/FeatureServer/1";

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
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeText(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeUrl(raw: string) {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.hash = "";
    // remove common tracking params so same article URL de-dupes reliably
    for (const key of [...u.searchParams.keys()]) {
      if (/^utm_/i.test(key) || /^(gclid|fbclid|mc_cid|mc_eid|igshid)$/i.test(key)) {
        u.searchParams.delete(key);
      }
    }
    u.pathname = u.pathname.replace(/\/+$/, "") || "/";
    const qs = u.searchParams.toString();
    return `${u.origin}${u.pathname}${qs ? `?${qs}` : ""}`;
  } catch {
    return raw.trim();
  }
}

function severityWeight(severity: LiveNewsItem["severity"]) {
  if (severity === "CRITICAL") return 30;
  if (severity === "HIGH") return 16;
  return 6;
}

function caseStatusWeight(status: CaseStatus) {
  if (status === "CONFIRMED") return 24;
  if (status === "PROBABLE") return 14;
  if (status === "SUSPECTED") return 6;
  return 0;
}

function sourceTypeWeight(sourceType: SourceType) {
  if (sourceType === "OFFICIAL") return 15;
  if (sourceType === "MEDIA") return 8;
  if (sourceType === "AGGREGATOR") return 3;
  return 0;
}

function newsEventKey(item: LiveNewsItem) {
  const normalizedHeadline = normalizeHeadline(item.headline);
  const normalizedBody = normalizeText(item.body).slice(0, 140);
  const canonicalUrl = canonicalizeUrl(item.url);
  return `${normalizedHeadline}|${normalizedBody}|${canonicalUrl}`;
}

function keepPreferredItem(current: LiveNewsItem, next: LiveNewsItem) {
  const currentRank =
    current.confidenceScore +
    severityWeight(current.severity) +
    caseStatusWeight(current.caseStatus) +
    sourceTypeWeight(current.sourceType);
  const nextRank =
    next.confidenceScore +
    severityWeight(next.severity) +
    caseStatusWeight(next.caseStatus) +
    sourceTypeWeight(next.sourceType);

  if (nextRank !== currentRank) return nextRank > currentRank ? next : current;
  return next.iso > current.iso ? next : current;
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

export const getArcgisCaseStats = createServerFn({ method: "GET" }).handler(
  async (): Promise<ArcgisCaseStats> => {
    const fetchedAt = new Date().toISOString();
    const params = new URLSearchParams({
      where: "1=1",
      groupByFieldsForStatistics: "STATUS",
      outStatistics: JSON.stringify([
        {
          statisticType: "count",
          onStatisticField: "OBJECTID",
          outStatisticFieldName: "count",
        },
      ]),
      f: "json",
    });

    const res = await fetch(`${ARCGIS_CASE_LAYER_URL}/query?${params.toString()}`, {
      headers: { "User-Agent": "HantaER/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`ArcGIS stats fetch failed: HTTP ${res.status}`);
    }

    const payload = (await res.json()) as {
      features?: Array<{ attributes?: { STATUS?: string; count?: number } }>;
      error?: { message?: string };
    };

    if (payload.error) {
      throw new Error(payload.error.message ?? "ArcGIS query returned an error");
    }

    let deceased = 0;
    let confirmed = 0;
    let suspected = 0;
    let monitoring = 0;

    for (const feature of payload.features ?? []) {
      const status = (feature.attributes?.STATUS ?? "").toUpperCase().trim();
      const count = Number(feature.attributes?.count ?? 0);
      if (!Number.isFinite(count) || count < 0) continue;

      if (status === "DECEASED") deceased += count;
      else if (status === "CONFIRMED") confirmed += count;
      else if (status === "SUSPECTED") suspected += count;
      else if (status === "MONITORING") monitoring += count;
    }

    return {
      deceased,
      confirmed,
      suspected,
      monitoring,
      total: deceased + confirmed + suspected + monitoring,
      fetchedAt,
      source: ARCGIS_CASE_LAYER_URL,
    };
  },
);

export const getArcgisCasePoints = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ points: ArcgisCasePoint[]; fetchedAt: string; source: string }> => {
    const fetchedAt = new Date().toISOString();
    const params = new URLSearchParams({
      where: "1=1",
      outFields: "OBJECTID,CASE_,STATUS,LASTLOCATION,DETAILS",
      returnGeometry: "true",
      outSR: "4326",
      f: "json",
    });

    const res = await fetch(`${ARCGIS_CASE_LAYER_URL}/query?${params.toString()}`, {
      headers: { "User-Agent": "HantaER/1.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) {
      throw new Error(`ArcGIS points fetch failed: HTTP ${res.status}`);
    }

    const payload = (await res.json()) as {
      features?: Array<{
        attributes?: {
          OBJECTID?: number;
          CASE_?: number;
          STATUS?: string;
          LASTLOCATION?: string;
          DETAILS?: string;
        };
        geometry?: { x?: number; y?: number };
      }>;
      error?: { message?: string };
    };

    if (payload.error) {
      throw new Error(payload.error.message ?? "ArcGIS points query returned an error");
    }

    const points: ArcgisCasePoint[] = [];
    for (const feature of payload.features ?? []) {
      const objectId = Number(feature.attributes?.OBJECTID ?? NaN);
      const lat = Number(feature.geometry?.y ?? NaN);
      const lng = Number(feature.geometry?.x ?? NaN);
      if (!Number.isFinite(objectId) || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;

      const caseNumberRaw = Number(feature.attributes?.CASE_);
      points.push({
        id: objectId,
        caseNumber: Number.isFinite(caseNumberRaw) ? caseNumberRaw : null,
        status: (feature.attributes?.STATUS ?? "").toUpperCase().trim(),
        lastLocation: (feature.attributes?.LASTLOCATION ?? "").trim(),
        details: (feature.attributes?.DETAILS ?? "").trim(),
        lat,
        lng,
      });
    }

    return {
      points,
      fetchedAt,
      source: ARCGIS_CASE_LAYER_URL,
    };
  },
);

export const getLiveHantaNews = createServerFn({ method: "GET" }).handler(
  async (): Promise<{
    items: LiveNewsItem[];
    fetchedAt: string;
    sources: number;
    sourceHealth: SourceHealth[];
  }> => {
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

    // de-dupe by canonicalized event signature and keep best-quality evidence per event
    const uniqueByEvent = new Map<string, LiveNewsItem>();
    for (const item of results) {
      const key = newsEventKey(item);
      const existing = uniqueByEvent.get(key);
      uniqueByEvent.set(key, existing ? keepPreferredItem(existing, item) : item);
    }

    const unique = Array.from(uniqueByEvent.values());

    unique.sort((a, b) => b.iso.localeCompare(a.iso));

    return {
      items: unique.slice(0, 12),
      fetchedAt: new Date().toISOString(),
      sources: FEEDS.length,
      sourceHealth,
    };
  },
);
