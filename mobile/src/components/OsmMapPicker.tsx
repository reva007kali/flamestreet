import { forwardRef, useImperativeHandle, useMemo, useRef } from "react";
import { View } from "react-native";
import { WebView } from "react-native-webview";
import { theme } from "../ui/theme";

export type OsmMapPickerRef = {
  setPoint: (lat: number, lng: number, zoom?: number) => void;
};

export default forwardRef<
  OsmMapPickerRef,
  {
    lat: number;
    lng: number;
    zoom?: number;
    onChange: (lat: number, lng: number) => void;
    height?: number;
  }
>(function OsmMapPicker({ lat, lng, zoom = 19, onChange, height = 260 }, ref) {
  const wvRef = useRef<WebView>(null);

  useImperativeHandle(ref, () => ({
    setPoint: (nLat, nLng, nZoom) => {
      try {
        wvRef.current?.postMessage(
          JSON.stringify({
            type: "setPoint",
            lat: nLat,
            lng: nLng,
            zoom: nZoom ?? zoom,
          }),
        );
      } catch {}
    },
  }));

  const html = useMemo(() => {
    const safeLat = Number.isFinite(lat) ? lat : -6.2;
    const safeLng = Number.isFinite(lng) ? lng : 106.8;
    const safeZoom = Number.isFinite(zoom) ? zoom : 19;
    return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #050807; }
      .leaflet-control-attribution { display: none !important; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map', { zoomControl: false }).setView([${safeLat}, ${safeLng}], ${safeZoom});
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);
      const marker = L.marker([${safeLat}, ${safeLng}], { draggable: true }).addTo(map);

      function emit(lat, lng) {
        try { window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'change', lat, lng })); } catch {}
      }

      map.on('click', (e) => {
        const lat = e.latlng.lat;
        const lng = e.latlng.lng;
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], map.getZoom(), { animate: true });
        emit(lat, lng);
      });

      marker.on('dragend', () => {
        const p = marker.getLatLng();
        map.panTo(p, { animate: true });
        emit(p.lat, p.lng);
      });

      function setPoint(lat, lng, z) {
        const zl = (typeof z === 'number' && isFinite(z)) ? z : map.getZoom();
        marker.setLatLng([lat, lng]);
        map.setView([lat, lng], zl, { animate: true });
      }

      document.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data || '{}');
          if (msg.type === 'setPoint') setPoint(msg.lat, msg.lng, msg.zoom);
        } catch {}
      });
      window.addEventListener('message', (ev) => {
        try {
          const msg = JSON.parse(ev.data || '{}');
          if (msg.type === 'setPoint') setPoint(msg.lat, msg.lng, msg.zoom);
        } catch {}
      });
    </script>
  </body>
</html>`;
  }, [lat, lng, zoom]);

  return (
    <View
      style={{
        height,
        borderRadius: theme.radius.lg,
        overflow: "hidden",
        borderWidth: 1,
        borderColor: theme.colors.border,
        backgroundColor: theme.colors.bg,
      }}
    >
      <WebView
        ref={wvRef}
        source={{ html }}
        onMessage={(e) => {
          try {
            const msg = JSON.parse(e.nativeEvent.data);
            if (msg?.type !== "change") return;
            const nLat = Number(msg.lat);
            const nLng = Number(msg.lng);
            if (!Number.isFinite(nLat) || !Number.isFinite(nLng)) return;
            onChange(nLat, nLng);
          } catch {}
        }}
        originWhitelist={["*"]}
        javaScriptEnabled
        domStorageEnabled
        setSupportMultipleWindows={false}
        style={{ backgroundColor: theme.colors.bg }}
      />
    </View>
  );
});
