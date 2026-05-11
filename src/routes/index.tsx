import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, MapPin, Plane, Ship } from "lucide-react";
import { OutbreakMap } from "@/components/OutbreakMap";
import {
  getArcgisCasePoints,
  getArcgisCaseStats,
  type ArcgisCasePoint,
  getLiveHantaNews,
  type ArcgisCaseStats,
  type LiveNewsItem,
} from "@/lib/news.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hantavirus Monitor — Outbreak Surveillance Dashboard" },
      {
        name: "description",
        content:
          "Real-time hantavirus surveillance dashboard with alerts, map signals, public pulse and ER protocol.",
      },
      { property: "og:title", content: "Hantavirus Monitor" },
      {
        property: "og:description",
        content:
          "Real-time outbreak surveillance with alert feed, transmissions, map markers and protocol guidance.",
      },
    ],
  }),
  component: HantavirusMonitor,
});

type Outbreak = {
  id: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  cases: number;
  deaths: number;
  status: "ACTIVE" | "MONITORING" | "ENDEMIC";
  note: string;
};

type LocationRule = {
  id: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  keywords: string[];
};

const OUTBREAKS: Outbreak[] = [
  {
    id: "mv-hondius",
    location: "MV Hondius — off Cape Verde",
    country: "Maritime / Multi-country",
    lat: 16.0,
    lng: -24.0,
    cases: 7,
    deaths: 3,
    status: "ACTIVE",
    note: "Cluster aboard Dutch-flagged cruise ship. WHO DON599. 147 on board.",
  },
  {
    id: "argentina",
    location: "Patagonia / Southern Argentina",
    country: "Argentina",
    lat: -41.1,
    lng: -71.3,
    cases: 41,
    deaths: 0,
    status: "ACTIVE",
    note: "Andes virus activity above seasonal baseline.",
  },
  {
    id: "canaries",
    location: "Canary Islands",
    country: "Spain",
    lat: 28.1,
    lng: -15.4,
    cases: 0,
    deaths: 0,
    status: "MONITORING",
    note: "Port-of-entry monitoring and travel-linked observation.",
  },
  {
    id: "germany-nrw",
    location: "Cologne / North Rhine-Westphalia",
    country: "Germany",
    lat: 50.93,
    lng: 6.96,
    cases: 0,
    deaths: 1,
    status: "MONITORING",
    note: "Regional risk-area advisories in effect.",
  },
  {
    id: "usa-fourcorners",
    location: "Four Corners region",
    country: "USA",
    lat: 36.99,
    lng: -109.04,
    cases: 0,
    deaths: 0,
    status: "ENDEMIC",
    note: "Endemic zone. Ongoing baseline surveillance.",
  },
  {
    id: "chile",
    location: "Aysen / Los Lagos",
    country: "Chile",
    lat: -45.4,
    lng: -72.7,
    cases: 0,
    deaths: 0,
    status: "ENDEMIC",
    note: "Known endemic area with continuous public health monitoring.",
  },
];

const LIVE_LOCATION_RULES: LocationRule[] = [
  {
    id: "cape-verde",
    location: "MV Hondius — off Cape Verde",
    country: "Maritime / Multi-country",
    lat: 16.0,
    lng: -24.0,
    keywords: ["hondius", "cape verde", "kap verde", "cruise", "vessel", "ship"],
  },
  {
    id: "argentina",
    location: "Patagonia / Southern Argentina",
    country: "Argentina",
    lat: -41.1,
    lng: -71.3,
    keywords: ["argentina", "patagonia", "andes virus", "bariloche", "chubut", "neuquen"],
  },
  {
    id: "canaries",
    location: "Canary Islands",
    country: "Spain",
    lat: 28.1,
    lng: -15.4,
    keywords: ["canary", "canaries", "tenerife", "las palmas", "spain"],
  },
  {
    id: "germany-nrw",
    location: "Cologne / North Rhine-Westphalia",
    country: "Germany",
    lat: 50.93,
    lng: 6.96,
    keywords: ["germany", "deutschland", "nrw", "cologne", "koln", "köln"],
  },
  {
    id: "usa-fourcorners",
    location: "Four Corners region",
    country: "USA",
    lat: 36.99,
    lng: -109.04,
    keywords: ["usa", "united states", "four corners", "sin nombre", "new mexico", "arizona"],
  },
  {
    id: "chile",
    location: "Aysen / Los Lagos",
    country: "Chile",
    lat: -45.4,
    lng: -72.7,
    keywords: ["chile", "aysen", "los lagos"],
  },
];

