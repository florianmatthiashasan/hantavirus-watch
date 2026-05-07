import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";

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
function WorldMap() {
  const W = 1000;
  const H = 500;
  const project = (lat: number, lng: number) => ({
    x: ((lng + 180) / 360) * W,
    y: ((90 - lat) / 180) * H,
  });
  const [hover, setHover] = useState<Outbreak | null>(null);

  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="OUTBREAK MAP" sub="Real-time signal · click pins for detail" />
      <div className="relative overflow-hidden border border-border bg-surface/40">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          {/* grid */}
          {Array.from({ length: 13 }).map((_, i) => (
            <line
              key={"v" + i}
              x1={(i * W) / 12}
              y1={0}
              x2={(i * W) / 12}
              y2={H}
              stroke="oklch(0.3 0.04 25 / 0.3)"
              strokeWidth={1}
            />
          ))}
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={"h" + i}
              x1={0}
              y1={(i * H) / 6}
              x2={W}
              y2={(i * H) / 6}
              stroke="oklch(0.3 0.04 25 / 0.3)"
              strokeWidth={1}
            />
          ))}
          {/* simple continents silhouette via rough polygons */}
          <g fill="oklch(0.22 0.025 20)" stroke="oklch(0.35 0.04 30 / 0.6)" strokeWidth={0.7}>
            {/* North America */}
            <path d="M120,110 L260,90 L300,150 L280,210 L210,260 L150,240 L110,180 Z" />
            {/* South America */}
            <path d="M260,280 L320,260 L330,330 L300,420 L270,440 L255,360 Z" />
            {/* Europe */}
            <path d="M470,110 L560,100 L580,150 L540,180 L480,170 Z" />
            {/* Africa */}
            <path d="M480,200 L580,200 L600,290 L560,380 L510,360 L480,290 Z" />
            {/* Asia */}
            <path d="M580,90 L820,100 L860,180 L800,230 L700,220 L600,180 Z" />
            {/* Australia */}
            <path d="M780,330 L880,330 L890,380 L820,400 L780,370 Z" />
          </g>
          {/* outbreaks */}
          {OUTBREAKS.map((o) => {
            const { x, y } = project(o.lat, o.lng);
            const r = Math.max(5, Math.min(18, 5 + Math.sqrt(Math.max(o.cases, 1)) * 2));
            const color =
              o.status === "ACTIVE"
                ? "oklch(0.62 0.24 25)"
                : o.status === "MONITORING"
                  ? "oklch(0.78 0.18 75)"
                  : "oklch(0.7 0.18 155)";
            return (
              <g
                key={o.id}
                onMouseEnter={() => setHover(o)}
                onMouseLeave={() => setHover(null)}
                style={{ cursor: "pointer" }}
              >
                {o.status === "ACTIVE" && (
                  <circle cx={x} cy={y} r={r + 6} fill="none" stroke={color} strokeWidth={1.5} opacity={0.4}>
                    <animate attributeName="r" from={r} to={r + 18} dur="2s" repeatCount="indefinite" />
                    <animate attributeName="opacity" from="0.7" to="0" dur="2s" repeatCount="indefinite" />
                  </circle>
                )}
                <circle cx={x} cy={y} r={r} fill={color} fillOpacity={0.85} stroke="white" strokeWidth={0.8} />
                <text x={x + r + 4} y={y + 3} fontSize={10} fill="oklch(0.96 0.01 80)" fontFamily="monospace">
                  {o.country}
                </text>
              </g>
            );
          })}
        </svg>
        {hover && (
          <div className="pointer-events-none absolute left-3 top-3 max-w-xs border border-border bg-surface/95 p-3 text-xs shadow-lg">
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`px-1.5 py-0.5 text-[9px] font-bold ${
                  hover.status === "ACTIVE"
                    ? "bg-danger text-primary-foreground"
                    : hover.status === "MONITORING"
                      ? "bg-accent text-accent-foreground"
                      : "bg-success/20 text-success"
                }`}
              >
                {hover.status}
              </span>
              <span className="font-bold">{hover.country}</span>
            </div>
            <div className="text-foreground">{hover.location}</div>
            <div className="mt-1 text-muted-foreground">{hover.note}</div>
            <div className="mt-2 flex gap-3 text-[11px]">
              <span>
                Cases: <b className="text-foreground">{hover.cases}</b>
              </span>
              <span>
                Deaths: <b className="text-danger">{hover.deaths}</b>
              </span>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-4 border-t border-border bg-surface/60 px-3 py-2 text-[10px] text-muted-foreground">
          <LegendDot color="oklch(0.62 0.24 25)" label="ACTIVE OUTBREAK" />
          <LegendDot color="oklch(0.78 0.18 75)" label="MONITORING" />
          <LegendDot color="oklch(0.7 0.18 155)" label="ENDEMIC" />
          <span className="ml-auto">Equirectangular projection · not to scale</span>
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

function NewsFeed() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-6">
      <SectionHead title="INCOMING TRANSMISSIONS" sub="Source: WHO · ECDC · CDC · RKI · press" />
      <div className="grid gap-3 md:grid-cols-2">
        {NEWS.map((n, i) => {
          const sevCls =
            n.severity === "CRITICAL"
              ? "border-danger text-danger"
              : n.severity === "HIGH"
                ? "border-accent text-accent"
                : "border-border text-muted-foreground";
          return (
            <a
              key={i}
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
  return (
    <div className="min-h-screen">
      <TopBar />
      <Hero />
      <Stats />
      <WorldMap />
      <NewsFeed />
      <ClinicalPanel />
      <Footer />
    </div>
  );
}
