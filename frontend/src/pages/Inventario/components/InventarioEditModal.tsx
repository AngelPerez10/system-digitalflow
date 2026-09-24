/**
 * Ficha del producto (editar).
 *
 * Estructura:
 *  - Cabecera marina centrada en el producto (foto, nombre, código, proveedor, ubicación).
 *  - Indicadores: Existencia · Costo · Precio de venta (se actualiza desde SYSCOM/TVC) · Margen.
 *  - Pestañas: Datos · Catálogo · Existencia · Historial. Los paneles quedan montados
 *    (salvo Historial, que carga al abrirse) para no perder lo capturado al cambiar.
 *  - Pie con estado de cambios y acciones.
 *
 * Movimiento: indicadores con entrada escalonada (`cot-rise`), panel que aparece con
 * `cot-fade`, indicador de pestaña deslizante y cifras que se re-montan (`cot-flash`).
 * Solo `transform`/`opacity`; todo se apaga con `prefers-reduced-motion`.
 */
import { useCallback, useEffect, useId, useMemo, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  History,
  ImagePlus,
  Link2,
  Loader2,
  Minus,
  Package,
  Plus,
  RefreshCw,
  Search,
  Tag,
  Trash2,
  TrendingDown,
  TrendingUp,
  Unlink,
  X,
} from "lucide-react";
import { Modal } from "@/components/ui/modal";
import "@/components/ui/modal-kit/motion.css";
import {
  actualizarPrecioMercado,
  fetchCatalogoDetallePorRef,
  scanInventario,
  searchCatalogo,
  uploadInventarioImagen,
} from "../shared/inventarioApi";
import {
  candidatoRowClass,
  fuenteBadgeClass,
  inventarioFieldLabelClass,
  inventarioSansStyle,
  invInputLikeClass,
  invNotaSalidaTextareaClass,
  invPrimaryBtnClass,
  invSecondaryBtnClass,
  invTextareaLikeClass,
} from "../shared/inventarioStyles";
import { esDeProveedor, formatMxn, formatPct, precioMercadoInfo } from "../shared/precioMercado";
import InventarioItemHistorialTab from "./InventarioItemHistorialTab";
import { UbicacionBadge, UbicacionPicker } from "./InventarioUbicacion";
import InventarioSeccionBadge from "./InventarioSeccionBadge";
import InventarioThumb from "./InventarioThumb";
import type {
  CatalogoCandidato,
  InventarioFuente,
  InventarioItem,
  InventarioItemPatch,
  InventarioUbicacion,
} from "../shared/inventarioTypes";
import { INVENTARIO_SECCIONES } from "../shared/inventarioSecciones";

const MIN_BUSQUEDA = 3;
const MAX_IMAGEN_MB = 8;
const NOTA_MAX = 255;

type ModalTab = "datos" | "catalogo" | "existencia" | "historial";

const MODAL_TABS: { id: ModalTab; label: string; icon: ReactNode }[] = [
  { id: "datos", label: "Datos", icon: <Tag className="size-4" aria-hidden /> },
  { id: "catalogo", label: "Catálogo", icon: <Link2 className="size-4" aria-hidden /> },
  { id: "existencia", label: "Existencia", icon: <Package className="size-4" aria-hidden /> },
  { id: "historial", label: "Historial", icon: <History className="size-4" aria-hidden /> },
];

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

const linkBtnClass =
  "inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:opacity-60";

