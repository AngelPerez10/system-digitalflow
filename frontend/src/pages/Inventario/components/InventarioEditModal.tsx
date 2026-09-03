import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Modal } from "@/components/ui/modal";
import {
  fetchCatalogoDetallePorRef,
  scanInventario,
  searchCatalogo,
  uploadInventarioImagen,
} from "../shared/inventarioApi";
import {
  candidatoRowClass,
  existenciaBadgeClass,
  fuenteBadgeClass,
  inventarioFieldLabelClass,
  inventarioSectionIconClass,
  invInputLikeClass,
  invModalBodyClass,
  invModalEyebrowClass,
  invModalFooterClass,
  invModalHeaderClass,
  invModalHeaderIconClass,
  invModalScrollClass,
  invModalShellClass,
  invModalSubtitleClass,
  invModalTitleClass,
  invPrimaryBtnClass,
  invSecondaryBtnClass,
  invTextareaLikeClass,
} from "../shared/inventarioStyles";
import InventarioFormSection from "./InventarioFormSection";
import InventarioSeccionBadge from "./InventarioSeccionBadge";
import InventarioThumb from "./InventarioThumb";
import {
  BarcodeIcon,
  CheckIcon,
  CloseIcon,
  EntradaIcon,
  LinkIcon,
  PhotoIcon,
  RefreshIcon,
  SalidaIcon,
  SearchIcon,
  TagIcon,
  TrashIcon,
  UploadIcon,
} from "./inventarioIcons";
import type {
  CatalogoCandidato,
  InventarioFuente,
  InventarioItem,
  InventarioItemPatch,
} from "../shared/inventarioTypes";
import { INVENTARIO_SECCIONES } from "../shared/inventarioSecciones";

const MIN_BUSQUEDA = 3;
const MAX_IMAGEN_MB = 8;

function leerComoDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
    reader.readAsDataURL(file);
  });
}

function fuenteLabel(fuente: InventarioFuente | "manual"): string {
  if (fuente === "syscom") return "SYSCOM";
  if (fuente === "tvc") return "TVC";
  if (fuente === "manual") return "Manual";
  return "Sin catálogo";
}

/** El ítem solo persiste syscom/tvc/desconocido; manual se guarda como desconocido + ref. */
function toInventarioFuente(fuente: InventarioFuente | "manual"): InventarioFuente {
  if (fuente === "syscom" || fuente === "tvc") return fuente;
  return "desconocido";
}

type InventarioEditModalProps = {
  open: boolean;
  item: InventarioItem | null;
  saving: boolean;
  /** Permiso inventario.create: meter/sacar ±1 sin escáner (se aplica al Guardar). */
  canAdjustStock?: boolean;
  onClose: () => void;
  onSave: (id: number, patch: InventarioItemPatch) => Promise<void>;
  /** Tras aplicar entradas/salidas pendientes al Guardar. */
  onItemUpdated?: (item: InventarioItem) => void;
};

