/**
 * Elegir una ubicación en el mapa (Leaflet + OpenStreetMap, cargado bajo
 * demanda con SRI).
 *
 * - Mapa a todo lo ancho; se marca con un toque/clic o arrastrando el pin.
 *   «Mi ubicación» centra en la posición del dispositivo. No se muestran
 *   coordenadas: el resultado es una liga de Google Maps en el formulario
 *   (que también acepta una liga pegada a mano, la alternativa sin ratón).
 * - Si el domicilio no trae coordenadas no hay punto preseleccionado: no se
 *   puede confirmar sin elegir (antes se guardaba el centro por omisión).
 * - El mapa se crea al abrir y se destruye al cerrar o desmontar; una carga
 *   que termina después de cerrar ya no crea un mapa huérfano.
 */
import { useEffect, useId, useRef, useState } from "react";
import { CircleCheck, ExternalLink, LocateFixed, MapPin, MousePointerClick } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { ModalHeader, Spinner } from "../ui/FormUi";
import { btnPrimary, btnSecondary, focusRing, formFont, modalFooterClass } from "../ui/tokens";
import { mapsUrlForCoords, parseCoords } from "../domain/clienteLinks";
import { leaflet, loadLeaflet, placeMarker, type LatLng, type LeafletMapLike, type LeafletMarkerLike } from "./leaflet";

/** Centro de la vista cuando no hay punto: Manzanillo, Colima. */
const DEFAULT_CENTER: LatLng = { lat: 19.0653, lng: -104.2831 };
const DEFAULT_ZOOM = 13;
const PICKED_ZOOM = 16;

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

