"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, ScaleControl, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Plus, Minus, LocateFixed } from "lucide-react";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  kind: "on_shift" | "en_route" | "site";
}

export type TileStyle = "plan" | "satellite";

// Same free-tiles-only constraint already accepted for the mobile app's
// Leaflet WebView (src/components/leafletMapHtml.ts): OSM raster for "Plan",
// Esri World Imagery for "Satellite" -- both free, no API key. This won't
// pixel-match a paid vector-tile style, but it's a real, working toggle.
const TILE_SOURCES: Record<TileStyle, { url: string; attribution: string }> = {
  plan: {
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: "&copy; OpenStreetMap contributors",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri",
  },
};

// Default center: Lyon, matching the seeded sites, until a real
// "company region" concept exists.
const DEFAULT_CENTER: [number, number] = [45.75, 4.85];
const DEFAULT_ZOOM = 12;

// Inline SVGs (lucide's User / MapPin glyphs) baked directly into the divIcon
// HTML string -- Leaflet renders icons as raw DOM outside React's tree, so a
// <User /> component can't be used here directly.
const USER_SVG =
  '<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>';
const PIN_SVG =
  '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>';

const STATUS_LABELS: Record<MapMarker["kind"], string | null> = {
  on_shift: "En service",
  en_route: "En route",
  site: null,
};

function markerIcon(kind: MapMarker["kind"]) {
  const color = kind === "site" ? "#475569" : kind === "en_route" ? "#a855f7" : "#3b82f6";
  const glyph = kind === "site" ? PIN_SVG : USER_SVG;
  const size = kind === "site" ? 28 : 34;
  const pulseClass = kind === "site" ? "" : kind === "en_route" ? "marker-pulse-purple" : "marker-pulse-blue";
  return L.divIcon({
    html: `<div class="${pulseClass}" style="width:${size}px;height:${size}px;border-radius:9999px;background:${color};display:flex;align-items:center;justify-content:center;box-shadow:0 3px 8px rgba(0,0,0,0.55);border:2.5px solid #0f172a;outline:2px solid rgba(255,255,255,0.85);">
      <svg width="${size * 0.52}" height="${size * 0.52}" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">${glyph}</svg>
    </div>`,
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

function MarkerLabel({ marker }: { marker: MapMarker }) {
  const status = STATUS_LABELS[marker.kind];
  const statusClass =
    marker.kind === "en_route"
      ? "bg-purple-500/20 text-purple-300"
      : marker.kind === "on_shift"
        ? "bg-blue-500/20 text-blue-300"
        : "bg-slate-600/30 text-slate-300";
  return (
    <div className="flex flex-col items-center gap-1 rounded-lg border border-slate-700 bg-slate-900/95 px-2.5 py-1.5 shadow-lg">
      <span className="whitespace-nowrap text-xs font-semibold text-white">{marker.label}</span>
      {status && (
        <span className={`whitespace-nowrap rounded-full px-1.5 py-0.5 text-[10px] font-medium ${statusClass}`}>
          {status}
        </span>
      )}
    </div>
  );
}

function MapControls() {
  const map = useMap();
  return (
    <div className="absolute left-3 top-3 z-[1000] flex flex-col gap-1.5">
      <button
        onClick={() => map.zoomIn()}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg hover:bg-slate-800"
        aria-label="Zoomer"
      >
        <Plus size={16} />
      </button>
      <button
        onClick={() => map.zoomOut()}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg hover:bg-slate-800"
        aria-label="Dézoomer"
      >
        <Minus size={16} />
      </button>
      <button
        onClick={() => map.setView(DEFAULT_CENTER, DEFAULT_ZOOM)}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-700 bg-slate-900/90 text-slate-200 shadow-lg hover:bg-slate-800"
        aria-label="Recentrer"
      >
        <LocateFixed size={16} />
      </button>
    </div>
  );
}

export interface FlyToTarget {
  id: string;
  lat: number;
  lng: number;
}

function FlyToHandler({ target }: { target: FlyToTarget | null }) {
  const map = useMap();

  useEffect(() => {
    if (!target) return;
    map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 15), { duration: 1.1 });
    // `target` (not just its fields) is the dep on purpose -- the parent
    // creates a new object per click, including re-clicking the same agent,
    // and each click should re-trigger the flight, not just the first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return null;
}

function Legend() {
  return (
    <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-700 bg-slate-900/90 px-3 py-2.5 text-xs text-slate-300 shadow-lg">
      <div className="flex items-center gap-2 py-0.5">
        <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Agent en service
      </div>
      <div className="flex items-center gap-2 py-0.5">
        <span className="h-2.5 w-2.5 rounded-full bg-purple-500" /> Agent en route
      </div>
      <div className="flex items-center gap-2 py-0.5">
        <span className="h-2.5 w-2.5 rounded-full bg-slate-500" /> Site
      </div>
    </div>
  );
}

export function LeafletMap({
  markers,
  siteMarkers = [],
  tileStyle = "plan",
  flyTo = null,
}: {
  markers: MapMarker[];
  siteMarkers?: MapMarker[];
  tileStyle?: TileStyle;
  flyTo?: FlyToTarget | null;
}) {
  const tiles = TILE_SOURCES[tileStyle];
  return (
    <div className="relative h-full w-full">
      <MapContainer center={DEFAULT_CENTER} zoom={DEFAULT_ZOOM} zoomControl={false} className="h-full w-full">
        <TileLayer url={tiles.url} attribution={tiles.attribution} />
        <MapControls />
        <FlyToHandler target={flyTo} />
        <ScaleControl position="bottomright" imperial={false} />
        {siteMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon(m.kind)}>
            <Tooltip direction="top" offset={[0, -15]} permanent opacity={1} className="marker-tooltip">
              <MarkerLabel marker={m} />
            </Tooltip>
          </Marker>
        ))}
        {markers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={markerIcon(m.kind)}>
            <Tooltip direction="top" offset={[0, -19]} permanent opacity={1} className="marker-tooltip">
              <MarkerLabel marker={m} />
            </Tooltip>
          </Marker>
        ))}
      </MapContainer>
      <Legend />
      {markers.length === 0 && (
        <div className="pointer-events-none absolute left-1/2 top-3 z-[1000] -translate-x-1/2 rounded-lg bg-slate-900/90 px-3 py-2 text-center text-sm text-slate-200 shadow-lg">
          Aucun agent en service actuellement
        </div>
      )}
    </div>
  );
}