const FALLBACK_NEWS: LiveNewsItem[] = [
  {
    time: "07 May 2026 · 14:22 UTC",
    iso: "2026-05-07T14:22:00.000Z",
    source: "RKI",
    sourceType: "OFFICIAL",
    severity: "HIGH",
    headline: "RKI updates guidance on cruise-ship hantavirus outbreak",
    body: "Andes virus remains under investigation in a travel-linked cluster.",
    url: "https://www.rki.de/DE/Themen/Infektionskrankheiten/Infektionskrankheiten-A-Z/H/Hantavirus/Hanta_Kreuzfahrtschiff_2026.html",
    caseStatus: "PROBABLE",
    confidenceScore: 90,
    confidenceLabel: "HIGH",
    signalReason: "official update",
    lastVerifiedAt: "2026-05-07T14:22:00.000Z",
  },
  {
    time: "06 May 2026 · 18:40 UTC",
    iso: "2026-05-06T18:40:00.000Z",
    source: "ECDC",
    sourceType: "OFFICIAL",
    severity: "HIGH",
    headline: "ECDC publishes risk assessment for multi-country cluster",
    body: "Two confirmed and several probable cases in outbreak-linked travel group.",
    url: "https://www.ecdc.europa.eu/en/publications-data/hantavirus-associated-cluster-illness-cruise-ship-ecdc-assessment-and",
    caseStatus: "CONFIRMED",
    confidenceScore: 96,
    confidenceLabel: "HIGH",
    signalReason: "official risk bulletin",
    lastVerifiedAt: "2026-05-06T18:40:00.000Z",
  },
  {
    time: "05 May 2026 · 23:10 UTC",
    iso: "2026-05-05T23:10:00.000Z",
    source: "WHO",
    sourceType: "OFFICIAL",
    severity: "CRITICAL",
    headline: "WHO DON599 reports hantavirus cluster linked to cruise travel",
    body: "Multi-country coordination active with deaths and critical cases reported.",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON599",
    caseStatus: "CONFIRMED",
    confidenceScore: 96,
    confidenceLabel: "HIGH",
    signalReason: "official outbreak notification",
    lastVerifiedAt: "2026-05-05T23:10:00.000Z",
  },
];

const SYMPTOM_PHASES = [
  {
    phase: "Early phase",
    tone: "amber",
    items: ["Fever", "Severe muscle aches", "Fatigue", "Headache", "Chills", "Nausea"],
  },
  {
    phase: "Late phase",
    tone: "red",
    items: [
      "Coughing",
      "Shortness of breath",
      "Pulmonary edema",
      "Hypotension",
      "Respiratory failure",
      "Shock",
    ],
  },
] as const;

const ER_PROTOCOL = [
  "Isolate patient and apply droplet/contact precautions.",
  "Stabilize oxygenation and monitor respiratory decline.",
  "Collect serum and EDTA blood for RT-PCR and serology.",
  "Notify local public health authority within 24 hours.",
  "Start contact tracing for enclosed-space exposures.",
];

const FAQ_ITEMS = [
  {
    q: "How often is the dashboard updated?",
    a: "It refreshes automatically every 20 minutes, and you can trigger a manual refresh anytime.",
  },
  {
    q: "Where do the sources come from?",
    a: "From official agencies (for example WHO and CDC) plus curated/public news feeds.",
  },
  {
    q: "Are social signals verified?",
    a: "No. Social signals are early indicators and should always be cross-checked against official sources.",
  },
  {
    q: "Is this medical advice?",
    a: "No. This is a monitoring dashboard and does not replace clinical judgment.",
  },
];