export default function InventarioEditModal({
  open,
  item,
  saving,
  canAdjustStock = false,
  onClose,
  onSave,
  onItemUpdated,
}: InventarioEditModalProps) {
  const titleId = useId();
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [notas, setNotas] = useState("");
  const [fuente, setFuente] = useState<InventarioFuente>("desconocido");
  const [refExterna, setRefExterna] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [seccion, setSeccion] = useState("");
  /** Existencia ya persistida (al abrir o tras Guardar). */
  const [cantidadGuardada, setCantidadGuardada] = useState(0);
  /** Existencia en pantalla; los ±1 solo se envían al Guardar. */
  const [cantidad, setCantidad] = useState(0);
  const [ajusteAviso, setAjusteAviso] = useState<string | null>(null);
  const [aplicandoExistencia, setAplicandoExistencia] = useState(false);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [imagenError, setImagenError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [termino, setTermino] = useState("");
  const [candidatos, setCandidatos] = useState<CatalogoCandidato[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [busquedaError, setBusquedaError] = useState<string | null>(null);
  const [busquedaHecha, setBusquedaHecha] = useState(false);
  const [refrescando, setRefrescando] = useState(false);
  const [refrescoAviso, setRefrescoAviso] = useState<string | null>(null);
  const [trayendoFicha, setTrayendoFicha] = useState(false);
  const [fichaAviso, setFichaAviso] = useState<string | null>(null);
  // fetchApi convierte un abort en 401, así que descartamos respuestas viejas por secuencia.
  const seqRef = useRef(0);
  // Evita repetir la consulta automática al catálogo mientras el modal sigue abierto.
  const autoCatalogoRef = useRef<number | null>(null);

  /** Rellena solo los campos vacíos: nunca pisa lo que el operador ya capturó. */
  const aplicarDetalle = useCallback((detalle: CatalogoCandidato) => {
    setNombre((prev) => (prev.trim() ? prev : detalle.nombre || prev));
    setMarca((prev) => (prev.trim() ? prev : detalle.marca || prev));
    setModelo((prev) => (prev.trim() ? prev : detalle.modelo || prev));
    setImagenUrl((prev) => (prev.trim() ? prev : detalle.imagen_url || prev));
    setNotas((prev) => (prev.trim() ? prev : detalle.caracteristicas || prev));
    setPrecioUnitario((prev) =>
      prev.trim() ? prev : detalle.precio_unitario?.trim() || prev,
    );
    setSeccion((prev) => (prev.trim() ? prev : detalle.seccion?.trim() || prev));
  }, []);

  useEffect(() => {
    if (!item) return;
    setRefrescoAviso(null);
    setFichaAviso(null);
    setAjusteAviso(null);
    setNombre(item.nombre || "");
    setMarca(item.marca || "");
    setModelo(item.modelo || "");
    setNotas(item.notas || "");
    setFuente(item.fuente || "desconocido");
    setRefExterna(item.ref_externa || "");
    setImagenUrl(item.imagen_url || "");
    setPrecioUnitario(item.precio_unitario != null ? String(item.precio_unitario) : "");
    setSeccion(item.seccion || "");
    setCantidadGuardada(item.cantidad);
    setCantidad(item.cantidad);
    setImagenError(null);
    setError(null);
    setTermino(item.nombre || item.modelo || "");
    setCandidatos([]);
    setBusquedaError(null);
    setBusquedaHecha(false);
    // Solo al abrir otro ítem: un ±1 pendiente no debe pisar campos sin guardar.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset de ficha solo por id
  }, [item?.id]);

  // La búsqueda del catálogo no trae foto ni ficha técnica, solo el detalle; se
  // piden solos al abrir un ítem vinculado al que le falte alguno de los dos.
  useEffect(() => {
    if (!open || !item) return;
    const tieneVinculo = item.fuente !== "desconocido" && item.ref_externa.trim().length > 0;
    const faltaAlgo =
      !item.imagen_url.trim() ||
      !item.notas.trim() ||
      item.precio_unitario == null ||
      item.precio_unitario === "" ||
      !(item.seccion || "").trim();
    if (!tieneVinculo || !faltaAlgo) return;
    if (autoCatalogoRef.current === item.id) return;
    autoCatalogoRef.current = item.id;

    let vigente = true;
    setRefrescando(true);
    fetchCatalogoDetallePorRef(item.fuente, item.ref_externa, item.modelo)
      .then((detalle) => {
        if (vigente && detalle) aplicarDetalle(detalle);
      })
      .catch(() => {
        // Silencioso: el botón "Traer datos del catálogo" permite reintentar.
      })
      .finally(() => {
        if (vigente) setRefrescando(false);
      });

    return () => {
      vigente = false;
    };
  }, [open, item, aplicarDetalle]);

  /** Consulta el detalle del vínculo actual, aunque todavía no esté guardado. */
  const pedirDetalle = useCallback(
    () => fetchCatalogoDetallePorRef(fuente, refExterna, modelo),
    [fuente, refExterna, modelo],
  );

  const refrescarCatalogo = async () => {
    setRefrescando(true);
    setRefrescoAviso(null);
    try {
      const detalle = await pedirDetalle();
      if (!detalle) {
        setRefrescoAviso("El catálogo ya no devuelve este producto.");
        return;
      }
      aplicarDetalle(detalle);
      if (!detalle.imagen_url && !imagenUrl.trim()) {
        setRefrescoAviso("El catálogo no tiene foto para este producto.");
      }
    } catch (e) {
      setRefrescoAviso(e instanceof Error ? e.message : "No se pudo consultar el catálogo");
    } finally {
      setRefrescando(false);
    }
  };

  /** Botón explícito: aquí sí se reemplaza lo que hubiera escrito el operador. */
  const traerCaracteristicas = async () => {
    setTrayendoFicha(true);
    setFichaAviso(null);
    try {
      const detalle = await pedirDetalle();
      if (!detalle) {
        setFichaAviso("El catálogo ya no devuelve este producto.");
        return;
      }
      if (!detalle.caracteristicas.trim()) {
        setFichaAviso(
          fuente === "tvc"
            ? "TVC no publica ficha técnica; captúrala a mano."
            : "El catálogo no tiene características para este producto.",
        );
        return;
      }
      setNotas(detalle.caracteristicas);
      setFichaAviso("Características tomadas del catálogo.");
    } catch (e) {
      setFichaAviso(e instanceof Error ? e.message : "No se pudo consultar el catálogo");
    } finally {
      setTrayendoFicha(false);
    }
  };

  const buscar = useCallback(async (term: string) => {
    const seq = ++seqRef.current;
    setBuscando(true);
    setBusquedaError(null);
    try {
      const data = await searchCatalogo(term);
      if (seq !== seqRef.current) return;
      setCandidatos(data);
      setBusquedaHecha(true);
    } catch (e) {
      if (seq !== seqRef.current) return;
      setCandidatos([]);
      setBusquedaError(e instanceof Error ? e.message : "No se pudo buscar en el catálogo");
    } finally {
      if (seq === seqRef.current) setBuscando(false);
    }
  }, []);

  const vincular = (candidato: CatalogoCandidato) => {
    setNombre(candidato.nombre);
    setMarca(candidato.marca);
    setModelo(candidato.modelo);
    const esManual = candidato.fuente === "manual";
    setFuente(toInventarioFuente(candidato.fuente));
    setRefExterna(
      esManual && !candidato.ref_externa.startsWith("manual:")
        ? `manual:${candidato.ref_externa}`
        : candidato.ref_externa,
    );
    // Solo tomamos la foto del catálogo si el ítem aún no tiene una propia.
    if (candidato.imagen_url && !imagenUrl) setImagenUrl(candidato.imagen_url);
    if (candidato.caracteristicas && !notas.trim()) setNotas(candidato.caracteristicas);
    if (candidato.precio_unitario && !precioUnitario.trim()) {
      setPrecioUnitario(candidato.precio_unitario);
    }
    if (candidato.seccion && !seccion.trim()) {
      setSeccion(candidato.seccion);
    }
    setCandidatos([]);
    setBusquedaHecha(false);
    setFichaAviso(null);

    // Detalle: ficha técnica, precio y sección (la búsqueda suele no traerlos).
    const faltaNotas = !notas.trim() && !candidato.caracteristicas;
    const faltaPrecio = !precioUnitario.trim() && !candidato.precio_unitario;
    const faltaSeccion = !seccion.trim() && !candidato.seccion;
    if (!faltaNotas && !faltaPrecio && !faltaSeccion) return;
    setTrayendoFicha(true);
    fetchCatalogoDetallePorRef(candidato.fuente, candidato.ref_externa, candidato.modelo)
      .then((detalle) => {
        if (!detalle) return;
        if (detalle.caracteristicas) {
          setNotas((prev) => (prev.trim() ? prev : detalle.caracteristicas));
        }
        if (detalle.precio_unitario) {
          setPrecioUnitario((prev) => (prev.trim() ? prev : detalle.precio_unitario || prev));
        }
        if (detalle.seccion) {
          setSeccion((prev) => (prev.trim() ? prev : detalle.seccion || prev));
        }
      })
      .catch(() => {
        // Silencioso: queda el botón "Traer del catálogo" para reintentar.
      })
      .finally(() => setTrayendoFicha(false));
  };

  const deltaExistencia = cantidad - cantidadGuardada;
  const busy = saving || aplicandoExistencia;

  const ajustarExistenciaLocal = (delta: 1 | -1) => {
    if (!canAdjustStock || busy) return;
    setCantidad((prev) => Math.max(0, prev + delta));
    setAjusteAviso(null);
    setError(null);
  };

  const desvincular = () => {
    setFuente("desconocido");
    setRefExterna("");
  };

  const elegirImagen = async (file: File | undefined) => {
    if (!file) return;
    setImagenError(null);
    if (!file.type.startsWith("image/")) {
      setImagenError("El archivo debe ser una imagen.");
      return;
    }
    if (file.size > MAX_IMAGEN_MB * 1024 * 1024) {
      setImagenError(`La imagen no debe pasar de ${MAX_IMAGEN_MB} MB.`);
      return;
    }
    setSubiendoImagen(true);
    try {
      const dataUrl = await leerComoDataUrl(file);
      setImagenUrl(await uploadInventarioImagen(dataUrl));
    } catch (e) {
      setImagenError(e instanceof Error ? e.message : "No se pudo subir la imagen");
    } finally {
      setSubiendoImagen(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setError(null);
    setAjusteAviso(null);
    try {
      // Mismos ±1 que el escáner; se aplican aquí para no tocar el historial hasta Guardar.
      if (deltaExistencia !== 0) {
        if (!canAdjustStock) {
          throw new Error("No tienes permiso para meter o sacar existencia.");
        }
        setAplicandoExistencia(true);
        const modo = deltaExistencia > 0 ? "entrada" : "salida";
        const pasos = Math.abs(deltaExistencia);
        let actualizado = item;
        for (let i = 0; i < pasos; i += 1) {
          const result = await scanInventario(item.codigo_barras, modo);
          actualizado = result.item;
        }
        setCantidadGuardada(actualizado.cantidad);
        setCantidad(actualizado.cantidad);
        onItemUpdated?.(actualizado);
        setAjusteAviso(
          deltaExistencia > 0
            ? `Se registraron ${pasos} entrada${pasos === 1 ? "" : "s"} · existencia ${actualizado.cantidad}`
            : `Se registraron ${pasos} salida${pasos === 1 ? "" : "s"} · existencia ${actualizado.cantidad}`,
        );
      }
      await onSave(item.id, {
        nombre: nombre.trim(),
        marca: marca.trim(),
        modelo: modelo.trim(),
        notas: notas.trim(),
        fuente,
        ref_externa: refExterna.trim(),
        imagen_url: imagenUrl.trim(),
        precio_unitario: precioUnitario.trim() ? precioUnitario.trim() : null,
        seccion: seccion.trim(),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el ítem");
    } finally {
      setAplicandoExistencia(false);
    }
  };

  const vinculado = fuente !== "desconocido" && refExterna.trim().length > 0;
  const terminoValido = termino.trim().length >= MIN_BUSQUEDA;

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      ariaLabelledBy={titleId}
      mobileBottomSheet
      className={invModalShellClass}
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col">
        <header className={invModalHeaderClass}>
          <div className="flex items-start gap-3.5 sm:gap-4">
            <span className={invModalHeaderIconClass} aria-hidden="true">
              <BarcodeIcon className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-2">
                <p className={invModalEyebrowClass}>Operación · Inventario</p>
                {vinculado ? (
                  <span className="inline-flex h-5 items-center rounded-full bg-[rgba(230,162,60,0.22)] px-2 text-[10px] font-semibold uppercase tracking-wide text-[#E6A23C]">
                    Vinculado
                  </span>
                ) : (
                  <span className="inline-flex h-5 items-center rounded-full bg-white/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-white/70">
                    Sin vincular
                  </span>
                )}
              </div>
              <h2 id={titleId} className={`mt-1 sm:mt-1.5 ${invModalTitleClass}`}>
                Ficha del ítem
              </h2>
              {item ? (
                <p className={invModalSubtitleClass}>
                  Código{" "}
                  <span className="font-mono tracking-wide text-white">{item.codigo_barras}</span>{" "}
                  · existencia {cantidad}
                </p>
              ) : null}
            </div>
          </div>
        </header>

        <div className={invModalBodyClass}>
          <div className={invModalScrollClass}>
            <InventarioFormSection
              titleId={`${titleId}-sec-existencia`}
              eyebrow="Existencia"
              title="Meter o sacar"
              hint="Los botones solo cambian el conteo aquí; el historial se escribe al Guardar."
              icon={<BarcodeIcon className={inventarioSectionIconClass} />}
            >
              <div
                className="overflow-hidden rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#1B2539]"
                role="group"
                aria-labelledby={`${titleId}-existencia-label`}
              >
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:p-5">
                  <div className="min-w-0">
                    <p
                      id={`${titleId}-existencia-label`}
                      className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A6B15] dark:text-[#E6A23C]"
                    >
                      En piso ahora
                    </p>
                    <div className="mt-2 flex flex-wrap items-end gap-3">
                      <span
                        className={`${existenciaBadgeClass(cantidad)} !min-w-[3.25rem] !rounded-xl !px-3 !py-1.5 !text-2xl !leading-none`}
                        aria-live="polite"
                        aria-atomic="true"
                      >
                        {cantidad}
                      </span>
                      <div className="pb-0.5">
                        <p className="text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">
                          {cantidad === 1 ? "unidad" : "unidades"}
                        </p>
                        <p className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                          Guardado: {cantidadGuardada}
                          {deltaExistencia !== 0 ? (
                            <span className="ml-1.5 font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                              · pendiente {deltaExistencia > 0 ? `+${deltaExistencia}` : deltaExistencia}
                            </span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                  </div>

                  {canAdjustStock ? (
                    <div className="flex w-full gap-2 sm:w-auto sm:shrink-0">
                      <button
                        type="button"
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#E6A23C]/40 bg-[rgba(230,162,60,0.10)] px-4 text-sm font-semibold text-[#9A6B15] transition-colors hover:bg-[rgba(230,162,60,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E6A23C]/40 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#E6A23C]/30 dark:bg-[rgba(230,162,60,0.12)] dark:text-[#E6A23C] dark:hover:bg-[rgba(230,162,60,0.2)] sm:flex-none sm:min-w-[8.5rem]"
                        onClick={() => ajustarExistenciaLocal(-1)}
                        disabled={busy || !item || cantidad <= 0}
                        aria-label="Salida: restar una unidad (se aplica al guardar)"
                        title={cantidad <= 0 ? "Sin existencia" : "Salida −1 (al Guardar)"}
                      >
                        <SalidaIcon className="h-4 w-4 shrink-0" />
                        Salida
                      </button>
                      <button
                        type="button"
                        className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-[10px] border border-[#04724D] bg-[#04724D] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#035c3e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#04724D]/40 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:min-w-[8.5rem]"
                        onClick={() => ajustarExistenciaLocal(1)}
                        disabled={busy || !item}
                        aria-label="Entrada: sumar una unidad (se aplica al guardar)"
                        title="Entrada +1 (al Guardar)"
                      >
                        <EntradaIcon className="h-4 w-4 shrink-0" />
                        Entrada
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                      Necesitas permiso de crear en Inventario para meter o sacar.
                    </p>
                  )}
                </div>
                {deltaExistencia !== 0 ? (
                  <p
                    className="border-t border-[#E7E7EA] bg-[rgba(230,162,60,0.08)] px-4 py-2.5 text-xs text-[#9A6B15] dark:border-[#273244] dark:bg-[rgba(230,162,60,0.10)] dark:text-[#E6A23C] sm:px-5"
                    role="status"
                    aria-live="polite"
                  >
                    Al guardar se {deltaExistencia > 0 ? "entrarán" : "sacarán"}{" "}
                    {Math.abs(deltaExistencia)} unidad
                    {Math.abs(deltaExistencia) === 1 ? "" : "es"} (mismo historial que el escáner).
                  </p>
                ) : null}
              </div>
              {ajusteAviso ? (
                <p className="mt-2 text-xs text-[#04724D] dark:text-[#4ADE80]" role="status" aria-live="polite">
                  {ajusteAviso}
                </p>
              ) : null}
            </InventarioFormSection>

            <InventarioFormSection
              titleId={`${titleId}-sec-foto`}
              eyebrow="Paso 1"
              title="Foto del producto"
              hint="Ayuda a distinguir productos que comparten empaque."
              icon={<PhotoIcon className={inventarioSectionIconClass} />}
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <InventarioThumb
                  src={imagenUrl}
                  alt={imagenUrl ? `Foto de ${nombre || item?.codigo_barras || "producto"}` : ""}
                  size={88}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
                    {refrescando && !imagenUrl
                      ? "Buscando la foto en el catálogo…"
                      : "Al vincular con el catálogo se toma la foto del proveedor. También puedes subir la tuya."}
                  </p>
                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                    <label
                      className={`${invSecondaryBtnClass} cursor-pointer ${
                        saving || subiendoImagen ? "pointer-events-none opacity-60" : ""
                      }`}
                    >
                      <UploadIcon className="h-4 w-4" />
                      {subiendoImagen ? "Subiendo…" : imagenUrl ? "Cambiar foto" : "Subir foto"}
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        disabled={saving || subiendoImagen}
                        onChange={(e) => void elegirImagen(e.target.files?.[0])}
                      />
                    </label>
                    {imagenUrl ? (
                      <button
                        type="button"
                        className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[10px] px-3 text-sm font-semibold text-[#C22B2B] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(194,43,43,0.3)] dark:text-[#F87171] sm:min-h-0 sm:py-2"
                        onClick={() => setImagenUrl("")}
                        disabled={saving || subiendoImagen}
                      >
                        <TrashIcon className="h-4 w-4" />
                        Quitar foto
                      </button>
                    ) : null}
                  </div>
                  {imagenError ? (
                    <p className="mt-2 text-xs text-[#C22B2B] dark:text-[#F87171]" role="alert">
                      {imagenError}
                    </p>
                  ) : null}
                </div>
              </div>
            </InventarioFormSection>

            {item && (item.folio_factura || item.proveedor_nombre) ? (
              <InventarioFormSection
                titleId={`${titleId}-sec-compra`}
                eyebrow="Compra"
                title="Última factura"
                hint="Se actualiza al importar otra factura de este producto."
                icon={<BarcodeIcon className={inventarioSectionIconClass} />}
              >
                <dl className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <dt className={inventarioFieldLabelClass}>Proveedor</dt>
                    <dd className="mt-1 text-sm text-[#09090B] dark:text-[#F8FAFC]">
                      {item.proveedor_nombre || "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className={inventarioFieldLabelClass}>Folio</dt>
                    <dd className="mt-1 font-mono text-sm text-[#09090B] dark:text-[#F8FAFC]">
                      {item.folio_factura || "—"}
                    </dd>
                  </div>
                </dl>
              </InventarioFormSection>
            ) : null}

            <InventarioFormSection
              titleId={`${titleId}-sec-catalogo`}
              eyebrow="Paso 2"
              title="Vincular con el catálogo"
              hint="Vincula una vez y los siguientes escaneos traerán los datos solos."
              icon={<LinkIcon className={inventarioSectionIconClass} />}
            >
              <p className="text-xs leading-relaxed text-[#52525B] dark:text-[#B7C1D1]">
                SYSCOM y TVC no indexan el código de barras de la caja, solo su propio modelo. Busca
                el producto por nombre o modelo.
              </p>

              {vinculado ? (
                <div className="flex flex-wrap items-center gap-2 rounded-[12px] border border-[#BFE6D4] bg-[#E9F8F0] px-3 py-2 dark:border-[#1E5A42] dark:bg-[#0F2A1C]">
                  <span className="text-[#04724D] dark:text-[#4ADE80]" aria-hidden="true">
                    <CheckIcon className="h-4 w-4" />
                  </span>
                  <span className={fuenteBadgeClass(fuente)}>{fuenteLabel(fuente)}</span>
                  <span className="font-mono text-xs text-[#52525B] dark:text-[#B7C1D1]">
                    ref {refExterna}
                  </span>
                  <div className="ml-auto flex items-center gap-1">
                    <button
                      type="button"
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#04724D] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#04724D]/35 disabled:opacity-60 dark:text-[#4ADE80]"
                      onClick={() => void refrescarCatalogo()}
                      disabled={saving || refrescando}
                    >
                      <RefreshIcon className="h-3.5 w-3.5" />
                      {refrescando ? "Consultando…" : "Traer datos del catálogo"}
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#C22B2B] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(194,43,43,0.3)] dark:text-[#F87171]"
                      onClick={desvincular}
                      disabled={saving}
                    >
                      <CloseIcon className="h-3.5 w-3.5" />
                      Quitar vínculo
                    </button>
                  </div>
                </div>
              ) : null}

              {refrescoAviso ? (
                <p className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]" role="status">
                  {refrescoAviso}
                </p>
              ) : null}

              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <label htmlFor={`${titleId}-buscar`} className="sr-only">
                    Buscar producto en SYSCOM o TVC
                  </label>
                  <span
                    className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748b]"
                    aria-hidden="true"
                  >
                    <SearchIcon className="h-4 w-4" />
                  </span>
                  <input
                    id={`${titleId}-buscar`}
                    type="search"
                    value={termino}
                    onChange={(e) => setTermino(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        if (terminoValido && !buscando) void buscar(termino);
                      }
                    }}
                    placeholder="Ej. DS-2CD1023G0E-I o videoportero"
                    className={`${invInputLikeClass} !pl-10`}
                    disabled={saving}
                  />
                </div>
                <button
                  type="button"
                  className={invSecondaryBtnClass}
                  onClick={() => void buscar(termino)}
                  disabled={saving || buscando || !terminoValido}
                >
                  <SearchIcon className="h-4 w-4" />
                  {buscando ? "Buscando…" : "Buscar"}
                </button>
              </div>

              {!terminoValido && termino.trim().length > 0 ? (
                <p className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                  Escribe al menos {MIN_BUSQUEDA} caracteres.
                </p>
              ) : null}

              {busquedaError ? (
                <p className="text-xs text-[#C22B2B] dark:text-[#F87171]" role="alert">
                  {busquedaError}
                </p>
              ) : null}

              <div aria-live="polite" aria-atomic="true">
                {buscando ? (
                  <div
                    className="relative overflow-hidden rounded-[12px] border border-[#E7E7EA] bg-white dark:border-[#273244] dark:bg-[#0f172a]"
                    role="status"
                    aria-busy="true"
                  >
                    <span className="absolute inset-y-0 left-0 w-1 bg-[#1B5CFF] dark:bg-[#4B7CFF]" aria-hidden />
                    <div className="flex items-start gap-3 px-4 py-3.5 pl-5">
                      <span className="relative mt-0.5 flex size-10 shrink-0 items-center justify-center">
                        <span
                          className="absolute -inset-0.5 rounded-[12px] border-2 border-[#1B5CFF]/45 motion-safe:animate-ping"
                          aria-hidden
                        />
                        <span
                          className="relative flex size-10 items-center justify-center rounded-[12px] bg-[#1B5CFF] text-white dark:bg-[#4B7CFF]"
                          aria-hidden
                        >
                          <SearchIcon className="h-4 w-4" />
                        </span>
                      </span>
                      <div className="min-w-0">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#1B5CFF] dark:text-[#4B7CFF]">
                          Escaneando
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                          Buscando en SYSCOM y TVC
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-[#6E6E77] dark:text-[#8EA0B8]">
                          El catálogo puede tardar unos segundos. No cierres el diálogo.
                        </p>
                      </div>
                    </div>
                    <div
                      className="mx-4 mb-3 h-1 overflow-hidden rounded-full bg-[#E7E7EA] dark:bg-[#273244]"
                      aria-hidden
                    >
                      <div className="h-full w-[62%] rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF] motion-safe:animate-pulse" />
                    </div>
                  </div>
                ) : candidatos.length > 0 ? (
                  <ul className="max-h-64 space-y-2 overflow-y-auto pr-1 custom-scrollbar">
                    {candidatos.map((c) => (
                      <li key={`${c.fuente}-${c.ref_externa}-${c.modelo}`}>
                        <button
                          type="button"
                          className={candidatoRowClass}
                          onClick={() => vincular(c)}
                          disabled={saving}
                        >
                          <InventarioThumb src={c.imagen_url} alt="" size={40} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">
                              {c.nombre || c.modelo}
                            </span>
                            <span className="mt-0.5 block truncate text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                              {[c.marca, c.modelo].filter(Boolean).join(" · ") || "Sin modelo"}
                            </span>
                          </span>
                          <span className={fuenteBadgeClass(c.fuente === "manual" ? "desconocido" : c.fuente)}>
                            {fuenteLabel(c.fuente)}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : busquedaHecha && !buscando ? (
                  <p className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                    Sin resultados en SYSCOM ni TVC. Captura los datos a mano abajo.
                  </p>
                ) : null}
              </div>
            </InventarioFormSection>

            <InventarioFormSection
              titleId={`${titleId}-sec-datos`}
              eyebrow="Paso 3"
              title="Datos del producto"
              hint="Puedes ajustarlos aunque el ítem venga del catálogo."
              icon={<TagIcon className={inventarioSectionIconClass} />}
            >
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label htmlFor={`${titleId}-nombre`} className={inventarioFieldLabelClass}>
                    Nombre
                  </label>
                  <input
                    id={`${titleId}-nombre`}
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className={invInputLikeClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor={`${titleId}-marca`} className={inventarioFieldLabelClass}>
                    Marca
                  </label>
                  <input
                    id={`${titleId}-marca`}
                    type="text"
                    value={marca}
                    onChange={(e) => setMarca(e.target.value)}
                    className={invInputLikeClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor={`${titleId}-modelo`} className={inventarioFieldLabelClass}>
                    Modelo
                  </label>
                  <input
                    id={`${titleId}-modelo`}
                    type="text"
                    value={modelo}
                    onChange={(e) => setModelo(e.target.value)}
                    className={invInputLikeClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor={`${titleId}-precio`} className={inventarioFieldLabelClass}>
                    Precio unitario (MXN)
                  </label>
                  <input
                    id={`${titleId}-precio`}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={precioUnitario}
                    onChange={(e) => setPrecioUnitario(e.target.value)}
                    placeholder="Del catálogo o captura manual"
                    className={invInputLikeClass}
                    disabled={saving}
                  />
                </div>
                <div>
                  <label htmlFor={`${titleId}-seccion`} className={inventarioFieldLabelClass}>
                    Sección
                  </label>
                  <select
                    id={`${titleId}-seccion`}
                    value={seccion}
                    onChange={(e) => setSeccion(e.target.value)}
                    className={invInputLikeClass}
                    disabled={busy}
                    aria-describedby={`${titleId}-seccion-hint`}
                  >
                    <option value="">Sin sección</option>
                    {INVENTARIO_SECCIONES.map((s) => (
                      <option key={s.slug} value={s.slug}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <InventarioSeccionBadge seccion={seccion || null} showEmpty />
                    <p
                      id={`${titleId}-seccion-hint`}
                      className="text-xs text-[#6E6E77] dark:text-[#8EA0B8]"
                    >
                      {seccion
                        ? "Puedes corregirla si el catálogo no acertó."
                        : "Se intenta llenar desde el catálogo; puedes asignarla aquí."}
                    </p>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={`${titleId}-notas`} className={inventarioFieldLabelClass}>
                      Características y notas
                    </label>
                    {vinculado ? (
                      <button
                        type="button"
                        className="inline-flex min-h-[32px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#1B5CFF] underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(27,92,255,0.3)] disabled:opacity-60 dark:text-[#4B7CFF]"
                        onClick={() => void traerCaracteristicas()}
                        disabled={saving || trayendoFicha}
                      >
                        <RefreshIcon className="h-3.5 w-3.5" />
                        {trayendoFicha ? "Consultando…" : "Traer del catálogo"}
                      </button>
                    ) : null}
                  </div>
                  <textarea
                    id={`${titleId}-notas`}
                    value={notas}
                    onChange={(e) => setNotas(e.target.value)}
                    className={invTextareaLikeClass}
                    disabled={saving}
                    rows={6}
                    placeholder={
                      trayendoFicha
                        ? "Buscando la ficha técnica en el catálogo…"
                        : "Ficha técnica del producto: una característica por renglón."
                    }
                  />
                  <p className="mt-1.5 text-xs text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
                    {fichaAviso ??
                      (vinculado
                        ? "Se llenan solas con la ficha de SYSCOM o TVC; puedes corregirlas o escribir las tuyas."
                        : "Captura aquí las características del producto o vincúlalo con el catálogo para traerlas.")}
                  </p>
                </div>
              </div>
            </InventarioFormSection>

            {error ? (
              <p className="text-sm text-[#C22B2B] dark:text-[#F87171]" role="alert">
                {error}
              </p>
            ) : null}
          </div>
        </div>

        <footer className={invModalFooterClass}>
          <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end sm:gap-3">
            <button type="button" className={invSecondaryBtnClass} onClick={onClose} disabled={busy}>
              <CloseIcon className="h-4 w-4" />
              Cancelar
            </button>
            <button type="submit" className={invPrimaryBtnClass} disabled={busy || !item}>
              <CheckIcon className="h-4 w-4" />
              {aplicandoExistencia
                ? "Registrando existencia…"
                : saving
                  ? "Guardando…"
                  : deltaExistencia !== 0
                    ? `Guardar (${deltaExistencia > 0 ? "+" : ""}${deltaExistencia})`
                    : "Guardar"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}