/** Capa flotante sobre el mapa (por encima de los paneles de Leaflet, z ≤ 1000). */
const overlayCard =
  "rounded-full border border-black/5 bg-white/95 shadow-[0_6px_20px_-8px_rgba(9,9,11,0.35)] backdrop-blur-sm dark:border-white/10 dark:bg-[#111827]/95";

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
  const titleId = useId();
  const descId = useId();
  const mapRef = useRef<LeafletMapLike | null>(null);
  const markerRef = useRef<LeafletMarkerLike | null>(null);
  const zoomRef = useRef(DEFAULT_ZOOM);
  // Las props cambian en cada render del padre; el efecto de carga solo debe correr al abrir.
  const latest = useRef({ direccion, setSelectedLocation, onMapError });
  useEffect(() => {
    latest.current = { direccion, setSelectedLocation, onMapError };
  });

  const [loading, setLoading] = useState(false);
  const [locating, setLocating] = useState(false);
  const [geoError, setGeoError] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    setLoading(true);
    setGeoError("");

    const { direccion: dir, setSelectedLocation: select } = latest.current;
    // Solo hay punto inicial si el domicilio ya trae coordenadas.
    const start = parseCoords(dir);
    select(start);
    zoomRef.current = start ? PICKED_ZOOM : DEFAULT_ZOOM;
    const center = start ?? DEFAULT_CENTER;

    loadLeaflet()
      .then((L) => {
        if (cancelled) return;
        const container = document.getElementById(mapContainerId);
        if (!container) return;
        const map = L.map(container).setView([center.lat, center.lng], zoomRef.current);
        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap",
        }).addTo(map);
        map.on("zoomend", () => {
          zoomRef.current = map.getZoom();
        });
        map.on("click", (e) => latest.current.setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng }));
        mapRef.current = map;
        if (start) markerRef.current = placeMarker(L, map, start, (p) => latest.current.setSelectedLocation(p));
        // El panel entra con una animación: recalcula el tamaño cuando termina.
        window.setTimeout(() => {
          if (!cancelled) map.invalidateSize();
        }, 220);
      })
      .catch(() => {
        if (!cancelled) latest.current.onMapError?.("No se pudo cargar el mapa. Pega una liga de Google Maps en el campo de ubicación.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      try {
        mapRef.current?.remove();
      } catch {
        /* el contenedor ya no existe */
      }
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [isOpen, mapContainerId]);

  // Mueve (o crea) el pin al cambiar el punto.
  useEffect(() => {
    const L = leaflet();
    const map = mapRef.current;
    if (!map || !selectedLocation || !L) return;
    if (markerRef.current) markerRef.current.setLatLng([selectedLocation.lat, selectedLocation.lng]);
    else markerRef.current = placeMarker(L, map, selectedLocation, (p) => latest.current.setSelectedLocation(p));
    map.setView([selectedLocation.lat, selectedLocation.lng], Math.max(zoomRef.current, PICKED_ZOOM - 1));
  }, [selectedLocation]);

  const useMyLocation = () => {
    if (!("geolocation" in navigator)) {
      setGeoError("Este navegador no permite obtener tu ubicación.");
      return;
    }
    setLocating(true);
    setGeoError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocating(false);
        zoomRef.current = PICKED_ZOOM;
        setSelectedLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLocating(false);
        setGeoError(err.code === err.PERMISSION_DENIED ? "Permiso de ubicación denegado." : "No se pudo obtener tu ubicación.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <Modal
      mobileBottomSheet
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={false}
      closeOnBackdropClick={false}
      ariaLabelledBy={titleId}
      ariaDescribedBy={descId}
      className="flex max-h-[92dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.35)] dark:border-[#273244] dark:!bg-[#111827] sm:rounded-[20px]"
    >
      <div className="flex min-h-0 flex-1 flex-col" style={formFont}>
        <ModalHeader
          icon={<MapPin className="size-5" />}
          eyebrow="Domicilio"
          title="Ubicación en el mapa"
          subtitle="Toca el mapa o arrastra el pin hasta el lugar exacto."
          titleId={titleId}
          descId={descId}
          onClose={onClose}
        />

        <div className="relative isolate min-h-0 flex-1 bg-[#EEF0F3] dark:bg-[#0d1420]">
          <div id={mapContainerId} className="h-[min(62dvh,520px)] w-full" aria-hidden />

          {/* Indicación flotante (no recibe clics). */}
          {!loading && !selectedLocation ? (
            <div className="pointer-events-none absolute inset-x-0 top-3 z-[1000] flex justify-center px-14">
              <p className={`${overlayCard} cot-pop inline-flex items-center gap-2 px-3.5 py-2 text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]`}>
                <MousePointerClick className="size-4 text-[#1B5CFF] dark:text-[#7FA2FF]" aria-hidden />
                Toca el mapa para marcar el lugar
              </p>
            </div>
          ) : null}

          <div className="absolute bottom-4 right-3 z-[1000] flex flex-col items-end gap-2">
            {geoError ? (
              <p role="alert" className={`${overlayCard} cot-pop px-3.5 py-2 text-[12.5px] font-medium text-[#B42318] dark:text-[#FCA5A5]`}>
                {geoError}
              </p>
            ) : null}
            <button
              type="button"
              onClick={useMyLocation}
              disabled={locating || loading}
              className={`${overlayCard} cot-press inline-flex h-11 items-center gap-2 px-4 text-[13.5px] font-semibold text-[#17235B] hover:bg-white disabled:opacity-60 dark:text-[#F8FAFC] dark:hover:bg-[#151E32] ${focusRing}`}
            >
              {locating ? <Spinner /> : <LocateFixed className="size-4 text-[#1B5CFF] dark:text-[#7FA2FF]" aria-hidden />}
              {locating ? "Buscando…" : "Mi ubicación"}
            </button>
          </div>

          {loading ? (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-[#EEF0F3]/70 backdrop-blur-[2px] dark:bg-[#0d1420]/70" role="status">
              <span className={`${overlayCard} inline-flex items-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#52525B] dark:text-[#B7C1D1]`}>
                <Spinner />
                Cargando mapa…
              </span>
            </div>
          ) : null}
        </div>

        <div className={modalFooterClass}>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0" aria-live="polite">
              {selectedLocation ? (
                <p className="cot-fade flex flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
                  <span className="inline-flex items-center gap-1.5 font-medium text-[#04724D] dark:text-[#4ADE80]">
                    <CircleCheck className="size-4" aria-hidden />
                    Lugar marcado
                  </span>
                  <a
                    href={mapsUrlForCoords(selectedLocation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`inline-flex items-center gap-1 rounded-[6px] text-[12.5px] font-medium text-[#1244D1] hover:underline dark:text-[#7FA2FF] ${focusRing}`}
                  >
                    Verificar en Google Maps
                    <ExternalLink className="size-3.5" aria-hidden />
                    <span className="sr-only"> (abre en una pestaña nueva)</span>
                  </a>
                </p>
              ) : (
                <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]">Aún no has marcado un lugar.</p>
              )}
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row">
              <button type="button" onClick={onClose} className={btnSecondary}>
                Cancelar
              </button>
              <button type="button" onClick={onConfirm} disabled={!selectedLocation} className={btnPrimary}>
                <MapPin className="size-4" aria-hidden />
                Usar esta ubicación
              </button>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}