const RISK_POSTURE = {
  publicFearLevel: "Low panic risk — stay alert",
  who: "WHO: Elevated monitoring for travel-linked clusters.",
  eu: "EU / ECDC: Current public risk remains very low for the general population.",
  cdc: "CDC: Rodent exposure remains primary risk; no broad sustained person-to-person spread.",
};

const REFRESH_MS = 20 * 60 * 1000;
const DISCLAIMER_STORAGE_KEY = "hanta-disclaimer-accepted";
const DISCLAIMER_ACCEPTED_VALUE = "v1";

function trackAnalyticsEvent(
  eventName: string,
  params: Record<string, string | number | boolean> = {},
) {
  if (typeof window === "undefined") return;
  const maybeGtag = (window as Window & { gtag?: (...args: unknown[]) => void }).gtag;
  if (typeof maybeGtag !== "function") return;
  maybeGtag("event", eventName, params);
}

function useLiveNews() {
  return useQuery({
    queryKey: ["hanta-news"],
    queryFn: () => getLiveHantaNews(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });
}

function useArcgisCaseStats() {
  return useQuery({
    queryKey: ["arcgis-case-stats"],
    queryFn: () => getArcgisCaseStats(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });
}

function useArcgisCasePoints() {
  return useQuery({
    queryKey: ["arcgis-case-points"],
    queryFn: () => getArcgisCasePoints(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });
}

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

function useThemeMode() {
  const [mode, setMode] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = localStorage.getItem("hanta-theme");
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    const initial = saved === "dark" || saved === "light" ? saved : preferred;
    setMode(initial);
    document.documentElement.classList.toggle("dark", initial === "dark");
  }, []);

  const toggle = () => {
    setMode((prev) => {
      const next = prev === "light" ? "dark" : "light";
      document.documentElement.classList.toggle("dark", next === "dark");
      localStorage.setItem("hanta-theme", next);
      return next;
    });
  };

  return { mode, toggle };
}

function useTimeAgo(iso?: string) {
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  if (!iso) return "—";
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m ago`;
}

function levelFromNews(items: LiveNewsItem[]) {
  if (items.some((x) => x.severity === "CRITICAL" || x.caseStatus === "CONFIRMED")) {
    return "elevated" as const;
  }
  return "normal" as const;
}

function metricDelta(value: number) {
  if (value > 0) return "↑ up";
  if (value < 0) return "↓ down";
  return "— steady";
}

function statusClass(status: Outbreak["status"]) {
  if (status === "ACTIVE") return "border-danger/60 text-danger";
  if (status === "MONITORING") return "border-accent/60 text-accent";
  return "border-sky-600/50 text-sky-700 dark:text-sky-300";
}

function alertCardBorder(severity: LiveNewsItem["severity"]) {
  if (severity === "CRITICAL") return "border-l-danger";
  if (severity === "HIGH") return "border-l-accent";
  return "border-l-sky-500";
}

function severityPill(severity: LiveNewsItem["severity"]) {
  if (severity === "CRITICAL") return "bg-danger/15 text-danger border-danger/60";
  if (severity === "HIGH") return "bg-accent/15 text-accent border-accent/60";
  return "bg-sky-500/10 text-sky-700 border-sky-500/50 dark:text-sky-300";
}

function transmissionIcon(o: Outbreak) {
  if (o.location.toLowerCase().includes("mv") || o.note.toLowerCase().includes("ship")) {
    return Ship;
  }
  if (o.note.toLowerCase().includes("travel") || o.location.toLowerCase().includes("islands")) {
    return Plane;
  }
  return MapPin;
}

function isDeathSignal(item: LiveNewsItem) {
  return /death|deaths|dead|fatal|tote|gestorben/i.test(`${item.headline} ${item.body}`);
}

function isUnderObservationSignal(item: LiveNewsItem) {
  return (
    item.severity === "HIGH" ||
    item.caseStatus === "PROBABLE" ||
    item.caseStatus === "SUSPECTED" ||
    /monitor|observation|investigation|watch/i.test(`${item.headline} ${item.body}`)
  );
}

function mapRuleForItem(item: LiveNewsItem) {
  const text = `${item.headline} ${item.body}`.toLowerCase();
  return LIVE_LOCATION_RULES.find((rule) => rule.keywords.some((k) => text.includes(k)));
}

function normalizeNewsText(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function canonicalizeNewsUrl(raw: string) {
  if (!raw) return "";
  try {
    const u = new URL(raw);
    u.hash = "";
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

function newsEventKey(item: LiveNewsItem) {
  const headline = normalizeNewsText(item.headline);
  const body = normalizeNewsText(item.body).slice(0, 140);
  const url = canonicalizeNewsUrl(item.url);
  return `${headline}|${body}|${url}`;
}

function pickPreferredNewsItem(current: LiveNewsItem, next: LiveNewsItem) {
  const score = (item: LiveNewsItem) => {
    const sev = item.severity === "CRITICAL" ? 30 : item.severity === "HIGH" ? 16 : 6;
    const status =
      item.caseStatus === "CONFIRMED"
        ? 24
        : item.caseStatus === "PROBABLE"
          ? 14
          : item.caseStatus === "SUSPECTED"
            ? 6
            : 0;
    const source =
      item.sourceType === "OFFICIAL"
        ? 15
        : item.sourceType === "MEDIA"
          ? 8
          : item.sourceType === "AGGREGATOR"
            ? 3
            : 0;
    return item.confidenceScore + sev + status + source;
  };

  const currentScore = score(current);
  const nextScore = score(next);
  if (nextScore !== currentScore) return nextScore > currentScore ? next : current;
  return next.iso > current.iso ? next : current;
}

function dedupeNewsItems(items: LiveNewsItem[]) {
  const uniqueByEvent = new Map<string, LiveNewsItem>();
  for (const item of items) {
    const key = newsEventKey(item);
    const existing = uniqueByEvent.get(key);
    uniqueByEvent.set(key, existing ? pickPreferredNewsItem(existing, item) : item);
  }
  return Array.from(uniqueByEvent.values()).sort((a, b) => b.iso.localeCompare(a.iso));
}

function buildLiveMapSignals(items: LiveNewsItem[]): Outbreak[] {
  const uniqueItems = dedupeNewsItems(items);
  const bucket = new Map<
    string,
    {
      rule: LocationRule;
      cases: number;
      deaths: number;
      critical: number;
      observation: number;
    }
  >();

  for (const item of uniqueItems) {
    const rule = mapRuleForItem(item);
    if (!rule) continue;
    const current = bucket.get(rule.id) ?? {
      rule,
      cases: 0,
      deaths: 0,
      critical: 0,
      observation: 0,
    };

    current.cases += 1;
    if (isDeathSignal(item)) current.deaths += 1;
    if (item.severity === "CRITICAL" || item.caseStatus === "CONFIRMED") current.critical += 1;
    if (isUnderObservationSignal(item)) current.observation += 1;
    bucket.set(rule.id, current);
  }

  return Array.from(bucket.values()).map((x) => {
    const status: Outbreak["status"] =
      x.deaths > 0 || x.critical > 0 ? "ACTIVE" : x.observation > 0 ? "MONITORING" : "ENDEMIC";

    return {
      id: x.rule.id,
      location: x.rule.location,
      country: x.rule.country,
      lat: x.rule.lat,
      lng: x.rule.lng,
      cases: x.cases,
      deaths: x.deaths,
      status,
      note: `Live: Deaths ${x.deaths} · Critical ${x.critical} · Under observation ${x.observation}`,
    };
  });
}

function statusRank(status: Outbreak["status"]) {
  if (status === "ACTIVE") return 3;
  if (status === "MONITORING") return 2;
  return 1;
}

function mergeOutbreakData(base: Outbreak[], live: Outbreak[]) {
  const merged = new Map<string, Outbreak>(base.map((x) => [x.id, { ...x }]));

  for (const entry of live) {
    const existing = merged.get(entry.id);
    if (!existing) {
      merged.set(entry.id, entry);
      continue;
    }

    const liveDominates =
      entry.cases > 0 || entry.deaths > 0 || statusRank(entry.status) > statusRank(existing.status);
    merged.set(entry.id, {
      ...existing,
      cases: liveDominates ? entry.cases : existing.cases,
      deaths: liveDominates ? entry.deaths : existing.deaths,
      status:
        statusRank(entry.status) > statusRank(existing.status) ? entry.status : existing.status,
      note: liveDominates ? entry.note : existing.note,
    });
  }

  return Array.from(merged.values());
}

function buildArcgisMapSignals(points: ArcgisCasePoint[]): Outbreak[] {
  return points.map((point) => {
    const status = point.status.toUpperCase();
    const outbreakStatus: Outbreak["status"] =
      status === "DECEASED" || status === "CONFIRMED"
        ? "ACTIVE"
        : status === "SUSPECTED" || status === "MONITORING"
          ? "MONITORING"
          : "ENDEMIC";

    const label = point.lastLocation || "Unknown location";
    const caseLabel = point.caseNumber != null ? `Case ${point.caseNumber}` : `Case #${point.id}`;
    const detailText = point.details || "No detail provided";
    return {
      id: `arcgis-case-${point.id}`,
      location: `${label} · ${caseLabel}`,
      country: "Case feed",
      lat: point.lat,
      lng: point.lng,
      cases: 1,
      deaths: status === "DECEASED" ? 1 : 0,
      status: outbreakStatus,
      note: `Status ${status || "UNKNOWN"} · ${detailText}`,
    };
  });
}

