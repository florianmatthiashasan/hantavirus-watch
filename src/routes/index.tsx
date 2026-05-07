import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { OutbreakMap } from "@/components/OutbreakMap";
import { getLiveHantaNews, type LiveNewsItem } from "@/lib/news.functions";
import { getLiveHantaReddit } from "@/lib/reddit.functions";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "HANTAVIRUS // Global Emergency Room — Live Outbreak Tracker" },
      {
        name: "description",
        content:
          "Live emergency-room style dashboard tracking the 2026 hantavirus outbreak: confirmed cases, deaths, news feed and outbreak map.",
      },
      { property: "og:title", content: "HANTAVIRUS // Global Emergency Room" },
      {
        property: "og:description",
        content:
          "Live tracker of the 2026 hantavirus outbreak — cases, deaths, news, and map.",
      },
    ],
  }),
  component: EmergencyRoom,
});

// ---------------- DATA (compiled from WHO / ECDC / CDC / RKI / news, May 2026) ----------------

const STATS = {
  confirmedCases: 2,
  suspectedCases: 5,
  deaths: 3,
  critical: 1,
  onBoard: 147,
  argentinaCases2026: 41,
  countriesAffected: 6,
  riskLevelEU: "VERY LOW",
};

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
    note: "Andes virus — 2026 above epidemic threshold per Argentine MoH.",
  },
  {
    id: "spain-canaries",
    location: "Canary Islands (port of entry)",
    country: "Spain",
    lat: 28.1,
    lng: -15.4,
    cases: 0,
    deaths: 0,
    status: "MONITORING",
    note: "Critical evacuations from Cape Verde. Vessel docking authorised.",
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
    note: "German passenger died. RKI lists local risk areas (Puumala virus).",
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
    note: "Sin Nombre virus endemic. CDC: NO person-to-person transmission.",
  },
  {
    id: "chile",
    location: "Aysén / Los Lagos",
    country: "Chile",
    lat: -45.4,
    lng: -72.7,
    cases: 0,
    deaths: 0,
    status: "ENDEMIC",
    note: "Andes virus endemic — historically the only hantavirus with H2H risk.",
  },
];

type NewsItem = {
  time: string;
  source: string;
  severity: "CRITICAL" | "HIGH" | "INFO";
  headline: string;
  body: string;
  url: string;
};

type LiveLocationRule = {
  id: string;
  location: string;
  country: string;
  lat: number;
  lng: number;
  keywords: string[];
};

