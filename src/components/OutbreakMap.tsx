import { useEffect, useRef } from "react";

export type MapOutbreak = {
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

export function OutbreakMap({ outbreaks }: { outbreaks: MapOutbreak[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<unknown>(null);

  useEffect(() => {
    let cancelled = false;
    let map: any = null;

    (async () => {
      const L = (await import("leaflet")).default;
      // inject leaflet css once
      if (!document.getElementById("leaflet-css")) {
        const link = document.createElement("link");
        link.id = "leaflet-css";
        link.rel = "stylesheet";
        link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
        document.head.appendChild(link);
      }

      if (cancelled || !ref.current) return;

      map = L.map(ref.current, {
        center: [10, -10],
        zoom: 2,
        worldCopyJump: true,
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true,
      });
      mapRef.current = map;

      // Dark tile layer (CARTO)
      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        {
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
          subdomains: "abcd",
          maxZoom: 8,
          minZoom: 2,
        },
      ).addTo(map);

      const colorFor = (s: MapOutbreak["status"]) =>
        s === "ACTIVE" ? "#f43f5e" : s === "MONITORING" ? "#f59e0b" : "#10b981";

      for (const o of outbreaks) {
        const color = colorFor(o.status);
        const radius = Math.max(6, Math.min(22, 6 + Math.sqrt(Math.max(o.cases, 1)) * 2.2));

        // pulsing ring for active
        if (o.status === "ACTIVE") {
          const pulseIcon = L.divIcon({
            className: "",
            html: `<div style="
              width:${radius * 3}px;height:${radius * 3}px;border-radius:50%;
              border:2px solid ${color};opacity:.6;
              animation: hantapulse 2s ease-out infinite;
              transform: translate(-50%, -50%);
            "></div>`,
            iconSize: [0, 0],
          });
          L.marker([o.lat, o.lng], { icon: pulseIcon, interactive: false }).addTo(map);
        }

        const marker = L.circleMarker([o.lat, o.lng], {
          radius,
          color: "#fff",
          weight: 1.2,
          fillColor: color,
          fillOpacity: 0.9,
        }).addTo(map);

        marker.bindPopup(
          `<div style="font-family:ui-monospace,monospace;color:#111;min-width:200px">
             <div style="font-weight:700;margin-bottom:4px">
               <span style="background:${color};color:#fff;padding:2px 6px;font-size:10px;margin-right:6px">${o.status}</span>
               ${o.country}
             </div>
             <div style="font-size:12px;margin-bottom:4px">${o.location}</div>
             <div style="font-size:11px;color:#555;margin-bottom:6px">${o.note}</div>
             <div style="font-size:11px"><b>Cases:</b> ${o.cases} &nbsp; <b>Deaths:</b> <span style="color:#dc2626">${o.deaths}</span></div>
           </div>`,
        );
      }

      // inject keyframes once
      if (!document.getElementById("hantapulse-css")) {
        const style = document.createElement("style");
        style.id = "hantapulse-css";
        style.textContent = `@keyframes hantapulse {
          0% { transform: translate(-50%,-50%) scale(0.4); opacity:.9 }
          100% { transform: translate(-50%,-50%) scale(1.6); opacity:0 }
        }`;
        document.head.appendChild(style);
      }
    })();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, [outbreaks]);

  return (
    <div
      ref={ref}
      style={{ height: 500, width: "100%", background: "oklch(0.18 0.02 20)" }}
    />
  );
}