function buildMetricCounts(items: LiveNewsItem[], arcgisStats?: ArcgisCaseStats) {
  const uniqueItems = dedupeNewsItems(items);
  const dead = arcgisStats?.deceased ?? uniqueItems.filter(isDeathSignal).length;
  const confirmed =
    arcgisStats?.confirmed ??
    uniqueItems.filter((x) => x.severity === "CRITICAL" || x.caseStatus === "CONFIRMED").length;
  const suspected =
    arcgisStats?.suspected ??
    uniqueItems.filter(
      (x) =>
        x.caseStatus === "SUSPECTED" ||
        x.caseStatus === "PROBABLE" ||
        /suspected|possible|unconfirmed|monitor|observation|investigation/i.test(
          `${x.headline} ${x.body}`,
        ),
    ).length;

  return {
    suspected,
    confirmed,
    dead,
  };
}

function Topbar({
  alertLevel,
  refreshedAt,
}: {
  alertLevel: "normal" | "elevated";
  refreshedAt?: string;
}) {
  const now = useClock();
  const { mode, toggle } = useThemeMode();
  const ago = useTimeAgo(refreshedAt);

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-sm">
        <div className="font-medium text-foreground">Hantavirus Monitor</div>
        <button
          onClick={toggle}
          className="ml-2 border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
        >
          {mode === "dark" ? "Light" : "Dark"}
        </button>
        <div className="ml-auto flex w-full flex-wrap items-center justify-start gap-2 sm:w-auto sm:justify-end sm:gap-3">
          <span className="inline-flex items-center gap-2 text-muted-foreground">
            <span className="h-2 w-2 animate-pulse rounded-full bg-danger" />
            Live {now ? now.toISOString().slice(11, 19) : "--:--:--"} UTC
          </span>
          <span className="text-muted-foreground">Updated {ago}</span>
          <span className="rounded-full border border-danger/60 bg-danger px-2 py-0.5 text-[10px] tracking-[0.08em] text-primary-foreground">
            OUTBREAK {alertLevel === "elevated" ? "ELEVATED" : "NORMAL"}
          </span>
        </div>
      </div>
    </header>
  );
}