type InventarioEditModalProps = {
  open: boolean;
  item: InventarioItem | null;
  saving: boolean;
  /** Permiso inventario.create: meter/sacar ±1 sin escáner (se aplica al Guardar). */
  canAdjustStock?: boolean;
  onClose: () => void;
  onSave: (id: number, patch: InventarioItemPatch) => Promise<void>;
  /** El precio de venta se consultó de nuevo (para refrescar la tabla). */
  onPrecioMercadoActualizado?: (item: InventarioItem) => void;
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
  onPrecioMercadoActualizado,
}: InventarioEditModalProps) {
  const titleId = useId();
  const [modalTab, setModalTab] = useState<ModalTab>("datos");
  const [historialRefreshKey, setHistorialRefreshKey] = useState(0);
  const [notaSalida, setNotaSalida] = useState("");
  const [nombre, setNombre] = useState("");
  const [marca, setMarca] = useState("");
  const [modelo, setModelo] = useState("");
  const [notas, setNotas] = useState("");
  const [fuente, setFuente] = useState<InventarioFuente>("desconocido");
  const [refExterna, setRefExterna] = useState("");
  const [imagenUrl, setImagenUrl] = useState("");
  const [precioUnitario, setPrecioUnitario] = useState("");
  const [seccion, setSeccion] = useState("");
  const [ubicacion, setUbicacion] = useState<InventarioUbicacion | "">("");
  /** Precio de venta en pantalla (se refresca con «Actualizar» sin cerrar la ficha). */
  const [mercado, setMercado] = useState<InventarioItem | null>(null);
  const [consultandoMercado, setConsultandoMercado] = useState(false);
  const [mercadoError, setMercadoError] = useState<string | null>(null);
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
    setPrecioUnitario((prev) => (prev.trim() ? prev : detalle.precio_unitario?.trim() || prev));
    setSeccion((prev) => (prev.trim() ? prev : detalle.seccion?.trim() || prev));
  }, []);

  useEffect(() => {
    if (!item) return;
    setModalTab("datos");
    setNotaSalida("");
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
    setUbicacion(item.ubicacion || "");
    setMercado(item);
    setMercadoError(null);
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
      setRefrescoAviso(
        !detalle.imagen_url && !imagenUrl.trim()
          ? "El catálogo no tiene foto para este producto."
          : "Datos vacíos completados desde el catálogo.",
      );
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
    if (candidato.precio_unitario && !precioUnitario.trim()) setPrecioUnitario(candidato.precio_unitario);
    if (candidato.seccion && !seccion.trim()) setSeccion(candidato.seccion);
    setCandidatos([]);
    setBusquedaHecha(false);
    setFichaAviso(null);
    setRefrescoAviso(`Vinculado con ${fuenteLabel(candidato.fuente)}. Revisa los datos y guarda.`);

    // Detalle: ficha técnica, precio y sección (la búsqueda suele no traerlos).
    const faltaNotas = !notas.trim() && !candidato.caracteristicas;
    const faltaPrecio = !precioUnitario.trim() && !candidato.precio_unitario;
    const faltaSeccion = !seccion.trim() && !candidato.seccion;
    if (!faltaNotas && !faltaPrecio && !faltaSeccion) return;
    setTrayendoFicha(true);
    fetchCatalogoDetallePorRef(candidato.fuente, candidato.ref_externa, candidato.modelo)
      .then((detalle) => {
        if (!detalle) return;
        if (detalle.caracteristicas) setNotas((prev) => (prev.trim() ? prev : detalle.caracteristicas));
        if (detalle.precio_unitario) {
          setPrecioUnitario((prev) => (prev.trim() ? prev : detalle.precio_unitario || prev));
        }
        if (detalle.seccion) setSeccion((prev) => (prev.trim() ? prev : detalle.seccion || prev));
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
    setRefrescoAviso(null);
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
          const result = await scanInventario(item.codigo_barras, modo, modo === "salida" ? notaSalida : undefined);
          actualizado = result.item;
        }
        setCantidadGuardada(actualizado.cantidad);
        setCantidad(actualizado.cantidad);
        onItemUpdated?.(actualizado);
        setHistorialRefreshKey((k) => k + 1);
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
        // Una vez asignada no se puede vaciar; solo se envía si hay una.
        ...(ubicacion ? { ubicacion } : {}),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el ítem");
    } finally {
      setAplicandoExistencia(false);
    }
  };

  const vinculado = fuente !== "desconocido" && refExterna.trim().length > 0;

  const consultarMercado = async () => {
    if (!item) return;
    setConsultandoMercado(true);
    setMercadoError(null);
    try {
      const actualizado = await actualizarPrecioMercado(item.id);
      setMercado(actualizado);
      onPrecioMercadoActualizado?.(actualizado);
    } catch (e) {
      setMercadoError(e instanceof Error ? e.message : "No se pudo consultar el precio");
    } finally {
      setConsultandoMercado(false);
    }
  };
  const terminoValido = termino.trim().length >= MIN_BUSQUEDA;

  /** Hay algo sin guardar (campos o existencia). */
  const dirty = useMemo(() => {
    if (!item) return false;
    return (
      deltaExistencia !== 0 ||
      nombre.trim() !== (item.nombre || "").trim() ||
      marca.trim() !== (item.marca || "").trim() ||
      modelo.trim() !== (item.modelo || "").trim() ||
      notas.trim() !== (item.notas || "").trim() ||
      fuente !== (item.fuente || "desconocido") ||
      refExterna.trim() !== (item.ref_externa || "").trim() ||
      imagenUrl.trim() !== (item.imagen_url || "").trim() ||
      precioUnitario.trim() !== (item.precio_unitario != null ? String(item.precio_unitario) : "") ||
      seccion !== (item.seccion || "") ||
      ubicacion !== (item.ubicacion || "")
    );
  }, [item, deltaExistencia, nombre, marca, modelo, notas, fuente, refExterna, imagenUrl, precioUnitario, seccion, ubicacion]);

  const tabIdFor = (id: ModalTab) => `${titleId}-tab-${id}`;
  const panelIdFor = (id: ModalTab) => `${titleId}-panel-${id}`;
  const tabIndex = MODAL_TABS.findIndex((t) => t.id === modalTab);

  const onModalTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const last = MODAL_TABS.length - 1;
    let next = index;
    if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
    else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = last;
    else return;
    event.preventDefault();
    const nextTab = MODAL_TABS[next];
    setModalTab(nextTab.id);
    window.requestAnimationFrame(() => document.getElementById(tabIdFor(nextTab.id))?.focus());
  };

  /* Indicadores (precio de venta con el precio de lista más reciente) */
  const precioItem = mercado
    ? { ...mercado, precio_unitario: precioUnitario.trim() ? precioUnitario.trim() : null }
    : null;
  const info = precioItem ? precioMercadoInfo(precioItem) : null;
  const deProveedor = mercado ? esDeProveedor(mercado) : false;

  const tabAviso: Partial<Record<ModalTab, "rojo" | "dorado">> = {
    ...(ubicacion ? {} : { datos: "rojo" as const }),
    ...(deltaExistencia !== 0 ? { existencia: "dorado" as const } : {}),
  };

  const nombreVisible = nombre.trim() || "Producto sin identificar";

  return (
    <Modal
      isOpen={open}
      onClose={() => !busy && onClose()}
      closeOnEscape={!busy}
      closeOnBackdropClick={false}
      showCloseButton={false}
      ariaLabelledBy={titleId}
      mobileBottomSheet
      className="flex max-h-[min(94dvh,920px)] w-full flex-col overflow-hidden rounded-t-[20px] border border-[#E7E7EA] bg-white! p-0 shadow-[0_24px_60px_-20px_rgba(9,9,11,0.4)] dark:border-[#273244] dark:bg-[#111827]! sm:w-[min(96vw,58rem)] sm:max-w-4xl sm:rounded-[20px]"
    >
      <form onSubmit={(e) => void handleSubmit(e)} className="flex min-h-0 flex-1 flex-col" style={inventarioSansStyle}>
        {/* ---------------- Cabecera ---------------- */}
        <header className="relative shrink-0 overflow-hidden bg-[#17235B] px-5 pb-5 pt-5 dark:bg-[#1B2A63] sm:px-6">
          <div className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl" aria-hidden />
          <div className="relative flex items-start gap-4 pr-12">
            <span className="shrink-0 rounded-[14px] bg-white p-1 shadow-[0_6px_16px_-8px_rgba(0,0,0,0.5)]">
              <InventarioThumb src={imagenUrl} alt="" size={56} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/55">Ficha del producto</p>
              <h2 id={titleId} className="mt-1 line-clamp-2 text-[19px] font-semibold leading-[1.25] tracking-[-0.4px] text-white sm:text-[21px]">
                {nombreVisible}
              </h2>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                {item ? (
                  <span className="inline-flex h-6 items-center rounded-md bg-white/10 px-2 font-mono text-[12px] tracking-wide text-white/85">
                    {item.codigo_barras}
                  </span>
                ) : null}
                <span
                  className={`inline-flex h-6 items-center gap-1 rounded-full px-2.5 text-[11px] font-semibold ${
                    vinculado ? "bg-[rgba(230,162,60,0.22)] text-[#F0B454]" : "bg-white/10 text-white/70"
                  }`}
                >
                  {vinculado ? <Link2 className="size-3" aria-hidden /> : <Unlink className="size-3" aria-hidden />}
                  {vinculado ? fuenteLabel(fuente) : "Sin vincular"}
                </span>
                <UbicacionBadge value={ubicacion} />
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Cerrar ventana"
            className="absolute right-4 top-4 inline-flex size-10 items-center justify-center rounded-[10px] text-white/70 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60 disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </header>

        {/* ---------------- Indicadores ---------------- */}
        <div className="grid shrink-0 grid-cols-2 gap-2 border-b border-[#E7E7EA] bg-[#FAFAFA] px-5 py-3.5 dark:border-[#273244] dark:bg-[#151E32] sm:grid-cols-4 sm:gap-3 sm:px-6">
          <Kpi i={0} label="Existencia">
            <span key={cantidad} className="cot-flash inline-block text-[20px] font-semibold tabular-nums tracking-[-0.4px] text-[#09090B] dark:text-[#F8FAFC]">
              {cantidad}
            </span>
            {deltaExistencia !== 0 ? (
              <span className="ml-1.5 text-[12px] font-semibold text-[#9A6B15] dark:text-[#E6A23C]">
                {deltaExistencia > 0 ? `+${deltaExistencia}` : deltaExistencia} al guardar
              </span>
            ) : (
              <span className="ml-1.5 text-[12px] text-[#6E6E77] dark:text-[#8EA0B8]">{cantidad === 1 ? "unidad" : "unidades"}</span>
            )}
          </Kpi>
          <Kpi i={1} label="Costo" sub={item?.folio_factura ? `Factura ${item.folio_factura}` : "Lo que te costó"}>
            <span className="text-[17px] font-semibold tabular-nums tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
              {formatMxn(precioUnitario) ?? "—"}
            </span>
          </Kpi>
          <Kpi
            i={2}
            label="Precio de venta"
            sub={
              mercadoError ??
              (deProveedor ? `Lista ${fuenteLabel(mercado?.fuente ?? "desconocido")} · con IVA` : "Solo SYSCOM o TVC")
            }
            subTone={mercadoError ? "error" : undefined}
            action={
              deProveedor ? (
                <button
                  type="button"
                  onClick={() => void consultarMercado()}
                  disabled={consultandoMercado || busy}
                  aria-label="Actualizar precio de venta desde el proveedor"
                  title="Consultar ahora el precio de lista"
                  className="inline-flex size-7 items-center justify-center rounded-md text-[#1B5CFF] transition-colors hover:bg-[rgba(27,92,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 disabled:opacity-50 dark:text-[#7EA0FF]"
                >
                  <RefreshCw className={`size-3.5 ${consultandoMercado ? "animate-spin" : ""}`} aria-hidden />
                </button>
              ) : null
            }
          >
            <span className="inline-flex items-center gap-1.5">
              <span key={info?.mercado ?? "x"} className="cot-flash inline-block text-[17px] font-semibold tabular-nums tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                {deProveedor ? (formatMxn(info?.mercado) ?? "Consultando…") : "—"}
              </span>
              {info?.tendencia === "sube" || info?.tendencia === "baja" ? (
                <span
                  className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-px text-[10px] font-bold ${
                    info.tendencia === "sube"
                      ? "bg-[#E9F8F0] text-[#04724D] dark:bg-[#0F2A1C] dark:text-[#4ADE80]"
                      : "bg-[#FEF2F2] text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]"
                  }`}
                  title={`Antes ${formatMxn(mercado?.precio_mercado_anterior)}`}
                >
                  {info.tendencia === "sube" ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
                  {formatPct(info.variacionPct)}
                </span>
              ) : null}
            </span>
          </Kpi>
          <Kpi i={3} label="Margen" sub={info?.vsCostoPct != null ? "Precio de venta vs. costo" : "Falta costo o precio"}>
            <span
              className={`text-[17px] font-semibold tabular-nums tracking-[-0.3px] ${
                info?.vsCostoPct == null
                  ? "text-[#A1A1AA] dark:text-[#64748B]"
                  : info.vsCostoPct >= 0
                    ? "text-[#04724D] dark:text-[#4ADE80]"
                    : "text-[#C22B2B] dark:text-[#F87171]"
              }`}
            >
              {info?.vsCostoPct != null ? formatPct(info.vsCostoPct) : "—"}
            </span>
          </Kpi>
        </div>

        {/* ---------------- Pestañas ---------------- */}
        <div className="shrink-0 border-b border-[#E7E7EA] px-2 dark:border-[#273244] sm:px-4">
        <div role="tablist" aria-label="Secciones de la ficha" className="relative grid grid-cols-4">
          {MODAL_TABS.map((tab, index) => {
            const selected = modalTab === tab.id;
            const aviso = tabAviso[tab.id];
            return (
              <button
                key={tab.id}
                type="button"
                id={tabIdFor(tab.id)}
                role="tab"
                aria-selected={selected}
                aria-controls={panelIdFor(tab.id)}
                tabIndex={selected ? 0 : -1}
                onClick={() => setModalTab(tab.id)}
                onKeyDown={(e) => onModalTabKeyDown(e, index)}
                className={`relative inline-flex min-h-12 items-center justify-center gap-1.5 px-1 text-[13px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B5CFF]/40 sm:text-[14px] ${
                  selected ? "text-[#1B5CFF] dark:text-[#7EA0FF]" : "text-[#6E6E77] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
                }`}
              >
                <span className="hidden sm:inline-flex">{tab.icon}</span>
                {tab.label}
                {aviso ? (
                  <>
                    <span
                      className={`size-1.5 rounded-full ${aviso === "rojo" ? "bg-[#C22B2B] dark:bg-[#F87171]" : "bg-[#E6A23C]"}`}
                      aria-hidden
                    />
                    <span className="sr-only">{aviso === "rojo" ? "(falta información)" : "(cambios pendientes)"}</span>
                  </>
                ) : null}
              </button>
            );
          })}
          <span
            aria-hidden
            className="pointer-events-none absolute bottom-0 left-0 h-0.5 rounded-full bg-[#1B5CFF] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none dark:bg-[#4B7CFF]"
            style={{ width: `${100 / MODAL_TABS.length}%`, transform: `translateX(${tabIndex * 100}%)` }}
          />
        </div>
        </div>

        {/* ---------------- Cuerpo ---------------- */}
        <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto overscroll-contain bg-white px-5 py-5 dark:bg-[#111827] sm:px-6">
          {error ? (
            <div role="alert" className="cot-fade mb-4 rounded-[14px] border border-[#F6CFCF] bg-[#FEF2F2] px-4 py-3 text-[14px] text-[#9F1F1F] dark:border-[#7F1D1D] dark:bg-[#3F1518] dark:text-[#FCA5A5]">
              {error}
            </div>
          ) : null}

          {/* ===== Datos ===== */}
          <section id={panelIdFor("datos")} role="tabpanel" aria-labelledby={tabIdFor("datos")} hidden={modalTab !== "datos"} className="cot-fade">
            <div className="grid gap-6 md:grid-cols-[13rem_minmax(0,1fr)]">
              {/* Foto */}
              <div className="space-y-3">
                <span className={inventarioFieldLabelClass}>Foto</span>
                <div className="flex items-center justify-center rounded-[16px] border border-[#E7E7EA] bg-[#FAFAFA] p-3 dark:border-[#273244] dark:bg-[#0F172A]">
                  {subiendoImagen ? (
                    <span className="flex size-[168px] items-center justify-center text-[#A1A1AA]">
                      <Loader2 className="size-6 animate-spin" aria-hidden />
                    </span>
                  ) : (
                    <InventarioThumb src={imagenUrl} alt={imagenUrl ? `Foto de ${nombreVisible}` : ""} size={168} />
                  )}
                </div>
                <div className="flex gap-2 md:flex-col">
                  <label
                    className={`${invSecondaryBtnClass} h-10 min-h-0 flex-1 cursor-pointer text-[13px] md:w-full ${
                      saving || subiendoImagen ? "pointer-events-none opacity-60" : ""
                    }`}
                  >
                    <ImagePlus className="size-4" aria-hidden />
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
                      onClick={() => setImagenUrl("")}
                      disabled={saving || subiendoImagen}
                      className={`${linkBtnClass} justify-center text-[#C22B2B] hover:bg-[#FEF2F2] focus-visible:ring-[#C22B2B]/30 dark:text-[#F87171] dark:hover:bg-[#3F1518]`}
                    >
                      <Trash2 className="size-4" aria-hidden />
                      Quitar
                    </button>
                  ) : null}
                </div>
                {imagenError ? (
                  <p className="text-[12.5px] text-[#C22B2B] dark:text-[#F87171]" role="alert">
                    {imagenError}
                  </p>
                ) : refrescando && !imagenUrl ? (
                  <p className="text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">Buscando la foto en el catálogo…</p>
                ) : null}
              </div>

              {/* Campos */}
              <div className="space-y-5">
                <div>
                  <span className={inventarioFieldLabelClass}>
                    Ubicación<span className="ml-0.5 text-[#C22B2B] dark:text-[#F87171]" aria-hidden>*</span>
                  </span>
                  <UbicacionPicker
                    value={ubicacion}
                    onChange={setUbicacion}
                    disabled={saving}
                    invalid={!ubicacion}
                    label="Ubicación del producto"
                  />
                  {!ubicacion ? (
                    <p className="mt-1.5 text-[12.5px] font-medium text-[#C22B2B] dark:text-[#F87171]">
                      Este producto aún no tiene ubicación: elige exhibición o almacén.
                    </p>
                  ) : null}
                </div>

                <Field id={`${titleId}-nombre`} label="Nombre">
                  <input id={`${titleId}-nombre`} type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} className={invInputLikeClass} disabled={saving} placeholder="Nombre del producto" />
                </Field>

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id={`${titleId}-marca`} label="Marca">
                    <input id={`${titleId}-marca`} type="text" value={marca} onChange={(e) => setMarca(e.target.value)} className={invInputLikeClass} disabled={saving} />
                  </Field>
                  <Field id={`${titleId}-modelo`} label="Modelo">
                    <input id={`${titleId}-modelo`} type="text" value={modelo} onChange={(e) => setModelo(e.target.value)} className={`${invInputLikeClass} font-mono`} disabled={saving} />
                  </Field>
                  <Field id={`${titleId}-precio`} label="Costo (MXN)" hint="Lo que te costó; se actualiza al importar otra factura.">
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-[#A1A1AA]">$</span>
                      <input
                        id={`${titleId}-precio`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={precioUnitario}
                        onChange={(e) => setPrecioUnitario(e.target.value)}
                        placeholder="0.00"
                        className={`${invInputLikeClass} pl-7! tabular-nums`}
                        disabled={saving}
                      />
                    </div>
                  </Field>
                  <Field id={`${titleId}-seccion`} label="Sección">
                    <select id={`${titleId}-seccion`} value={seccion} onChange={(e) => setSeccion(e.target.value)} className={invInputLikeClass} disabled={busy}>
                      <option value="">Sin sección</option>
                      {INVENTARIO_SECCIONES.map((s) => (
                        <option key={s.slug} value={s.slug}>
                          {s.label}
                        </option>
                      ))}
                    </select>
                    <div className="mt-2">
                      <InventarioSeccionBadge seccion={seccion || null} showEmpty />
                    </div>
                  </Field>
                </div>

                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label htmlFor={`${titleId}-notas`} className={inventarioFieldLabelClass}>
                      Características y notas
                    </label>
                    {vinculado ? (
                      <button
                        type="button"
                        className={`${linkBtnClass} -mt-1.5 text-[#1B5CFF] hover:bg-[rgba(27,92,255,0.07)] focus-visible:ring-[#1B5CFF]/30 dark:text-[#7EA0FF]`}
                        onClick={() => void traerCaracteristicas()}
                        disabled={saving || trayendoFicha}
                      >
                        <RefreshCw className={`size-3.5 ${trayendoFicha ? "animate-spin" : ""}`} aria-hidden />
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
                    placeholder={trayendoFicha ? "Buscando la ficha técnica en el catálogo…" : "Ficha técnica: una característica por renglón."}
                  />
                  <p className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
                    {fichaAviso ??
                      (vinculado
                        ? "Se llenan solas con la ficha de SYSCOM o TVC; puedes corregirlas."
                        : "Vincúlalo con el catálogo (pestaña Catálogo) para traerlas.")}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* ===== Catálogo ===== */}
          <section id={panelIdFor("catalogo")} role="tabpanel" aria-labelledby={tabIdFor("catalogo")} hidden={modalTab !== "catalogo"} className="cot-fade space-y-5">
            <div
              className={`flex flex-col gap-3 rounded-[16px] border p-4 sm:flex-row sm:items-center ${
                vinculado
                  ? "border-[#BFE6D4] bg-[#F1FAF5] dark:border-[#1E5A42] dark:bg-[#0F2A1C]"
                  : "border-dashed border-[#D4D4D8] bg-[#FAFAFA] dark:border-[#3A4661] dark:bg-[#0F172A]"
              }`}
            >
              <span
                className={`inline-flex size-10 shrink-0 items-center justify-center rounded-[12px] ${
                  vinculado ? "bg-[#04724D] text-white dark:bg-[#22A06B]" : "bg-[#F4F4F5] text-[#6E6E77] dark:bg-[#1B2539] dark:text-[#8EA0B8]"
                }`}
              >
                {vinculado ? <Check className="cot-tick size-5" strokeWidth={2.5} aria-hidden /> : <Unlink className="size-5" aria-hidden />}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  {vinculado ? `Vinculado con ${fuenteLabel(fuente)}` : "Sin vincular"}
                </p>
                <p className="mt-0.5 text-[12.5px] leading-[18px] text-[#52525B] dark:text-[#B7C1D1]">
                  {vinculado ? (
                    <>
                      Referencia <span className="font-mono">{refExterna}</span> · los siguientes escaneos traen los datos solos.
                    </>
                  ) : (
                    "Búscalo abajo por nombre o modelo: SYSCOM y TVC no indexan el código de barras de la caja."
                  )}
                </p>
              </div>
              {vinculado ? (
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    className={`${linkBtnClass} text-[#04724D] hover:bg-[rgba(4,114,77,0.08)] focus-visible:ring-[#04724D]/30 dark:text-[#4ADE80]`}
                    onClick={() => void refrescarCatalogo()}
                    disabled={saving || refrescando}
                  >
                    <RefreshCw className={`size-3.5 ${refrescando ? "animate-spin" : ""}`} aria-hidden />
                    {refrescando ? "Consultando…" : "Completar datos"}
                  </button>
                  <button
                    type="button"
                    className={`${linkBtnClass} text-[#C22B2B] hover:bg-[#FEF2F2] focus-visible:ring-[#C22B2B]/30 dark:text-[#F87171] dark:hover:bg-[#3F1518]`}
                    onClick={desvincular}
                    disabled={saving}
                  >
                    <Unlink className="size-3.5" aria-hidden />
                    Quitar
                  </button>
                </div>
              ) : null}
            </div>
            {refrescoAviso ? (
              <p className="cot-fade -mt-2 text-[12.5px] text-[#52525B] dark:text-[#B7C1D1]" role="status">
                {refrescoAviso}
              </p>
            ) : null}

            {item && (item.folio_factura || item.proveedor_nombre) ? (
              <dl className="grid grid-cols-2 gap-3 rounded-[14px] border border-[#E7E7EA] p-4 dark:border-[#273244]">
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">Proveedor</dt>
                  <dd className="mt-1 text-[14px] text-[#09090B] dark:text-[#F8FAFC]">{item.proveedor_nombre || "—"}</dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">Última factura</dt>
                  <dd className="mt-1 font-mono text-[14px] text-[#09090B] dark:text-[#F8FAFC]">{item.folio_factura || "—"}</dd>
                </div>
              </dl>
            ) : null}

            <div>
              <label htmlFor={`${titleId}-buscar`} className={inventarioFieldLabelClass}>
                {vinculado ? "Vincular con otro producto" : "Buscar en SYSCOM y TVC"}
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA] dark:text-[#64748b]" aria-hidden />
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
                    className={`${invInputLikeClass} pl-10!`}
                    disabled={saving}
                  />
                </div>
                <button type="button" className={invSecondaryBtnClass} onClick={() => void buscar(termino)} disabled={saving || buscando || !terminoValido}>
                  {buscando ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Search className="size-4" aria-hidden />}
                  {buscando ? "Buscando…" : "Buscar"}
                </button>
              </div>
              {!terminoValido && termino.trim().length > 0 ? (
                <p className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">Escribe al menos {MIN_BUSQUEDA} caracteres.</p>
              ) : null}
              {busquedaError ? (
                <p className="mt-1.5 text-[12.5px] text-[#C22B2B] dark:text-[#F87171]" role="alert">
                  {busquedaError}
                </p>
              ) : null}
            </div>

            <div aria-live="polite" aria-atomic="true">
              {buscando ? (
                <ul className="space-y-2" aria-busy="true" aria-label="Buscando en el catálogo">
                  {[0, 1, 2].map((i) => (
                    <li key={i} className="flex items-center gap-3 rounded-[12px] border border-[#F0F0F2] p-3 dark:border-[#1F2A3C]" style={{ opacity: 1 - i * 0.25 }}>
                      <span className="size-10 shrink-0 rounded-lg bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                      <span className="flex-1 space-y-2">
                        <span className="block h-3 w-2/3 rounded-full bg-[#F0F0F2] motion-safe:animate-pulse dark:bg-[#1B2539]" />
                        <span className="block h-2.5 w-1/3 rounded-full bg-[#F4F4F5] motion-safe:animate-pulse dark:bg-[#151E32]" />
                      </span>
                    </li>
                  ))}
                </ul>
              ) : candidatos.length > 0 ? (
                <ul className="custom-scrollbar max-h-72 space-y-2 overflow-y-auto pr-1">
                  {candidatos.map((c, i) => (
                    <li key={`${c.fuente}-${c.ref_externa}-${c.modelo}`} className="cot-rise" style={{ "--cot-i": Math.min(i, 8) } as CSSProperties}>
                      <button type="button" className={candidatoRowClass} onClick={() => vincular(c)} disabled={saving}>
                        <InventarioThumb src={c.imagen_url} alt="" size={40} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-[#09090B] dark:text-[#F8FAFC]">{c.nombre || c.modelo}</span>
                          <span className="mt-0.5 block truncate text-xs text-[#6E6E77] dark:text-[#8EA0B8]">
                            {[c.marca, c.modelo].filter(Boolean).join(" · ") || "Sin modelo"}
                          </span>
                        </span>
                        <span className={fuenteBadgeClass(c.fuente === "manual" ? "desconocido" : c.fuente)}>{fuenteLabel(c.fuente)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : busquedaHecha ? (
                <p className="rounded-[12px] border border-dashed border-[#D4D4D8] px-4 py-6 text-center text-[13px] text-[#6E6E77] dark:border-[#3A4661] dark:text-[#8EA0B8]">
                  Sin resultados en SYSCOM ni TVC. Captura los datos a mano en la pestaña Datos.
                </p>
              ) : null}
            </div>
          </section>

          {/* ===== Existencia ===== */}
          <section id={panelIdFor("existencia")} role="tabpanel" aria-labelledby={tabIdFor("existencia")} hidden={modalTab !== "existencia"} className="cot-fade space-y-5">
            <div className="overflow-hidden rounded-[18px] border border-[#E7E7EA] dark:border-[#273244]">
              <div className="flex flex-col items-center gap-5 bg-[#FAFAFA] px-5 py-7 dark:bg-[#0F172A] sm:flex-row sm:justify-between sm:px-7">
                <div className="text-center sm:text-left">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#9A6B15] dark:text-[#E6A23C]">En piso ahora</p>
                  <p className="mt-1 flex items-baseline justify-center gap-2 sm:justify-start" aria-live="polite" aria-atomic="true">
                    <span key={cantidad} className="cot-flash inline-block text-[44px] font-bold leading-none tracking-[-1.5px] tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                      {cantidad}
                    </span>
                    <span className="text-[14px] text-[#6E6E77] dark:text-[#8EA0B8]">{cantidad === 1 ? "unidad" : "unidades"}</span>
                  </p>
                  <p className="mt-1 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">Guardado: {cantidadGuardada}</p>
                </div>
                {canAdjustStock ? (
                  <div className="flex w-full items-center gap-2 sm:w-auto">
                    <button
                      type="button"
                      onClick={() => ajustarExistenciaLocal(-1)}
                      disabled={busy || !item || cantidad <= 0}
                      aria-label="Salida: restar una unidad (se aplica al guardar)"
                      className="cot-press inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#E6A23C]/45 bg-[rgba(230,162,60,0.10)] px-5 text-[15px] font-semibold text-[#9A6B15] hover:bg-[rgba(230,162,60,0.18)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#E6A23C]/30 disabled:cursor-not-allowed disabled:opacity-45 dark:text-[#E6A23C] sm:flex-none"
                    >
                      <Minus className="size-5" aria-hidden />
                      Salida
                    </button>
                    <button
                      type="button"
                      onClick={() => ajustarExistenciaLocal(1)}
                      disabled={busy || !item}
                      aria-label="Entrada: sumar una unidad (se aplica al guardar)"
                      className="cot-press inline-flex h-14 flex-1 items-center justify-center gap-2 rounded-[14px] border border-[#04724D] bg-[#04724D] px-5 text-[15px] font-semibold text-white hover:bg-[#035c3e] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#04724D]/30 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
                    >
                      <Plus className="size-5" aria-hidden />
                      Entrada
                    </button>
                  </div>
                ) : (
                  <p className="max-w-[16rem] text-center text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8] sm:text-right">
                    Necesitas permiso de crear en Inventario para meter o sacar.
                  </p>
                )}
              </div>
              {deltaExistencia !== 0 ? (
                <p
                  className="cot-fade flex items-center gap-2 border-t border-[#F0D7A3] bg-[#FFF8EB] px-5 py-3 text-[13px] text-[#8A5D0F] dark:border-[rgba(230,162,60,0.3)] dark:bg-[rgba(230,162,60,0.10)] dark:text-[#E6A23C] sm:px-7"
                  role="status"
                  aria-live="polite"
                >
                  {deltaExistencia > 0 ? <ArrowDownToLine className="size-4 shrink-0" aria-hidden /> : <ArrowUpFromLine className="size-4 shrink-0" aria-hidden />}
                  Al guardar se {deltaExistencia > 0 ? "registrarán" : "sacarán"} {Math.abs(deltaExistencia)}{" "}
                  {Math.abs(deltaExistencia) === 1 ? "unidad" : "unidades"} (mismo historial que el escáner).
                </p>
              ) : null}
            </div>

            {canAdjustStock ? (
              <div>
                <div className="flex items-end justify-between gap-2">
                  <label htmlFor={`${titleId}-nota-salida`} className={inventarioFieldLabelClass}>
                    Motivo de la salida <span className="font-normal text-[#6E6E77] dark:text-[#8EA0B8]">(opcional)</span>
                  </label>
                  <span className="mb-1.5 text-[11px] tabular-nums text-[#6E6E77] dark:text-[#8EA0B8]">
                    {notaSalida.length}/{NOTA_MAX}
                  </span>
                </div>
                <textarea
                  id={`${titleId}-nota-salida`}
                  value={notaSalida}
                  onChange={(e) => setNotaSalida(e.target.value.slice(0, NOTA_MAX))}
                  maxLength={NOTA_MAX}
                  rows={3}
                  disabled={busy}
                  autoComplete="off"
                  placeholder="Ej. Entrega a obra Norte, préstamo a técnico, merma en almacén…"
                  className={invNotaSalidaTextareaClass}
                />
                <p className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">Se aplica a las salidas pendientes al guardar.</p>
              </div>
            ) : null}
            {ajusteAviso ? (
              <p className="cot-fade text-[13px] text-[#04724D] dark:text-[#4ADE80]" role="status" aria-live="polite">
                {ajusteAviso}
              </p>
            ) : null}
          </section>

          {/* ===== Historial (se carga al abrir la pestaña) ===== */}
          {modalTab === "historial" && item ? (
            <div className="cot-fade">
              <InventarioItemHistorialTab item={item} refreshKey={historialRefreshKey} labelledBy={tabIdFor("historial")} panelId={panelIdFor("historial")} />
            </div>
          ) : null}
        </div>

        {/* ---------------- Pie ---------------- */}
        <footer className="flex shrink-0 flex-col gap-3 border-t border-[#E7E7EA] bg-[#FAFAFA] px-5 py-4 dark:border-[#273244] dark:bg-[#151E32] sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-[13px] text-[#6E6E77] dark:text-[#8EA0B8]" aria-live="polite">
            {dirty ? (
              <span className="cot-fade inline-flex items-center gap-1.5 font-medium text-[#9A6B15] dark:text-[#E6A23C]">
                <span className="size-1.5 rounded-full bg-current" aria-hidden />
                Cambios sin guardar
              </span>
            ) : (
              "Sin cambios"
            )}
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <button type="button" className={invSecondaryBtnClass} onClick={onClose} disabled={busy}>
              {dirty ? "Descartar" : "Cerrar"}
            </button>
            <button type="submit" className={invPrimaryBtnClass} disabled={busy || !item || !dirty}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Check className="size-4" aria-hidden />}
              {aplicandoExistencia
                ? "Registrando existencia…"
                : saving
                  ? "Guardando…"
                  : deltaExistencia !== 0
                    ? `Guardar (${deltaExistencia > 0 ? "+" : ""}${deltaExistencia})`
                    : "Guardar cambios"}
            </button>
          </div>
        </footer>
      </form>
    </Modal>
  );
}

/** Indicador de la tira superior. */
function Kpi({
  i,
  label,
  sub,
  subTone,
  action,
  children,
}: {
  i: number;
  label: string;
  sub?: string;
  subTone?: "error";
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      className="cot-rise min-w-0 rounded-[12px] border border-[#E7E7EA] bg-white px-3 py-2.5 dark:border-[#273244] dark:bg-[#111827]"
      style={{ "--cot-i": i } as CSSProperties}
    >
      <div className="flex items-center justify-between gap-1">
        <p className="truncate text-[10.5px] font-semibold uppercase tracking-[0.1em] text-[#6E6E77] dark:text-[#8EA0B8]">{label}</p>
        {action}
      </div>
      <div className="mt-0.5 flex min-h-7 items-baseline">{children}</div>
      {sub ? (
        <p className={`mt-0.5 truncate text-[11px] ${subTone === "error" ? "text-[#C22B2B] dark:text-[#F87171]" : "text-[#6E6E77] dark:text-[#8EA0B8]"}`} title={sub}>
          {sub}
        </p>
      ) : null}
    </div>
  );
}

function Field({ id, label, hint, children }: { id: string; label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className={inventarioFieldLabelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1.5 text-[12.5px] text-[#6E6E77] dark:text-[#8EA0B8]">{hint}</p> : null}
    </div>
  );
}
