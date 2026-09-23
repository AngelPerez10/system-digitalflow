import { useEffect, useId, useRef, useState } from "react";
import { Check, ExternalLink, Loader2, LocateFixed, MapPin, Minus, Plus, X } from "lucide-react";
import { AppModal } from "@/components/ui/modal-kit/ModalKit";

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

export type LeafletMap = {
  remove: () => void;
  setView: (center: [number, number], zoom?: number) => LeafletMap;
  getZoom: () => number;
  zoomIn: () => LeafletMap;
  zoomOut: () => LeafletMap;
  invalidateSize: (animate?: boolean) => void;
  on: (event: string, handler: (e?: { latlng?: OrdenMapLatLng }) => void) => LeafletMap;
};

export type LeafletMarker = {
  setLatLng: (latlng: [number, number]) => void;
  addTo: (map: LeafletMap) => LeafletMarker;
};

export type LeafletNS = {
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
  const descId = useId().replace(/:/g, "");
  const mapDomId = useId().replace(/:/g, "");

  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  const zoomRef = useRef(15);
  const locationRef = useRef<OrdenMapLatLng>(DEFAULT_CENTER);
  /** true = el cambio viene de tocar el mapa: mover solo el pin, sin recentrar (evita saltos). */
  const skipRecenterRef = useRef(false);

  const [location, setLocation] = useState<OrdenMapLatLng>(DEFAULT_CENTER);
  const [mapReady, setMapReady] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);

  locationRef.current = location;

  const applyLocation = (next: OrdenMapLatLng) => {
    setLocation(next);
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

        const map = L.map(el, { zoomControl: false }).setView(
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
          skipRecenterRef.current = true;
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
    if (skipRecenterRef.current) {
      skipRecenterRef.current = false;
    } else {
      const zoom = typeof zoomRef.current === "number" ? zoomRef.current : map.getZoom();
      map.setView([location.lat, location.lng], zoom);
    }
    if (markerRef.current) {
      markerRef.current.setLatLng([location.lat, location.lng]);
    } else {
      markerRef.current = L.marker([location.lat, location.lng]).addTo(map);
    }
  }, [location, open, mapReady]);

  /** Mueve el pin a tu posición actual; confirmas tú con «Usar esta ubicación». */
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
        zoomRef.current = Math.max(zoomRef.current, 17);
        applyLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
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

  const zoomBy = (delta: 1 | -1) => {
    const map = mapRef.current;
    if (!map) return;
    try {
      if (delta > 0) map.zoomIn();
      else map.zoomOut();
    } catch {
      /* mapa en teardown */
    }
  };

  const floatingBtn =
    "inline-flex size-11 items-center justify-center bg-white text-[#27272A] transition-colors hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF] disabled:cursor-not-allowed disabled:opacity-50 dark:bg-[#111827] dark:text-[#E5E7EB] dark:hover:bg-[#1B2539]";

  return (
    <AppModal
      open={open}
      onClose={onClose}
      size="lg"
      labelledBy={titleId}
      describedBy={descId}
      className="sm:max-w-4xl!"
    >
      <div className="relative h-[min(82dvh,720px)] min-h-[480px] overflow-hidden bg-[#E5E7EB] dark:bg-[#0B1220]">
        {/* Mapa a todo el modal */}
        <div
          className="absolute inset-0"
          role="application"
          aria-label="Mapa interactivo: haz clic o toca para mover el pin"
        >
          <div id={mapDomId} className="absolute inset-0 z-0" />
        </div>

        {/* Encabezado flotante */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[600] bg-gradient-to-b from-[#0B1220]/75 via-[#0B1220]/35 to-transparent px-4 pb-10 pt-4 sm:px-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-white text-[#1B5CFF] shadow-md dark:bg-[#111827] dark:text-[#9BB6FF]">
                <MapPin className="size-5" strokeWidth={2} aria-hidden />
              </span>
              <div className="min-w-0">
                <h2 id={titleId} className="text-[17px] font-semibold tracking-[-0.2px] text-white drop-shadow">
                  Ubicación del servicio
                </h2>
                <p id={descId} className="truncate text-[13px] text-white/85 drop-shadow">
                  {mapReady ? "Toca el mapa para mover el pin" : "Cargando mapa…"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Cerrar ventana"
              className="pointer-events-auto inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-white/95 text-[#27272A] shadow-md transition-colors hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white dark:bg-[#111827]/95 dark:text-[#E5E7EB]"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>
        </div>

        {!mapReady && (
          <div className="absolute inset-0 z-[550] flex items-center justify-center" role="status">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-[13px] font-medium text-[#27272A] shadow-lg dark:bg-[#111827] dark:text-[#E5E7EB]">
              <Loader2 className="size-4 animate-spin text-[#1B5CFF]" aria-hidden />
              Cargando mapa…
            </span>
          </div>
        )}

        {/* Controles flotantes (derecha) */}
        <div className="absolute right-4 top-1/2 z-[600] flex -translate-y-1/2 flex-col gap-3 sm:right-5">
          <div className="flex flex-col overflow-hidden rounded-xl shadow-[0_8px_20px_-8px_rgba(9,9,11,0.45)] ring-1 ring-black/5 dark:ring-white/10">
            <button type="button" onClick={() => zoomBy(1)} disabled={!mapReady} aria-label="Acercar" className={floatingBtn}>
              <Plus className="size-5" aria-hidden />
            </button>
            <span className="h-px bg-[#E4E4E7] dark:bg-[#273244]" aria-hidden />
            <button type="button" onClick={() => zoomBy(-1)} disabled={!mapReady} aria-label="Alejar" className={floatingBtn}>
              <Minus className="size-5" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={geoLoading || !mapReady}
            aria-busy={geoLoading || undefined}
            aria-label="Ir a mi ubicación"
            title="Ir a mi ubicación"
            className={`${floatingBtn} rounded-xl text-[#1B5CFF]! shadow-[0_8px_20px_-8px_rgba(9,9,11,0.45)] ring-1 ring-black/5 dark:text-[#9BB6FF]! dark:ring-white/10`}
          >
            {geoLoading ? <Loader2 className="size-5 animate-spin" aria-hidden /> : <LocateFixed className="size-5" aria-hidden />}
          </button>
        </div>

        {/* Tarjeta flotante (abajo) */}
        <div className="absolute inset-x-3 bottom-7 z-[600] sm:inset-x-auto sm:bottom-5 sm:left-5 sm:w-[min(100%-2.5rem,26rem)]">
          <div className="cot-pop rounded-2xl bg-white p-4 shadow-[0_18px_40px_-16px_rgba(9,9,11,0.5)] ring-1 ring-black/5 dark:bg-[#111827] dark:ring-white/10">
            <div className="flex items-center gap-3">
              <span
                className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                aria-hidden
              >
                <MapPin className="size-5" strokeWidth={2} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">Pin colocado</p>
                <a
                  href={mapsUrlFrom(location)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[13px] font-medium text-[#1B5CFF] underline-offset-4 hover:underline dark:text-[#7FA2FF]"
                >
                  Revisar en Google Maps
                  <ExternalLink className="size-3.5" aria-hidden />
                </a>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-[14px] font-medium text-[#52525B] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#B7C1D1] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={!mapReady}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#1B5CFF] px-4 text-[14px] font-semibold text-white transition-[background-color,transform] hover:bg-[#1244D1] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.25)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#4B7CFF] dark:hover:bg-[#3B6AF0]"
              >
                <Check className="size-4" aria-hidden />
                Usar esta ubicación
              </button>
            </div>
          </div>
        </div>
      </div>
    </AppModal>
  );
}