function StatusBanner({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <section className="border-b border-danger/40 bg-danger/10">
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 text-sm text-danger">
        <AlertTriangle className="h-4 w-4" />
        Situation summary: elevated alert level due to confirmed or critical hantavirus signals.
      </div>
    </section>
  );
}

function RiskPosturePanel() {
  return (
    <section className="mx-auto max-w-7xl px-4 pt-4">
      <div className="border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-foreground">Risk posture</span>
          <span className="rounded-full border border-accent/60 bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
            {RISK_POSTURE.publicFearLevel}
          </span>
        </div>
        <div className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div>{RISK_POSTURE.who}</div>
          <div>{RISK_POSTURE.eu}</div>
          <div>{RISK_POSTURE.cdc}</div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  delta,
  tone,
  active,
  onClick,
}: {
  label: string;
  value: string | number;
  delta: number;
  tone: "red" | "amber" | "green";
  active: boolean;
  onClick: () => void;
}) {
  const toneCls =
    tone === "red"
      ? "text-danger border-danger/40"
      : tone === "amber"
        ? "text-accent border-accent/40"
        : "text-success border-success/40";

  return (
    <button
      onClick={onClick}
      className={`group w-full border bg-card p-3 text-left md:p-4 ${toneCls} ${active ? "ring-1 ring-foreground/25" : ""}`}
    >
      <div className="text-[11px] uppercase tracking-[0.06em] text-muted-foreground">{label}</div>
      <div className="mt-1 text-[24px] leading-none font-medium md:text-[26px]">{value}</div>
      <div className="mt-2 text-xs text-muted-foreground opacity-70 transition-opacity group-hover:opacity-100">
        {metricDelta(delta)}
      </div>
    </button>
  );
}

