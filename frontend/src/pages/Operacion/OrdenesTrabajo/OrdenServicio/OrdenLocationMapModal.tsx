import { useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  erpBodyClass,
  erpInputLikeClass,
  erpPrimaryBtnClass,
  erpSecondaryBtnClass,
  erpSubheadingClass,
} from "@/layout/erpPageStyles";

export type OrdenMapLatLng = { lat: number; lng: number };

type OrdenLocationMapModalProps = {
  open: boolean;
  onClose: () => void;
  /** Dirección actual (si trae `q=lat,lng` se usa como centro). */
  direccion?: string;
  onConfirm: (mapsUrl: string, location: OrdenMapLatLng) => void;
  onNotify?: (payload: {
    variant: "error" | "warning" | "success" | "info";
    title: string;
    message: string;
  }) => void;
};

type LeafletMap = {
  remove: () => void;
  setView: (center: [number, number], zoom?: number) => LeafletMap;
  getZoom: () => number;
  invalidateSize: (animate?: boolean) => void;
  on: (event: string, handler: (e?: { latlng?: OrdenMapLatLng }) => void) => LeafletMap;
};

type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
};

type LeafletNS = {
  map: (el: HTMLElement | string, options?: { zoomControl?: boolean }) => LeafletMap;
  tileLayer: (
    url: string,
    options?: { maxZoom?: number; attribution?: string }
  ) => { addTo: (map: LeafletMap) => void };
  marker: (latlng: [number, number]) => LeafletMarker;
};

const DEFAULT_CENTER: OrdenMapLatLng = { lat: 19.0653, lng: -104.2831 };

function parseLatLngFromDireccion(direccion: string): OrdenMapLatLng | null {
  const m = direccion.trim().match(/q=([-\d.]+),([-\d.]+)/);
  if (!m) return null;
  const lat = Number.parseFloat(m[1]);
  const lng = Number.parseFloat(m[2]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lat, lng };
}

function mapsUrlFrom(loc: OrdenMapLatLng): string {
  return `https://www.google.com/maps?q=${loc.lat},${loc.lng}`;
}

function formatCoord(n: number): string {
  return n.toFixed(6);
}

async function ensureLeaflet(): Promise<LeafletNS> {
  const w = window as Window & { L?: LeafletNS };
  if (w.L) return w.L;

  if (!document.getElementById("leaflet-css")) {
    const link = document.createElement("link");
    link.id = "leaflet-css";
    link.rel = "stylesheet";
    link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
    link.integrity = "sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=";
    link.crossOrigin = "";
    document.head.appendChild(link);
  }

  await new Promise<void>((resolve, reject) => {
    if (document.getElementById("leaflet-js") && w.L) {
      resolve();
      return;
    }
    const existing = document.getElementById("leaflet-js");
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Leaflet load error")), {
        once: true,
      });
      // Script ya en DOM pero L aún no listo
      const poll = window.setInterval(() => {
        if ((window as Window & { L?: LeafletNS }).L) {
          window.clearInterval(poll);
          resolve();
        }
      }, 50);
      window.setTimeout(() => {
        window.clearInterval(poll);
        if ((window as Window & { L?: LeafletNS }).L) resolve();
        else reject(new Error("Leaflet load timeout"));
      }, 8000);
      return;
    }
    const script = document.createElement("script");
    script.id = "leaflet-js";
    script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
    script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
    script.crossOrigin = "";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Leaflet load error"));
    document.body.appendChild(script);
  });

  const L = (window as Window & { L?: LeafletNS }).L;
  if (!L) throw new Error("Leaflet no disponible");
  return L;
}

/**
 * Modal de ubicación con Leaflet (CDN). Diseño ERP Intrax + a11y.
 */