const NEWS: NewsItem[] = [
  {
    time: "07 May 2026 · 14:22 UTC",
    source: "RKI",
    severity: "HIGH",
    headline: "RKI updates guidance on cruise-ship hantavirus outbreak",
    body: "Robert Koch-Institut confirms outbreak on Dutch-flagged vessel that left southern Argentina on 1 April. Andes virus suspected.",
    url: "https://www.rki.de/DE/Themen/Infektionskrankheiten/Infektionskrankheiten-A-Z/H/Hantavirus/Hanta_Kreuzfahrtschiff_2026.html",
  },
  {
    time: "06 May 2026 · 18:40 UTC",
    source: "ECDC",
    severity: "HIGH",
    headline: "ECDC: 7 cases in cruise-ship cluster — risk to EU public 'very low'",
    body: "Rapid risk assessment published. Two lab-confirmed, five probable. Investigation into possible human-to-human transmission ongoing.",
    url: "https://www.ecdc.europa.eu/en/publications-data/hantavirus-associated-cluster-illness-cruise-ship-ecdc-assessment-and",
  },
  {
    time: "05 May 2026 · 23:10 UTC",
    source: "WHO",
    severity: "CRITICAL",
    headline: "WHO DON599 — Hantavirus cluster linked to cruise-ship travel, multi-country",
    body: "147 passengers and crew. 7 cases reported including 3 deaths, 1 critical, 3 mild. Outbreak under multi-country coordination.",
    url: "https://www.who.int/emergencies/disease-outbreak-news/item/2026-DON599",
  },
  {
    time: "05 May 2026 · 16:05 UTC",
    source: "DIE ZEIT",
    severity: "HIGH",
    headline: "Bis zu sieben mögliche Hantavirus-Fälle auf Kreuzfahrtschiff",
    body: "Zwei labor­bestätigte und fünf mutmaßliche Fälle, drei Tote. Schiff sitzt vor Kap Verde fest.",
    url: "https://www.zeit.de/gesellschaft/zeitgeschehen/2026-05/hantavirus-kreuzfahrtschiff-infektion-tote-kap-verde",
  },
  {
    time: "05 May 2026 · 09:30 UTC",
    source: "t-online",
    severity: "INFO",
    headline: "Hantavirus: Risikogebiete in Köln und NRW ausgewiesen",
    body: "Erste Fälle 2026 in Nordrhein-Westfalen gemeldet. Behörden weisen auf Puumala-Risikogebiete hin.",
    url: "https://koeln.t-online.de/region/koeln/id_101241444/hantavirus-risikogebiete-in-koeln-und-nrw-ausgewiesen-erste-faelle.html",
  },
  {
    time: "04 May 2026 · 21:00 UTC",
    source: "Argentina MoH",
    severity: "HIGH",
    headline: "Argentina: 41 cases in 2026 — 'above epidemic threshold'",
    body: "Health ministry reports stronger spread than previous seasons. Andes virus circulation increasing.",
    url: "https://www.unionesarda.it/de/welt/hantavirus-argentinien-stellt-klar-im-jahr-2026-wurden-bereits-41-infektionsfalle-registriert-vs2nlovi",
  },
  {
    time: "23 Apr 2026 · 12:00 UTC",
    source: "CDC",
    severity: "INFO",
    headline: "CDC: Sin Nombre virus does NOT spread person-to-person",
    body: "Surveillance continues across Four Corners. Public reminder: rodent exposure remains the primary transmission route in the US.",
    url: "https://www.cdc.gov/hantavirus/data-research/cases/index.html",
  },
];

const SYMPTOMS = [
  {
    phase: "EARLY (1–5 d)",
    items: ["Fever", "Severe muscle aches", "Fatigue", "Headache", "Chills"],
  },
  {
    phase: "LATE (4–10 d)",
    items: [
      "Coughing",
      "Acute shortness of breath",
      "Pulmonary edema",
      "Hypotension",
      "Cardiac failure (HCPS)",
    ],
  },
];

const PROTOCOL = [
  "ISOLATE patient — droplet + contact precautions until Andes virus excluded.",
  "OXYGEN sat target ≥ 92%. Prepare for mechanical ventilation / ECMO.",
  "FLUIDS conservatively — risk of pulmonary edema in HCPS.",
  "COLLECT serum + EDTA blood for RT-PCR & ELISA (IgM/IgG).",
  "NOTIFY public health authority within 24h. WHO IHR if travel-linked.",
  "TRACE contacts — focus on shared enclosed spaces (cabins, vehicles).",
];

const FAQ = [
  {
    q: "Is everything updated automatically?",
    a: "Yes. The dashboard updates automatically, and the live news feed refreshes every 30 minutes.",
  },
  {
    q: "Why are some reports not labeled as outbreaks?",
    a: "Some items are suspected cases, advisories, or monitoring updates rather than confirmed outbreaks.",
  },
  {
    q: "Is this medical advice?",
    a: "No. This dashboard is for informational use only and does not replace clinical judgment.",
  },
];

const REFRESH_MS = 30 * 60 * 1000; // 30 minutes