function MetricsRow({
  items,
  metricCounts,
}: {
  items: LiveNewsItem[];
  metricCounts: { suspected: number; confirmed: number; dead: number };
}) {
  type MetricKey = "suspected" | "confirmed" | "dead";
  const [selectedMetric, setSelectedMetric] = useState<MetricKey>("suspected");
  const sorted = dedupeNewsItems(items);

  const sourceMap: Record<MetricKey, { title: string; rows: LiveNewsItem[] }> = {
    suspected: {
      title: "Sources for suspected cases",
      rows: sorted.filter(
        (x) =>
          x.caseStatus === "SUSPECTED" ||
          x.caseStatus === "PROBABLE" ||
          /suspected|possible|unconfirmed|monitor|observation|investigation/i.test(
            `${x.headline} ${x.body}`,
          ),
      ),
    },
    confirmed: {
      title: "Sources for confirmed cases",
      rows: sorted.filter(
        (x) =>
          x.caseStatus === "CONFIRMED" ||
          /confirmed|lab-confirmed|positive test|pcr/i.test(`${x.headline} ${x.body}`),
      ),
    },
    dead: {
      title: "Sources for deceased cases",
      rows: sorted.filter(isDeathSignal),
    },
  };

  const selected = sourceMap[selectedMetric];
  const rows = selected.rows.length > 0 ? selected.rows.slice(0, 4) : sorted.slice(0, 4);

  return (
    <section className="mx-auto max-w-7xl px-4 py-5">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <MetricCard
          label="Suspected"
          value={metricCounts.suspected}
          delta={metricCounts.suspected}
          tone="amber"
          active={selectedMetric === "suspected"}
          onClick={() => setSelectedMetric("suspected")}
        />
        <MetricCard
          label="Confirmed"
          value={metricCounts.confirmed}
          delta={metricCounts.confirmed}
          tone="red"
          active={selectedMetric === "confirmed"}
          onClick={() => setSelectedMetric("confirmed")}
        />
        <MetricCard
          label="Dead"
          value={metricCounts.dead}
          delta={metricCounts.dead}
          tone="red"
          active={selectedMetric === "dead"}
          onClick={() => setSelectedMetric("dead")}
        />
      </div>
      <div className="mt-3 border border-border bg-card p-3">
        <div className="text-xs font-medium text-foreground">{selected.title}</div>
        <div className="mt-2 space-y-1">
          {rows.map((x) => (
            <a
              key={`${x.url}-${x.iso}`}
              href={x.url}
              target="_blank"
              rel="noreferrer"
              className="block text-xs leading-5 text-muted-foreground hover:text-foreground"
            >
              {x.source} · {x.time} · {x.headline}
            </a>
          ))}
          {rows.length === 0 && (
            <div className="text-xs text-muted-foreground">No sources found.</div>
          )}
        </div>
      </div>
    </section>
  );
}