export default function OrdenLocationMapModal({
  open,
  onClose,
  direccion = "",
  onConfirm,
  onNotify,
}: OrdenLocationMapModalProps) {
  const titleId = useId().replace(/:/g, "");
  const mapDomId = useId().replace(/:/g, "");
  const latId = useId().replace(/:/g, "");
  const lngId = useId().replace(/:/g, "");

  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const zoomRef = useRef(15);
  const locationRef = useRef<OrdenMapLatLng>(DEFAULT_CENTER);

  const [location, setLocation] = useState<OrdenMapLatLng>(DEFAULT_CENTER);
  const [latText, setLatText] = useState(formatCoord(DEFAULT_CENTER.lat));
  const [lngText, setLngText] = useState(formatCoord(DEFAULT_CENTER.lng));
  const [mapReady, setMapReady] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  locationRef.current = location;

  const applyLocation = (next: OrdenMapLatLng, syncInputs = true) => {
    setLocation(next);
    if (syncInputs) {
      setLatText(formatCoord(next.lat));
      setLngText(formatCoord(next.lng));
    }
  };

  // Inicializar / destruir mapa al abrir / cerrar
  useEffect(() => {
    if (!open) {
      setMapReady(false);
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* mapa ya destruido */
        }
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const fromDireccion = parseLatLngFromDireccion(direccion);
    const initial = fromDireccion ?? DEFAULT_CENTER;
    applyLocation(initial);

    let cancelled = false;
    let resizeTimers: number[] = [];

    void (async () => {
      try {
        const L = await ensureLeaflet();
        if (cancelled) return;

        const el = document.getElementById(mapDomId);
        if (!el) return;

        const map = L.map(el, { zoomControl: true }).setView(
          [initial.lat, initial.lng],
          zoomRef.current
        );
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        map.on("zoomend", () => {
          try {
            zoomRef.current = map.getZoom();
          } catch {
            /* teardown */
          }
        });
        map.on("click", (e) => {
          if (!e?.latlng) return;
          applyLocation({ lat: e.latlng.lat, lng: e.latlng.lng });
        });

        markerRef.current = L.marker([initial.lat, initial.lng]).addTo(map);
        mapRef.current = map;
        setMapReady(true);

        // Leaflet: el contenedor del modal aún no tiene tamaño estable → invalidateSize
        const bump = () => {
          try {
            map.invalidateSize(false);
            map.setView([locationRef.current.lat, locationRef.current.lng], zoomRef.current);
          } catch {
            /* ignore */
          }
        };
        requestAnimationFrame(bump);
        resizeTimers = [100, 280, 500].map((ms) => window.setTimeout(bump, ms));
      } catch {
        onNotify?.({
          variant: "error",
          title: "Error de mapa",
          message: "No se pudo cargar el mapa interactivo.",
        });
      }
    })();

    return () => {
      cancelled = true;
      resizeTimers.forEach((t) => window.clearTimeout(t));
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // Solo al abrir/cerrar; direccion se lee al abrir
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mapDomId]);

  // Sincronizar marker cuando cambia la ubicación
  useEffect(() => {
    const map = mapRef.current;
    const L = (window as Window & { L?: LeafletNS }).L;
    if (!open || !map || !L || !mapReady) return;
    const zoom = typeof zoomRef.current === "number" ? zoomRef.current : map.getZoom();
    map.setView([location.lat, location.lng], zoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng]);
    } else {
      markerRef.current = L.marker([location.lat, location.lng]).addTo(map);
    }
  }, [location, open, mapReady]);

  const commitLatText = () => {
    const lat = Number.parseFloat(latText.replace(",", "."));
    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      setLatText(formatCoord(location.lat));
      return;
    }
    applyLocation({ lat, lng: location.lng });
  };

  const commitLngText = () => {
    const lng = Number.parseFloat(lngText.replace(",", "."));
    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      setLngText(formatCoord(location.lng));
      return;
    }
    applyLocation({ lat: location.lat, lng });
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      onNotify?.({
        variant: "warning",
        title: "Geolocalización no disponible",
        message: "Tu navegador no soporta geolocalización.",
      });
      return;
    }
    if (!window.isSecureContext) {
      onNotify?.({
        variant: "warning",
        title: "Se requiere conexión segura",
        message:
          "La geolocalización requiere HTTPS (o localhost). Abre el sistema con HTTPS o en localhost e inténtalo de nuevo.",
      });
      return;
    }
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoLoading(false);
        const next = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        applyLocation(next);
        onConfirm(mapsUrlFrom(next), next);
        onClose();
      },
      () => {
        setGeoLoading(false);
        onNotify?.({
          variant: "warning",
          title: "No se pudo obtener ubicación",
          message: "Activa permisos de ubicación e inténtalo de nuevo.",
        });
      },
      { enableHighAccuracy: true, timeout: 8000 }
    );
  };

  const handleConfirm = () => {
    onConfirm(mapsUrlFrom(location), location);
    onClose();
  };

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      closeOnBackdropClick={false}
      ariaLabelledBy={titleId}
      className="mx-0 w-[min(96vw,52rem)] max-w-4xl overflow-hidden rounded-3xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-[0_30px_90px_-40px_rgba(28,25,23,0.55)] dark:border-[#273244] dark:bg-[#111a2b] sm:mx-auto"
    >
      <div className="flex max-h-[92vh] flex-col">
        <header className="relative shrink-0 border-b border-[#e7ded0] bg-gradient-to-r from-[#fcfaf6] via-[#fffaf3] to-[#fffdfa] px-4 py-4 pr-14 dark:border-[#334155] dark:from-[#111827] dark:via-[#111827] dark:to-[#0f172a] sm:px-6 sm:pr-16">
          <div className="pointer-events-none absolute left-0 top-0 h-0.5 w-full bg-[#ff801f]" aria-hidden />
          <div className="flex items-start gap-3">
            <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#ff801f] text-black shadow-sm">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
                <path
                  d="M12 21s7-5.4 7-11a7 7 0 1 0-14 0c0 5.6 7 11 7 11z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#ea580c] dark:text-[#fb923c]">
                Órdenes · Ubicación
              </p>
              <h3 id={titleId} className={`mt-1 ${erpSubheadingClass}`}>
                Seleccionar ubicación
              </h3>
              <p className={`mt-1 text-sm ${erpBodyClass}`}>
                Toca el mapa o escribe latitud y longitud. Se guardará un enlace de Google Maps.
              </p>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
          <div className="relative overflow-hidden rounded-2xl border border-[#e7ded0] bg-[#0f172a] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] dark:border-[#334155]">
            <div
              className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-center p-3"
              aria-hidden={!mapReady}
            >
              <span className="rounded-full border border-white/15 bg-[#0f172a]/75 px-3 py-1.5 text-[11px] font-medium text-[#f8fafc] shadow-lg backdrop-blur-md">
                {mapReady ? "Haz clic en el mapa para colocar el pin" : "Cargando mapa…"}
              </span>
            </div>

            <div
              className="relative h-[min(52vh,28rem)] w-full sm:h-[min(56vh,32rem)]"
              role="application"
              aria-label="Mapa interactivo para elegir coordenadas"
            >
              <div id={mapDomId} className="absolute inset-0 z-0" />
            </div>

            <div className="pointer-events-none absolute bottom-3 left-3 z-[500] max-w-[min(100%-1.5rem,18rem)] rounded-xl border border-white/10 bg-[#0f172a]/80 px-3 py-2 text-[11px] text-[#e2e8f0] shadow-lg backdrop-blur-md">
              <p className="font-semibold text-[#f8fafc]">Pin actual</p>
              <p className="mt-0.5 tabular-nums text-[#94a3b8]">
                {formatCoord(location.lat)}, {formatCoord(location.lng)}
              </p>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-[#e7ded0] bg-[#fcfaf6] p-4 dark:border-[#334155] dark:bg-[#0f172a]/50">
            <p className="mb-3 text-xs font-medium text-[#57534e] dark:text-[#aeb8c8]">
              O ingresa las coordenadas manualmente
            </p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor={latId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Latitud
                </label>
                <input
                  id={latId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej. 19.065300"
                  value={latText}
                  onChange={(e) => setLatText(e.target.value)}
                  onBlur={commitLatText}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitLatText();
                    }
                  }}
                  className={erpInputLikeClass}
                />
              </div>
              <div>
                <label htmlFor={lngId} className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-300">
                  Longitud
                </label>
                <input
                  id={lngId}
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="Ej. -104.283100"
                  value={lngText}
                  onChange={(e) => setLngText(e.target.value)}
                  onBlur={commitLngText}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      commitLngText();
                    }
                  }}
                  className={erpInputLikeClass}
                />
              </div>
            </div>
            <p className="mt-3 break-all text-[11px] text-[#78716c] dark:text-[#8ea0b8]">
              <span className="font-medium text-[#57534e] dark:text-[#aeb8c8]">Vista previa: </span>
              <a
                href={mapsUrlFrom(location)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#c2410c] underline-offset-2 hover:underline dark:text-[#fdba74]"
              >
                {mapsUrlFrom(location)}
              </a>
            </p>
          </div>
        </div>

        <footer className="flex shrink-0 flex-col-reverse gap-2.5 border-t border-[#e7ded0] bg-[#fcfaf6] px-4 py-4 dark:border-[#334155] dark:bg-[#111827] sm:flex-row sm:items-center sm:justify-end sm:gap-3 sm:px-6">
          <button type="button" onClick={onClose} className={erpSecondaryBtnClass}>
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading}
            aria-busy={geoLoading || undefined}
            className={`${erpSecondaryBtnClass} border-[#fed7aa] text-[#9a3412] hover:bg-[#fff7ed] dark:border-[#fb923c]/35 dark:text-[#fdba74] dark:hover:bg-[#fb923c]/10`}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" strokeLinecap="round" />
            </svg>
            {geoLoading ? "Obteniendo…" : "Usar mi ubicación"}
          </button>
          <button type="button" onClick={handleConfirm} className={erpPrimaryBtnClass}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M5 12l4 4L19 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Usar esta ubicación
          </button>
        </footer>
      </div>
    </Modal>
  );
}
