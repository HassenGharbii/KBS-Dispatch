"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Matches web/src/app/org/map's default center convention (Lyon, until a
// real "company region" concept exists) so a freshly created site without a
// picked location doesn't default somewhere unrelated to the org's sites.
const DEFAULT_CENTER: [number, number] = [45.75, 4.85];

const PIN_ICON = L.divIcon({
  html: '<div style="background:#111827;width:14px;height:14px;border-radius:50%;border:3px solid #fff;box-shadow:0 1px 4px rgba(0,0,0,0.5);"></div>',
  className: "",
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function ClickHandler({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export function LocationPicker({
  value,
  onChange,
}: {
  value: { lat: number; lng: number } | null;
  onChange: (lat: number, lng: number) => void;
}) {
  return (
    <div className="h-56 overflow-hidden rounded-md border border-slate-700">
      <MapContainer center={value ?? DEFAULT_CENTER} zoom={value ? 15 : 12} className="h-full w-full">
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
        />
        <ClickHandler onPick={onChange} />
        {value && (
          <Marker
            position={value}
            icon={PIN_ICON}
            draggable
            eventHandlers={{
              dragend: (e) => {
                const pos = e.target.getLatLng();
                onChange(pos.lat, pos.lng);
              },
            }}
          />
        )}
      </MapContainer>
    </div>
  );
}
