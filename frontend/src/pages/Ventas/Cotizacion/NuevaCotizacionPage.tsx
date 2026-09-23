import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleCheck,
  CloudCheck,
  Copy,
  FileSpreadsheet,
  FileText,
  Info,
  Loader2,
  Mail,
  MailCheck,
  Minus,
  MoveHorizontal,
  Package,
  Pencil,
  Percent,
  Phone,
  Plus,
  RotateCcw,
  Save,
  Search,
  Send,
  User,
  Wrench,
  X,
} from "lucide-react";

import PageMeta from "@/components/common/PageMeta";
import Alert from "@/components/ui/alert/Alert";
import { fetchApi, resolveMediaUrl } from "@/config/api";
import { MARCA_NOMBRE_DEFAULT } from "@/config/marcaIniciales";
import "@/components/ui/modal-kit/motion.css";
import { useAuth } from "@/context/AuthContext";
import { useMarca } from "@/context/MarcaContext";
import { CotizacionConceptosTable, type CotizacionConceptoLine } from "@/pages/Ventas/Cotizacion/form/CotizacionConceptosTable";
import {
  buildVisualTableRows,
  categoriasToApiPayload,
  createCategoria,
  parseCategoriasFromApi,
  resolveCategoriaId,
  type CotizacionCategoria,
} from "@/pages/Ventas/Cotizacion/shared/cotizacionCategoriasUtils";
import { CotizacionPdfOptionsPanel } from "@/pages/Ventas/Cotizacion/pdf/CotizacionPdfOptionsPanel";
import { defaultPdfOpciones, parsePdfOpcionesFromApi } from "@/pages/Ventas/Cotizacion/shared/cotizacionPdfTypes";
import { terminosCotizacionDefault } from "@/pages/Ventas/Cotizacion/shared/terminosCotizacionDefault";
import {
  createCotizacionDraft,
  fetchCotizacionClienteById,
  fetchCotizacionClientes,
  fetchCotizacionDetail,
} from "@/pages/Ventas/Cotizacion/shared/cotizacionApi";
import { useCotizacionCatalogos } from "@/pages/Ventas/Cotizacion/shared/useCotizacionCatalogos";
import { useCotizacionCloneSearch } from "@/pages/Ventas/Cotizacion/shared/useCotizacionCloneSearch";
import {
  fetchSyscomProductosSugerencia,
  fetchSyscomTipoCambio,
  fetchTvcProductosSugerencia,
  fetchTvcTipoCambio,
  getCatalogProductoImageUrl,
  type SyscomProducto,
} from "@/pages/ProductosYServicios/syscomCatalog";
import { cotizacionListPath, listSearchFromLocationState } from "@/pages/Ventas/Cotizacion/shared/cotizacionListNav";
import { FOLIO_SERIE, formatDocumentFolio } from "@/utils/documentFolio";
import CotizacionEnviarPdfModal, {
  type CotizacionEnviarPdfTarget,
} from "@/pages/Ventas/Cotizacion/form/CotizacionEnviarPdfModal";
import CotizacionMarcarEnviadaModal, {
  type CotizacionMarcarEnviadaTarget,
} from "@/pages/Ventas/Cotizacion/form/CotizacionMarcarEnviadaModal";
import { CotizacionExportOverlay } from "@/pages/Ventas/Cotizacion/form/CotizacionExportOverlay";
import { CotizacionClearModal } from "@/pages/Ventas/Cotizacion/form/CotizacionClearModal";
import { CotizacionCloneModal } from "@/pages/Ventas/Cotizacion/form/CotizacionCloneModal";
import { CotizacionConfirmDeleteModal } from "@/pages/Ventas/Cotizacion/form/CotizacionConfirmDeleteModal";
import type {
  ApiCotizacion,
  CatalogoConcepto,
  Cliente,
  Concepto,
  ProductoManualCatalogo,
  SyscomPopPos,
} from "./shared/cotizacionFormTypes";
import {
  correoActionBtnClass,
  cotFolioBadgeClass,
  cotFolioBadgeNumberClass,
  cotFolioBadgePrefixClass,
  cotPageCanvasClass,
  cotPageInnerClass,
  cotSansStyle,
  cotStatusDotAutorizadaClass,
  cotStatusDotCanceladaClass,
  cotStatusDotPendienteClass,
  inputInvalidClass,
  inputLikeClassName,
  numberInputClass,
  primaryActionBtnClass,
  primaryActionInlineBtnClass,
  secondaryActionBtnClass,
  tableWrapClass,
  textareaLikeClassName,
} from "./shared/cotizacionFormStyles";
import {
  buildManualProductoDescripcion,
  clampPct,
  formatCotizacionApiError,
  formatMoney,
  getSyscomPrecioListaMxnConIva,
  linePrecioUnitarioCotizacion,
  linePrecioUnitarioSinIva,
  MAX_COTIZ_CLIENTE_LEN,
  MAX_COTIZ_PRODUCTO_NOMBRE_LEN,
  MAX_COTIZ_THUMB_URL_LEN,
  normalizeTipoTrabajoIds,
  resolveConceptoDescripcion,
  round2,
  toNumber,
  truncateStr,
  uid,
} from "./shared/cotizacionFormUtils";

/** Muestra "" cuando el número es 0 para no obligar al usuario a borrar el cero. */
const numValue = (n: number) => (n ? String(n) : "");

/** Anticipo por defecto y mínimo operativo (no se puede pedir menos del 40 %). */
const ANTICIPO_PCT_DEFAULT = 60;
const ANTICIPO_PCT_MIN = 40;
const ANTICIPO_PCT_MAX = 100;
const clampAnticipo = (n: number) =>
  Math.min(ANTICIPO_PCT_MAX, Math.max(ANTICIPO_PCT_MIN, Number.isFinite(n) ? n : ANTICIPO_PCT_DEFAULT));

/* --------------------------------------------------------------------------
   Piezas de presentación de la página (solo UI, sin estado de negocio).
   -------------------------------------------------------------------------- */

const fieldLabelClass =
  "mb-1.5 flex items-center gap-1 text-[13px] font-medium text-[#3F3F46] dark:text-[#B7C1D1]";
const fieldHintClass = "mt-1.5 text-[12px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]";
const fieldErrorClass = "mt-1.5 text-[12px] font-medium text-[#C22B2B] dark:text-[#F87171]";
const subgroupTitleClass =
  "text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]";
const heroBtnClass =
  "cot-press inline-flex min-h-9 items-center justify-center gap-2 rounded-[10px] bg-white/10 px-3 text-[13px] font-medium text-white/90 ring-1 ring-inset ring-white/15 hover:bg-white/15 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60";
const toolbarBtnClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-[10px] border border-[#E4E4E7] bg-white px-3.5 text-[13px] font-medium text-[#3F3F46] transition-colors hover:border-[#D4D4D8] hover:bg-[#FAFAFA] hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[rgba(27,92,255,0.18)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#273244] dark:bg-[#111827] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]";
const dropdownPanelClass =
  "cot-pop absolute left-0 right-0 top-full z-120 mt-1.5 w-full overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-[0_18px_40px_-18px_rgba(9,9,11,0.35)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827] dark:ring-white/10";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

function scrollToSection(id: string) {
  document.getElementById(id)?.scrollIntoView({
    behavior: prefersReducedMotion() ? "auto" : "smooth",
    block: "start",
  });
}

function SectionCard({
  id,
  step,
  title,
  description,
  done,
  optional,
  actions,
  raised,
  order = 0,
  children,
}: {
  id: string;
  step: number;
  /** Posición en la entrada escalonada. */
  order?: number;
  title: string;
  description: string;
  done?: boolean;
  optional?: boolean;
  actions?: ReactNode;
  raised?: boolean;
  children: ReactNode;
}) {
  const headingId = `${id}-heading`;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      style={{ "--cot-i": order } as CSSProperties}
      className={`cot-rise scroll-mt-24 rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827] ${
        raised ? "relative z-200" : "relative"
      }`}
    >
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-[#F0F0F2] px-5 py-4 dark:border-[#1F2A3C] sm:px-6">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`mt-0.5 inline-flex size-7 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-colors duration-300 ${
              done
                ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                : "border border-[#D4D4D8] bg-white text-[#52525B] dark:border-[#3A4661] dark:bg-[#111827] dark:text-[#B7C1D1]"
            }`}
            aria-hidden
          >
            {done ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : step}
          </span>
          <div className="min-w-0">
            <h2
              id={headingId}
              className="flex flex-wrap items-center gap-2 text-[16px] font-semibold tracking-[-0.2px] text-[#09090B] dark:text-[#F8FAFC]"
            >
              {title}
              {optional && (
                <span className="rounded-full bg-[#F4F4F5] px-2 py-0.5 text-[11px] font-medium tracking-normal text-[#71717A] dark:bg-[#1B2539] dark:text-[#8EA0B8]">
                  Opcional
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-[13px] leading-relaxed text-[#71717A] dark:text-[#8EA0B8]">{description}</p>
          </div>
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </header>
      <div className="px-5 py-5 sm:px-6 sm:py-6">{children}</div>
    </section>
  );
}

function FieldLabel({
  htmlFor,
  children,
  required,
  optional,
}: {
  htmlFor?: string;
  children: ReactNode;
  required?: boolean;
  optional?: string | boolean;
}) {
  return (
    <label htmlFor={htmlFor} className={fieldLabelClass}>
      {children}
      {required && (
        <span className="text-[#C22B2B] dark:text-[#F87171]" aria-hidden>
          *
        </span>
      )}
      {optional && (
        <span className="font-normal text-[#A1A1AA] dark:text-[#64748B]">
          {typeof optional === "string" ? optional : "(opcional)"}
        </span>
      )}
    </label>
  );
}

function SuffixInput({ suffix, prefix, children }: { suffix?: string; prefix?: string; children: ReactNode }) {
  return (
    <div className="relative">
      {prefix && (
        <span
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#A1A1AA] dark:text-[#64748B]"
          aria-hidden
        >
          {prefix}
        </span>
      )}
      {children}
      {suffix && (
        <span
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-[#A1A1AA] dark:text-[#64748B]"
          aria-hidden
        >
          {suffix}
        </span>
      )}
    </div>
  );
}

function Spinner({ className = "size-4" }: { className?: string }) {
  return <Loader2 className={`${className} animate-spin`} aria-hidden />;
}

export default function NuevaCotizacionPage() {
  const { permissions, isAdmin } = useAuth();
  const { nombre: marcaNombre } = useMarca();
  const canCotizacionesView = permissions?.cotizaciones?.view === true;
  const canCotizacionesCreate = permissions?.cotizaciones?.create === true;

  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const editingCotizacionId = params?.id ? String(params.id) : "";
  const goToCotizacionList = useCallback(() => {
    navigate(cotizacionListPath(listSearchFromLocationState(location.state)));
  }, [location.state, navigate]);

  const [hydratingFromStorage, setHydratingFromStorage] = useState(false);

  const [alert, setAlert] = useState<{
    show: boolean;
    variant: "success" | "error" | "warning" | "info";
    title: string;
    message: string;
  }>({ show: false, variant: "info", title: "", message: "" });

  const [previewLoading, setPreviewLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(8);
  const [enviarCorreoSaving, setEnviarCorreoSaving] = useState(false);
  const [enviarPdfTarget, setEnviarPdfTarget] = useState<CotizacionEnviarPdfTarget | null>(null);
  const [marcarEnviadaTarget, setMarcarEnviadaTarget] = useState<CotizacionMarcarEnviadaTarget | null>(null);
  const [enviadoInfo, setEnviadoInfo] = useState<{
    por: string;
    en?: string;
    comentario?: string;
  } | null>(null);

  const [cloneModalOpen, setCloneModalOpen] = useState(false);
  const [clearFormModalOpen, setClearFormModalOpen] = useState(false);
  const [conceptoToDelete, setConceptoToDelete] = useState<{ id: string; nombre: string } | null>(null);
  const [categoriaToDelete, setCategoriaToDelete] = useState<{
    id: string;
    nombre: string;
    productosCount: number;
  } | null>(null);
  const {
    cloneListLoading,
    cloneRows,
    cloneSearch,
    cloneSearchDebounced,
    resetCloneSearch,
    setCloneSearch,
  } = useCotizacionCloneSearch({ canSearch: canCotizacionesView, isOpen: cloneModalOpen });
  const [clonePickingId, setClonePickingId] = useState<number | null>(null);
  const [cloneClienteMode, setCloneClienteMode] = useState<"mismo" | "otro">("mismo");
  const [cloneClienteSearch, setCloneClienteSearch] = useState("");
  const [cloneClienteDebounced, setCloneClienteDebounced] = useState("");
  const [cloneClienteOptions, setCloneClienteOptions] = useState<Cliente[]>([]);
  const [cloneClienteLoading, setCloneClienteLoading] = useState(false);
  const [cloneTargetCliente, setCloneTargetCliente] = useState<Cliente | null>(null);

  const exportBusy = previewLoading || excelLoading;

  useEffect(() => {
    if (!exportBusy) {
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(8);
    const interval = window.setInterval(() => {
      setLoadingProgress((p) => {
        const next = p + (p < 55 ? 10 : p < 80 ? 6 : 3);
        return Math.min(95, next);
      });
    }, 650);

    return () => window.clearInterval(interval);
  }, [exportBusy]);

  const [loadingClientes, setLoadingClientes] = useState(false);
  const [clientes, setClientes] = useState<Cliente[]>([]);

  const [clienteId, setClienteId] = useState<number | "">("");
  const [clienteSearch, setClienteSearch] = useState("");
  const [debouncedClienteSearch, setDebouncedClienteSearch] = useState("");
  const [clienteOpen, setClienteOpen] = useState(false);

  /** Folio visible en UI al editar (modelo `idx`), no el id de base de datos. */
  const [editingCotizacionIdx, setEditingCotizacionIdx] = useState<number | null>(null);
  const [activeCotizacionId, setActiveCotizacionId] = useState<string>(editingCotizacionId || "");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastAutoSavedAt, setLastAutoSavedAt] = useState<number | null>(null);
  const isEditingRoute = !!editingCotizacionId;

  const [contactoNombre, setContactoNombre] = useState("");
  const [contactoTelefono, setContactoTelefono] = useState("");

  const [cantidad, setCantidad] = useState<number>(1);
  const [conceptoNombre, setConceptoNombre] = useState("");
  const [productoSearch, setProductoSearch] = useState("");
  const [conceptoDescripcion, setConceptoDescripcion] = useState("");
  const [unidad, setUnidad] = useState("");
  const [precioLista, setPrecioLista] = useState<number>(0);
  const [descuentoPct, setDescuentoPct] = useState<number>(0);
  /** Switch ON = no aplicar IVA en la línea que se agrega/edita. */
  const [sinIva, setSinIva] = useState(false);
  const [syscomTipoCambio, setSyscomTipoCambio] = useState<number | null>(null);
  const [syscomOpen, setSyscomOpen] = useState(false);
  const [loadingSyscom, setLoadingSyscom] = useState(false);
  const [syscomProductos, setSyscomProductos] = useState<SyscomProducto[]>([]);
  const [syscomError, setSyscomError] = useState("");
  const [selectedSyscomProducto, setSelectedSyscomProducto] = useState<SyscomProducto | null>(null);
  const [selectedCatalogoConcepto, setSelectedCatalogoConcepto] = useState<CatalogoConcepto | null>(null);
  const [selectedManualProducto, setSelectedManualProducto] = useState<ProductoManualCatalogo | null>(null);
  const [conceptoOpen, setConceptoOpen] = useState(false);
  const [conceptoSearch, setConceptoSearch] = useState("");
  const {
    catalogoConceptos,
    catalogoManualProductos,
    catalogoManualError,
    servicios,
  } = useCotizacionCatalogos(canCotizacionesView);

  const syscomInputWrapRef = useRef<HTMLDivElement>(null);
  const syscomPopRef = useRef<HTMLDivElement>(null);
  const conceptoRef = useRef<HTMLDivElement>(null);
  const conceptoPopRef = useRef<HTMLDivElement>(null);
  /** Evita aplicar resultados de una petición SYSCOM anterior si el usuario sigue escribiendo. */
  const syscomSearchGenRef = useRef(0);
  const [syscomPopPos, setSyscomPopPos] = useState<SyscomPopPos | null>(null);
  const [conceptoPopPos, setConceptoPopPos] = useState<SyscomPopPos | null>(null);
  const [descuentoClientePct, setDescuentoClientePct] = useState<number>(0);
  const [descuentoClienteTouched, setDescuentoClienteTouched] = useState<boolean>(false);
  /** Porcentaje de anticipo personalizado (default 60 %, mínimo 40 %). */
  const [anticipoPct, setAnticipoPct] = useState<number>(ANTICIPO_PCT_DEFAULT);

  const [editingConceptoId, setEditingConceptoId] = useState<string | null>(null);
  /** Qué captura el compositor de partidas: producto de catálogo o concepto de servicio. */
  const [composerModeChoice, setComposerModeChoice] = useState<"producto" | "concepto">("producto");

  const [conceptos, setConceptos] = useState<Concepto[]>([]);
  const [categorias, setCategorias] = useState<CotizacionCategoria[]>([]);
  const [categoriaIdParaAgregar, setCategoriaIdParaAgregar] = useState("");

  const [textoArribaPrecios, setTextoArribaPrecios] = useState(
    "A continuación cotización solicitada: "
  );
  const [terminos, setTerminos] = useState(() =>
    terminosCotizacionDefault(MARCA_NOMBRE_DEFAULT)
  );

  const [pdfOpciones, setPdfOpciones] = useState(() => defaultPdfOpciones());
  const [pdfDescripcionCorta, setPdfDescripcionCorta] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditingRoute) return;
    setTerminos((prev) =>
      prev === terminosCotizacionDefault(MARCA_NOMBRE_DEFAULT)
        ? terminosCotizacionDefault(marcaNombre)
        : prev,
    );
  }, [isEditingRoute, marcaNombre]);

  const todayIso = useMemo(() => {
    const d = new Date();
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, []);

  const MEDIO_CONTACTO_OPTIONS = useMemo(
    () => [
      { value: 'CLIENTE', label: 'Cliente' },
      { value: 'BNI', label: 'BNI' },
      { value: 'REFERIDO', label: 'Referido' },
      { value: 'WEB', label: 'Web' },
      { value: 'TIENDA_ONLINE', label: 'Tienda Online' },
      { value: 'FACEBOOK', label: 'Facebook' },
      { value: 'INSTAGRAM', label: 'Instagram' },
      { value: 'TIKTOK', label: 'Tiktok' },
      { value: 'GOOGLE_MAPS', label: 'Google Maps' },
      { value: 'YOUTUBE', label: 'Youtube' },
      { value: 'TIENDA_FISICA', label: 'Tienda Fisica' },
    ],
    []
  );

  const STATUS_OPTIONS = useMemo(
    () => [
      { value: 'AUTORIZADA', label: 'Autorizada' },
      { value: 'PENDIENTE', label: 'Pendiente' },
      { value: 'CANCELADA', label: 'Cancelada' },
    ],
    []
  );

  const [medioContacto, setMedioContacto] = useState<string>('');
  const [medioContactoTouched, setMedioContactoTouched] = useState(false);
  const [status, setStatus] = useState<string>('PENDIENTE');

  const [tipoTrabajo, setTipoTrabajo] = useState<number[]>([]);
  const [tipoTrabajoOpen, setTipoTrabajoOpen] = useState(false);
  const [tipoTrabajoTouched, setTipoTrabajoTouched] = useState(false);
  const tipoTrabajoRef = useRef<HTMLDivElement>(null);
  const lastAutosaveSnapshotRef = useRef<string | null>(null);
  const draftInitStartedRef = useRef(false);
  const draftInitPromiseRef = useRef<Promise<string | null> | null>(null);
  const upsertInFlightRef = useRef(false);
  const upsertCotizacionRef = useRef<
    (opts?: {
      navigateAfterSave?: boolean;
      validateRequired?: boolean;
      silent?: boolean;
      autosave?: boolean;
    }) => Promise<string | null>
  >(() => Promise.resolve(null));

  const formatDMY = (iso: string) => {
    if (!iso) return "";
    const [y, m, d] = iso.split("-");
    return `${d}/${m}/${y}`;
  };

  const selectedCliente = useMemo(() => {
    if (!clienteId) return null;
    return clientes.find((c) => c.id === clienteId) || null;
  }, [clientes, clienteId]);

  const tipoTrabajoIds = useMemo(() => normalizeTipoTrabajoIds(tipoTrabajo), [tipoTrabajo]);

  const tipoTrabajoAutosaveKey = useMemo(
    () => [...tipoTrabajoIds].sort((a, b) => a - b).join(","),
    [tipoTrabajoIds]
  );

  const pdfOpcionesAutosaveKey = useMemo(() => JSON.stringify(pdfOpciones), [pdfOpciones]);

  const pdfDescripcionCortaAutosaveKey = useMemo(
    () => JSON.stringify(pdfDescripcionCorta),
    [pdfDescripcionCorta]
  );

  const conceptosAutosaveKey = useMemo(
    () =>
      JSON.stringify({
        categorias: categoriasToApiPayload(categorias),
        conceptos: buildVisualTableRows(categorias, conceptos).flatMap((row) =>
          row.kind === "product"
            ? [
                {
                  producto_externo_id: row.line.producto_externo_id,
                  producto_nombre: row.line.producto_nombre,
                  producto_descripcion: row.line.producto_descripcion,
                  unidad: row.line.unidad,
                  thumbnail_url: row.line.thumbnail_url,
                  cantidad: row.line.cantidad,
                  precio_lista: row.line.precio_lista,
                  descuento_pct: row.line.descuento_pct,
                  categoria_id: row.line.categoria_id || "",
                },
              ]
            : []
        ),
      }),
    [conceptos, categorias]
  );

  const tipoTrabajoDisplay = useMemo(() => {
    if (tipoTrabajoIds.length === 0) return "";
    const names = tipoTrabajoIds
      .map((id) => servicios.find((s) => s.id === id)?.nombre)
      .filter((n): n is string => Boolean(n));
    if (names.length === 0) return `${tipoTrabajoIds.length} seleccionados`;
    if (names.length === 1) return names[0];
    if (names.length === 2) return names.join(", ");
    return `${tipoTrabajoIds.length} servicios seleccionados`;
  }, [tipoTrabajoIds, servicios]);

  useEffect(() => {
    if (!tipoTrabajoOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (tipoTrabajoRef.current && !tipoTrabajoRef.current.contains(event.target as Node)) {
        setTipoTrabajoOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [tipoTrabajoOpen]);

  useLayoutEffect(() => {
    if (!conceptoOpen) {
      setConceptoPopPos(null);
      return;
    }
    const el = conceptoRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const preferredMax = Math.min(288, vh * 0.42);
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const width = Math.min(Math.max(rect.width, 280), vw - margin * 2);
      let left = rect.left;
      if (left + width > vw - margin) left = Math.max(margin, vw - width - margin);

      const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;

      if (openAbove) {
        const maxHeight = Math.max(120, Math.min(preferredMax, spaceAbove - 4));
        setConceptoPopPos({
          left,
          width,
          bottom: vh - rect.top + margin,
          maxHeight,
        });
      } else {
        const top = rect.bottom + margin;
        const maxHeight = Math.max(120, Math.min(preferredMax, vh - top - margin));
        setConceptoPopPos({
          left,
          width,
          top,
          maxHeight,
        });
      }
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [conceptoOpen, conceptoSearch]);

  useEffect(() => {
    if (!conceptoOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      const t = event.target as Node;
      if (conceptoRef.current?.contains(t)) return;
      if (conceptoPopRef.current?.contains(t)) return;
      setConceptoOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [conceptoOpen]);

  const effectiveDescuentoClientePct = useMemo(() => {
    const hasManualConceptLines = conceptos.some((c) => String(c.producto_externo_id || "").trim() === "");
    const hasProductLines = conceptos.some((c) => String(c.producto_externo_id || "").trim() !== "");
    const base = clampPct(toNumber(descuentoClientePct, 0));
    return hasManualConceptLines && !hasProductLines ? 0 : base;
  }, [conceptos, descuentoClientePct]);

  const lineaEditando = useMemo(
    () => (editingConceptoId ? conceptos.find((c) => c.id === editingConceptoId) : undefined),
    [editingConceptoId, conceptos]
  );

  const esFormularioProducto = useMemo(() => {
    if (selectedSyscomProducto || selectedManualProducto) return true;
    if (lineaEditando && String(lineaEditando.producto_externo_id || "").trim() !== "") return true;
    return false;
  }, [selectedSyscomProducto, selectedManualProducto, lineaEditando]);

  /** Conceptos: cualquiera. Productos: solo admin. */
  const canMarcarSinIva = !esFormularioProducto || isAdmin;

  useEffect(() => {
    if (!canMarcarSinIva && sinIva) setSinIva(false);
  }, [canMarcarSinIva, sinIva]);

  const contactosOptions = useMemo(() => {
    if (!selectedCliente?.contactos) return [];
    return selectedCliente.contactos
      .map((c) => String(c.nombre_apellido || "").trim())
      .filter(Boolean);
  }, [selectedCliente]);

  const preview = useMemo(() => {
    const qty = Math.max(0, toNumber(cantidad, 0));
    const pl = Math.max(0, toNumber(precioLista, 0));
    const desc = clampPct(toNumber(descuentoPct, 0));
    const productoExternoId =
      selectedSyscomProducto?.producto_id ||
      (selectedManualProducto ? `manual:${selectedManualProducto.id}` : "") ||
      (lineaEditando ? String(lineaEditando.producto_externo_id || "") : "");
    const sinIvaEfectivo = canMarcarSinIva && sinIva;
    const puBase = linePrecioUnitarioSinIva(pl, desc, productoExternoId);
    const puCobrado = linePrecioUnitarioCotizacion(pl, desc, productoExternoId, sinIvaEfectivo);
    const importe = qty * puBase;
    const importeCobrado = qty * puCobrado;
    return { qty, pl, desc, puBase, importe, puCobrado, importeCobrado, sinIvaEfectivo };
  }, [
    cantidad,
    precioLista,
    descuentoPct,
    selectedSyscomProducto,
    selectedManualProducto,
    lineaEditando,
    canMarcarSinIva,
    sinIva,
  ]);

  const fetchClientes = useCallback(async (search = "") => {
    if (!canCotizacionesView) return;
    setLoadingClientes(true);
    try {
      setClientes(await fetchCotizacionClientes(search));
    } catch (error) {
      console.error("Error fetching clientes:", error);
    } finally {
      setLoadingClientes(false);
    }
  }, [canCotizacionesView]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedClienteSearch(clienteSearch);
    }, 400);
    return () => clearTimeout(timer);
  }, [clienteSearch]);

  useEffect(() => {
    fetchClientes(debouncedClienteSearch);
  }, [debouncedClienteSearch, fetchClientes]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setCloneClienteDebounced(cloneClienteSearch.trim());
    }, 400);
    return () => window.clearTimeout(timer);
  }, [cloneClienteSearch]);

  useEffect(() => {
    if (!cloneModalOpen || cloneClienteMode !== "otro" || !canCotizacionesView) {
      setCloneClienteOptions([]);
      return;
    }
    if (cloneClienteDebounced.length < 1) {
      setCloneClienteOptions([]);
      return;
    }

    let cancelled = false;
    setCloneClienteLoading(true);
    fetchCotizacionClientes(cloneClienteDebounced)
      .then((rows) => {
        if (!cancelled) setCloneClienteOptions(rows);
      })
      .catch((error) => {
        console.error("Error buscando clientes para clonar:", error);
        if (!cancelled) setCloneClienteOptions([]);
      })
      .finally(() => {
        if (!cancelled) setCloneClienteLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [canCotizacionesView, cloneClienteDebounced, cloneClienteMode, cloneModalOpen]);

  const contactoPrincipalDeCliente = (cliente: Cliente) => {
    const principal = (cliente.contactos || []).find((x) => x.is_principal);
    const first = (cliente.contactos || [])[0];
    return String(principal?.nombre_apellido || first?.nombre_apellido || "").trim();
  };

  const telefonoPrincipalDeCliente = (cliente: Cliente) => {
    const principal = (cliente.contactos || []).find((x) => x.is_principal);
    const first = (cliente.contactos || [])[0];
    return String(principal?.celular || first?.celular || cliente.telefono || "").trim();
  };

  const selectCliente = (cliente: Cliente | null) => {
    if (cliente) {
      setClienteId(cliente.id);
      setClienteSearch(String(cliente.nombre || "").trim());

      const desc = clampPct(toNumber(cliente.descuento_pct, 0));
      setDescuentoClientePct(desc);
      setDescuentoClienteTouched(false);
      setContactoNombre(contactoPrincipalDeCliente(cliente));
      setContactoTelefono(telefonoPrincipalDeCliente(cliente));
      setMedioContacto("CLIENTE");
      setMedioContactoTouched(false);
    } else {
      setClienteId("");
      setClienteSearch("");

      setDescuentoClientePct(0);
      setDescuentoClienteTouched(false);
      setContactoNombre("");
      setContactoTelefono("");
      setMedioContacto("");
      setMedioContactoTouched(false);
    }
    setClienteOpen(false);
  };

  const filteredClientes = clientes;

  const hydrateFormFromCotizacionDetail = useCallback(
    async (data: ApiCotizacion, opts: { updateIdxBadge: boolean }) => {
      if (opts.updateIdxBadge) {
        setEditingCotizacionIdx(Number.isFinite(Number(data.idx)) ? Number(data.idx) : null);
      }

      setClienteId(data.cliente_id ? Number(data.cliente_id) : "");
      const nombreDesdeApi = String(data.cliente_nombre || data.cliente || "").trim();
      setClienteSearch(nombreDesdeApi);
      setContactoNombre(String(data.contacto || ""));
      setContactoTelefono(String(data.contacto_telefono || ""));
      setMedioContacto(String(data.medio_contacto || ""));
      setTipoTrabajo(normalizeTipoTrabajoIds(data.tipo_trabajo));
      setStatus(String(data.status || "PENDIENTE"));
      {
        const enviadoPor = String(data.enviado_por_full_name || data.enviado_por_username || "").trim();
        setEnviadoInfo(
          enviadoPor
            ? {
                por: enviadoPor,
                en: String(data.enviado_en || "").trim() || undefined,
                comentario: String(data.enviado_comentario || "").trim() || undefined,
              }
            : null
        );
      }
      setDescuentoClientePct(clampPct(toNumber(data.descuento_cliente_pct, 0)));
      setDescuentoClienteTouched(true);
      setAnticipoPct(
        data.anticipo_pct == null
          ? ANTICIPO_PCT_DEFAULT
          : clampAnticipo(toNumber(data.anticipo_pct, ANTICIPO_PCT_DEFAULT)),
      );
      setTextoArribaPrecios(String(data.texto_arriba_precios || ""));
      {
        const incoming = String(data.terminos || "").trim();
        if (incoming) setTerminos(incoming);
      }

      const itemsArr = Array.isArray(data.items)
        ? [...data.items].sort((a, b) => toNumber(a.orden, 0) - toNumber(b.orden, 0))
        : [];
      const conceptosList: Concepto[] = itemsArr.map((it) => ({
        id: uid(),
        producto_externo_id: String(it.producto_externo_id ?? ""),
        producto_nombre: String(it.producto_nombre || ""),
        producto_descripcion: String(it.producto_descripcion || ""),
        unidad: String(it.unidad || ""),
        thumbnail_url: it.thumbnail_url || undefined,
        cantidad: toNumber(it.cantidad, 0),
        precio_lista: toNumber(it.precio_lista, 0),
        descuento_pct: clampPct(toNumber(it.descuento_pct, 0)),
        sin_iva: !!it.sin_iva,
        categoria_id: String(it.categoria_id || "").trim() || undefined,
      }));
      const descCortas: Record<string, string> = {};
      conceptosList.forEach((c, i) => {
        const corta = String(itemsArr[i]?.pdf_descripcion_corta || "").trim();
        if (corta) descCortas[c.id] = corta;
      });
      setConceptos(conceptosList);
      setCategorias(parseCategoriasFromApi((data as ApiCotizacion).categorias_productos));
      setCategoriaIdParaAgregar("");
      setPdfOpciones(parsePdfOpcionesFromApi(data.pdf_opciones));
      setPdfDescripcionCorta(descCortas);
      setEditingConceptoId(null);
      setClienteOpen(false);

      const cid = data.cliente_id ? Number(data.cliente_id) : null;
      if (cid) {
        try {
          const one = await fetchCotizacionClienteById(cid);
          if (one) {
            setClientes((prev) => {
              if (prev.some((c) => c.id === one.id)) {
                return prev.map((c) => (c.id === one.id ? { ...c, ...one } : c));
              }
              return [one, ...prev];
            });
            const n = String(one.nombre || "").trim();
            if (n && !String(nombreDesdeApi).trim()) {
              setClienteSearch(n);
            }
          }
        } catch {
          /* ignore */
        }
      }
    },
    []
  );

  useEffect(() => {
    if (!catalogoManualProductos.length) return;
    setConceptos((prev) => {
      if (!prev.length) return prev;
      let changed = false;
      const next = prev.map((c) => {
        const resolved = resolveConceptoDescripcion(c, catalogoManualProductos);
        const stored = String(c.producto_descripcion || "").trim();
        if (resolved && resolved !== stored) {
          changed = true;
          return { ...c, producto_descripcion: resolved };
        }
        return c;
      });
      return changed ? next : prev;
    });
  }, [catalogoManualProductos]);

  useEffect(() => {
    setActiveCotizacionId(editingCotizacionId || "");
  }, [editingCotizacionId]);

  useEffect(() => {
    if (editingCotizacionId || activeCotizacionId || !canCotizacionesCreate) return;
    if (draftInitStartedRef.current) return;
    draftInitStartedRef.current = true;

    let cancelled = false;
    const createDraft = async (): Promise<string | null> => {
      try {
        const data = await createCotizacionDraft({
          cliente_id: null,
          cliente: "",
          prospecto: false,
          contacto: "",
          contacto_telefono: "",
          medio_contacto: "",
          tipo_trabajo: [],
          status: "PENDIENTE",
          fecha: todayIso,
          subtotal: 0,
          descuento_cliente_pct: 0,
          anticipo_pct: ANTICIPO_PCT_DEFAULT,
          iva_pct: 0,
          iva: 0,
          total: 0,
          texto_arriba_precios: "",
          terminos: "",
          items: [],
        });
        if (!data || cancelled) return null;
        const newId = String(data?.id || "").trim();
        if (newId) {
          setActiveCotizacionId(newId);
          setEditingCotizacionIdx(
            data?.idx != null && Number.isFinite(Number(data.idx)) ? Number(data.idx) : null
          );
        }
        return newId || null;
      } catch {
        draftInitStartedRef.current = false;
        return null;
      }
    };

    draftInitPromiseRef.current = createDraft();
    return () => {
      cancelled = true;
    };
  }, [editingCotizacionId, activeCotizacionId, canCotizacionesCreate, todayIso]);

  useEffect(() => {
    if (!editingCotizacionId) {
      return;
    }
    setHydratingFromStorage(true);

    const load = async () => {
      try {
        const data = await fetchCotizacionDetail(editingCotizacionId);
        if (!data) {
          setEditingCotizacionIdx(null);
          setAlert({
            show: true,
            variant: "warning",
            title: "Cotización no encontrada",
            message: "No se encontró la cotización. Regresando al listado.",
          });
          window.setTimeout(() => goToCotizacionList(), 450);
          return;
        }

        await hydrateFormFromCotizacionDetail(data, { updateIdxBadge: true });
      } catch {
        setAlert({
          show: true,
          variant: "error",
          title: "Error",
          message: "No se pudo cargar la cotización.",
        });
      } finally {
        setHydratingFromStorage(false);
      }
    };

    void load();
  }, [editingCotizacionId, hydrateFormFromCotizacionDetail, goToCotizacionList]);

  const resetCloneClienteState = useCallback(() => {
    setCloneClienteMode("mismo");
    setCloneClienteSearch("");
    setCloneClienteDebounced("");
    setCloneClienteOptions([]);
    setCloneTargetCliente(null);
  }, []);

  const handleClonePick = async (id: number) => {
    if (cloneClienteMode === "otro" && !cloneTargetCliente) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Falta el cliente",
        message: "Elige el cliente destino o cambia a «Mismo cliente».",
      });
      return;
    }

    setClonePickingId(id);
    setHydratingFromStorage(true);
    try {
      const data = await fetchCotizacionDetail(id);
      if (!data) {
        setAlert({
          show: true,
          variant: "error",
          title: "Error",
          message: "No se pudo cargar la cotización seleccionada.",
        });
        return;
      }
      await hydrateFormFromCotizacionDetail(data, { updateIdxBadge: false });

      if (cloneClienteMode === "otro" && cloneTargetCliente) {
        selectCliente(cloneTargetCliente);
      }

      setCloneModalOpen(false);
      resetCloneSearch();
      resetCloneClienteState();
      const folioOrigen = formatDocumentFolio(FOLIO_SERIE.cotizacion, data.idx);
      const clienteDestino =
        cloneClienteMode === "otro" && cloneTargetCliente
          ? String(cloneTargetCliente.nombre || "").trim()
          : "";
      setAlert({
        show: true,
        variant: "success",
        title: "Cotización clonada",
        message: clienteDestino
          ? `Se copiaron conceptos y textos del folio ${folioOrigen} para ${clienteDestino}. Revisa y guarda como cotización nueva.`
          : `Se copiaron los datos del folio ${folioOrigen}. Revisa la información y guarda como cotización nueva.`,
      });
    } catch {
      setAlert({
        show: true,
        variant: "error",
        title: "Error",
        message: "No se pudo clonar la cotización.",
      });
    } finally {
      setHydratingFromStorage(false);
      setClonePickingId(null);
    }
  };

  useEffect(() => {
    if (hydratingFromStorage) return;
    if (!selectedCliente) {
      if (!editingCotizacionId) {
        setContactoNombre("");
        setContactoTelefono("");
        setMedioContacto("");
        setMedioContactoTouched(false);
      }
      return;
    }

    if (String(contactoNombre || "").trim()) return;

    const principal = (selectedCliente.contactos || []).find((x) => x.is_principal);
    const first = (selectedCliente.contactos || [])[0];
    const next = (principal?.nombre_apellido || first?.nombre_apellido || "").trim();
    setContactoNombre(next);
  }, [selectedCliente, hydratingFromStorage, editingCotizacionId, contactoNombre]);

  useEffect(() => {
    if (hydratingFromStorage || !selectedCliente) return;
    const name = String(contactoNombre || "").trim().toLowerCase();
    if (!name) return;
    const match = (selectedCliente.contactos || []).find(
      (c) => String(c.nombre_apellido || "").trim().toLowerCase() === name
    );
    if (!match) return;
    const phone = String(match.celular || "").trim();
    if (phone) setContactoTelefono(phone);
  }, [selectedCliente, contactoNombre, hydratingFromStorage]);

  useEffect(() => {
    if (hydratingFromStorage) return;

    if (!selectedCliente) {
      if (!editingCotizacionId) {
        setDescuentoClientePct(0);
        setDescuentoClienteTouched(false);
      }
      return;
    }

    if (descuentoClienteTouched) return;

    const desc = clampPct(toNumber(selectedCliente.descuento_pct, 0));
    setDescuentoClientePct(desc);
  }, [selectedCliente, hydratingFromStorage, editingCotizacionId, descuentoClienteTouched]);

  useEffect(() => {
    if (!productoSearch.trim()) {
      setUnidad("");
      setPrecioLista(0);
      setSyscomProductos([]);
      setSyscomOpen(false);
    }
  }, [productoSearch]);

  useEffect(() => {
    Promise.all([fetchSyscomTipoCambio(), fetchTvcTipoCambio()])
      .then(([tcSyscom, tcTvc]) => setSyscomTipoCambio(tcSyscom ?? tcTvc))
      .catch(() => {
        // ignore
      });
  }, []);

  useEffect(() => {
    const q = productoSearch.trim();
    if (selectedSyscomProducto || selectedCatalogoConcepto || selectedManualProducto) {
      setSyscomOpen(false);
      setSyscomError("");
      return;
    }
    if (q.length < 2) {
      setSyscomProductos([]);
      setSyscomError("");
      setLoadingSyscom(false);
      if (!q) setSyscomOpen(false);
      return;
    }
    // Abrir panel por búsqueda local (catálogo) aunque falle Syscom o TVC.
    setSyscomOpen(true);
    const runGen = ++syscomSearchGenRef.current;
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoadingSyscom(true);
      setSyscomError("");
      try {
        const [syscomRes, tvcRes] = await Promise.all([
          fetchSyscomProductosSugerencia(q, { signal: ac.signal }),
          fetchTvcProductosSugerencia(q, { signal: ac.signal }),
        ]);
        if (runGen !== syscomSearchGenRef.current) return;

        const merged: SyscomProducto[] = [];
        const seen = new Set<string>();
        for (const p of [...tvcRes.productos, ...syscomRes.productos]) {
          const id = String(p.producto_id ?? "");
          if (!id || seen.has(id)) continue;
          seen.add(id);
          merged.push(p);
        }

        if (!syscomRes.ok && !tvcRes.ok && merged.length === 0) {
          setSyscomProductos([]);
          setSyscomError("No se pudo consultar Syscom ni TVC en este momento.");
          return;
        }
        setSyscomProductos(merged);
      } catch (e) {
        if (runGen !== syscomSearchGenRef.current) return;
        if (e instanceof DOMException && e.name === "AbortError") return;
        setSyscomProductos([]);
        setSyscomError("Error de conexión con SYSCOM.");
      } finally {
        if (runGen === syscomSearchGenRef.current) {
          setLoadingSyscom(false);
        }
      }
    }, 120);
    return () => {
      window.clearTimeout(timer);
      ac.abort();
    };
  }, [productoSearch, selectedSyscomProducto, selectedCatalogoConcepto, selectedManualProducto]);

  const selectSyscomProducto = useCallback((p: SyscomProducto) => {
    setSelectedSyscomProducto(p);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setConceptoNombre("");
    // No sobreescribir el concepto: el usuario lo captura manualmente.
    setProductoSearch(String(p.titulo || p.modelo || ""));
    setConceptoDescripcion(String([p.marca, p.modelo].filter(Boolean).join(" · ") || p.titulo || ""));
    setCantidad((q) => (toNumber(q, 0) > 0 ? q : 1));
    setUnidad((u) => (u.trim() ? u : "PZA"));
    setPrecioLista(round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio)));
    setSyscomOpen(false);
  }, [syscomTipoCambio]);

  const resolveCatalogoDescripcion = (c: CatalogoConcepto) => {
    const catalogDesc = String(c.descripcion || "").trim();
    if (catalogDesc) return catalogDesc;
    return `Folio: ${c.folio}`;
  };

  const filteredManualProductos = useMemo(() => {
    const q = productoSearch.trim().toLowerCase();
    if (!q) return [];
    return catalogoManualProductos
      .filter((p) =>
        p.producto.toLowerCase().includes(q) ||
        p.marca.toLowerCase().includes(q) ||
        p.modelo.toLowerCase().includes(q) ||
        String(p.id).includes(q)
      )
      .slice(0, 8);
  }, [catalogoManualProductos, productoSearch]);

  const selectManualProducto = useCallback((p: ProductoManualCatalogo) => {
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(p);
    setConceptoNombre("");
    setProductoSearch(String(p.producto || ""));
    setConceptoDescripcion((prev) =>
      String(prev || "").trim() ? prev : buildManualProductoDescripcion(p)
    );
    setCantidad((q) => (toNumber(q, 0) > 0 ? q : 1));
    setUnidad((u) => (u.trim() ? u : "PZA"));
    setPrecioLista(Math.max(0, toNumber(p.precio, 0)));
    setSyscomOpen(false);
  }, []);

  const showSyscomPanel = useMemo(
    () =>
      syscomOpen &&
      (loadingSyscom ||
        syscomProductos.length > 0 ||
        filteredManualProductos.length > 0 ||
        !!syscomError ||
        !!catalogoManualError ||
        productoSearch.trim().length >= 2),
    [
      syscomOpen,
      loadingSyscom,
      syscomProductos.length,
      filteredManualProductos.length,
      syscomError,
      catalogoManualError,
      productoSearch,
    ]
  );

  /** Solo productos (manual / SYSCOM / TVC). Los conceptos van en el campo Concepto. */
  const combinedProductoOptions = useMemo(
    () => [
      ...filteredManualProductos.map((p) => ({
        key: `manual-${p.id}`,
        source: "manual" as const,
        title: p.producto || "-",
        subtitle: [p.marca, p.modelo].filter(Boolean).join(" · ") || `Manual #${p.id}`,
        price: toNumber(p.precio, 0),
        imageUrl: resolveMediaUrl(p.imagen_url) || undefined,
        onSelect: () => selectManualProducto(p),
      })),
      ...syscomProductos.map((p) => ({
        key: `${p.fuente || "syscom"}-${p.producto_id}`,
        source: p.fuente === "tvc" ? ("tvc" as const) : ("syscom" as const),
        title: String(p.titulo || p.modelo || "-"),
        subtitle: [p.marca, p.modelo].filter(Boolean).join(" · "),
        price: round2(getSyscomPrecioListaMxnConIva(p, syscomTipoCambio)),
        imageUrl: getCatalogProductoImageUrl(p) || undefined,
        onSelect: () => selectSyscomProducto(p),
      })),
    ],
    [filteredManualProductos, syscomProductos, syscomTipoCambio, selectManualProducto, selectSyscomProducto]
  );

  useLayoutEffect(() => {
    if (!showSyscomPanel) {
      setSyscomPopPos(null);
      return;
    }
    const el = syscomInputWrapRef.current;
    if (!el) return;

    const update = () => {
      const rect = el.getBoundingClientRect();
      const margin = 8;
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      const preferredMax = Math.min(288, vh * 0.42);
      const spaceBelow = vh - rect.bottom - margin;
      const spaceAbove = rect.top - margin;
      const width = Math.min(Math.max(rect.width, 280), vw - margin * 2);
      let left = rect.left;
      if (left + width > vw - margin) left = Math.max(margin, vw - width - margin);

      const openAbove = spaceBelow < 160 && spaceAbove > spaceBelow;

      if (openAbove) {
        const maxHeight = Math.max(120, Math.min(preferredMax, spaceAbove - 4));
        setSyscomPopPos({
          left,
          width,
          bottom: vh - rect.top + margin,
          maxHeight,
        });
      } else {
        const top = rect.bottom + margin;
        const maxHeight = Math.max(120, Math.min(preferredMax, vh - top - margin));
        setSyscomPopPos({
          left,
          width,
          top,
          maxHeight,
        });
      }
    };

    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [showSyscomPanel, loadingSyscom, syscomProductos.length]);

  useEffect(() => {
    if (!showSyscomPanel) return;
    const onPointerDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (syscomInputWrapRef.current?.contains(t)) return;
      if (syscomPopRef.current?.contains(t)) return;
      setSyscomOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showSyscomPanel]);

  useEffect(() => {
    if (!alert.show) return;
    const t = window.setTimeout(() => {
      setAlert((a) => ({ ...a, show: false }));
    }, 4500);
    return () => window.clearTimeout(t);
  }, [alert.show]);

  const validateClienteContacto = () => {
    const missing: string[] = [];
    if (!clienteId) missing.push("Cliente");
    const tieneContacto = !!String(contactoNombre || "").trim();
    // Contacto es opcional; medio solo obligatorio si hay contacto.
    if (tieneContacto && !String(medioContacto || "").trim()) {
      missing.push("Medio de Contacto");
    }
    return { ok: missing.length === 0, missing };
  };

  const validateCotizacionRequired = useCallback(() => {
    const missing: string[] = [];
    if (!clienteId) missing.push("Cliente");
    const tieneContacto = !!String(contactoNombre || "").trim();
    // Contacto es opcional; medio solo obligatorio si hay contacto.
    if (tieneContacto && !String(medioContacto || "").trim()) {
      missing.push("Medio de Contacto");
    }
    if (tipoTrabajoIds.length === 0) missing.push("Tipo de Trabajo");
    return { ok: missing.length === 0, missing };
  }, [clienteId, contactoNombre, medioContacto, tipoTrabajoIds.length]);

  const medioContactoInvalid =
    medioContactoTouched &&
    !!String(contactoNombre || "").trim() &&
    !String(medioContacto || "").trim();

  const tipoTrabajoInvalid = tipoTrabajoTouched && tipoTrabajoIds.length === 0;

  const resolveClienteNombre = useCallback(() => {
    const fromList = String(selectedCliente?.nombre || "").trim();
    if (fromList) return fromList;
    return String(clienteSearch || "").trim();
  }, [selectedCliente?.nombre, clienteSearch]);

  const buildCotizacionPayload = useCallback(() => {
    const nowIso = todayIso;
    const clienteNombre = resolveClienteNombre();
    const contacto = String(contactoNombre || "").trim();
    const contactoTelefonoValue = String(contactoTelefono || "").trim();
    const lines = conceptos.map((c) => ({ ...c }));
    const orderedLines = buildVisualTableRows(categorias, lines).flatMap((row) =>
      row.kind === "product" ? [row.line] : []
    );
    const subtotalLineasConIva = lines.reduce((acc, c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const pu = linePrecioUnitarioCotizacion(
        toNumber(c.precio_lista, 0),
        descuento,
        c.producto_externo_id,
        !!c.sin_iva
      );
      return acc + toNumber(c.cantidad, 0) * pu;
    }, 0);
    const descClientePct = clampPct(toNumber(effectiveDescuentoClientePct, 0));
    const descuentoCliente = subtotalLineasConIva * (descClientePct / 100);
    const totalConIva = Math.max(0, subtotalLineasConIva - descuentoCliente);
    const subtotal = round2(totalConIva);
    const total = round2(totalConIva);
    return {
      cliente_id: clienteId ? Number(clienteId) : null,
      cliente: truncateStr(clienteNombre, MAX_COTIZ_CLIENTE_LEN),
      prospecto: !!selectedCliente?.is_prospecto,
      contacto: contacto || "",
      contacto_telefono: contactoTelefonoValue || "",
      medio_contacto: String(medioContacto || ""),
      tipo_trabajo: tipoTrabajoIds,
      status: String(status || "PENDIENTE"),
      fecha: nowIso,
      subtotal,
      descuento_cliente_pct: descClientePct,
      anticipo_pct: clampAnticipo(toNumber(anticipoPct, ANTICIPO_PCT_DEFAULT)),
      iva_pct: 0,
      iva: 0,
      total,
      texto_arriba_precios: String(textoArribaPrecios || ""),
      terminos: String(terminos || ""),
      pdf_opciones: pdfOpciones,
      categorias_productos: categoriasToApiPayload(categorias),
      items: orderedLines.map((c, i) => ({
        producto_externo_id: truncateStr(c.producto_externo_id ?? "", 100),
        producto_nombre: truncateStr(c.producto_nombre, MAX_COTIZ_PRODUCTO_NOMBRE_LEN),
        producto_descripcion: resolveConceptoDescripcion(c, catalogoManualProductos),
        pdf_descripcion_corta: truncateStr(String(pdfDescripcionCorta[c.id] || "").trim(), 500),
        unidad: truncateStr(c.unidad, 50),
        thumbnail_url: truncateStr(c.thumbnail_url || "", MAX_COTIZ_THUMB_URL_LEN),
        cantidad: toNumber(c.cantidad, 0),
        precio_lista: toNumber(c.precio_lista, 0),
        descuento_pct: clampPct(toNumber(c.descuento_pct, 0)),
        sin_iva: !!c.sin_iva,
        categoria_id: truncateStr(resolveCategoriaId(categorias, c.categoria_id), 64),
        orden: i,
      })),
    };
  }, [
    todayIso,
    selectedCliente,
    clienteId,
    resolveClienteNombre,
    contactoNombre,
    contactoTelefono,
    medioContacto,
    tipoTrabajoIds,
    status,
    conceptos,
    categorias,
    effectiveDescuentoClientePct,
    anticipoPct,
    textoArribaPrecios,
    terminos,
    pdfOpciones,
    pdfDescripcionCorta,
    catalogoManualProductos,
  ]);

  const upsertCotizacion = useCallback(async (opts?: {
    navigateAfterSave?: boolean;
    validateRequired?: boolean;
    silent?: boolean;
    autosave?: boolean;
  }): Promise<string | null> => {
    const navigateAfterSave = !!opts?.navigateAfterSave;
    const validateRequired = opts?.validateRequired !== false;
    const silent = !!opts?.silent;
    const autosave = !!opts?.autosave;
    const canView = permissions?.cotizaciones?.view === true;
    const canCreate = permissions?.cotizaciones?.create === true;
    const canEdit = permissions?.cotizaciones?.edit === true;
    let targetId = (editingCotizacionId || activeCotizacionId || "").trim();

    if (!targetId && draftInitPromiseRef.current) {
      const draftId = await draftInitPromiseRef.current.catch(() => null);
      if (draftId) targetId = draftId;
    }

    if (upsertInFlightRef.current) {
      if (!silent) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Guardando",
          message: "Espera a que termine el guardado anterior.",
        });
      }
      return targetId || null;
    }
    upsertInFlightRef.current = true;

    if (!canView) {
      upsertInFlightRef.current = false;
      if (!silent) {
        setAlert({
          show: true,
          variant: "warning",
          title: "Sin permiso",
          message: "No tienes permiso para ver cotizaciones.",
        });
      }
      return null;
    }

    if (targetId) {
      if (!canEdit) {
        upsertInFlightRef.current = false;
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin permiso",
            message: "No tienes permiso para editar cotizaciones.",
          });
        }
        return null;
      }
    } else {
      if (!canCreate) {
        upsertInFlightRef.current = false;
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Sin permiso",
            message: "No tienes permiso para crear cotizaciones.",
          });
        }
        return null;
      }
    }

    if (validateRequired) {
      const v = validateCotizacionRequired();
      if (!v.ok) {
        if (!String(medioContacto || "").trim()) {
          setMedioContactoTouched(true);
        }
        if (tipoTrabajoIds.length === 0) {
          setTipoTrabajoTouched(true);
        }
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Faltan datos",
            message: `Completa: ${v.missing.join(", ")}.`,
          });
        }
        upsertInFlightRef.current = false;
        return null;
      }
      if (!conceptos.length) {
        if (!silent) {
          setAlert({
            show: true,
            variant: "warning",
            title: "Faltan conceptos",
            message: "Agrega al menos un producto o servicio para guardar la cotización.",
          });
        }
        upsertInFlightRef.current = false;
        return null;
      }
    }

    const payload = buildCotizacionPayload();

    if (
      autosave &&
      clienteId &&
      String(contactoNombre || "").trim() &&
      !String(medioContacto || "").trim()
    ) {
      upsertInFlightRef.current = false;
      return null;
    }

    if (autosave) {
      const snapshot = JSON.stringify({
        ...payload,
        tipo_trabajo: [...(payload.tipo_trabajo || [])].sort((a: number, b: number) => a - b),
      });
      if (lastAutosaveSnapshotRef.current === snapshot) {
        upsertInFlightRef.current = false;
        return targetId || null;
      }
      lastAutosaveSnapshotRef.current = snapshot;
    }

    try {
      if (autosave) setIsAutoSaving(true);
      const isEdit = !!targetId;
      const res = await fetchApi(isEdit ? `/api/cotizaciones/${targetId}/` : "/api/cotizaciones/", {
        method: isEdit ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        if (autosave) {
          lastAutosaveSnapshotRef.current = null;
        }
        if (!silent) {
          const msg = formatCotizacionApiError(data);
          setAlert({ show: true, variant: "error", title: "Error", message: msg });
        }
        return null;
      }

      const savedId = String(data?.id || targetId || "").trim();
      if (savedId && savedId !== activeCotizacionId) setActiveCotizacionId(savedId);
      if (data?.idx != null && Number.isFinite(Number(data.idx))) {
        setEditingCotizacionIdx(Number(data.idx));
      }
      if (!autosave && data && "tipo_trabajo" in data) {
        setTipoTrabajo(normalizeTipoTrabajoIds((data as ApiCotizacion).tipo_trabajo));
      }
      if (autosave) {
        setLastAutoSavedAt(Date.now());
      } else if (!silent) {
        setAlert({
          show: true,
          variant: "success",
          title: isEdit ? "Cotización actualizada" : "Cotización guardada",
          message: `Folio ${formatDocumentFolio(FOLIO_SERIE.cotizacion, data?.idx || data?.id)} guardado correctamente.`,
        });
      }
      // Refresca contactos del cliente por si el backend creó uno nuevo.
      const cid = clienteId ? Number(clienteId) : 0;
      if (cid && String(contactoNombre || "").trim()) {
        try {
          const refreshed = await fetchCotizacionClienteById(cid);
          if (refreshed) {
            setClientes((prev) => {
              if (prev.some((c) => c.id === refreshed.id)) {
                return prev.map((c) => (c.id === refreshed.id ? { ...c, ...refreshed } : c));
              }
              return [refreshed, ...prev];
            });
          }
        } catch (error) {
          console.error("Error refrescando contactos del cliente:", error);
        }
      }
      if (navigateAfterSave) {
        window.setTimeout(() => goToCotizacionList(), 350);
      }
      return savedId || null;
    } catch {
      if (autosave) {
        lastAutosaveSnapshotRef.current = null;
      }
      if (!silent) {
        setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo guardar la cotización." });
      }
      return null;
    } finally {
      upsertInFlightRef.current = false;
      if (autosave) setIsAutoSaving(false);
    }
  }, [
    editingCotizacionId,
    activeCotizacionId,
    buildCotizacionPayload,
    conceptos.length,
    goToCotizacionList,
    permissions,
    clienteId,
    contactoNombre,
    medioContacto,
    tipoTrabajoIds.length,
    validateCotizacionRequired,
  ]);

  upsertCotizacionRef.current = upsertCotizacion;

  const handleSaveCotizacion = async (navigateAfterSave = true): Promise<string | null> =>
    upsertCotizacion({ navigateAfterSave, validateRequired: true, silent: false, autosave: false });

  useEffect(() => {
    const targetId = (editingCotizacionId || activeCotizacionId || "").trim();
    if (!targetId || hydratingFromStorage) return;

    const timer = window.setTimeout(() => {
      void upsertCotizacionRef.current({
        navigateAfterSave: false,
        validateRequired: false,
        silent: true,
        autosave: true,
      });
    }, 2500);

    return () => window.clearTimeout(timer);
  }, [
    editingCotizacionId,
    activeCotizacionId,
    hydratingFromStorage,
    clienteId,
    contactoNombre,
    medioContacto,
    tipoTrabajoAutosaveKey,
    status,
    descuentoClientePct,
    anticipoPct,
    conceptosAutosaveKey,
    pdfOpcionesAutosaveKey,
    pdfDescripcionCortaAutosaveKey,
    textoArribaPrecios,
    terminos,
  ]);

  useEffect(() => {
    lastAutosaveSnapshotRef.current = null;
  }, [editingCotizacionId, activeCotizacionId]);

  useEffect(() => {
    const onBeforeUnload = () => {
      const targetId = (editingCotizacionId || activeCotizacionId || "").trim();
      if (!targetId) return;
      try {
        void fetchApi(`/api/cotizaciones/${targetId}/`, {
          method: "PUT",
          // Sin Content-Type DRF responde 415 y el último guardado se pierde en silencio.
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(buildCotizacionPayload()),
          keepalive: true,
        });
      } catch {
        // ignore
      }
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [editingCotizacionId, activeCotizacionId, buildCotizacionPayload]);

  const editingConceptoActual = useMemo(
    () => (editingConceptoId ? conceptos.find((x) => x.id === editingConceptoId) || null : null),
    [conceptos, editingConceptoId]
  );
  const hasProductoSeleccionado = !!selectedSyscomProducto || !!selectedManualProducto;
  const bloquearConceptoInput = hasProductoSeleccionado || String(productoSearch || "").trim().length > 0;
  const bloquearProductoInput = String(conceptoNombre || "").trim().length > 0;
  const nombreConceptoResuelto = String(
    conceptoNombre ||
      selectedCatalogoConcepto?.concepto ||
      selectedManualProducto?.producto ||
      selectedSyscomProducto?.titulo ||
      selectedSyscomProducto?.modelo ||
      (editingConceptoActual?.producto_externo_id ? productoSearch : "") ||
      ""
  ).trim();

  const canAddConcepto = useMemo(() => {
    const v = validateClienteContacto();
    const qtyOk = toNumber(cantidad, 0) > 0;
    const nameOk = nombreConceptoResuelto !== "";
    const priceOk = toNumber(precioLista, 0) >= 0;
    return v.ok && qtyOk && nameOk && priceOk;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    clienteId,
    contactoNombre,
    medioContacto,
    cantidad,
    nombreConceptoResuelto,
    precioLista,
  ]);

  const clearConceptoForm = () => {
    setEditingConceptoId(null);
    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSinIva(false);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomProductos([]);
    setSyscomError("");
    setSyscomOpen(false);
    setConceptoOpen(false);
    setConceptoSearch("");
  };

  /** Al editar, el modo lo dicta la partida; si no, la pestaña elegida. */
  const composerMode: "producto" | "concepto" = editingConceptoId
    ? esFormularioProducto
      ? "producto"
      : "concepto"
    : composerModeChoice;

  /** Cambia de pestaña limpiando lo capturado en la otra (son excluyentes). */
  const switchComposerMode = (next: "producto" | "concepto") => {
    if (editingConceptoId || next === composerMode) return;
    if (next === "producto") {
      setConceptoNombre("");
      setConceptoSearch("");
      setSelectedCatalogoConcepto(null);
      setConceptoOpen(false);
    } else {
      setProductoSearch("");
      setSelectedSyscomProducto(null);
      setSelectedManualProducto(null);
      setSyscomOpen(false);
    }
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setComposerModeChoice(next);
  };

  const handleConceptoInputChange = (nextConcepto: string) => {
    setConceptoNombre(nextConcepto);
    setConceptoSearch(nextConcepto);
    if (toNumber(cantidad, 0) <= 0) {
      setCantidad(1);
    }
    if (nextConcepto.trim().length > 0) {
      setProductoSearch("");
      setSyscomOpen(false);
    }
    setSelectedSyscomProducto(null);
    setSelectedManualProducto(null);
    const match = catalogoConceptos.find(
      (c) => String(c.concepto || "").trim().toLowerCase() === nextConcepto.trim().toLowerCase()
    );
    if (match) {
      setSelectedCatalogoConcepto(match);
      if (toNumber(precioLista, 0) <= 0) {
        setPrecioLista(Math.max(0, toNumber(match.precio1, 0)));
      }
      setUnidad((u) => (u.trim() ? u : "SERV"));
      setConceptoDescripcion((prev) => (String(prev || "").trim() ? prev : resolveCatalogoDescripcion(match)));
    } else {
      setSelectedCatalogoConcepto(null);
    }
  };

  const addConcepto = () => {
    const v = validateClienteContacto();
    if (!v.ok) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    const qty = Math.max(0, toNumber(cantidad, 0));
    const pl = Math.max(0, toNumber(precioLista, 0));
    const precioCatalogo = Math.max(0, toNumber(selectedCatalogoConcepto?.precio1, 0));
    const precioLinea = pl > 0 ? pl : precioCatalogo;
    const desc = clampPct(toNumber(descuentoPct, 0));
    const nombre = nombreConceptoResuelto;
    const descripcion = selectedManualProducto
      ? buildManualProductoDescripcion(selectedManualProducto)
      : String(conceptoDescripcion || "").trim();
    const productoExternoId = selectedSyscomProducto?.producto_id || (selectedManualProducto ? `manual:${selectedManualProducto.id}` : "");
    const catalogThumb = selectedCatalogoConcepto?.imagen_url?.trim();
    const manualThumb = selectedManualProducto?.imagen_url?.trim();
    const thumbnail = selectedSyscomProducto?.img_portada
      ? getCatalogProductoImageUrl(selectedSyscomProducto) || undefined
      : manualThumb || catalogThumb || undefined;
    const esProductoLinea =
      !!productoExternoId ||
      (!!editingConceptoId &&
        String(conceptos.find((x) => x.id === editingConceptoId)?.producto_externo_id || "").trim() !== "");
    const sinIvaLinea = (esProductoLinea ? isAdmin : true) && sinIva;

    if (qty <= 0 || !nombre) return;

    if (editingConceptoId) {
      setConceptos((prev) =>
        prev.map((x) =>
          x.id === editingConceptoId
            ? {
              ...x,
              producto_externo_id: productoExternoId || x.producto_externo_id || "",
              producto_nombre: nombre,
              producto_descripcion: descripcion,
              unidad: String(unidad || ""),
              thumbnail_url: thumbnail || x.thumbnail_url,
              cantidad: qty,
              precio_lista: precioLinea,
              descuento_pct: desc,
              sin_iva: sinIvaLinea,
            }
            : x
        )
      );
      setEditingConceptoId(null);
    } else {
      const categoriaAsignada = resolveCategoriaId(categorias, categoriaIdParaAgregar);
      setConceptos((prev) => [
        ...prev,
        {
          id: uid(),
          producto_externo_id: productoExternoId,
          producto_nombre: nombre,
          producto_descripcion: descripcion,
          unidad: String(unidad || ""),
          thumbnail_url: thumbnail,
          cantidad: qty,
          precio_lista: precioLinea,
          descuento_pct: desc,
          sin_iva: sinIvaLinea,
          categoria_id: categoriaAsignada || undefined,
        },
      ]);
    }

    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSinIva(false);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomProductos([]);
    setSyscomError("");
    setSyscomOpen(false);
  };

  const askRemoveConcepto = useCallback(
    (id: string) => {
      const c = conceptos.find((x) => x.id === id);
      if (!c) return;
      setConceptoToDelete({
        id,
        nombre: String(c.producto_nombre || "").trim() || "este concepto",
      });
    },
    [conceptos]
  );

  const confirmRemoveConcepto = useCallback(() => {
    if (!conceptoToDelete) return;
    const id = conceptoToDelete.id;
    setConceptos((prev) => prev.filter((c) => c.id !== id));
    setEditingConceptoId((prev) => (prev === id ? null : prev));
  }, [conceptoToDelete]);

  const handleReorderProducts = useCallback((reorderedLines: CotizacionConceptoLine[]) => {
    setConceptos((prev) => {
      const byId = new Map(prev.map((c) => [c.id, c]));
      const next: Concepto[] = [];
      for (const line of reorderedLines) {
        const base = byId.get(line.id);
        if (!base) continue;
        next.push({
          ...base,
          categoria_id: line.categoria_id || undefined,
        });
      }
      if (next.length !== prev.length) return prev;
      return next;
    });
  }, []);

  const handleReorderCategorias = useCallback((next: CotizacionCategoria[]) => {
    setCategorias(next);
  }, []);

  const handleAddCategoria = useCallback((nombre: string) => {
    setCategorias((prev) => [...prev, createCategoria(nombre, prev)]);
  }, []);

  const handleUpdateCategoria = useCallback((id: string, nombre: string) => {
    setCategorias((prev) => prev.map((c) => (c.id === id ? { ...c, nombre: nombre.trim() } : c)));
  }, []);

  const askRemoveCategoria = useCallback(
    (id: string) => {
      const cat = categorias.find((c) => c.id === id);
      if (!cat) return;
      const productosCount = conceptos.filter((c) => c.categoria_id === id).length;
      setCategoriaToDelete({
        id,
        nombre: String(cat.nombre || "").trim() || "esta categoría",
        productosCount,
      });
    },
    [categorias, conceptos]
  );

  const confirmRemoveCategoria = useCallback(() => {
    if (!categoriaToDelete) return;
    const id = categoriaToDelete.id;
    const removedIds = new Set(
      conceptos.filter((c) => c.categoria_id === id).map((c) => c.id)
    );
    setCategorias((prev) => prev.filter((c) => c.id !== id));
    setConceptos((prev) => prev.filter((c) => c.categoria_id !== id));
    if (editingConceptoId && removedIds.has(editingConceptoId)) {
      setEditingConceptoId(null);
    }
    setCategoriaIdParaAgregar((prev) => (prev === id ? "" : prev));
  }, [categoriaToDelete, conceptos, editingConceptoId]);

  const editConcepto = (id: string) => {
    const c = conceptos.find((x) => x.id === id);
    if (!c) return;
    const productoExternoId = String(c.producto_externo_id || "").trim();
    const esLineaDeProducto = productoExternoId !== "";
    setEditingConceptoId(id);
    setCantidad(toNumber(c.cantidad, 1));
    setConceptoNombre(String(c.producto_nombre || ""));
    setProductoSearch(esLineaDeProducto ? String(c.producto_nombre || "") : "");
    setConceptoDescripcion(String(c.producto_descripcion || ""));
    setUnidad(String(c.unidad || ""));
    setPrecioLista(toNumber(c.precio_lista, 0));
    setDescuentoPct(clampPct(toNumber(c.descuento_pct, 0)));
    setSinIva(!!c.sin_iva);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    if (productoExternoId.toLowerCase().startsWith("manual:")) {
      const manualId = Number(productoExternoId.split(":")[1]);
      const manual = catalogoManualProductos.find((p) => p.id === manualId);
      if (manual) {
        setSelectedManualProducto(manual);
        setConceptoDescripcion(buildManualProductoDescripcion(manual));
      }
    }
    setSyscomError("");
    setSyscomOpen(false);
  };

  const computed = useMemo(() => {
    const lines = conceptos.map((c) => {
      const descuento = clampPct(toNumber(c.descuento_pct, 0));
      const sinIvaLinea = !!c.sin_iva;
      const pu = linePrecioUnitarioSinIva(toNumber(c.precio_lista, 0), descuento, c.producto_externo_id);
      const puCobrado = linePrecioUnitarioCotizacion(
        toNumber(c.precio_lista, 0),
        descuento,
        c.producto_externo_id,
        sinIvaLinea
      );
      const qty = toNumber(c.cantidad, 0);
      const importe = qty * pu;
      const importeCobrado = qty * puCobrado;
      return { ...c, pu, importe, sin_iva: sinIvaLinea, importeCobrado };
    });

    const subtotalLineasSinIva = lines.reduce((acc, l) => acc + (Number.isFinite(l.importe) ? l.importe : 0), 0);
    const subtotalLineasBase = lines.reduce((acc, l) => {
      const descuento = clampPct(toNumber(l.descuento_pct, 0));
      const puBase = linePrecioUnitarioSinIva(toNumber(l.precio_lista, 0), descuento, l.producto_externo_id);
      return acc + toNumber(l.cantidad, 0) * puBase;
    }, 0);
    /** Monto total descontado por los descuentos aplicados por concepto (sin IVA). */
    const descuentoLineasSinIva = lines.reduce((acc, l) => {
      const descuento = clampPct(toNumber(l.descuento_pct, 0));
      if (descuento <= 0) return acc;
      const puLista = linePrecioUnitarioSinIva(toNumber(l.precio_lista, 0), 0, l.producto_externo_id);
      const puDesc = linePrecioUnitarioSinIva(toNumber(l.precio_lista, 0), descuento, l.producto_externo_id);
      return acc + toNumber(l.cantidad, 0) * Math.max(0, puLista - puDesc);
    }, 0);
    /** Suma cobrada (con o sin IVA según bandera); el descuento cliente se aplica sobre este monto. */
    const subtotalLineasConIva = lines.reduce(
      (acc, l) => acc + (Number.isFinite(l.importeCobrado) ? l.importeCobrado : 0),
      0
    );

    const descClientePct = clampPct(toNumber(effectiveDescuentoClientePct, 0));
    const descuentoCliente = subtotalLineasConIva * (descClientePct / 100);
    const totalConIva = Math.max(0, subtotalLineasConIva - descuentoCliente);
    const factorDesc = subtotalLineasConIva > 0 ? totalConIva / subtotalLineasConIva : 1;
    const subtotalSinIva = round2(subtotalLineasBase * factorDesc);
    const ivaDesglose = round2(Math.max(0, totalConIva - subtotalSinIva));
    /** Subtotal/total guardados: monto cobrado (misma convención que el backend). */
    const subtotal = totalConIva;
    const total = totalConIva;

    return {
      lines,
      subtotalLineas: subtotalLineasSinIva,
      descuentoLineas: round2(descuentoLineasSinIva),
      descClientePct,
      descuentoCliente,
      subtotal,
      iva: 0,
      total,
      ivaPct: 0,
      totalConIva,
      subtotalSinIva,
      ivaDesglose,
    };
  }, [conceptos, effectiveDescuentoClientePct]);

  /**
   * Vista de garantía: los precios se muestran en $0 en la app (tabla de
   * conceptos y resumen) para que coincidan con el PDF. Los datos reales
   * (precio_lista, subtotal, total) NO se tocan — se siguen guardando
   * normales en `buildCotizacionPayload`, que lee de `conceptos`, no de aquí.
   */
  const displayComputed = useMemo(() => {
    if (!pdfOpciones.es_garantia) return computed;
    return {
      ...computed,
      lines: computed.lines.map((l) => ({ ...l, pu: 0, importe: 0, importeCobrado: 0 })),
      subtotalLineas: 0,
      descuentoLineas: 0,
      descuentoCliente: 0,
      subtotal: 0,
      total: 0,
      totalConIva: 0,
      subtotalSinIva: 0,
      ivaDesglose: 0,
    };
  }, [computed, pdfOpciones.es_garantia]);

  /** Cliente, tipo de trabajo y al menos un concepto; contacto es opcional (medio solo si hay contacto). */
  const canGuardarCotizacion = useMemo(() => {
    if (!clienteId) return false;
    if (String(contactoNombre || "").trim() && !medioContacto) return false;
    if (tipoTrabajoIds.length === 0) return false;
    if (!computed.lines.length) return false;
    return true;
  }, [clienteId, contactoNombre, medioContacto, tipoTrabajoIds.length, computed.lines.length]);

  const resetAll = () => {
    setClienteId("");
    setClienteSearch("");
    setClienteOpen(false);
    setDebouncedClienteSearch("");
    setContactoNombre("");
    setContactoTelefono("");

    setMedioContacto('');
    setMedioContactoTouched(false);
    setTipoTrabajo([]);
    setTipoTrabajoTouched(false);
    setStatus('PENDIENTE');
    setEnviadoInfo(null);

    setCantidad(1);
    setConceptoNombre("");
    setProductoSearch("");
    setConceptoDescripcion("");
    setUnidad("");
    setPrecioLista(0);
    setDescuentoPct(0);
    setSinIva(false);
    setSelectedSyscomProducto(null);
    setSelectedCatalogoConcepto(null);
    setSelectedManualProducto(null);
    setSyscomProductos([]);
    setSyscomError("");
    setSyscomOpen(false);
    setDescuentoClientePct(0);
    setDescuentoClienteTouched(false);

    setEditingConceptoId(null);

    setConceptos([]);
    setCategorias([]);
    setCategoriaIdParaAgregar("");
    setTextoArribaPrecios("A continuación cotización solicitada:");
    setTerminos(terminosCotizacionDefault(marcaNombre));
    setPdfOpciones(defaultPdfOpciones());
    setPdfDescripcionCorta({});
  };

  const handleOpenPdf = async () => {
    if (previewLoading || excelLoading) return;

    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para generar el PDF.",
      });
      return;
    }

    const v = validateCotizacionRequired();
    if (!v.ok) {
      if (tipoTrabajoIds.length === 0) setTipoTrabajoTouched(true);
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    try {
      setPreviewLoading(true);
      const savedId = await upsertCotizacion({
        navigateAfterSave: false,
        validateRequired: true,
        silent: false,
        autosave: false,
      });
      if (!savedId) return;
      navigate(`/cotizacion/${savedId}/pdf`);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo abrir el PDF." });
    } finally {
      setPreviewLoading(false);
    }
  };

  const canEnviarPorCorreo = ["PENDIENTE", "AUTORIZADA"].includes(String(status || "").trim().toUpperCase());

  const handleEnviarPorCorreo = async () => {
    if (previewLoading || excelLoading || enviarCorreoSaving) return;

    if (!computed.lines.length) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan conceptos",
        message: "Agrega al menos un producto o servicio para enviar la cotización por correo.",
      });
      return;
    }

    const v = validateCotizacionRequired();
    if (!v.ok) {
      if (tipoTrabajoIds.length === 0) setTipoTrabajoTouched(true);
      setAlert({
        show: true,
        variant: "warning",
        title: "Faltan datos",
        message: `Completa: ${v.missing.join(", ")}.`,
      });
      return;
    }

    try {
      setEnviarCorreoSaving(true);
      const savedId = await upsertCotizacion({
        navigateAfterSave: false,
        validateRequired: true,
        silent: false,
        autosave: false,
      });
      if (!savedId) return;
      if (savedId !== activeCotizacionId) setActiveCotizacionId(savedId);
      setEnviarPdfTarget({
        id: Number(savedId),
        idx: editingCotizacionIdx ?? undefined,
        cliente: resolveClienteNombre() || undefined,
        status,
      });
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo preparar el envío por correo." });
    } finally {
      setEnviarCorreoSaving(false);
    }
  };

  const handleDownloadExcel = async () => {
    if (previewLoading || excelLoading) return;

    const cotizacionPk = String(editingCotizacionId || activeCotizacionId || "").trim();
    if (!cotizacionPk) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Guarda la cotización",
        message: "Para descargar el Excel, primero guarda la cotización para generar su folio.",
      });
      return;
    }

    try {
      setExcelLoading(true);
      const resp = await fetchApi(`/api/cotizaciones/${cotizacionPk}/excel/`);

      if (!resp.ok) {
        let msg = `No se pudo generar el Excel (HTTP ${resp.status}).`;
        try {
          const ct = resp.headers.get("content-type") || "";
          if (ct.includes("application/json")) {
            const data = await resp.json();
            msg = (data as { detail?: string })?.detail || msg;
          } else {
            msg = (await resp.text()) || msg;
          }
        } catch {
          /* ignore */
        }
        setAlert({ show: true, variant: "error", title: "Error", message: msg });
        return;
      }

      const dispo = resp.headers.get("content-disposition") || "";
      const m = dispo.match(/filename="?([^";]+)"?/i);
      const filename = m?.[1] ? String(m[1]) : `Cotizacion_${cotizacionPk}.xlsx`;

      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    } catch {
      setAlert({ show: true, variant: "error", title: "Error", message: "No se pudo descargar el Excel." });
    } finally {
      setExcelLoading(false);
    }
  };

  const handleAbrirMarcarEnviada = () => {
    const cotizacionPk = String(editingCotizacionId || activeCotizacionId || "").trim();
    if (!cotizacionPk) {
      setAlert({
        show: true,
        variant: "warning",
        title: "Guarda la cotización",
        message: "Para marcarla como enviada, primero guarda la cotización.",
      });
      return;
    }
    setMarcarEnviadaTarget({
      id: Number(cotizacionPk),
      idx: editingCotizacionIdx ?? undefined,
      cliente: resolveClienteNombre() || undefined,
      comentario: enviadoInfo?.comentario,
      enviadoPor: enviadoInfo?.por,
      enviadoEn: enviadoInfo?.en,
    });
  };

  /* ------------------------------------------------------------------------
     Derivados solo de presentación
     ------------------------------------------------------------------------ */
  const cotizacionPk = String(editingCotizacionId || activeCotizacionId || "").trim();
  const folioLabel =
    editingCotizacionIdx != null ? formatDocumentFolio(FOLIO_SERIE.cotizacion, editingCotizacionIdx) : "";
  const [folioPrefix, ...folioRest] = folioLabel.split("-");
  const tieneContacto = !!String(contactoNombre || "").trim();
  const clienteStepDone = !!clienteId && tipoTrabajoIds.length > 0 && !(tieneContacto && !medioContacto);
  const partidasStepDone = computed.lines.length > 0;
  const anticipoPctEfectivo = clampAnticipo(toNumber(anticipoPct, ANTICIPO_PCT_DEFAULT));
  const anticipoMonto = displayComputed.totalConIva * (anticipoPctEfectivo / 100);
  const saldoMonto = Math.max(0, displayComputed.totalConIva - anticipoMonto);
  const requisitos = [
    { key: "cliente", label: "Selecciona un cliente", done: !!clienteId, target: "cot-cliente" },
    { key: "tipo", label: "Elige el tipo de trabajo", done: tipoTrabajoIds.length > 0, target: "cot-cliente" },
    ...(tieneContacto
      ? [{ key: "medio", label: "Indica el medio de contacto", done: !!medioContacto, target: "cot-cliente" }]
      : []),
    { key: "partidas", label: "Agrega al menos una partida", done: partidasStepDone, target: "cot-partidas" },
  ];
  const requisitosListos = requisitos.filter((r) => r.done).length;
  const steps = [
    { id: "cot-cliente", label: "Cliente", done: clienteStepDone },
    { id: "cot-partidas", label: "Partidas", done: partidasStepDone },
    { id: "cot-textos", label: "Textos", done: false, optional: true },
    { id: "cot-pdf", label: "Exportación", done: false, optional: true },
  ];
  const statusMeta: Record<string, { dot: string; label: string }> = {
    PENDIENTE: { dot: cotStatusDotPendienteClass, label: "Pendiente" },
    AUTORIZADA: { dot: cotStatusDotAutorizadaClass, label: "Autorizada" },
    CANCELADA: { dot: cotStatusDotCanceladaClass, label: "Cancelada" },
  };
  const statusActual = statusMeta[String(status || "").toUpperCase()] ?? statusMeta.PENDIENTE;
  const productoFuenteLabel = selectedSyscomProducto
    ? selectedSyscomProducto.fuente === "tvc"
      ? "TVC"
      : "SYSCOM"
    : selectedManualProducto
      ? "Catálogo manual"
      : "";
  const conceptosFiltrados = catalogoConceptos.filter((c) => {
    const q = (conceptoSearch || "").trim().toLowerCase();
    if (!q) return true;
    return String(c.concepto || "").toLowerCase().includes(q) || String(c.folio || "").toLowerCase().includes(q);
  });
  const saveDisabledReason = !clienteId
    ? "Selecciona un cliente"
    : tipoTrabajoIds.length === 0
      ? "Selecciona al menos un tipo de trabajo"
      : !computed.lines.length
        ? "Agrega al menos una partida"
        : undefined;

  const saveButtonLabel = isEditingRoute ? "Actualizar cotización" : "Guardar cotización";
  const pasosObligatorios = steps.filter((st) => !st.optional).length;
  const pasosObligatoriosListos = steps.filter((st) => !st.optional && st.done).length;
  const headerFacts: {
    key: string;
    label: string;
    icon: ReactNode;
    value: string;
    muted?: boolean;
    live?: boolean;
  }[] = [
    {
      key: "cliente",
      label: "Cliente",
      icon: <User className="size-3.5" aria-hidden />,
      value: selectedCliente?.nombre?.trim() || (clienteId ? clienteSearch.trim() : "") || "Sin asignar",
      muted: !clienteId,
    },
    {
      key: "status",
      label: "Status",
      icon: <span className={`size-2 rounded-full ${statusActual.dot}`} aria-hidden />,
      value: pdfOpciones.es_garantia ? `${statusActual.label} · Garantía` : statusActual.label,
    },
    {
      key: "fecha",
      label: "Fecha",
      icon: <CalendarDays className="size-3.5" aria-hidden />,
      value: formatDMY(todayIso),
    },
    {
      key: "guardado",
      label: "Guardado",
      icon: isAutoSaving ? (
        <Spinner className="size-3.5" />
      ) : (
        <CloudCheck className={`size-3.5 ${lastAutoSavedAt ? "text-[#4ADE80]" : ""}`} aria-hidden />
      ),
      value: isAutoSaving
        ? "Guardando…"
        : lastAutoSavedAt
          ? `A las ${new Date(lastAutoSavedAt).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" })}`
          : "Automático",
      live: true,
    },
  ];

  return (
    <div className={cotPageCanvasClass} style={cotSansStyle}>
      <div className={`${cotPageInnerClass} pb-32! lg:pb-12!`}>
        <PageMeta title="Nueva Cotización | Sistema Grupo Intrax GPS" description="Crear nueva cotización" />

        <CotizacionExportOverlay open={exportBusy} isExcel={excelLoading} progress={loadingProgress} />

        <CotizacionEnviarPdfModal
          open={enviarPdfTarget != null}
          cotizacion={enviarPdfTarget}
          onClose={() => setEnviarPdfTarget(null)}
          onSent={(correo, envio) => {
            setEnviarPdfTarget(null);
            const por = String(envio?.enviado_por_full_name || envio?.enviado_por_username || "").trim();
            if (por) {
              setEnviadoInfo({
                por,
                en: String(envio?.enviado_en || "").trim() || undefined,
                comentario: String(envio?.enviado_comentario || "").trim() || undefined,
              });
            }
            setAlert({
              show: true,
              variant: "success",
              title: "Correo enviado",
              message: `El PDF se envió a ${correo}.`,
            });
          }}
          onError={(message) => {
            setAlert({ show: true, variant: "error", title: "Correo", message });
          }}
        />

        <CotizacionMarcarEnviadaModal
          open={marcarEnviadaTarget != null}
          cotizacion={marcarEnviadaTarget}
          onClose={() => setMarcarEnviadaTarget(null)}
          onMarked={(data) => {
            setMarcarEnviadaTarget(null);
            const por = String(data.enviado_por_full_name || data.enviado_por_username || "").trim();
            setEnviadoInfo(
              por
                ? { por, en: data.enviado_en, comentario: data.enviado_comentario }
                : enviadoInfo
            );
            setAlert({
              show: true,
              variant: "success",
              title: "Cotización marcada como enviada",
              message: "Se registró quién la marcó y cuándo.",
            });
          }}
          onError={(message) => {
            setAlert({ show: true, variant: "error", title: "Marcar como enviada", message });
          }}
        />

        <CotizacionCloneModal
          open={cloneModalOpen}
          pickingId={clonePickingId}
          onClose={() => {
            if (clonePickingId != null) return;
            setCloneModalOpen(false);
            resetCloneClienteState();
          }}
          onPick={(id) => void handleClonePick(id)}
          clienteMode={cloneClienteMode}
          onClienteModeChange={(mode) => {
            setCloneClienteMode(mode);
            if (mode === "mismo") {
              setCloneTargetCliente(null);
              setCloneClienteSearch("");
              setCloneClienteOptions([]);
            }
          }}
          targetCliente={cloneTargetCliente}
          onPickTargetCliente={(c) => {
            setCloneTargetCliente(c);
            setCloneClienteSearch(String(c.nombre || ""));
            setCloneClienteOptions([]);
          }}
          onClearTargetCliente={() => {
            setCloneTargetCliente(null);
            setCloneClienteSearch("");
          }}
          clienteSearch={cloneClienteSearch}
          onClienteSearchChange={setCloneClienteSearch}
          clienteOptions={cloneClienteOptions}
          clienteLoading={cloneClienteLoading}
          clienteDebounced={cloneClienteDebounced}
          search={cloneSearch}
          onSearchChange={setCloneSearch}
          searchDebounced={cloneSearchDebounced}
          listLoading={cloneListLoading}
          rows={cloneRows}
        />

        <CotizacionClearModal
          open={clearFormModalOpen}
          onClose={() => setClearFormModalOpen(false)}
          onConfirm={resetAll}
        />

        <CotizacionConfirmDeleteModal
          open={conceptoToDelete != null}
          onClose={() => setConceptoToDelete(null)}
          onConfirm={confirmRemoveConcepto}
          title="¿Eliminar concepto?"
          description={
            conceptoToDelete ? (
              <>
                Se eliminará{" "}
                <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                  {conceptoToDelete.nombre}
                </span>{" "}
                de la cotización. Esta acción no se puede deshacer.
              </>
            ) : null
          }
        />

        <CotizacionConfirmDeleteModal
          open={categoriaToDelete != null}
          onClose={() => setCategoriaToDelete(null)}
          onConfirm={confirmRemoveCategoria}
          title="¿Eliminar categoría?"
          description={
            categoriaToDelete ? (
              categoriaToDelete.productosCount > 0 ? (
                <>
                  Se eliminará la categoría{" "}
                  <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                    {categoriaToDelete.nombre}
                  </span>{" "}
                  y{" "}
                  <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                    {categoriaToDelete.productosCount === 1
                      ? "1 producto"
                      : `${categoriaToDelete.productosCount} productos`}
                  </span>{" "}
                  que contiene. Esta acción no se puede deshacer.
                </>
              ) : (
                <>
                  Se eliminará la categoría{" "}
                  <span className="font-semibold text-[#09090B] dark:text-[#F8FAFC]">
                    {categoriaToDelete.nombre}
                  </span>
                  . Esta acción no se puede deshacer.
                </>
              )
            ) : null
          }
        />

        {showSyscomPanel &&
          syscomPopPos &&
          createPortal(
            <div
              ref={syscomPopRef}
              role="listbox"
              aria-label="Resultados de productos"
              style={{
                position: "fixed",
                zIndex: 2147483646,
                left: syscomPopPos.left,
                width: syscomPopPos.width,
                maxHeight: syscomPopPos.maxHeight,
                ...(syscomPopPos.top != null ? { top: syscomPopPos.top } : { bottom: syscomPopPos.bottom }),
              }}
              className="cot-pop flex flex-col overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.4)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827] dark:ring-white/10"
            >
              <div className="flex shrink-0 items-center justify-between gap-2 border-b border-[#F0F0F2] px-3.5 py-2.5 dark:border-[#1F2A3C]">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#71717A] dark:text-[#8EA0B8]">
                  Resultados
                </p>
                <p className="text-[11px] text-[#A1A1AA] dark:text-[#64748B]">Manual · SYSCOM · TVC</p>
              </div>
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5">
                {!!catalogoManualError && (
                  <div className="mb-1 rounded-lg bg-[#FEF2F2] px-3 py-2.5 text-xs text-[#C22B2B] dark:bg-[#3F1518] dark:text-[#F87171]">
                    {catalogoManualError}
                  </div>
                )}
                {loadingSyscom && (
                  <div className="flex items-center gap-2 px-3 py-3 text-xs text-[#71717A] dark:text-[#8EA0B8]">
                    <Spinner className="size-4 text-[#1B5CFF]" />
                    Buscando en catálogos externos…
                  </div>
                )}
                {!loadingSyscom && !!syscomError && (
                  <div className="mb-1 rounded-lg bg-[rgba(230,162,60,0.10)] px-3 py-2.5 text-xs text-[#9A6B15] dark:text-[#E6A23C]">
                    {syscomError}
                    {combinedProductoOptions.length > 0 ? " Puedes seguir eligiendo productos manuales." : ""}
                  </div>
                )}
                {combinedProductoOptions.map((opt) => (
                  <button
                    key={opt.key}
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={opt.onSelect}
                    className="group flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-[#F4F7FF] focus:outline-none focus-visible:bg-[#F4F7FF] focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-[#1B2539] dark:focus-visible:bg-[#1B2539]"
                  >
                    <span className="inline-flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-[#E4E4E7] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]">
                      {opt.imageUrl ? (
                        <img
                          src={opt.imageUrl}
                          alt=""
                          className="size-full object-contain p-0.5"
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <Package className="size-5 text-[#A1A1AA] dark:text-[#64748B]" aria-hidden />
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                        {opt.title}
                      </span>
                      <span className="mt-0.5 flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                        <span className="rounded bg-[#F4F4F5] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]">
                          {opt.source === "manual" ? "Manual" : opt.source === "tvc" ? "TVC" : "Syscom"}
                        </span>
                        <span className="truncate">{opt.subtitle || "Sin detalle"}</span>
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#09090B] group-hover:text-[#1B5CFF] dark:text-[#F8FAFC] dark:group-hover:text-[#7FA2FF]">
                      {formatMoney(opt.price)}
                    </span>
                  </button>
                ))}
                {!loadingSyscom &&
                  !catalogoManualError &&
                  combinedProductoOptions.length === 0 &&
                  productoSearch.trim().length >= 2 && (
                    <div className="px-3 py-6 text-center">
                      <p className="text-[13px] font-medium text-[#3F3F46] dark:text-[#D6DEEA]">Sin resultados</p>
                      <p className="mt-0.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                        Prueba con la marca, el modelo o usa «Concepto / servicio».
                      </p>
                    </div>
                  )}
              </div>
            </div>,
            document.body
          )}

        {!bloquearConceptoInput &&
          conceptoOpen &&
          conceptoPopPos &&
          createPortal(
            <div
              ref={conceptoPopRef}
              id="cotizacion-concepto-sugerencias"
              role="listbox"
              aria-label="Sugerencias de concepto"
              style={{
                position: "fixed",
                zIndex: 2147483646,
                left: conceptoPopPos.left,
                width: conceptoPopPos.width,
                maxHeight: conceptoPopPos.maxHeight,
                ...(conceptoPopPos.top != null
                  ? { top: conceptoPopPos.top }
                  : { bottom: conceptoPopPos.bottom }),
              }}
              className="cot-pop flex flex-col overflow-hidden rounded-xl border border-[#E4E4E7] bg-white shadow-[0_24px_48px_-20px_rgba(9,9,11,0.4)] ring-1 ring-black/5 dark:border-[#273244] dark:bg-[#111827] dark:ring-white/10"
            >
              <div className="custom-scrollbar min-h-0 flex-1 overflow-y-auto p-1.5">
                {conceptoSearch.trim() && (
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      handleConceptoInputChange(conceptoSearch);
                      setConceptoOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2.5 text-left text-[14px] text-[#3F3F46] transition-colors hover:bg-[#F4F7FF] dark:text-[#D6DEEA] dark:hover:bg-[#1B2539]"
                  >
                    <Plus className="size-4 shrink-0 text-[#1B5CFF]" aria-hidden />
                    <span className="min-w-0 truncate">
                      Usar «
                      <span className="font-medium text-[#09090B] dark:text-[#F8FAFC]">
                        {conceptoSearch.trim()}
                      </span>
                      » como concepto libre
                    </span>
                  </button>
                )}
                {conceptosFiltrados.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    role="option"
                    aria-selected={
                      String(c.concepto || "").trim().toLowerCase() ===
                      conceptoNombre.trim().toLowerCase()
                    }
                    onClick={() => {
                      handleConceptoInputChange(String(c.concepto || ""));
                      setConceptoOpen(false);
                    }}
                    className="flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2.5 text-left transition-colors hover:bg-[#F4F7FF] dark:hover:bg-[#1B2539]"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                        {c.concepto || "Sin nombre"}
                      </span>
                      <span className="block text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                        Folio {c.folio}
                      </span>
                    </span>
                    <span className="shrink-0 text-[13px] font-semibold tabular-nums text-[#09090B] dark:text-[#F8FAFC]">
                      {formatMoney(toNumber(c.precio1, 0))}
                    </span>
                  </button>
                ))}
                {conceptosFiltrados.length === 0 && !conceptoSearch.trim() && (
                  <p className="px-3 py-6 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                    No hay conceptos en el catálogo.
                  </p>
                )}
              </div>
            </div>,
            document.body
          )}

        {alert.show && (
          <div role="alert" aria-live={alert.variant === "error" ? "assertive" : "polite"}>
            <Alert
              variant={alert.variant}
              title={alert.title}
              message={alert.message}
              showLink={false}
              onClose={() => setAlert((a) => ({ ...a, show: false }))}
            />
          </div>
        )}

        {!canCotizacionesView ? (
          <div className="rounded-2xl border border-[#E4E4E7] bg-white px-4 py-12 text-center dark:border-[#273244] dark:bg-[#111827]">
            <p className="text-[15px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Sin acceso</p>
            <p className="mt-1 text-sm text-[#71717A] dark:text-[#8EA0B8]">No tienes permiso para ver Cotizaciones.</p>
          </div>
        ) : (
          <>
            {/* ============================ Encabezado ============================ */}
            <header
              className="cot-rise overflow-hidden rounded-2xl border border-[#E4E4E7] bg-white shadow-[0_1px_2px_rgba(9,9,11,0.04)] dark:border-[#273244] dark:bg-[#111827]"
              style={{ "--cot-i": 0 } as CSSProperties}
            >
              {/* Banda marina */}
              <div className="cot-sheen relative overflow-hidden bg-[#17235B] px-5 pb-5 pt-4 text-white dark:bg-[#1B2A63] sm:px-7 sm:pb-6 sm:pt-5">
                <div
                  className="pointer-events-none absolute -right-24 -top-28 size-80 rounded-full bg-[#E6A23C]/14 blur-3xl"
                  aria-hidden
                />
                <div
                  className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] bg-size-[18px_18px] mask-[linear-gradient(to_left,black,transparent_70%)]"
                  aria-hidden
                />

                <div className="relative flex flex-wrap items-center justify-between gap-3">
                  <nav aria-label="Migas de pan" className="flex min-w-0 items-center gap-1 text-[13px] text-white/60">
                    <button
                      type="button"
                      onClick={() => goToCotizacionList()}
                      className="cot-press -ml-1.5 mr-1 inline-flex size-9 items-center justify-center rounded-lg text-white/75 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                      aria-label="Volver al listado de cotizaciones"
                      title="Volver al listado"
                    >
                      <ArrowLeft className="size-4" aria-hidden />
                    </button>
                    <Link
                      to="/"
                      className="rounded px-0.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      Inicio
                    </Link>
                    <ChevronRight className="size-3.5 text-white/30" aria-hidden />
                    <Link
                      to="/cotizacion"
                      className="rounded px-0.5 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
                    >
                      Cotizaciones
                    </Link>
                    <ChevronRight className="size-3.5 text-white/30" aria-hidden />
                    <span className="truncate px-0.5 font-medium text-white/90">
                      {isEditingRoute ? "Editar" : "Nueva"}
                    </span>
                  </nav>

                  <div className="flex flex-wrap items-center gap-2">
                    {!editingCotizacionId && canCotizacionesCreate && (
                      <button
                        type="button"
                        onClick={() => {
                          resetCloneSearch();
                          resetCloneClienteState();
                          setCloneModalOpen(true);
                        }}
                        className={heroBtnClass}
                      >
                        <Copy className="size-4" aria-hidden />
                        Clonar existente
                      </button>
                    )}
                    <button type="button" onClick={() => setClearFormModalOpen(true)} className={heroBtnClass}>
                      <RotateCcw className="size-4" aria-hidden />
                      Limpiar
                    </button>
                  </div>
                </div>

                <div className="relative mt-5 flex items-start gap-4">
                  <span
                    className="hidden size-12 shrink-0 items-center justify-center rounded-[14px] bg-[rgba(230,162,60,0.16)] text-[#E6A23C] ring-1 ring-inset ring-[#E6A23C]/25 sm:inline-flex"
                    aria-hidden
                  >
                    <FileText className="size-5.5" strokeWidth={1.75} />
                  </span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.8px] text-white sm:text-[32px] sm:tracking-[-1px]">
                        {isEditingRoute ? "Editar cotización" : "Nueva cotización"}
                      </h1>
                      {folioLabel ? (
                        <span className={cotFolioBadgeClass} aria-label={`Folio ${folioLabel}`}>
                          <span className={cotFolioBadgePrefixClass}>{folioPrefix}</span>
                          <span className={cotFolioBadgeNumberClass}>{folioRest.join("-")}</span>
                        </span>
                      ) : cotizacionPk ? (
                        <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-white/75 ring-1 ring-inset ring-white/15">
                          Borrador
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1.5 max-w-[62ch] text-[14px] leading-relaxed text-white/65 sm:text-[15px]">
                      {isEditingRoute
                        ? "Ajusta cliente, partidas y condiciones. Los cambios se guardan solos; usa «Actualizar» para cerrar."
                        : "Elige al cliente, arma las partidas y revisa el total. Todo se guarda como borrador mientras trabajas."}
                    </p>
                  </div>
                </div>

                {/* Datos clave */}
                <dl className="relative mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl bg-white/10 ring-1 ring-inset ring-white/10 md:grid-cols-4">
                  {headerFacts.map((f) => (
                    <div key={f.key} className="min-w-0 bg-[#17235B]/85 px-4 py-3 dark:bg-[#1B2A63]/85">
                      <dt className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-widest text-white/50">
                        {f.icon}
                        {f.label}
                      </dt>
                      <dd
                        className={`mt-1 truncate text-[14px] font-medium ${f.muted ? "text-white/45" : "text-white"}`}
                        aria-live={f.live ? "polite" : undefined}
                        title={f.value}
                      >
                        <span key={f.value} className="cot-flash inline-block max-w-full truncate align-bottom">
                          {f.value}
                        </span>
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>

              {/* Progreso */}
              <nav aria-label="Secciones de la cotización" className="relative">
                <div
                  className="h-0.5 bg-[#F0F0F2] dark:bg-[#1F2A3C]"
                  role="progressbar"
                  aria-label="Pasos obligatorios completados"
                  aria-valuemin={0}
                  aria-valuemax={pasosObligatorios}
                  aria-valuenow={pasosObligatoriosListos}
                >
                  <div
                    className="cot-bar h-full bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                    style={{ transform: `scaleX(${pasosObligatoriosListos / pasosObligatorios})` }}
                  />
                </div>
                <div className="overflow-x-auto">
                  <ol className="flex min-w-max items-center gap-1 p-1.5 sm:min-w-0">
                    {steps.map((s, i) => (
                      <li key={s.id} className="flex flex-1 items-center">
                        <button
                          type="button"
                          onClick={() => scrollToSection(s.id)}
                          className="cot-press flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-[#F4F4F5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:hover:bg-[#1B2539]"
                        >
                          <span
                            className={`inline-flex size-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums transition-colors duration-300 ${
                              s.done
                                ? "bg-[#04724D] text-white dark:bg-[#22A06B]"
                                : "bg-[#F4F4F5] text-[#52525B] dark:bg-[#1B2539] dark:text-[#B7C1D1]"
                            }`}
                            aria-hidden
                          >
                            {s.done ? <Check className="cot-tick size-3.5" strokeWidth={3} /> : i + 1}
                          </span>
                          <span className="min-w-0">
                            <span className="block text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                              {s.label}
                            </span>
                            <span className="block text-[11px] text-[#71717A] dark:text-[#8EA0B8]">
                              {s.done ? "Listo" : s.optional ? "Opcional" : "Pendiente"}
                            </span>
                          </span>
                        </button>
                        {i < steps.length - 1 && (
                          <ChevronRight
                            className="mx-0.5 hidden size-4 shrink-0 text-[#D4D4D8] dark:text-[#3A4661] md:block"
                            aria-hidden
                          />
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </nav>
            </header>

            <div className="grid min-w-0 grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_400px] xl:gap-8">
              <div className="min-w-0 space-y-6">
                {/* ============================ 1. Cliente ============================ */}
                <SectionCard
                  id="cot-cliente"
                  step={1}
                  order={1}
                  title="Cliente y seguimiento"
                  description="A quién va dirigida la cotización y cómo se dio el contacto."
                  done={clienteStepDone}
                  raised={clienteOpen || tipoTrabajoOpen}
                >
                  <div className="space-y-6">
                    {/* Cliente */}
                    <div>
                      <FieldLabel htmlFor="cot-cliente-input" required>
                        Cliente
                      </FieldLabel>
                      <div className={`relative ${clienteOpen ? "z-100" : "z-0"}`}>
                        <Search
                          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[#A1A1AA]"
                          aria-hidden
                        />
                        <input
                          id="cot-cliente-input"
                          role="combobox"
                          aria-expanded={clienteOpen}
                          aria-controls="cot-cliente-listbox"
                          aria-autocomplete="list"
                          value={clienteSearch}
                          onChange={(e) => {
                            setClienteSearch(e.target.value);
                            if (clienteId) setClienteId("");
                            setClienteOpen(true);
                          }}
                          onFocus={() => setClienteOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "Escape") setClienteOpen(false);
                          }}
                          autoComplete="off"
                          placeholder={loadingClientes ? "Cargando clientes…" : "Busca por nombre o teléfono"}
                          className={`${inputLikeClassName} block min-h-12! pl-10 pr-20 text-[15px] ${
                            clienteId ? "border-[#BBD0FF]! bg-[#F7F9FF]! dark:border-[#3A4A6B]! dark:bg-[#151E32]!" : ""
                          }`}
                        />
                        <div className="absolute right-1.5 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                          {loadingClientes && <Spinner className="mr-1 size-4 text-[#A1A1AA]" />}
                          {(!!clienteId || clienteSearch.trim().length > 0) && (
                            <button
                              type="button"
                              onClick={() => selectCliente(null)}
                              aria-label="Quitar cliente"
                              className="inline-flex size-9 items-center justify-center rounded-lg text-[#A1A1AA] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] dark:hover:bg-[#1B2539] dark:hover:text-[#D6DEEA]"
                            >
                              <X className="size-4" aria-hidden />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setClienteOpen((o) => !o)}
                            aria-label={clienteOpen ? "Cerrar lista de clientes" : "Abrir lista de clientes"}
                            className="inline-flex size-9 items-center justify-center rounded-lg text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#3F3F46] dark:text-[#8EA0B8] dark:hover:bg-[#1B2539]"
                          >
                            <ChevronDown
                              className={`size-4 transition-transform duration-200 ${clienteOpen ? "rotate-180" : ""}`}
                              aria-hidden
                            />
                          </button>
                        </div>

                        {clienteOpen && (
                          <div className={dropdownPanelClass}>
                            <ul
                              id="cot-cliente-listbox"
                              role="listbox"
                              aria-label="Clientes"
                              className="custom-scrollbar max-h-72 overflow-y-auto p-1.5"
                            >
                              {filteredClientes.map((c) => {
                                const active = c.id === clienteId;
                                return (
                                  <li key={c.id} role="option" aria-selected={active}>
                                    <button
                                      type="button"
                                      onClick={() => selectCliente(c)}
                                      className={`flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
                                        active
                                          ? "bg-[#F4F7FF] dark:bg-[#1B2A63]/60"
                                          : "hover:bg-[#F4F4F5] dark:hover:bg-[#1B2539]"
                                      }`}
                                    >
                                      <span
                                        className="inline-flex size-8 shrink-0 items-center justify-center rounded-full bg-[#EEF3FF] text-[12px] font-semibold text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                                        aria-hidden
                                      >
                                        {(c.nombre || "?").trim().slice(0, 1).toUpperCase()}
                                      </span>
                                      <span className="min-w-0 flex-1">
                                        <span className="flex items-center gap-2">
                                          <span className="truncate text-[14px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                                            {c.nombre || "—"}
                                          </span>
                                          {c.is_prospecto && (
                                            <span className="shrink-0 rounded bg-[#FFF8EB] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#8A5A10] dark:bg-[rgba(230,162,60,0.12)] dark:text-[#F0C675]">
                                              Prospecto
                                            </span>
                                          )}
                                        </span>
                                        <span className="block truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                                          {c.telefono || "Sin teléfono"}
                                        </span>
                                      </span>
                                      {active && <Check className="size-4 shrink-0 text-[#1B5CFF]" aria-hidden />}
                                    </button>
                                  </li>
                                );
                              })}
                              {filteredClientes.length === 0 && !loadingClientes && (
                                <li className="px-3 py-6 text-center text-[13px] text-[#71717A] dark:text-[#8EA0B8]">
                                  No encontramos clientes con «{clienteSearch.trim()}».
                                </li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                      {selectedCliente && (
                        <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                          {selectedCliente.telefono && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="size-3" aria-hidden />
                              {selectedCliente.telefono}
                            </span>
                          )}
                          {!!toNumber(selectedCliente.descuento_pct, 0) && (
                            <span className="inline-flex items-center gap-1">
                              <Percent className="size-3" aria-hidden />
                              Descuento de cliente {toNumber(selectedCliente.descuento_pct, 0)}%
                            </span>
                          )}
                          {selectedCliente.is_prospecto && <span>Prospecto</span>}
                        </p>
                      )}
                    </div>

                    {/* Contacto */}
                    <fieldset className="space-y-3">
                      <legend className={subgroupTitleClass}>Contacto</legend>
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                        <div>
                          <FieldLabel htmlFor="cot-contacto" optional>
                            Nombre
                          </FieldLabel>
                          <input
                            id="cot-contacto"
                            value={contactoNombre}
                            onChange={(e) => setContactoNombre(e.target.value)}
                            placeholder="Persona que solicita"
                            list="contactos-datalist"
                            autoComplete="off"
                            className={inputLikeClassName}
                            aria-describedby="cot-contacto-hint"
                          />
                          <datalist id="contactos-datalist">
                            {contactosOptions.map((name) => (
                              <option key={name} value={name} />
                            ))}
                          </datalist>
                          <p id="cot-contacto-hint" className={fieldHintClass}>
                            Un contacto nuevo se agrega a la ficha del cliente.
                          </p>
                        </div>

                        <div>
                          <FieldLabel htmlFor="cot-contacto-tel" optional>
                            Teléfono
                          </FieldLabel>
                          <input
                            id="cot-contacto-tel"
                            type="tel"
                            inputMode="tel"
                            autoComplete="tel"
                            className={inputLikeClassName}
                            value={contactoTelefono}
                            onChange={(e) => setContactoTelefono(e.target.value)}
                            placeholder="Ej. 314 123 4567"
                          />
                        </div>

                        <div className="sm:col-span-2 xl:col-span-1">
                          <FieldLabel
                            htmlFor="cot-medio"
                            required={tieneContacto}
                            optional={tieneContacto ? false : "(si hay contacto)"}
                          >
                            Medio de contacto
                          </FieldLabel>
                          <select
                            id="cot-medio"
                            value={medioContacto}
                            onChange={(e) => {
                              setMedioContacto(e.target.value);
                              setMedioContactoTouched(true);
                            }}
                            onBlur={() => setMedioContactoTouched(true)}
                            className={`${inputLikeClassName} ${medioContactoInvalid ? inputInvalidClass : ""}`}
                            aria-invalid={medioContactoInvalid}
                            aria-describedby={medioContactoInvalid ? "medio-contacto-error" : undefined}
                          >
                            <option value="">Selecciona</option>
                            {MEDIO_CONTACTO_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                          {medioContactoInvalid && (
                            <p id="medio-contacto-error" className={fieldErrorClass}>
                              Selecciona cómo llegó el contacto.
                            </p>
                          )}
                        </div>
                      </div>
                    </fieldset>

                    <div className="h-px bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden />

                    {/* Clasificación */}
                    <fieldset className="space-y-3">
                      <legend className={subgroupTitleClass}>Clasificación</legend>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel htmlFor="tipo-trabajo-trigger" required>
                            Tipo de trabajo
                          </FieldLabel>
                          <div ref={tipoTrabajoRef} className={`relative ${tipoTrabajoOpen ? "z-100" : "z-0"}`}>
                            <button
                              id="tipo-trabajo-trigger"
                              type="button"
                              onClick={() => {
                                setTipoTrabajoTouched(true);
                                setTipoTrabajoOpen((open) => !open);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Escape") setTipoTrabajoOpen(false);
                              }}
                              disabled={servicios.length === 0}
                              aria-expanded={tipoTrabajoOpen}
                              aria-haspopup="listbox"
                              aria-required
                              aria-invalid={tipoTrabajoInvalid}
                              aria-describedby={tipoTrabajoInvalid ? "tipo-trabajo-error" : undefined}
                              className={`${inputLikeClassName} flex items-center justify-between gap-2 text-left disabled:cursor-not-allowed disabled:opacity-60 ${
                                tipoTrabajoInvalid ? inputInvalidClass : ""
                              }`}
                            >
                              <span
                                className={`min-w-0 flex-1 truncate ${
                                  tipoTrabajoIds.length === 0
                                    ? "text-[#A1A1AA] dark:text-[#8EA0B8]"
                                    : "text-[#09090B] dark:text-[#F8FAFC]"
                                }`}
                              >
                                {servicios.length === 0
                                  ? "Cargando servicios…"
                                  : tipoTrabajoIds.length === 0
                                    ? "Selecciona uno o varios"
                                    : tipoTrabajoDisplay}
                              </span>
                              {tipoTrabajoIds.length > 1 && (
                                <span className="shrink-0 rounded-full bg-[#EEF3FF] px-2 py-0.5 text-[11px] font-semibold tabular-nums text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]">
                                  {tipoTrabajoIds.length}
                                </span>
                              )}
                              <ChevronDown
                                className={`size-4 shrink-0 text-[#71717A] transition-transform duration-200 dark:text-[#8EA0B8] ${
                                  tipoTrabajoOpen ? "rotate-180" : ""
                                }`}
                                aria-hidden
                              />
                            </button>

                            {tipoTrabajoOpen && servicios.length > 0 && (
                              <div className={dropdownPanelClass}>
                                <div className="flex items-center justify-between gap-2 border-b border-[#F0F0F2] px-3.5 py-2 dark:border-[#1F2A3C]">
                                  <span className="text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                                    {tipoTrabajoIds.length > 0
                                      ? `${tipoTrabajoIds.length} seleccionados`
                                      : "Servicios disponibles"}
                                  </span>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTipoTrabajoTouched(true);
                                        setTipoTrabajo(servicios.map((s) => s.id));
                                      }}
                                      className="rounded-md px-2 py-1 text-[12px] font-medium text-[#1B5CFF] transition-colors hover:bg-[#F4F7FF] dark:text-[#7FA2FF] dark:hover:bg-[#1B2A63]/50"
                                    >
                                      Todos
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setTipoTrabajoTouched(true);
                                        setTipoTrabajo([]);
                                      }}
                                      className="rounded-md px-2 py-1 text-[12px] font-medium text-[#71717A] transition-colors hover:bg-[#F4F4F5] dark:text-[#8EA0B8] dark:hover:bg-[#1B2539]"
                                    >
                                      Ninguno
                                    </button>
                                  </div>
                                </div>
                                <ul
                                  role="listbox"
                                  aria-label="Servicios disponibles"
                                  aria-multiselectable
                                  className="custom-scrollbar max-h-60 overflow-y-auto p-1.5"
                                >
                                  {servicios.map((s) => {
                                    const checked = tipoTrabajoIds.includes(s.id);
                                    return (
                                      <li key={s.id} role="option" aria-selected={checked}>
                                        <label
                                          className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2.5 transition-colors ${
                                            checked
                                              ? "bg-[#F4F7FF] dark:bg-[#1B2A63]/50"
                                              : "hover:bg-[#F4F4F5] dark:hover:bg-[#1B2539]"
                                          }`}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => {
                                              setTipoTrabajoTouched(true);
                                              setTipoTrabajo((prev) => {
                                                const next = new Set(normalizeTipoTrabajoIds(prev));
                                                if (next.has(s.id)) next.delete(s.id);
                                                else next.add(s.id);
                                                return Array.from(next);
                                              });
                                            }}
                                            className="peer sr-only"
                                          />
                                          <span
                                            className={`inline-flex size-4.5 shrink-0 items-center justify-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-[#1B5CFF]/40 ${
                                              checked
                                                ? "border-[#1B5CFF] bg-[#1B5CFF] text-white dark:border-[#4B7CFF] dark:bg-[#4B7CFF]"
                                                : "border-[#D4D4D8] bg-white dark:border-[#3A4661] dark:bg-[#111827]"
                                            }`}
                                            aria-hidden
                                          >
                                            {checked && <Check className="size-3" strokeWidth={3} />}
                                          </span>
                                          <span
                                            className={`min-w-0 flex-1 text-[14px] ${
                                              checked
                                                ? "font-medium text-[#09090B] dark:text-[#F8FAFC]"
                                                : "text-[#3F3F46] dark:text-[#D6DEEA]"
                                            }`}
                                          >
                                            {s.nombre}
                                          </span>
                                        </label>
                                      </li>
                                    );
                                  })}
                                </ul>
                              </div>
                            )}
                          </div>
                          {tipoTrabajoInvalid && (
                            <p id="tipo-trabajo-error" className={fieldErrorClass}>
                              Selecciona al menos un tipo de trabajo.
                            </p>
                          )}
                        </div>

                        <div>
                          <FieldLabel>Status</FieldLabel>
                          <div
                            role="radiogroup"
                            aria-label="Status de la cotización"
                            className="grid min-h-11 grid-cols-3 gap-1 rounded-[10px] border border-[#E4E4E7] bg-[#F4F4F5] p-1 dark:border-[#273244] dark:bg-[#0F172A]"
                          >
                            {STATUS_OPTIONS.map((opt) => {
                              const active = String(status).toUpperCase() === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  role="radio"
                                  aria-checked={active}
                                  onClick={() => setStatus(opt.value)}
                                  className={`cot-press inline-flex items-center justify-center gap-1.5 rounded-[7px] px-2 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
                                    active
                                      ? "bg-white text-[#09090B] shadow-[0_1px_3px_rgba(9,9,11,0.12)] dark:bg-[#1B2539] dark:text-[#F8FAFC]"
                                      : "text-[#71717A] hover:text-[#3F3F46] dark:text-[#8EA0B8] dark:hover:text-[#D6DEEA]"
                                  }`}
                                >
                                  <span
                                    className={`size-1.5 rounded-full ${statusMeta[opt.value]?.dot ?? ""} ${active ? "" : "opacity-50"}`}
                                    aria-hidden
                                  />
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      {status === "PENDIENTE" && (
                        <div className="flex flex-col gap-3 rounded-xl border border-[#E4E4E7] bg-[#FAFAFA] px-4 py-3 dark:border-[#273244] dark:bg-[#0F172A]/60 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-start gap-3">
                            <span
                              className={`mt-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-full ${
                                enviadoInfo
                                  ? "bg-[#EEF3FF] text-[#1B5CFF] dark:bg-[#1B2A63] dark:text-[#9BB6FF]"
                                  : "bg-white text-[#71717A] ring-1 ring-[#E4E4E7] dark:bg-[#111827] dark:text-[#8EA0B8] dark:ring-[#273244]"
                              }`}
                              aria-hidden
                            >
                              {enviadoInfo ? <MailCheck className="size-4" /> : <Send className="size-4" />}
                            </span>
                            <div className="min-w-0">
                              <p className="text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                                {enviadoInfo ? `Enviada por ${enviadoInfo.por}` : "Seguimiento con el cliente"}
                              </p>
                              <p className="truncate text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                                {enviadoInfo
                                  ? [
                                      enviadoInfo.en
                                        ? new Date(enviadoInfo.en).toLocaleString("es-MX", {
                                            dateStyle: "medium",
                                            timeStyle: "short",
                                          })
                                        : null,
                                      enviadoInfo.comentario ? `«${enviadoInfo.comentario}»` : null,
                                    ]
                                      .filter(Boolean)
                                      .join(" · ") || "En espera de respuesta"
                                  : "Márcala cuando la envíes y quedes en espera de respuesta."}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            disabled={!cotizacionPk}
                            onClick={handleAbrirMarcarEnviada}
                            className={`${toolbarBtnClass} shrink-0`}
                            title={!cotizacionPk ? "Guarda la cotización para marcarla como enviada" : undefined}
                          >
                            {enviadoInfo ? "Ver detalle" : "Marcar como enviada"}
                          </button>
                        </div>
                      )}
                    </fieldset>

                    <div className="h-px bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden />

                    {/* Condiciones comerciales */}
                    <fieldset className="space-y-3">
                      <legend className={subgroupTitleClass}>Condiciones comerciales</legend>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <div>
                          <FieldLabel htmlFor="cot-desc-cliente">Descuento de cliente</FieldLabel>
                          <SuffixInput suffix="%">
                            <input
                              id="cot-desc-cliente"
                              type="number"
                              inputMode="decimal"
                              className={`${numberInputClass} pr-9`}
                              value={numValue(descuentoClientePct)}
                              onChange={(e) => {
                                setDescuentoClienteTouched(true);
                                setDescuentoClientePct(clampPct(toNumber(e.target.value, 0)));
                              }}
                              min="0"
                              max="100"
                              step="0.01"
                              placeholder="0"
                              aria-describedby="cot-desc-cliente-hint"
                            />
                          </SuffixInput>
                          <p id="cot-desc-cliente-hint" className={fieldHintClass}>
                            Se aplica al total; no aplica si la cotización solo tiene conceptos de servicio.
                          </p>
                        </div>

                        <div>
                          <FieldLabel htmlFor="anticipo-pct-input">Anticipo</FieldLabel>
                          <SuffixInput suffix="%">
                            <input
                              id="anticipo-pct-input"
                              type="number"
                              inputMode="decimal"
                              className={`${numberInputClass} pr-9`}
                              value={numValue(anticipoPct)}
                              onChange={(e) =>
                                setAnticipoPct(
                                  Math.min(ANTICIPO_PCT_MAX, Math.max(0, toNumber(e.target.value, ANTICIPO_PCT_DEFAULT)))
                                )
                              }
                              onBlur={(e) => {
                                const raw = toNumber(e.target.value, ANTICIPO_PCT_DEFAULT);
                                setAnticipoPct(clampAnticipo(raw || ANTICIPO_PCT_DEFAULT));
                              }}
                              min={ANTICIPO_PCT_MIN}
                              max={ANTICIPO_PCT_MAX}
                              step="1"
                              placeholder={String(ANTICIPO_PCT_DEFAULT)}
                              aria-describedby="anticipo-pct-help"
                            />
                          </SuffixInput>
                          <div className="mt-2 flex h-1.5 overflow-hidden rounded-full bg-[#F0F0F2] dark:bg-[#1F2A3C]" aria-hidden>
                            <div
                              className="cot-bar h-full w-full rounded-full bg-[#1B5CFF] dark:bg-[#4B7CFF]"
                              style={{ transform: `scaleX(${anticipoPctEfectivo / 100})` }}
                            />
                          </div>
                          <p id="anticipo-pct-help" className={fieldHintClass}>
                            {anticipoPctEfectivo}% para iniciar · {100 - anticipoPctEfectivo}% al finalizar. Mínimo{" "}
                            {ANTICIPO_PCT_MIN}%.
                          </p>
                        </div>
                      </div>
                    </fieldset>
                  </div>
                </SectionCard>

                {/* ============================ 2. Partidas ============================ */}
                <SectionCard
                  id="cot-partidas"
                  step={2}
                  order={2}
                  title="Partidas"
                  description="Agrega productos de catálogo o conceptos de servicio y ordénalos por categoría."
                  done={partidasStepDone}
                  raised={conceptoOpen || syscomOpen}
                  actions={
                    computed.lines.length > 0 ? (
                      <span className="rounded-full bg-[#F4F4F5] px-2.5 py-1 text-[12px] font-medium tabular-nums text-[#3F3F46] dark:bg-[#1B2539] dark:text-[#D6DEEA]">
                        {computed.lines.length} {computed.lines.length === 1 ? "partida" : "partidas"}
                      </span>
                    ) : null
                  }
                >
                  <div className="space-y-5">
                    {/* Compositor de partida */}
                    <div
                      className={`rounded-xl border transition-colors ${
                        editingConceptoId
                          ? "border-[#BBD0FF] bg-[#F7F9FF] dark:border-[#3A4A6B] dark:bg-[#151E32]"
                          : "border-[#E4E4E7] bg-[#FAFAFA] dark:border-[#273244] dark:bg-[#0F172A]/60"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3 px-4 pt-4">
                        {editingConceptoId ? (
                          <p className="inline-flex items-center gap-2 text-[13px] font-medium text-[#1244D1] dark:text-[#9BB6FF]">
                            <Pencil className="size-4" aria-hidden />
                            Editando partida
                          </p>
                        ) : (
                          <div
                            role="tablist"
                            aria-label="Tipo de partida"
                            className="inline-flex rounded-[10px] border border-[#E4E4E7] bg-white p-1 dark:border-[#273244] dark:bg-[#111827]"
                          >
                            {(
                              [
                                { value: "producto", label: "Producto", Icon: Package },
                                { value: "concepto", label: "Concepto / servicio", Icon: Wrench },
                              ] as const
                            ).map(({ value, label, Icon }) => {
                              const active = composerMode === value;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  role="tab"
                                  aria-selected={active}
                                  onClick={() => switchComposerMode(value)}
                                  className={`cot-press inline-flex min-h-9 items-center gap-2 rounded-[7px] px-3 text-[13px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 ${
                                    active
                                      ? "bg-[#17235B] text-white dark:bg-[#1B2A63]"
                                      : "text-[#71717A] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:text-[#F8FAFC]"
                                  }`}
                                >
                                  <Icon className="size-4" aria-hidden />
                                  {label}
                                </button>
                              );
                            })}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {preview.sinIvaEfectivo && (
                            <span className="rounded-full bg-[#EEF3FF] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-[#1244D1] dark:bg-[#1B2A63] dark:text-[#9BB6FF]">
                              Sin IVA
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={clearConceptoForm}
                            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-[#71717A] transition-colors hover:bg-white hover:text-[#09090B] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B5CFF]/40 dark:text-[#8EA0B8] dark:hover:bg-[#1B2539] dark:hover:text-[#F8FAFC]"
                          >
                            {editingConceptoId ? (
                              <>
                                <X className="size-4" aria-hidden />
                                Cancelar edición
                              </>
                            ) : (
                              <>
                                <RotateCcw className="size-3.5" aria-hidden />
                                Limpiar
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4 p-4">
                        {/* Qué se vende */}
                        {composerMode === "producto" ? (
                          <div key="producto" className="cot-fade">
                            <FieldLabel htmlFor="cot-producto-input">Buscar producto</FieldLabel>
                            <div ref={syscomInputWrapRef} className="relative">
                              <Search
                                className="pointer-events-none absolute left-3.5 top-1/2 z-1 size-4 -translate-y-1/2 text-[#A1A1AA]"
                                aria-hidden
                              />
                              <input
                                id="cot-producto-input"
                                className={`${inputLikeClassName} min-h-12! pl-10 text-[15px] disabled:cursor-not-allowed disabled:opacity-60 ${
                                  hasProductoSeleccionado ? "pr-10" : ""
                                }`}
                                value={productoSearch}
                                disabled={bloquearProductoInput}
                                onFocus={() => {
                                  if (!bloquearProductoInput && productoSearch.trim().length >= 2) setSyscomOpen(true);
                                }}
                                onChange={(e) => {
                                  setProductoSearch(e.target.value);
                                  setSelectedSyscomProducto(null);
                                  setSelectedCatalogoConcepto(null);
                                  setSelectedManualProducto(null);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setSyscomOpen(false);
                                }}
                                placeholder="Nombre, marca o modelo — catálogo manual, SYSCOM y TVC"
                                autoComplete="off"
                                aria-describedby="cot-producto-hint"
                              />
                              {hasProductoSeleccionado && (
                                <CircleCheck
                                  className="pointer-events-none absolute right-3.5 top-1/2 size-4 -translate-y-1/2 text-[#04724D] dark:text-[#4ADE80]"
                                  aria-hidden
                                />
                              )}
                            </div>
                            <p id="cot-producto-hint" className={fieldHintClass}>
                              {hasProductoSeleccionado
                                ? `${productoFuenteLabel} · precio de lista cargado. Ajusta cantidad o descuento.`
                                : editingConceptoId
                                  ? "El producto de una partida existente no se puede cambiar; ajusta cantidad y precio."
                                  : "Escribe al menos 2 caracteres para buscar."}
                            </p>
                          </div>
                        ) : (
                          <div key="concepto" className="cot-fade">
                            <FieldLabel htmlFor="cot-concepto-input">Concepto</FieldLabel>
                            <div className="relative" ref={conceptoRef}>
                              <input
                                id="cot-concepto-input"
                                role="combobox"
                                className={`${inputLikeClassName} min-h-12! text-[15px] disabled:cursor-not-allowed disabled:opacity-60`}
                                value={conceptoOpen ? conceptoSearch : conceptoNombre}
                                disabled={bloquearConceptoInput}
                                onFocus={() => {
                                  setConceptoSearch(conceptoNombre || "");
                                  setConceptoOpen(true);
                                }}
                                onChange={(e) => {
                                  handleConceptoInputChange(e.target.value);
                                  setConceptoOpen(true);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Escape") setConceptoOpen(false);
                                }}
                                placeholder="Busca por folio o escribe un concepto libre"
                                autoComplete="off"
                                aria-expanded={conceptoOpen && !bloquearConceptoInput}
                                aria-controls={
                                  conceptoOpen && !bloquearConceptoInput
                                    ? "cotizacion-concepto-sugerencias"
                                    : undefined
                                }
                                aria-autocomplete="list"
                              />
                            </div>
                            <p className={fieldHintClass}>
                              {selectedCatalogoConcepto
                                ? `Del catálogo · folio ${selectedCatalogoConcepto.folio}`
                                : "Elige uno del catálogo o escribe un texto libre."}
                            </p>
                          </div>
                        )}

                        {/* Precio y condiciones */}
                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-12">
                          <div className="col-span-2 sm:col-span-3">
                            <FieldLabel htmlFor="cot-cantidad">Cantidad</FieldLabel>
                            <div className="flex min-h-11 items-stretch overflow-hidden rounded-[10px] border border-[#E4E4E7] bg-white focus-within:border-[#1B5CFF] focus-within:ring-4 focus-within:ring-[rgba(27,92,255,0.18)] dark:border-[#273244] dark:bg-[#111827] dark:focus-within:border-[#4B7CFF]">
                              <button
                                type="button"
                                onClick={() => setCantidad((q) => Math.max(1, toNumber(q, 1) - 1))}
                                disabled={toNumber(cantidad, 0) <= 1}
                                aria-label="Disminuir cantidad"
                                className="inline-flex w-10 shrink-0 items-center justify-center text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] disabled:cursor-not-allowed disabled:opacity-40 dark:text-[#8EA0B8] dark:hover:bg-[#1B2539]"
                              >
                                <Minus className="size-4" aria-hidden />
                              </button>
                              <input
                                id="cot-cantidad"
                                className="w-full min-w-0 border-x border-[#F0F0F2] bg-transparent text-center text-[15px] font-semibold tabular-nums text-[#09090B] outline-none [appearance:textfield] dark:border-[#1F2A3C] dark:text-[#F8FAFC] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                                type="number"
                                inputMode="numeric"
                                value={String(cantidad)}
                                onChange={(e) => setCantidad(toNumber(e.target.value, 0))}
                                min="1"
                                step="1"
                              />
                              <button
                                type="button"
                                onClick={() => setCantidad((q) => toNumber(q, 0) + 1)}
                                aria-label="Aumentar cantidad"
                                className="inline-flex w-10 shrink-0 items-center justify-center text-[#71717A] transition-colors hover:bg-[#F4F4F5] hover:text-[#09090B] dark:text-[#8EA0B8] dark:hover:bg-[#1B2539]"
                              >
                                <Plus className="size-4" aria-hidden />
                              </button>
                            </div>
                          </div>

                          <div className="col-span-1 sm:col-span-4">
                            <FieldLabel htmlFor="cot-precio-lista">Precio de lista</FieldLabel>
                            <SuffixInput prefix="$">
                              <input
                                id="cot-precio-lista"
                                className={`${numberInputClass} pl-7 font-semibold`}
                                type="number"
                                inputMode="decimal"
                                value={numValue(precioLista)}
                                onChange={(e) => setPrecioLista(toNumber(e.target.value, 0))}
                                min="0"
                                step="0.01"
                                placeholder="0.00"
                              />
                            </SuffixInput>
                          </div>

                          <div className="col-span-1 sm:col-span-2">
                            <FieldLabel htmlFor="cot-descuento">Descuento</FieldLabel>
                            <SuffixInput suffix="%">
                              <input
                                id="cot-descuento"
                                className={`${numberInputClass} pr-8`}
                                type="number"
                                inputMode="decimal"
                                value={numValue(descuentoPct)}
                                onChange={(e) => setDescuentoPct(clampPct(toNumber(e.target.value, 0)))}
                                min="0"
                                max="100"
                                step="0.01"
                                placeholder="0"
                              />
                            </SuffixInput>
                          </div>

                          {categorias.length > 0 && (
                            <div className="col-span-2 sm:col-span-3">
                              <FieldLabel htmlFor="cot-categoria">Categoría</FieldLabel>
                              <select
                                id="cot-categoria"
                                className={inputLikeClassName}
                                value={categoriaIdParaAgregar}
                                onChange={(e) => setCategoriaIdParaAgregar(e.target.value)}
                              >
                                <option value="">Sin categoría</option>
                                {categorias.map((cat) => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                  </option>
                                ))}
                              </select>
                            </div>
                          )}
                        </div>

                        {canMarcarSinIva && (
                          <label className="flex cursor-pointer items-center justify-between gap-4 rounded-[10px] border border-[#E4E4E7] bg-white px-3.5 py-2.5 dark:border-[#273244] dark:bg-[#111827]">
                            <span className="min-w-0">
                              <span className="block text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">
                                Cobrar sin IVA
                              </span>
                              <span className="block text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                                Solo para esta partida.
                              </span>
                            </span>
                            <input
                              type="checkbox"
                              role="switch"
                              aria-checked={sinIva}
                              checked={sinIva}
                              onChange={(e) => setSinIva(e.target.checked)}
                              className="peer sr-only"
                            />
                            <span
                              className={`relative inline-flex h-6 w-10 shrink-0 items-center rounded-full transition-colors peer-focus-visible:ring-4 peer-focus-visible:ring-[rgba(27,92,255,0.25)] ${
                                sinIva ? "bg-[#1B5CFF] dark:bg-[#4B7CFF]" : "bg-[#D4D4D8] dark:bg-[#3A4661]"
                              }`}
                              aria-hidden
                            >
                              <span
                                className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform duration-200 ${
                                  sinIva ? "translate-x-4.5" : "translate-x-0.5"
                                }`}
                              />
                            </span>
                          </label>
                        )}
                      </div>

                      {/* Pie del compositor: vista previa + agregar */}
                      <div className="flex flex-col gap-3 border-t border-[#E4E4E7] px-4 py-3.5 dark:border-[#273244] sm:flex-row sm:items-center sm:justify-between">
                        <dl className="flex items-baseline gap-6">
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A] dark:text-[#8EA0B8]">
                              Unitario{preview.sinIvaEfectivo ? " sin IVA" : ""}
                            </dt>
                            <dd className="mt-0.5 text-[15px] font-semibold tabular-nums text-[#3F3F46] dark:text-[#D6DEEA]">
                              {formatMoney(preview.puBase)}
                            </dd>
                          </div>
                          <div>
                            <dt className="text-[11px] font-medium uppercase tracking-[0.08em] text-[#71717A] dark:text-[#8EA0B8]">
                              Importe
                            </dt>
                            <dd className="mt-0.5 text-[20px] font-semibold tabular-nums tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                              <span key={preview.importeCobrado ?? preview.importe} className="cot-flash inline-block">
                                {formatMoney(preview.importeCobrado ?? preview.importe)}
                              </span>
                            </dd>
                          </div>
                        </dl>
                        <button
                          type="button"
                          onClick={addConcepto}
                          disabled={!canAddConcepto}
                          title={!clienteId ? "Selecciona primero un cliente" : undefined}
                          className={`${primaryActionInlineBtnClass} sm:min-w-44`}
                        >
                          {editingConceptoId ? (
                            <>
                              <Check className="size-4" aria-hidden />
                              Guardar cambios
                            </>
                          ) : (
                            <>
                              <Plus className="size-4" aria-hidden />
                              Agregar partida
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                    {!clienteId && (
                      <p className="-mt-2 flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8]">
                        <Info className="size-3.5 shrink-0" aria-hidden />
                        Selecciona un cliente antes de agregar partidas.
                      </p>
                    )}

                    {/* Tabla */}
                    <div>
                      <p className="mb-2 flex items-center gap-1.5 text-[12px] text-[#71717A] dark:text-[#8EA0B8] sm:hidden">
                        <MoveHorizontal className="size-3.5" aria-hidden />
                        Desliza para ver todas las columnas
                      </p>
                      <div className={tableWrapClass}>
                        <div className="p-1 sm:p-2">
                          <CotizacionConceptosTable
                            lines={displayComputed.lines}
                            categorias={categorias}
                            onReorderProducts={handleReorderProducts}
                            onReorderCategorias={handleReorderCategorias}
                            onAddCategoria={handleAddCategoria}
                            onUpdateCategoria={handleUpdateCategoria}
                            onRemoveCategoria={askRemoveCategoria}
                            onEdit={(id) => {
                              editConcepto(id);
                              scrollToSection("cot-partidas");
                            }}
                            onRemove={askRemoveConcepto}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </SectionCard>

                {/* ============================ 3. Textos ============================ */}
                <SectionCard
                  id="cot-textos"
                  step={3}
                  order={3}
                  title="Textos del documento"
                  description="Lo que el cliente leerá antes y después de los precios."
                  optional
                >
                  <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <FieldLabel htmlFor="cot-texto-arriba">Introducción</FieldLabel>
                        <span className="text-[11px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">
                          {textoArribaPrecios.length.toLocaleString("es-MX")} / 5,000
                        </span>
                      </div>
                      <textarea
                        id="cot-texto-arriba"
                        value={textoArribaPrecios}
                        onChange={(e) => setTextoArribaPrecios(e.target.value.slice(0, 5000))}
                        className={textareaLikeClassName}
                        rows={7}
                        placeholder="Texto que aparece arriba de la tabla de precios"
                      />
                    </div>
                    <div>
                      <div className="flex items-baseline justify-between gap-3">
                        <FieldLabel htmlFor="cot-terminos">Términos y condiciones</FieldLabel>
                        <span className="text-[11px] tabular-nums text-[#A1A1AA] dark:text-[#64748B]">
                          {terminos.length.toLocaleString("es-MX")} / 8,000
                        </span>
                      </div>
                      <textarea
                        id="cot-terminos"
                        value={terminos}
                        onChange={(e) => setTerminos(e.target.value.slice(0, 8000))}
                        className={textareaLikeClassName}
                        rows={7}
                      />
                    </div>
                  </div>
                </SectionCard>
              </div>

              {/* ============================ Panel lateral ============================ */}
              <aside
                className="cot-rise min-w-0 space-y-4 lg:sticky lg:top-24 lg:self-start"
                style={{ "--cot-i": 2 } as CSSProperties}
              >
                {/* Total */}
                <div className="relative overflow-hidden rounded-2xl bg-[#17235B] p-5 text-white dark:bg-[#1B2A63] sm:p-6">
                  <div
                    className="pointer-events-none absolute -right-16 -top-20 size-56 rounded-full bg-[#E6A23C]/15 blur-3xl"
                    aria-hidden
                  />
                  <div className="relative">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
                        Total de la cotización
                      </p>
                      <span className="rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white/75">
                        MXN
                      </span>
                    </div>
                    <p
                      className="mt-2 text-[34px] font-semibold leading-none tracking-[-1px] tabular-nums sm:text-[38px]"
                      aria-live="polite"
                    >
                      <span key={displayComputed.total} className="cot-flash inline-block">
                        {formatMoney(displayComputed.total)}
                      </span>
                    </p>
                    <p className="mt-2 text-[12px] text-white/60">
                      IVA incluido · {computed.lines.length}{" "}
                      {computed.lines.length === 1 ? "partida" : "partidas"}
                      {pdfOpciones.es_garantia ? " · Garantía: $0 en PDF" : ""}
                    </p>

                    <dl className="mt-5 space-y-2 border-t border-white/10 pt-4 text-[13px]">
                      {displayComputed.descuentoLineas >= 0.01 && (
                        <div className="flex items-center justify-between gap-3">
                          <dt className="text-white/65">Descuento en partidas</dt>
                          <dd className="tabular-nums text-[#FCA5A5]">-{formatMoney(displayComputed.descuentoLineas)}</dd>
                        </div>
                      )}
                      {!!toNumber(computed.descClientePct, 0) && (
                        <>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-white/65">Importe partidas</dt>
                            <dd className="tabular-nums text-white/90">{formatMoney(displayComputed.subtotalLineas)}</dd>
                          </div>
                          <div className="flex items-center justify-between gap-3">
                            <dt className="text-white/65">
                              Descuento cliente ({clampPct(toNumber(computed.descClientePct, 0)).toFixed(2)}%)
                            </dt>
                            <dd className="tabular-nums text-[#FCA5A5]">-{formatMoney(displayComputed.descuentoCliente)}</dd>
                          </div>
                        </>
                      )}
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-white/65">Subtotal</dt>
                        <dd className="tabular-nums text-white/90">{formatMoney(displayComputed.subtotalSinIva)}</dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-white/65">IVA 16%</dt>
                        <dd className="tabular-nums text-white/90">{formatMoney(displayComputed.ivaDesglose)}</dd>
                      </div>
                    </dl>

                    <div className="mt-4 rounded-xl bg-white/[0.07] p-3.5">
                      <div className="flex h-1.5 overflow-hidden rounded-full bg-white/15" aria-hidden>
                        <div
                          className="cot-bar h-full w-full rounded-full bg-[#E6A23C]"
                          style={{ transform: `scaleX(${anticipoPctEfectivo / 100})` }}
                        />
                      </div>
                      <dl className="mt-3 grid grid-cols-2 gap-3">
                        <div>
                          <dt className="flex items-center gap-1.5 text-[11px] font-medium text-white/60">
                            <span className="size-1.5 rounded-full bg-[#E6A23C]" aria-hidden />
                            Anticipo {anticipoPctEfectivo}%
                          </dt>
                          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatMoney(anticipoMonto)}</dd>
                        </div>
                        <div className="text-right">
                          <dt className="flex items-center justify-end gap-1.5 text-[11px] font-medium text-white/60">
                            <span className="size-1.5 rounded-full bg-white/40" aria-hidden />
                            Saldo {100 - anticipoPctEfectivo}%
                          </dt>
                          <dd className="mt-0.5 text-[15px] font-semibold tabular-nums">{formatMoney(saldoMonto)}</dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="rounded-2xl border border-[#E4E4E7] bg-white p-4 dark:border-[#273244] dark:bg-[#111827] sm:p-5">
                  {!canGuardarCotizacion && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-[13px] font-medium text-[#09090B] dark:text-[#F8FAFC]">Para guardar</p>
                        <p className="text-[12px] tabular-nums text-[#71717A] dark:text-[#8EA0B8]">
                          {requisitosListos} de {requisitos.length}
                        </p>
                      </div>
                      <ul className="mt-2 space-y-0.5">
                        {requisitos.map((r) => (
                          <li key={r.key}>
                            <button
                              type="button"
                              onClick={() => scrollToSection(r.target)}
                              disabled={r.done}
                              className="flex w-full items-center gap-2.5 rounded-lg px-1.5 py-1.5 text-left text-[13px] transition-colors enabled:hover:bg-[#F4F4F5] disabled:cursor-default dark:enabled:hover:bg-[#1B2539]"
                            >
                              {r.done ? (
                                <CircleCheck className="cot-tick size-4 shrink-0 text-[#04724D] dark:text-[#4ADE80]" aria-hidden />
                              ) : (
                                <Circle className="size-4 shrink-0 text-[#D4D4D8] dark:text-[#3A4661]" aria-hidden />
                              )}
                              <span
                                className={
                                  r.done
                                    ? "text-[#A1A1AA] line-through dark:text-[#64748B]"
                                    : "text-[#3F3F46] dark:text-[#D6DEEA]"
                                }
                              >
                                {r.label}
                              </span>
                              <span className="sr-only">{r.done ? "(listo)" : "(pendiente)"}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={!canGuardarCotizacion}
                      onClick={() => {
                        void handleSaveCotizacion(true);
                      }}
                      title={saveDisabledReason}
                      className={primaryActionBtnClass}
                    >
                      <Save className="size-4" aria-hidden />
                      {saveButtonLabel}
                    </button>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={!canGuardarCotizacion || exportBusy}
                        onClick={() => void handleOpenPdf()}
                        className={secondaryActionBtnClass}
                      >
                        {previewLoading ? <Spinner /> : <FileText className="size-4" aria-hidden />}
                        {previewLoading ? "Generando…" : "Vista PDF"}
                      </button>
                      <button
                        type="button"
                        disabled={exportBusy || !cotizacionPk}
                        onClick={() => void handleDownloadExcel()}
                        className={secondaryActionBtnClass}
                        title={!cotizacionPk ? "Guarda la cotización para descargar el Excel" : undefined}
                      >
                        {excelLoading ? <Spinner /> : <FileSpreadsheet className="size-4" aria-hidden />}
                        {excelLoading ? "Generando…" : "Excel"}
                      </button>
                    </div>

                    <button
                      type="button"
                      disabled={!canGuardarCotizacion || exportBusy || enviarCorreoSaving || !canEnviarPorCorreo}
                      onClick={() => void handleEnviarPorCorreo()}
                      className={correoActionBtnClass}
                      title={
                        !canEnviarPorCorreo
                          ? "Solo se puede enviar en estado Pendiente o Autorizada"
                          : !canGuardarCotizacion
                            ? saveDisabledReason
                            : undefined
                      }
                    >
                      {enviarCorreoSaving ? <Spinner /> : <Mail className="size-4" aria-hidden />}
                      {enviarCorreoSaving ? "Preparando…" : "Enviar PDF por correo"}
                    </button>
                  </div>
                </div>

                {/* Exportación */}
                <div id="cot-pdf" className="scroll-mt-24">
                  <CotizacionPdfOptionsPanel
                    opciones={pdfOpciones}
                    onOpcionesChange={setPdfOpciones}
                    descripcionesCortas={pdfDescripcionCorta}
                    onDescripcionCortaChange={(conceptoId, value) => {
                      setPdfDescripcionCorta((prev) => ({ ...prev, [conceptoId]: value }));
                    }}
                    lines={computed.lines.map((c) => ({
                      id: c.id,
                      producto_nombre: c.producto_nombre,
                      producto_descripcion: c.producto_descripcion,
                    }))}
                    showGarantiaOption={!isEditingRoute || pdfOpciones.es_garantia}
                  />
                </div>
              </aside>
            </div>

            {/* ============================ Barra móvil ============================ */}
            <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#E4E4E7] bg-white/95 px-4 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)] pt-3 backdrop-blur-md dark:border-[#273244] dark:bg-[#111827]/95 lg:hidden">
              <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[11px] text-[#71717A] dark:text-[#8EA0B8]">
                    Total · {computed.lines.length} {computed.lines.length === 1 ? "partida" : "partidas"}
                  </p>
                  <p className="truncate text-[18px] font-semibold tabular-nums tracking-[-0.3px] text-[#09090B] dark:text-[#F8FAFC]">
                    <span key={displayComputed.total} className="cot-flash inline-block">
                      {formatMoney(displayComputed.total)}
                    </span>
                  </p>
                </div>
                <button
                  type="button"
                  disabled={!canGuardarCotizacion}
                  onClick={() => {
                    void handleSaveCotizacion(true);
                  }}
                  title={saveDisabledReason}
                  className={`${primaryActionInlineBtnClass} w-auto! shrink-0`}
                >
                  <Save className="size-4" aria-hidden />
                  {isEditingRoute ? "Actualizar" : "Guardar"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
