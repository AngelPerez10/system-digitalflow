import { useEffect, useRef } from "react";
import { Modal } from "@/components/ui/modal";

type LatLng = { lat: number; lng: number };

type LeafletClickEvent = {
  latlng: LatLng;
};

type LeafletMarkerLike = {
  setLatLng: (coords: [number, number]) => void;
  addTo: (map: LeafletMapLike) => LeafletMarkerLike;
};

type LeafletMapLike = {
  setView: (coords: [number, number], zoom: number) => LeafletMapLike;
  on(event: "zoomend", handler: () => void): void;
  on(event: "click", handler: (event: LeafletClickEvent) => void): void;
  getZoom: () => number;
  remove: () => void;
};

type LeafletLike = {
  map: (container: HTMLElement) => LeafletMapLike;
  tileLayer: (url: string, options: { maxZoom: number; attribution: string }) => { addTo: (map: LeafletMapLike) => void };
  marker: (coords: [number, number]) => LeafletMarkerLike;
};

function windowWithLeaflet(): Window & { L?: LeafletLike } {
  return window as unknown as Window & { L?: LeafletLike };
}

type Props = {
  isOpen: boolean;
  onClose: () => void;
  mapContainerId: string;
  direccion: string;
  selectedLocation: LatLng | null;
  setSelectedLocation: (loc: LatLng | null) => void;
  onConfirm: () => void;
  onMapError?: (message: string) => void;
};

export function ClienteMapPickerModal({
  isOpen,
  onClose,
  mapContainerId,
  direccion,
  selectedLocation,
  setSelectedLocation,
  onConfirm,
  onMapError,
}: Props) {
  const mapRef = useRef<LeafletMapLike | null>(null);
  const markerRef = useRef<LeafletMarkerLike | null>(null);
  const zoomRef = useRef<number>(15);

  useEffect(() => {
    if (!isOpen) {
      if (mapRef.current) {
        try {
          mapRef.current.remove();
        } catch {
          /* ignore */
        }
        mapRef.current = null;
        markerRef.current = null;
      }
      return;
    }

    const initFromDireccion = () => {
      const d = String(direccion || "").trim();
      const m = d.match(/q=([-\d.]+),([-\d.]+)/);
      if (m) {
        const lat = parseFloat(m[1]);
        const lng = parseFloat(m[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedLocation({ lat, lng });
          return true;
        }
      }
      const m2 = d.match(/(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)/);
      if (m2) {
        const lat = parseFloat(m2[1]);
        const lng = parseFloat(m2[2]);
        if (!isNaN(lat) && !isNaN(lng)) {
          setSelectedLocation({ lat, lng });
          return true;
        }
      }
      return false;
    };

    const ensureLeaflet = async () => {
      const w = windowWithLeaflet();
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
        if (document.getElementById("leaflet-js")) return resolve();
        const script = document.createElement("script");
        script.id = "leaflet-js";
        script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
        script.integrity = "sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=";
        script.crossOrigin = "";
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Leaflet load error"));
        document.body.appendChild(script);
      });
      return windowWithLeaflet().L;
    };

    (async () => {
      try {
        const L = await ensureLeaflet();
        if (!L) {
          throw new Error("Leaflet unavailable");
        }
        const had = initFromDireccion();
        if (!had && !selectedLocation) {
          setSelectedLocation({ lat: 19.0653, lng: -104.2831 });
        }
        const container = document.getElementById(mapContainerId);
        if (!container) return;
        const center = selectedLocation || { lat: 19.0653, lng: -104.2831 };
        const map = L.map(container).setView([center.lat, center.lng], zoomRef.current || 15);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);
        map.on("zoomend", () => {
          try {
            zoomRef.current = map.getZoom();
          } catch {
            /* ignore */
          }
        });
        map.on("click", (e: LeafletClickEvent) => {
          const { lat, lng } = e.latlng;
          setSelectedLocation({ lat, lng });
        });
        mapRef.current = map;
        if (selectedLocation) {
          markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
        }
      } catch {
        onMapError?.("No se pudo cargar el mapa interactivo.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mapContainerId]);

  useEffect(() => {
    const L = windowWithLeaflet().L;
    if (!mapRef.current || !selectedLocation || !L) return;
    const map = mapRef.current;
    const currentZoom = typeof zoomRef.current === "number" ? zoomRef.current : map.getZoom?.() || 15;
    map.setView([selectedLocation.lat, selectedLocation.lng], currentZoom);
    if (markerRef.current) {
      markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    } else {
      markerRef.current = L.marker([selectedLocation.lat, selectedLocation.lng]).addTo(map);
    }
  }, [selectedLocation]);

  return (
    <Modal
      mobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      ariaLabel="Seleccionar ubicación en el mapa"
      className="w-[94vw] max-w-3xl overflow-hidden rounded-xl border border-[#e7ded0] bg-[#fffdfa] p-0 shadow-xl dark:border-[#273244] dark:bg-[#111a2b]"
    >
      <div>
        <div className="border-b border-[#e7ded0] bg-[#fcfaf6] px-5 pb-4 pt-5 dark:border-[#273244] dark:bg-[#0f172a]/70">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#fff3e8] dark:bg-[#7c2d12]/30">
              <svg className="h-5 w-5 text-[#ff801f] dark:text-[#fb923c]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <div>
              <h5 className="text-base font-semibold text-gray-800 dark:text-gray-100">Seleccionar ubicación</h5>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">Haz clic en el mapa para seleccionar la ubicación</p>
            </div>
          </div>
        </div>
        <div className="p-4">
          <div className="overflow-hidden rounded-xl border border-[#e7ded0] dark:border-[#334155]">
            <div id={mapContainerId} className="w-full" style={{ height: 420 }} />
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="text-xs text-gray-600 dark:text-gray-300">
              {selectedLocation ? (
                <span>
                  Lat: {selectedLocation.lat.toFixed(6)} | Lng: {selectedLocation.lng.toFixed(6)}
                </span>
              ) : (
                <span>Selecciona un punto en el mapa</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-[12px] text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#111a2b] dark:text-[#f0f0f0] dark:hover:bg-white/[0.06]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedLocation}
                onClick={onConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#ff801f] px-4 py-2 text-[12px] text-black hover:bg-[#ff6a00] disabled:cursor-not-allowed disabled:opacity-50"
              >
                Usar ubicación
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
