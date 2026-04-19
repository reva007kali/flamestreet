import { useEffect, useMemo, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

function clamp(n, a, b) {
  const v = Number(n);
  if (!Number.isFinite(v)) return a;
  return Math.max(a, Math.min(b, v));
}

export default function OsmMapPicker({
  value,
  onChange,
  height = 280,
  defaultCenter = { lat: -6.2, lng: 106.816666 },
  defaultZoom = 12,
  focusSignal = 0,
  focusZoom = 19,
  children,
}) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);

  const markerIcon = useMemo(() => {
    return L.divIcon({
      className: "",
      html: `
        <div style="width:28px;height:28px;display:grid;place-items:center;transform:translateY(-6px);">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z" stroke="rgba(9,221,97,0.95)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 13.2a3.2 3.2 0 1 0 0-6.4a3.2 3.2 0 0 0 0 6.4Z" fill="rgba(9,221,97,0.28)" stroke="rgba(9,221,97,0.95)" stroke-width="2"/>
          </svg>
          <div style="position:absolute;width:10px;height:10px;border-radius:999px;background:rgba(9,221,97,0.95);box-shadow:0 0 0 7px rgba(9,221,97,0.16),0 0 26px rgba(9,221,97,0.22);"></div>
        </div>
      `,
      iconSize: [28, 28],
      iconAnchor: [14, 22],
    });
  }, []);

  useEffect(() => {
    const el = mapElRef.current;
    if (!el || mapRef.current) return;

    const map = L.map(el, {
      zoomControl: false,
      attributionControl: true,
    });
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const initLat =
      value?.lat != null ? clamp(value.lat, -90, 90) : defaultCenter.lat;
    const initLng =
      value?.lng != null ? clamp(value.lng, -180, 180) : defaultCenter.lng;
    map.setView([initLat, initLng], defaultZoom);

    const marker = L.marker([initLat, initLng], {
      draggable: true,
      icon: markerIcon,
    }).addTo(map);
    markerRef.current = marker;

    const emit = (latlng) => {
      if (!onChange) return;
      const lat = clamp(latlng.lat, -90, 90);
      const lng = clamp(latlng.lng, -180, 180);
      onChange({ lat, lng });
    };

    map.on("click", (e) => {
      const ll = e?.latlng;
      if (!ll) return;
      marker.setLatLng(ll);
      try {
        map.panTo(ll, { animate: true, duration: 0.3 });
      } catch {}
      emit(ll);
    });

    marker.on("dragend", () => {
      const ll = marker.getLatLng();
      try {
        map.panTo(ll, { animate: true, duration: 0.3 });
      } catch {}
      emit(ll);
    });

    const ro = new ResizeObserver(() => {
      try {
        map.invalidateSize();
      } catch {}
    });
    ro.observe(el);

    return () => {
      try {
        ro.disconnect();
      } catch {}
      try {
        map.off();
      } catch {}
      try {
        map.remove();
      } catch {}
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [defaultCenter.lat, defaultCenter.lng, defaultZoom, markerIcon, onChange, value?.lat, value?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    const marker = markerRef.current;
    if (!map || !marker) return;
    if (value?.lat == null || value?.lng == null) return;
    const lat = clamp(value.lat, -90, 90);
    const lng = clamp(value.lng, -180, 180);
    const cur = marker.getLatLng();
    if (Math.abs(cur.lat - lat) < 1e-10 && Math.abs(cur.lng - lng) < 1e-10) {
      return;
    }
    marker.setLatLng([lat, lng]);
    try {
      map.panTo([lat, lng], { animate: true, duration: 0.3 });
    } catch {}
  }, [value?.lat, value?.lng]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (value?.lat == null || value?.lng == null) return;
    const lat = clamp(value.lat, -90, 90);
    const lng = clamp(value.lng, -180, 180);
    try {
      map.flyTo([lat, lng], focusZoom, { animate: true, duration: 0.7 });
    } catch {
      try {
        map.setView([lat, lng], focusZoom, { animate: true });
      } catch {}
    }
  }, [focusSignal, focusZoom, value?.lat, value?.lng, defaultZoom]);

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
      style={{ height }}
    >
      <div ref={mapElRef} className="h-full w-full" />
      {children ? (
        <div className="pointer-events-none absolute inset-0">{children}</div>
      ) : null}
    </div>
  );
}
