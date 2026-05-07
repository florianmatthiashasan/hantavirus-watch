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
        content: "Live tracker of the 2026 hantavirus outbreak — cases, deaths, news, and map.",
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
  { phase: "EARLY (1–5 d)", items: ["Fever", "Severe muscle aches", "Fatigue", "Headache", "Chills"] },
  { phase: "LATE (4–10 d)", items: ["Coughing", "Acute shortness of breath", "Pulmonary edema", "Hypotension", "Cardiac failure (HCPS)"] },
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
    <header className="border-b border-border bg-surface/80 backdrop-blur sticky top-0 z-30">
      <div className="flex items-center gap-4 px-4 py-2 text-xs">
        <span className="flex items-center gap-2 px-2 py-1 bg-danger text-primary-foreground font-bold tracking-widest alert-pulse">
          <span className="w-2 h-2 bg-primary-foreground rounded-full blink" />
          LIVE · DEFCON 3
        </span>
        <span className="text-muted-foreground">EMERGENCY ROOM // GLOBAL HAN