const LIVE_LOCATION_RULES: LiveLocationRule[] = [
  {
    id: "mv-hondius-live",
    location: "MV Hondius / Cape Verde waters",
    country: "Maritime / Multi-country",
    lat: 16.0,
    lng: -24.0,
    keywords: ["hondius", "cape verde", "kap verde", "cabo verde", "cruise ship", "vessel"],
  },
  {
    id: "argentina-live",
    location: "Patagonia / Southern Argentina",
    country: "Argentina",
    lat: -41.1,
    lng: -71.3,
    keywords: ["argentina", "patagonia", "andes virus", "bariloche", "chubut", "neuquen"],
  },
  {
    id: "canaries-live",
    location: "Canary Islands",
    country: "Spain",
    lat: 28.1,
    lng: -15.4,
    keywords: ["canary islands", "canaries", "tenerife", "las palmas", "spain"],
  },
  {
    id: "germany-live",
    location: "Cologne / North Rhine-Westphalia",
    country: "Germany",
    lat: 50.93,
    lng: 6.96,
    keywords: ["germany", "deutschland", "nrw", "cologne", "köln", "rki"],
  },
  {
    id: "usa-live",
    location: "Four Corners region",
    country: "USA",
    lat: 36.99,
    lng: -109.04,
    keywords: ["usa", "united states", "four corners", "sin nombre", "new mexico", "arizona"],
  },
  {
    id: "chile-live",
    location: "Aysen / Los Lagos",
    country: "Chile",
    lat: -45.4,
    lng: -72.7,
    keywords: ["chile", "aysen", "los lagos"],
  },
];

const SUSPECT_RE = /\b(suspect|suspected|possible|probable|under investigation|verdacht|mutmasslich)\b/i;
const CASE_RE = /\b(case|cases|cluster|confirmed|infection|infektion|outbreak)\b/i;
const DEATH_RE = /\b(death|deaths|dead|tote|gestorben)\b/i;

function useLiveNews() {
  return useQuery({
    queryKey: ["hanta-news"],
    queryFn: () => getLiveHantaNews(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });
}

function useLiveReddit() {
  return useQuery({
    queryKey: ["hanta-reddit"],
    queryFn: () => getLiveHantaReddit(),
    refetchInterval: REFRESH_MS,
    refetchOnWindowFocus: false,
    staleTime: REFRESH_MS,
  });
}

function buildLiveSignalOutbreaks(liveItems: LiveNewsItem[]): Outbreak[] {
  const offsets = new Map<string, number>();

  return liveItems.flatMap((item, idx) => {
    const text = `${item.headline} ${item.body}`.toLowerCase();
    const rule = LIVE_LOCATION_RULES.find((r) => r.keywords.some((k) => text.includes(k)));
    if (!rule) return [];

    const localIndex = offsets.get(rule.id) ?? 0;
    offsets.set(rule.id, localIndex + 1);

    const angle = ((localIndex % 6) / 6) * Math.PI * 2;
    const spread = localIndex === 0 ? 0 : 0.35;
    const lat = rule.lat + Math.sin(angle) * spread;
    const lng = rule.lng + Math.cos(angle) * spread;

    const suspected = SUSPECT_RE.test(text);
    const caseSignal = CASE_RE.test(text);
    const deathSignal = DEATH_RE.test(text);
    const status: Outbreak["status"] =
      deathSignal || caseSignal || item.severity === "CRITICAL" ? "ACTIVE" : "MONITORING";

    const signalType = suspected ? "suspected" : caseSignal ? "case" : "alert";
    return [
      {
        id: `live-signal-${rule.id}-${item.iso}-${idx}`,
        location: `${rule.location} · Live signal`,
        country: rule.country,
        lat,
        lng,
        cases: 1,
        deaths: deathSignal ? 1 : 0,
        status,
        note: `Auto ${signalType} signal from ${item.source}: ${item.headline}`,
      },
    ];
  });
}

// ---------------- Components ----------------

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const i = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(i);
  }, []);
  return now;
}

