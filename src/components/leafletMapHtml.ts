// Loaded into a WebView via source={{ html: LEAFLET_MAP_HTML }} — not a
// bundled asset file, so it doesn't touch Metro's asset-extension config.
// Leaflet + OSM raster tiles: no API key, minimal native-build surface
// (react-native-webview is a thin wrapper, no config plugin) compared to a
// native map library. Requires connectivity to load Leaflet from the CDN
// and fetch tiles — acceptable since the live map is inherently
// network-dependent (it's showing Realtime data).
//
// Default center: Lyon area, matching the seeded sites — a placeholder
// until a real "company region" concept exists.
export const LEAFLET_MAP_HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; }
      .agent-pin {
        background: #1d4ed8;
        color: #fff;
        border-radius: 999px;
        padding: 4px 8px;
        font-size: 12px;
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        white-space: nowrap;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      }
      .agent-pin-en-route {
        background: #7c3aed;
      }
      .site-pin {
        background: #374151;
        color: #fff;
        border-radius: 6px;
        padding: 3px 7px;
        font-size: 11px;
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        white-space: nowrap;
        box-shadow: 0 1px 4px rgba(0,0,0,0.4);
      }
      #empty-overlay {
        position: absolute;
        top: 12px;
        left: 12px;
        right: 12px;
        background: rgba(17,24,39,0.85);
        color: #fff;
        padding: 8px 12px;
        border-radius: 8px;
        font-family: -apple-system, Helvetica, Arial, sans-serif;
        font-size: 13px;
        text-align: center;
        z-index: 1000;
        display: none;
      }
    </style>
  </head>
  <body>
    <div id="empty-overlay">Aucun agent en service actuellement</div>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const DEFAULT_CENTER = [45.75, 4.85];
      const map = L.map('map', { zoomControl: false }).setView(DEFAULT_CENTER, 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      const markersById = {};
      const siteMarkersById = {};

      function syncMarkerLayer(store, markers, htmlFor) {
        const incomingIds = new Set(markers.map((m) => m.id));

        for (const id of Object.keys(store)) {
          if (!incomingIds.has(id)) {
            map.removeLayer(store[id]);
            delete store[id];
          }
        }

        for (const m of markers) {
          const html = htmlFor(m);
          if (store[m.id]) {
            store[m.id].setLatLng([m.lat, m.lng]);
            store[m.id].setIcon(L.divIcon({ html, className: '', iconAnchor: [0, 0] }));
          } else {
            store[m.id] = L.marker([m.lat, m.lng], {
              icon: L.divIcon({ html, className: '', iconAnchor: [0, 0] }),
            }).addTo(map);
          }
        }
      }

      // Sites are their own layer so they never factor into the
      // "no agent on duty" empty-overlay count below.
      function setMarkers(markers) {
        syncMarkerLayer(markersById, markers, (m) => {
          const cls = m.kind === 'en_route' ? 'agent-pin agent-pin-en-route' : 'agent-pin';
          return '<div class="' + cls + '">' + m.label + '</div>';
        });
        document.getElementById('empty-overlay').style.display = markers.length === 0 ? 'block' : 'none';
      }

      function setSiteMarkers(markers) {
        syncMarkerLayer(siteMarkersById, markers, (m) => '<div class="site-pin">📍 ' + m.label + '</div>');
      }

      window.setMarkers = setMarkers;
      window.setSiteMarkers = setSiteMarkers;
      setMarkers([]);
      setSiteMarkers([]);
    </script>
  </body>
</html>
`;