function AlertFeed({ items }: { items: LiveNewsItem[] }) {
  return (
    <div>
      <SectionHead title="Alert feed" />
      <div className="space-y-2">
        {items.slice(0, 8).map((n) => (
          <a
            key={`${n.url}-${n.iso}`}
            href={n.url}
            target="_blank"
            rel="noreferrer"
            className={`block border border-border border-l-2 ${alertCardBorder(n.severity)} bg-card p-3`}
          >
            <div className="mb-2 flex items-start justify-between gap-2">
              <h3 className="text-[13px] font-medium leading-5 text-foreground">{n.headline}</h3>
              <span
                className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] ${severityPill(n.severity)}`}
              >
                {n.severity.toLowerCase()}
              </span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">
              {n.source} · {n.time}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function IncomingTransmissions({ outbreaks }: { outbreaks: Outbreak[] }) {
  return (
    <div>
      <SectionHead title="Incoming transmissions" />
      <div className="space-y-2">
        {outbreaks.slice(0, 5).map((o) => {
          const Icon = transmissionIcon(o);
          const statusLabel =
            o.status === "ACTIVE" ? "alert" : o.status === "MONITORING" ? "monitoring" : "tracking";
          return (
            <div
              key={o.id}
              className="flex flex-wrap items-start gap-2 border border-border bg-card p-3"
            >
              <Icon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-foreground">{o.location}</div>
                <div className="text-xs text-muted-foreground">{o.note}</div>
              </div>
              <span
                className={`rounded-full border px-2 py-0.5 text-[10px] ${statusClass(o.status)}`}
              >
                {statusLabel}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SymptomTimeline() {
  return (
    <div className="mt-4">
      <SectionHead title="Symptom timeline" />
      <div className="space-y-3">
        {SYMPTOM_PHASES.map((phase) => (
          <div key={phase.phase} className="border border-border bg-card p-3">
            <span
              className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] ${
                phase.tone === "red"
                  ? "border-danger/60 text-danger"
                  : "border-accent/60 text-accent"
              }`}
            >
              {phase.phase}
            </span>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {phase.items.map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-2 border border-border bg-background px-2 py-1 text-xs"
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      phase.tone === "red" ? "bg-danger" : "bg-accent"
                    }`}
                  />
                  {item}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function WorldMapSection({ outbreaks }: { outbreaks: Outbreak[] }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="World map" />
      <div className="relative overflow-hidden border border-border bg-card">
        <OutbreakMap outbreaks={outbreaks} />
        <div className="m-2 rounded border border-border bg-card/95 px-3 py-2 text-[11px] text-muted-foreground md:absolute md:bottom-3 md:left-3 md:m-0">
          <div className="flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-danger" /> deaths / critical
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-accent" /> under observation
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-success" /> baseline / clear
          </div>
        </div>
      </div>
    </section>
  );
}

function ERProtocol() {
  return (
    <div>
      <SectionHead title="ER protocol" />
      <div className="space-y-2">
        {ER_PROTOCOL.map((step, i) => (
          <div key={step} className="flex gap-3 border border-border bg-card p-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-border text-xs font-medium">
              {i + 1}
            </span>
            <span className="text-sm text-foreground">{step}</span>
          </div>
        ))}
      </div>
      <div className="mt-3 border border-accent/60 bg-accent/10 px-3 py-2 text-xs text-foreground">
        Not a substitute for clinical judgment.
      </div>
    </div>
  );
}

function FAQSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="FAQ" />
      <div className="space-y-2">
        {FAQ_ITEMS.map((item) => (
          <div key={item.q} className="border border-border bg-card p-3">
            <div className="text-sm font-medium text-foreground">{item.q}</div>
            <div className="mt-1 text-xs text-muted-foreground">{item.a}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SectionHead({ title }: { title: string }) {
  return (
    <div className="mb-2 border-b border-border pb-2">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
    </div>
  );
}

function DisclaimerModal({ onAccept, sources }: { onAccept: () => void; sources: number }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4">
      <div className="w-full max-w-xl border border-danger/40 bg-card p-5 shadow-2xl">
        <h1 className="text-lg font-semibold text-foreground">Important Notice</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          This dashboard is for monitoring and informational use only. It is not medical advice, not
          a diagnosis, and not a substitute for professional clinical judgment.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          Data is aggregated from official and public feeds (for example WHO, CDC, and curated news
          RSS). Content can be delayed, incomplete, or wrong.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Active feed sources right now: {sources}
        </p>
        <button
          onClick={onAccept}
          className="mt-5 inline-flex w-full items-center justify-center border border-red-700 bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
        >
          I understand and accept
        </button>
      </div>
    </div>
  );
}

function HantavirusMonitor() {
  const newsQuery = useLiveNews();
  const arcgisStatsQuery = useArcgisCaseStats();
  const arcgisPointsQuery = useArcgisCasePoints();
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState<boolean | null>(null);

  const liveItems = newsQuery.data?.items ?? [];
  const sourceItems = liveItems.length ? liveItems : FALLBACK_NEWS;
  const items = useMemo(() => dedupeNewsItems(sourceItems), [sourceItems]);
  const liveMapSignals = useMemo(() => buildLiveMapSignals(items), [items]);
  const arcgisMapSignals = useMemo(
    () => buildArcgisMapSignals(arcgisPointsQuery.data?.points ?? []),
    [arcgisPointsQuery.data?.points],
  );
  const outbreaks = useMemo(
    () => mergeOutbreakData(mergeOutbreakData(OUTBREAKS, liveMapSignals), arcgisMapSignals),
    [liveMapSignals, arcgisMapSignals],
  );
  const metricCounts = useMemo(
    () => buildMetricCounts(items, arcgisStatsQuery.data ?? undefined),
    [items, arcgisStatsQuery.data],
  );
  const alertLevel = levelFromNews(items);
  const sourceCount = newsQuery.data?.sources ?? 0;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isAccepted =
      window.localStorage.getItem(DISCLAIMER_STORAGE_KEY) === DISCLAIMER_ACCEPTED_VALUE;
    setAcceptedDisclaimer(isAccepted);

    if (!isAccepted) {
      trackAnalyticsEvent("disclaimer_view", {
        page: "home",
      });
    }
  }, []);

  useEffect(() => {
    if (acceptedDisclaimer !== false) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [acceptedDisclaimer]);

  const handleAcceptDisclaimer = () => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(DISCLAIMER_STORAGE_KEY, DISCLAIMER_ACCEPTED_VALUE);
    }
    setAcceptedDisclaimer(true);
    trackAnalyticsEvent("disclaimer_accept", {
      page: "home",
      sources: sourceCount,
    });
  };

  if (acceptedDisclaimer === null) {
    return <div className="min-h-screen bg-background" />;
  }

  if (!acceptedDisclaimer) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <DisclaimerModal onAccept={handleAcceptDisclaimer} sources={sourceCount} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Topbar alertLevel={alertLevel} refreshedAt={newsQuery.data?.fetchedAt} />
      <StatusBanner show={alertLevel === "elevated"} />
      <RiskPosturePanel />
      <MetricsRow items={items} metricCounts={metricCounts} />

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-2 md:grid-cols-2">
        <AlertFeed items={items} />
        <div>
          <IncomingTransmissions outbreaks={outbreaks} />
          <SymptomTimeline />
        </div>
      </section>

      <WorldMapSection outbreaks={outbreaks} />

      <section className="mx-auto max-w-7xl px-4 py-2">
        <ERProtocol />
      </section>
      <FAQSection />
      <footer className="mx-auto max-w-7xl px-4 pb-6 text-center text-xs text-muted-foreground">
        <a
          href="https://hasanyucedagportfolio.vercel.app/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Built by Hasan Yücedag
        </a>
        {" · "}
        <a
          href="https://buymeacoffee.com/yourdeveloperhsn"
          target="_blank"
          rel="noopener noreferrer"
          className="underline-offset-2 hover:underline"
        >
          Buy me a coffee
        </a>
      </footer>
    </div>
  );
}
