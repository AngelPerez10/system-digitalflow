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
      className="w-[94vw] max-w-3xl overflow-hidden rounded-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827]"
    >
      <div>
        <div className="relative bg-[#17235B] px-5 pb-4 pt-5 dark:bg-[#1B2A63]">
          <div className="flex items-center gap-3">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C]">
              <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path
                  d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <div>
              <h5 className="text-[17px] font-semibold leading-[1.3] tracking-[-0.3px] text-white">Seleccionar ubicación</h5>
              <p className="mt-0.5 text-[13px] text-white/70">Haz clic en el mapa para seleccionar la ubicación.</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 dark:bg-[#111827]">
          <div className="overflow-hidden rounded-[14px] border border-[#E7E7EA] dark:border-[#273244]">
            <div id={mapContainerId} className="w-full" style={{ height: 420 }} />
          </div>
          <div className="mt-4 flex items-center justify-between gap-3">
            <div className="text-[13px] text-[#52525B] dark:text-[#B7C1D1]">
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
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#E7E7EA] bg-white px-4 text-[14px] font-medium text-[#09090B] transition-colors hover:border-[#D3D3D8] hover:bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#151E32] dark:text-[#F8FAFC] dark:hover:border-[#3A4661] dark:hover:bg-[#243048]"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={!selectedLocation}
                onClick={onConfirm}
                className="inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-[#1B5CFF] bg-[#1B5CFF] px-4 text-[14px] font-medium text-white transition-colors hover:border-[#1244D1] hover:bg-[#1244D1] disabled:cursor-not-allowed disabled:border-[#DCE7FF] disabled:bg-[#DCE7FF] disabled:text-[#2F4899] dark:border-[#4B7CFF] dark:bg-[#4B7CFF] dark:hover:border-[#3B6AF0] dark:hover:bg-[#3B6AF0]"
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