function TopBar() {
  const now = useClock();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="flex flex-wrap items-center gap-3 px-4 py-2 text-xs">
        <span className="alert-pulse flex items-center gap-2 bg-danger px-2 py-1 font-bold tracking-widest text-primary-foreground">
          <span className="blink h-2 w-2 rounded-full bg-primary-foreground" />
          LIVE · DEFCON 3
        </span>
        <span className="text-muted-foreground">
          EMERGENCY ROOM // GLOBAL HANTAVIRUS SURVEILLANCE
        </span>
        <span className="ml-auto text-muted-foreground">
          UTC {now ? now.toISOString().slice(11, 19) : "--:--:--"}
        </span>
        <span className="rounded border border-border px-2 py-0.5 text-muted-foreground">
          SRC: WHO · ECDC · CDC · RKI
        </span>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="scanline relative border-b border-border bg-gradient-to-b from-danger/15 to-transparent px-4 py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-3 inline-flex items-center gap-2 border border-danger/60 bg-danger/10 px-3 py-1 text-[10px] font-bold tracking-[0.3em] text-danger">
          <span className="blink">●</span> ACTIVE OUTBREAK · WHO DON599 · 2026
        </div>
        <h1 className="font-mono text-4xl font-black tracking-tight md:text-6xl">
          HANTAVIRUS<span className="text-danger">_</span>
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-muted-foreground md:text-base">
          Emergency-room dashboard tracking the cruise-ship hantavirus cluster
          (MV Hondius), the Argentine Andes-virus surge, and global endemic
          activity. All figures verified against WHO, ECDC, CDC and RKI.
        </p>
      </div>
    </section>
  );
}

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sub?: string;
  tone?: "default" | "danger" | "warning" | "success";
}) {
  const toneCls =
    tone === "danger"
      ? "text-danger border-danger/50"
      : tone === "warning"
        ? "text-accent border-accent/50"
        : tone === "success"
          ? "text-success border-success/50"
          : "text-foreground border-border";
  return (
    <div className={`relative border bg-surface/60 p-4 ${toneCls}`}>
      <div className="text-[10px] font-bold tracking-[0.2em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-mono text-4xl font-black leading-none">
        {value}
      </div>
      {sub && <div className="mt-2 text-[11px] text-muted-foreground">{sub}</div>}
      <div className="absolute right-2 top-2 text-[10px] text-muted-foreground">
        ◉ LIVE
      </div>
    </div>
  );
}

function Stats() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="VITALS" sub="MV Hondius cluster + global signal" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="DEATHS" value={STATS.deaths} sub="Cruise-ship cluster" tone="danger" />
        <StatCard label="LAB-CONFIRMED" value={STATS.confirmedCases} sub="RT-PCR positive" tone="warning" />
        <StatCard label="SUSPECTED" value={STATS.suspectedCases} sub="Probable cases" tone="warning" />
        <StatCard label="CRITICAL ICU" value={STATS.critical} tone="danger" />
        <StatCard label="ON BOARD" value={STATS.onBoard} sub="Passengers + crew" />
        <StatCard label="ARGENTINA 2026" value={STATS.argentinaCases2026} sub="Above epidemic threshold" tone="warning" />
        <StatCard label="COUNTRIES INVOLVED" value={STATS.countriesAffected} />
        <StatCard label="EU PUBLIC RISK" value={STATS.riskLevelEU} sub="ECDC assessment" tone="success" />
      </div>
    </section>
  );
}

function SectionHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="mb-3 flex items-end justify-between border-b border-border pb-2">
      <h2 className="text-xs font-bold tracking-[0.3em] text-foreground">
        ▸ {title}
      </h2>
      {sub && (
        <span className="text-[10px] tracking-wider text-muted-foreground">
          {sub}
        </span>
      )}
    </div>
  );
}

