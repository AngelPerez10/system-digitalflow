/**
 * Leaflet bajo demanda (CDN con integridad SRI) y tipos mínimos que usa el
 * selector de ubicación. Se carga una sola vez por sesión; si falla, el
 * siguiente intento vuelve a descargarlo.
 */
export type LatLng = { lat: number; lng: number };

type LeafletClickEvent = { latlng: LatLng };

export type LeafletMarkerLike = {
  setLatLng: (coords: [number, number]) => void;
  getLatLng: () => LatLng;
  addTo: (map: LeafletMapLike) => LeafletMarkerLike;
  on: (event: "dragend", handler: () => void) => void;
};

export type LeafletMapLike = {
  setView: (coords: [number, number], zoom: number) => LeafletMapLike;
  on(event: "zoomend", handler: () => void): void;
  on(event: "click", handler: (event: LeafletClickEvent) => void): void;
  getZoom: () => number;
  invalidateSize: () => void;
  remove: () => void;
};

export type LeafletLike = {
  map: (container: HTMLElement) => LeafletMapLike;
  tileLayer: (url: string, options: { maxZoom: number; attribution: string }) => { addTo: (map: LeafletMapLike) => void };
  marker: (coords: [number, number], options?: { draggable?: boolean; keyboard?: boolean }) => LeafletMarkerLike;
};

export const leaflet = () => (window as unknown as { L?: LeafletLike }).L;


let leafletPromise: Promise<LeafletLike> | null = null;

/** Carga Leaflet una sola vez por sesión (CSS + JS con integridad SRI). */
export function loadLeaflet(): Promise<LeafletLike> {
  const ready = leaflet();
  if (ready) return Promise.resolve(ready);
  if (leafletPromise) return leafletPromise;
  leafletPromise = new Promise<LeafletLike>((resolve, reject) => {
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
      link.crossOrigin = "";
      document.head.appendChild(link);
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => {
      const L = leaflet();
      if (L) resolve(L);
      else reject(new Error("Leaflet no disponible"));
    };
    script.onerror = () => reject(new Error("No se pudo descargar Leaflet"));
    document.body.appendChild(script);
  }).catch((err) => {
    leafletPromise = null; // permite reintentar al volver a abrir
    throw err;
  });
  return leafletPromise;
}

/** Pin arrastrable; al soltarlo informa el nuevo punto. */
export function placeMarker(L: LeafletLike, map: LeafletMapLike, at: LatLng, onMove: (p: LatLng) => void): LeafletMarkerLike {
  const marker = L.marker([at.lat, at.lng], { draggable: true, keyboard: false }).addTo(map);
  marker.on("dragend", () => {
    const p = marker.getLatLng();
    onMove({ lat: p.lat, lng: p.lng });
  });
  return marker;
}