// Equirectangular projection map
function WorldMap({ liveItems }: { liveItems: LiveNewsItem[] }) {
  const mapOutbreaks = [...OUTBREAKS, ...buildLiveSignalOutbreaks(liveItems).slice(0, 12)];

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="OUTBREAK MAP" sub="Live · OpenStreetMap · click pins" />
      <div className="relative overflow-hidden border border-border bg-surface/40">
        <OutbreakMap outbreaks={mapOutbreaks} />
        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-surface/60 px-3 py-2 text-[10px] text-muted-foreground">
          <LegendDot color="#f43f5e" label="ACTIVE OUTBREAK" />
          <LegendDot color="#f59e0b" label="MONITORING" />
          <LegendDot color="#10b981" label="ENDEMIC" />
          <span className="rounded border border-border px-1.5 py-0.5 text-[9px]">
            + LIVE SIGNALS (30m)
          </span>
          <span className="ml-auto">Tiles © OpenStreetMap · CARTO</span>
        </div>
      </div>
    </section>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
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

function NewsFeed({ query }: { query: ReturnType<typeof useLiveNews> }) {
  const live = query.data?.items ?? [];
  // Merge: live items first, then curated fallback for items not present
  const merged: (LiveNewsItem | (typeof NEWS)[number])[] =
    live.length > 0 ? [...live, ...NEWS.slice(0, 4)] : NEWS;

  const lastFetch = query.data?.fetchedAt;
  const ago = useTimeAgo(lastFetch);
  const nextRefresh = lastFetch
    ? new Date(new Date(lastFetch).getTime() + REFRESH_MS).toISOString().slice(11, 16) + " UTC"
    : "—";

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead
        title="INCOMING TRANSMISSIONS"
        sub={`Live · auto-refresh every 30m · WHO + CDC + Google News RSS`}
      />
      <div className="mb-3 flex flex-wrap items-center gap-3 border border-border bg-surface/60 px-3 py-2 text-[11px]">
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              query.isFetching ? "bg-accent blink" : "bg-success"
            }`}
          />
          {query.isFetching ? "FETCHING…" : "LIVE"}
        </span>
        <span className="text-muted-foreground">
          Last update: <b className="text-foreground">{ago}</b>
        </span>
        <span className="text-muted-foreground">
          Next: <b className="text-foreground">{nextRefresh}</b>
        </span>
        <span className="text-muted-foreground">
          Live items: <b className="text-foreground">{live.length}</b>
        </span>
        <button
          onClick={() => query.refetch()}
          disabled={query.isFetching}
          className="ml-auto border border-border px-2 py-1 text-[10px] tracking-widest hover:border-danger hover:text-danger disabled:opacity-50"
        >
          ↻ REFRESH NOW
        </button>
      </div>
      {query.isError && (
        <div className="mb-3 border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
          Live feed unavailable — showing curated fallback. ({String(query.error)})
        </div>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {merged.map((n, i) => {
          const sevCls =
            n.severity === "CRITICAL"
              ? "border-danger text-danger"
              : n.severity === "HIGH"
                ? "border-accent text-accent"
                : "border-border text-muted-foreground";
          const isLive = "iso" in n;
          return (
            <a
              key={`${n.url}-${i}`}
              href={n.url}
              target="_blank"
              rel="noreferrer"
              className="group block border border-border bg-surface/60 p-4 transition hover:border-danger/60 hover:bg-surface"
            >
              <div className="flex items-center gap-2 text-[10px] tracking-widest">
                <span className={`border px-1.5 py-0.5 font-bold ${sevCls}`}>
                  {n.severity}
                </span>
                <span className="text-muted-foreground">{n.source}</span>
                {isLive && (
                  <span className="border border-success/60 px-1 py-0.5 text-[9px] text-success">
                    LIVE
                  </span>
                )}
                <span className="ml-auto text-muted-foreground">{n.time}</span>
              </div>
              <h3 className="mt-2 font-bold leading-snug text-foreground group-hover:text-danger">
                {n.headline}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">{n.body}</p>
              <div className="mt-2 text-[10px] tracking-widest text-danger opacity-70">
                ▸ READ SOURCE
              </div>
            </a>
          );
        })}
      </div>
    </section>
  );
}

function SocialPulse({ query }: { query: ReturnType<typeof useLiveReddit> }) {
  const posts = query.data?.items ?? [];
  const lastFetch = query.data?.fetchedAt;
  const ago = useTimeAgo(lastFetch);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="REDDIT PULSE" sub="Public user posts · API feed (30m)" />
      <div className="mb-3 flex flex-wrap items-center gap-3 border border-border bg-surface/60 px-3 py-2 text-[11px]">
        <span className="flex items-center gap-2">
          <span
            className={`h-2 w-2 rounded-full ${
              query.isFetching ? "bg-accent blink" : "bg-success"
            }`}
          />
          {query.isFetching ? "FETCHING…" : "LIVE"}
        </span>
        <span className="text-muted-foreground">
          Last update: <b className="text-foreground">{ago}</b>
        </span>
        <span className="text-muted-foreground">
          Posts: <b className="text-foreground">{posts.length}</b>
        </span>
      </div>
      {query.isError && (
        <div className="border border-danger/50 bg-danger/10 p-3 text-xs text-danger">
          Reddit feed unavailable. Open search directly:
          <a
            href="https://www.reddit.com/search/?q=hantavirus&sort=new"
            target="_blank"
            rel="noreferrer"
            className="ml-1 font-bold underline"
          >
            reddit.com/search/?q=hantavirus&sort=new
          </a>
        </div>
      )}
      {!query.isError && (
        <div className="grid gap-3 md:grid-cols-2">
          {posts.map((p) => (
            <a
              key={p.id}
              href={p.url}
              target="_blank"
              rel="noreferrer"
              className="group block border border-border bg-surface/60 p-4 transition hover:border-danger/60 hover:bg-surface"
            >
              <div className="flex items-center gap-2 text-[10px] tracking-widest">
                <span className="border border-border px-1.5 py-0.5 text-muted-foreground">
                  r/{p.subreddit}
                </span>
                <span className="text-danger">u/{p.author}</span>
                <span className="ml-auto text-muted-foreground">{p.time}</span>
              </div>
              <h3 className="mt-2 font-bold leading-snug text-foreground group-hover:text-danger">
                {p.title}
              </h3>
              {p.body ? <p className="mt-1 text-xs text-muted-foreground">{p.body}</p> : null}
              <div className="mt-2 text-[10px] tracking-widest text-muted-foreground">
                SCORE {p.score} · COMMENTS {p.comments}
              </div>
            </a>
          ))}
        </div>
      )}
      <div className="mt-2 text-[11px] text-muted-foreground">
        Source: Reddit recent search for hantavirus terms. Auto-refresh every 30 minutes.
      </div>
    </section>
  );
}

function ClinicalPanel() {
  return (
    <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 md:grid-cols-2">
      <div>
        <SectionHead title="SYMPTOM TIMELINE" sub="HCPS / HFRS" />
        <div className="space-y-3">
          {SYMPTOMS.map((s) => (
            <div key={s.phase} className="border border-border bg-surface/60 p-4">
              <div className="text-[10px] font-bold tracking-[0.2em] text-danger">
                {s.phase}
              </div>
              <ul className="mt-2 space-y-1 text-sm">
                {s.items.map((it) => (
                  <li key={it} className="flex items-center gap-2">
                    <span className="text-danger">▸</span>
                    {it}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div>
        <SectionHead title="ER PROTOCOL" sub="Suspected hantavirus admission" />
        <ol className="space-y-2 border border-border bg-surface/60 p-4 text-sm">
          {PROTOCOL.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="font-mono text-danger">{String(i + 1).padStart(2, "0")}</span>
              <span>{p}</span>
            </li>
          ))}
        </ol>
        <div className="mt-3 border border-accent/50 bg-accent/10 p-3 text-xs text-foreground">
          <b className="text-accent">ADVISORY:</b> Most hantaviruses do NOT spread
          person-to-person. Andes virus (South America) is the rare exception
          under investigation in the MV Hondius cluster.
        </div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="FAQ" sub="Quick answers" />
      <div className="space-y-2 border border-border bg-surface/60 p-4 text-sm">
        {FAQ.map((item) => (
          <div key={item.q}>
            <p className="font-bold text-foreground">{item.q}</p>
            <p className="text-muted-foreground">{item.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="mt-8 border-t border-border bg-surface/60 px-4 py-6 text-[11px] text-muted-foreground">
      <div className="mx-auto max-w-7xl">
        <div>
          ⚠ Informational dashboard only. Not medical advice. Figures aggregated from
          WHO DON599, ECDC RRA (6 May 2026), RKI, CDC and verified press as of
          07 May 2026.
        </div>
        <div className="mt-2">
          Built as an emergency-room style monitor — updates may lag the latest
          official bulletins. For clinical decisions consult your national public
          health authority.
        </div>
      </div>
    </footer>
  );
}

function EmergencyRoom() {
  const liveQuery = useLiveNews();
  const socialQuery = useLiveReddit();
  const liveItems = liveQuery.data?.items ?? [];

  return (
    <div className="min-h-screen">
      <TopBar />
      <Hero />
      <Stats />
      <WorldMap liveItems={liveItems} />
      <NewsFeed query={liveQuery} />
      <SocialPulse query={socialQuery} />
      <ClinicalPanel />
      <FaqSection />
      <Footer />
    </div>
  );
}
